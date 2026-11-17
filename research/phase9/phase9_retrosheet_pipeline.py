#!/usr/bin/env python3
"""Anatomy of an Almost: robust Retrosheet 2025 plays ingestion and RE24 pipeline.

USAGE:
 python scripts/retrosheet_pipeline.py --plays /path/to/2025plays.zip --regular data/tor_2025_regular_162.csv --postseason data/tor_2025_postseason_18.csv --out output/complete

Input is a legitimate user-supplied Retrosheet archive. NO download performed by this
script. The program hard-fails when 180/180 TOR games cannot be matched and reconciled.
Run expectancy uses 2025 MLB plays in the same archive; empirical and descriptive,
NOT an independent forecast or causal attribution. It does not compute WPA.
"""
from __future__ import annotations
import argparse, csv, io, json, math, os, re, sys, zipfile
from collections import defaultdict
from pathlib import Path

LICENSE_NOTICE = ("The information used here was obtained free of charge from and is "
                  "copyrighted by Retrosheet. Interested parties may contact Retrosheet "
                  "at 20 Sunset Rd., Newark, DE 19711.")
FIELDS = ('gid','pn','date','gametype','pbp','inning','top_bot','vis_home',
          'batteam','pitteam','score_v','score_h','runs','outs_pre','outs_post',
          'br1_pre','br2_pre','br3_pre','br1_post','br2_post','br3_post',
          'pa','batter','pitcher','hr','single','double','triple','walk','k','rbi','event')
NEEDED = {'gid','pn','date','inning','top_bot','vis_home','batteam','pitteam',
          'score_v','score_h','runs','outs_pre','outs_post','br1_pre','br2_pre',
          'br3_pre','br1_post','br2_post','br3_post','pa','batter','pitcher'}


def normalize_date(value):
    v=(value or '').strip()
    if re.fullmatch(r'\d{8}',v):return f'{v[:4]}-{v[4:6]}-{v[6:]}'
    return v[:10]

def asint(v,label):
    try: return int(str(v).strip())
    except (ValueError,TypeError): raise ValueError(f'Invalid {label}: {v!r}')

def occupied(v):
    return bool(str(v or '').strip() not in ('','.','0','?','NA'))

def state(row, phase='pre'):
    outs=asint(row[f'outs_{phase}'],f'outs_{phase}')
    mask=sum((1 << i) if occupied(row[f'br{i+1}_{phase}']) else 0 for i in range(3))
    return outs,mask

def ingest_rows(path):
    path=Path(path)
    if not path.exists():raise FileNotFoundError(f'REQUIRED authentic Retrosheet file missing: {path}')
    if path.suffix.lower()=='.zip':
        with zipfile.ZipFile(path) as z:
            matches=[s for s in z.namelist() if re.search(r'(?:2025)?plays\.csv$',s,re.I)]
            if len(matches)!=1:raise ValueError(f'Archive must have exactly one 2025 plays CSV; found {matches}')
            with z.open(matches[0]) as binary:
                yield from parse_csv(io.TextIOWrapper(binary,encoding='utf-8-sig',newline=''))
    elif path.suffix.lower()=='.csv':
        with open(path,encoding='utf-8-sig',newline='') as f:yield from parse_csv(f)
    else:raise ValueError('Pass 2025plays.zip or 2025plays.csv')

def parse_csv(file):
    reader=csv.DictReader(file)
    if not reader.fieldnames: raise ValueError('Missing CSV header')
    absent=NEEDED.difference(reader.fieldnames)
    if absent:raise ValueError(f'Retrosheet schema missing required columns: {sorted(absent)}')
    for index,row in enumerate(reader,2):
        if not row.get('gid'):raise ValueError(f'Missing gid at CSV line {index}')
        yield {f:(row.get(f) or '') for f in FIELDS}

def compute_game(gid,plays):
    plays.sort(key=lambda p:asint(p['pn'],'pn'))
    # Require genuine, unique play numbers rather than assuming CSV order is canonical.
    pns=[asint(p['pn'],'pn') for p in plays]
    if len(set(pns))!=len(pns): raise ValueError(f'Duplicate play numbers in {gid}')
    teams=set()
    for p in plays:
        if p['batteam']==p['pitteam']:raise ValueError(f'Same batter/pitcher team in {gid}')
        vis=p['batteam'] if asint(p['vis_home'],'vis_home')==0 else p['pitteam']
        hom=p['pitteam'] if asint(p['vis_home'],'vis_home')==0 else p['batteam']
        teams.add((vis,hom))
    if len(teams)!=1:raise ValueError(f'Home/away identity changes inside {gid}: {teams}')
    vis,hom=next(iter(teams))
    last=plays[-1]
    sv=asint(last['score_v'],'score_v')
    sh=asint(last['score_h'],'score_h')
    r=asint(last['runs'],'runs')
    if asint(last['vis_home'],'vis_home')==0:sv+=r
    else:sh+=r
    # Additionally verify score progression across all available consecutive events.
    prev=None
    for p in plays:
        current=(asint(p['score_v'],'score_v'),asint(p['score_h'],'score_h'))
        if prev is not None and current!=prev:
            raise ValueError(f'Broken play-by-play scoreboard in {gid}: expected {prev}, got {current}')
        runs=asint(p['runs'],'runs')
        if runs<0 or runs>9:raise ValueError(f'Implausible runs on one play in {gid}: {runs}')
        prev=(current[0]+runs,current[1]) if asint(p['vis_home'],'vis_home')==0 else (current[0],current[1]+runs)
    date=normalize_date(plays[0]['date'])
    return {'gid':gid,'date':date,'visiting':vis,'home':hom,'score_v':sv,'score_h':sh,
            'n_plays':len(plays), 'plays':plays}

def load_ledger(reg_path,post_path):
    combined=[]
    for season_type,path in [('R',reg_path),('P',post_path)]:
        with open(path,newline='',encoding='utf-8') as f:
            for item in csv.DictReader(f):
                combined.append({'kind':season_type,'date':normalize_date(item['date']),
                                 'opponent':item['opponent'],'site':item['site'],
                                 'runs_for':asint(item['runs_for'],'runs_for'),
                                 'runs_against':asint(item['runs_against'],'runs_against'),
                                 'local_game_number':asint(item['game_number'],'game_number')})
    if len(combined)!=180 or sum(x['kind']=='R' for x in combined)!=162 or sum(x['kind']=='P' for x in combined)!=18:
        raise ValueError('Local reference ledger is not 162 regular + 18 postseason games')
    return combined

# Verified team-code crosswalk from the user-provided 2025 Toronto ledgers
# to historical Retrosheet abbreviations.
TEAM_ALIASES = {
    'WSH':'WAS','NYM':'NYN','NYY':'NYA','LAA':'ANA','TBR':'TBA',
    'SDP':'SDN','STL':'SLN','CHW':'CHA','SFG':'SFN','KCR':'KCA',
    'LAD':'LAN','CHC':'CHN'
}

def match_games(game_map,ledger):
    candidates=[]
    for gid,g in game_map.items():
        if 'TOR' not in (g['home'],g['visiting']): continue
        site='H' if g['home']=='TOR' else 'A'
        opp=g['visiting'] if site=='H' else g['home']
        rf=g['score_h'] if site=='H' else g['score_v']
        ra=g['score_v'] if site=='H' else g['score_h']
        candidates.append({'gid':gid,'date':g['date'],'opponent':opp,'site':site,
                           'runs_for':rf,'runs_against':ra,'n_plays':g['n_plays']})
    if len(candidates)!=180:
        raise ValueError(f'Coverage BLOCKED: Retrosheet archive yields {len(candidates)}/180 Toronto games; need all 180')
    right=defaultdict(list)
    for c in candidates:
        right[(c['date'],c['opponent'],c['site'],c['runs_for'],c['runs_against'])].append(c)
    matched=[];used=set()
    for x in ledger:
        key=(x['date'],TEAM_ALIASES.get(x['opponent'],x['opponent']),x['site'],x['runs_for'],x['runs_against'])
        found=[v for v in right.get(key,[]) if v['gid'] not in used]
        if len(found)!=1:
            raise ValueError(f'Coverage BLOCKED: expected exactly one matching game for {x}; found {[v["gid"] for v in found]}')
        found=found[0]
        used.add(found['gid'])
        matched.append({**x,'gid':found['gid'],'n_plays':found['n_plays']})
    if len(used)!=180: raise ValueError('Coverage BLOCKED: incomplete or duplicate ledger mapping')
    return matched

def run_expectancy(games):
    """Compute E[runs from this state until end of half inning], 2025 MLB.
    Observed run-to-end labels include runs from the current event onward.
    The game must be complete and the rows chronologically ordered by pn.
    """
    sums=defaultdict(float);counts=defaultdict(int)
    for g in games.values():
        halves=defaultdict(list)
        for p in g['plays']:
            halves[(asint(p['inning'],'inning'),asint(p['top_bot'],'top_bot'))].append(p)
        for ps in halves.values():
            # Discard incomplete bottom halves ended by a walk-off; the unplayed
            # remaining outs make run-to-end labels right-censored.
            if asint(ps[-1]['outs_post'],'outs_post') != 3:
                continue
            rem=0
            for p in reversed(ps):
                rem+=asint(p['runs'],'runs')
                pre=state(p,'pre')
                if 0<=pre[0]<=2:
                    counts[pre]+=1
                    sums[pre]+=rem
    out={k:sums[k]/counts[k] for k in counts}
    if len(out)!=24:
        raise ValueError(f'RE24 BLOCKED: all 24 base/out states required, got {len(out)}')
    return out,counts

def analyze_player_plays(games,matched,RE):
    summaries=defaultdict(lambda: {'team':'TOR','player_id':'','role':'', 'plays':0,'pa':0,'re24':0.0,'runs_on_event':0})
    event_records=[]
    for m in matched:
        g=games[m['gid']];lastpn=asint(g['plays'][-1]['pn'],'pn')
        for p in g['plays']:
            before=state(p,'pre');after=state(p,'post')
            if before not in RE:
                raise ValueError(f'Missing RE before state {before}, {m["gid"]}')
            if after[0]>3 or before[0]>2:raise ValueError('Invalid outs in source')
            runs=asint(p['runs'],'runs')
            # A game-ending walk-off has no remaining run expectancy after this play.
            is_terminal=asint(p['pn'],'pn')==lastpn
            post_re=0.0 if after[0]==3 or is_terminal else RE.get(after)
            if post_re is None:
                raise ValueError(f'Missing RE after state {after}, {m["gid"]}')
            delta=runs+post_re-RE[before]
            tor_batting=(p['batteam']=='TOR')
            if tor_batting and asint(p['pa'],'pa')==1:
                person=p['batter'];tag=('offense',person)
            elif (not tor_batting):
                # Raw contextual run-prevention, not an isolated pitching-value metric.
                person=p['pitcher'];tag=('pitching_context',person)
                delta=-delta
            else:
                person='UNASSIGNED_NON_PA';tag=('non_PA_offense',person)
            if not person:raise ValueError(f'Missing responsible identifier in {m["gid"]}')
            z=summaries[tag]
            z['player_id']=person;z['role']=tag[0];z['plays']+=1
            z['pa']+=asint(p['pa'],'pa') if tag[0]=='offense' else 0
            z['re24']+=delta;z['runs_on_event']+=runs
            if tor_batting:
                event_records.append({'gid':m['gid'],'date':m['date'],'kind':m['kind'],
                                      'pn':asint(p['pn'],'pn'),'inning':asint(p['inning'],'inning'),
                                      'batting_player':p['batter'],'pitcher':p['pitcher'],
                                      'pa':asint(p['pa'],'pa'),'runs':runs,
                                      'outs_pre':before[0],'bases_pre':before[1],
                                      'outs_post':after[0],'bases_post':after[1],
                                      're24_offense':round(runs+post_re-RE[before],6),
                                      'event':p['event'][:120]})
    players=[{**v,'re24':round(v['re24'],5)} for v in summaries.values()]
    return players,event_records

def write_csv(path,records,fields=None):
    path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
    if not fields:fields=list(records[0]) if records else []
    with open(path,'w',encoding='utf-8',newline='') as f:
        w=csv.DictWriter(f,fieldnames=fields);w.writeheader();w.writerows(records)

def main():
    a=argparse.ArgumentParser()
    a.add_argument('--plays',required=True,help='Downloaded Retrosheet 2025plays.zip or CSV')
    a.add_argument('--regular',default='data/tor_2025_regular_162.csv')
    a.add_argument('--postseason',default='data/tor_2025_postseason_18.csv')
    a.add_argument('--out',default='output/complete')
    args=a.parse_args();out=Path(args.out)
    game_rows=defaultdict(list);total=0
    for p in ingest_rows(args.plays):
        game_rows[p['gid']].append(p);total+=1
    if total<100000:raise ValueError(f'Coverage BLOCKED: archive too small to provide 2025 MLB baseline: {total} rows')
    games={gid:compute_game(gid,ps) for gid,ps in game_rows.items()}
    ledger=load_ledger(args.regular,args.postseason)
    matched=match_games(games,ledger)
    re24,counts=run_expectancy(games)
    players,events=analyze_player_plays(games,matched,re24)
    out.mkdir(parents=True,exist_ok=True)
    write_csv(out/'tor_180_retrosheet_game_crosswalk.csv',matched)
    write_csv(out/'mlb_2025_run_expectancy_24.csv',
              [{'outs':i,'bases':j,'observations':counts[(i,j)],'expected_runs':round(re24[(i,j)],6)}
               for i in range(3) for j in range(8)])
    write_csv(out/'tor_2025_player_re24_context.csv',
              sorted(players,key=lambda x:(x['role'],-x['re24'])))
    write_csv(out/'tor_2025_offense_play_events.csv',events)
    audit={'status':'PASS','all_mlb_plays':total,'mlb_games':len(games),'RE24_baseline':'2025 source archive, all game types, complete half innings only',
           'tor_games_verified':len(matched), 'tor_regular_games':sum(m['kind']=='R' for m in matched),
           'tor_postseason_games':sum(m['kind']=='P' for m in matched),
           'tor_offense_events':len(events),'RE24_states':len(re24),
           'interpretation':'Observed 2025 MLB run-expectancy context; no WP/WPA, causal or preseason claims',
           'notice':LICENSE_NOTICE}
    (out/'coverage_audit.json').write_text(json.dumps(audit,indent=2)+'\n')
    print(json.dumps(audit,indent=2))

if __name__=='__main__':
    try:main()
    except Exception as e:
        print(f'INFERENCE BLOCKED — {type(e).__name__}: {e}',file=sys.stderr)
        sys.exit(2)
