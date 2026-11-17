#!/usr/bin/env python3
"""Verified player RE24 accounting for all 2025 TOR games.

Source: user-provided 2025 Retrosheet parsed play archive; 162 game regular +18 post.
Disaggregated run-expectancy outcomes; no WAR/WPA skill attribution.
"""
from collections import defaultdict, Counter
from pathlib import Path
import argparse
import csv
import hashlib
import json
import sys
sys.path.insert(0,str(Path(__file__).parent))
import phase9_retrosheet_pipeline as rp

ROOT = Path(__file__).resolve().parents[2]
REG = ROOT / 'data/tor_2025_regular_162.csv'
POST = ROOT / 'data/tor_2025_postseason_18.csv'


def analysis_arguments(description):
    parser = argparse.ArgumentParser(description=description)
    parser.add_argument('--plays', type=Path, required=True, help='Retrosheet 2025 parsed play archive')
    parser.add_argument('--out', type=Path, required=True, help='Directory for generated evidence')
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    return args


NAME={
'guerv002':'Vladimir Guerrero Jr.','sprig001':'George Springer','bichb001':'Bo Bichette',
'varsd001':'Daulton Varsho','barga001':'Addison Barger','kirka001':'Alejandro Kirk',
'lopej008':'Joey Loperfido','luken001':'Nathan Lukes','schnd001':'Davis Schneider',
'heint001':'Tyler Heineman','kennb002':'Buddy Kennedy','robew002':'Will Robertson',
'frant002':'Ty France','sanca009':'Ali Sánchez','wagnw001':'Will Wagner',
'stefm001':'Michael Stefanic','clasj001':'Jonatan Clase','jimel003':'Leo Jiménez',
'kinei001':'Isiah Kiner-Falefa','rodea001':'Alan Roden','stram002':'Myles Straw',
'gimea001':'Andrés Giménez','cleme002':'Ernie Clement','santa003':'Anthony Santander',
'gausk001':'Kevin Gausman','lauee001':'Eric Lauer','rodry003':'Yariel Rodríguez',
'fishb002':'Braydon Fisher','littb002':'Brendon Little','yesat001':'Trey Yesavage',
'bassc001':'Chris Bassitt','nanct001':'Tommy Nance','fluhm001':'Mason Fluharty',
'biebs001':'Shane Bieber','sandn001':'Nick Sandlin','garcy001':'Yimi García',
'burrr002':'Ryan Burr','urenj001':'José Ureña','borur001':'Alex Borucki',
'domis001':'Seranthony Domínguez','hoffj003':'Jeff Hoffman','tated001':'Dillon Tate',
 'turns003':'Spencer Turnbull','walkj004':'Josh Walker','lawrc001':'Casey Lawrence',
'barnj002':'Jacob Barnes','schup002':'Paxton Schultz','estrl002':'Lázaro Estrada',
'varll001':'Louie Varland','berrj001':'José Berríos','schem001':'Max Scherzer',
'greec003':'Chad Green','lucae002':'Easton Lucas','bruij001':'Justin Bruihl',
'swane001':'Erik Swanson','franb002':'Bowden Francis'}

def write(path,records,fields):
 with open(path,'w',newline='',encoding='utf-8') as f:
  w=csv.DictWriter(f,fieldnames=fields);w.writeheader();w.writerows(records)

def main(plays, out):
 gr=defaultdict(list)
 for p in rp.ingest_rows(plays):gr[p['gid']].append(p)
 games={gid:rp.compute_game(gid,ps) for gid,ps in gr.items()}
 game_kinds=Counter(g['plays'][0]['gametype'] for g in games.values())
 assert game_kinds['regular']==2430,(game_kinds,'wrong regular season count')
 assert len(games)==2478
 ledger=rp.load_ledger(REG,POST)
 matched=rp.match_games(games,ledger)
 game_to_match={r['gid']:r for r in matched}
 RE,counts=rp.run_expectancy({k:g for k,g in games.items() if g['plays'][0]['gametype']=='regular'})
 assert len(RE)==24
 # separate exact regular/postseason season counts, plus context-specific player values
 acc=defaultdict(lambda:dict(events=0,pa=0,runs_on_play=0,re24=0.,hits=0,hr=0))
 olay=[]; all_events=[]; conservation=defaultdict(float)
 span_counts=Counter()
 for m in matched:
  g=games[m['gid']]
  kind=m['kind'];date=m['date'];base={'gid':m['gid'],'date':date,'kind':kind,'series':g['plays'][0]['gametype'],'opponent':m['opponent'],'site':m['site']}
  sum_tor_runs=sum(rp.asint(p['runs'],'runs') for p in g['plays'] if p['batteam']=='TOR')
  sum_opp_runs=sum(rp.asint(p['runs'],'runs') for p in g['plays'] if p['pitteam']=='TOR')
  assert (sum_tor_runs,sum_opp_runs)==(m['runs_for'],m['runs_against']),(m,sum_tor_runs,sum_opp_runs)
  span_counts[kind]+=len(g['plays'])
  for pi,p in enumerate(g['plays']):
   before=rp.state(p,'pre'); after=rp.state(p,'post');runs=rp.asint(p['runs'],'runs')
   end_half=after[0]==3 or pi==len(g['plays'])-1
   post_re=0.0 if end_half else RE[after]
   delta=runs+post_re-RE[before]
   tor_batting=p['batteam']=='TOR';pa=rp.asint(p['pa'],'pa')
   if tor_batting:
    role='Batter (PA)' if pa==1 else 'Other offensive event (non-PA)'
    id=p['batter'] if pa==1 else 'UNASSIGNED_NON_PA'
    value=delta
   else:
    role='Pitcher/team run-prevention context'
    id=p['pitcher'];value=-delta
   key=(kind,role,id)
   a=acc[key];a['events']+=1;a['pa']+=pa if role=='Batter (PA)' else 0;a['re24']+=value
   a['runs_on_play']+=runs
   if role=='Batter (PA)':
    a['hits']+=sum(rp.asint(p.get(f) or '0',f) for f in ['single','double','triple','hr'])
    a['hr']+=rp.asint(p['hr'] or '0','hr')
   conservation[(kind,'tor_bat' if tor_batting else 'tor_pit')]+=value
   if tor_batting:
    olay.append({**base,'pn':rp.asint(p['pn'],'pn'),'inning':rp.asint(p['inning'],'inning'),
                 'batter_id':p['batter'],'batter_name':NAME.get(p['batter'],p['batter']),
                 'pitcher_id':p['pitcher'],'is_PA':pa,'event':p['event'],
                 'outs_before':before[0],'bases_before':before[1],
                 'outs_after':after[0],'bases_after':after[1],
                 'runs_scored':runs,'re24':round(delta,6),
                 'score_v_before':int(p['score_v']),'score_h_before':int(p['score_h']),
                 'source':'User-supplied Retrosheet 2025plays.csv'})
   if (kind=='P' and m['opponent']=='LAD') or (date=='2025-07-01'):
    all_events.append({**base,'pn':rp.asint(p['pn'],'pn'),'inning':rp.asint(p['inning'],'inning'),
      'batteam':p['batteam'],'pitcher_id':p['pitcher'],'batter_id':p['batter'],
      'batter_name':NAME.get(p['batter'],p['batter']), 'pa':pa, 'score_v_before':int(p['score_v']),
      'score_h_before':int(p['score_h']),'runs':runs,'event':p['event'],
      're24_for_batting_team':round(delta,6)})
 records=[]
 for (kind,role,id),a in acc.items():
  records.append({'season': 'Regular season' if kind=='R' else 'Postseason',
                  'role':role,'player_id':id,'player_name':NAME.get(id,id),
                  'events':a['events'],'pa':a['pa'],'hits':a['hits'],'home_runs':a['hr'],
                  're24':round(a['re24'],3),'re24_per_100_pa':round(a['re24']*100/a['pa'],3) if a['pa'] else None,
                  'runs_on_plays':a['runs_on_play'],
                  'scope_note':'Offensive plate appearances only' if role=='Batter (PA)' else ('Events not belonging to a batter PA' if role.startswith('Other') else 'Pitcher-on-mound context: excludes own batting, not fielding-inherited-run adjusted')})
 records.sort(key=lambda x:(x['season']!='Regular season', x['role'], -x['re24']))
 rw=[{'outs':i,'bases_mask':j,'bases': '-'.join(x for bit,x in enumerate(['1B','2B','3B']) if j&(1<<bit)) or 'Empty',
      'observations':counts[(i,j)],'run_expectancy':round(RE[(i,j)],5)} for i in range(3) for j in range(8)]
 game_rows=[]
 for m in matched:
  g=games[m['gid']]
  game_rows.append({**m,'gametype':g['plays'][0]['gametype'],
       'tor_play_rows':g['n_plays'], 'reference_source':'Retrosheet 2025plays.csv; local game-score ledger'})
 pw=['season','role','player_id','player_name','events','pa','hits','home_runs','re24','re24_per_100_pa','runs_on_plays','scope_note']
 write(out / 'tor_player_regular_vs_postseason_re24.csv',records,pw)
 write(out / 'tor_offense_all_events.csv',olay,list(olay[0]))
 write(out / 'mlb_regular_2025_re24_states.csv',rw,list(rw[0]))
 write(out / 'tor_180_retrosheet_crosswalk.csv',game_rows,list(game_rows[0]))
 write(out / 'selected_july1_worldseries_events.csv',all_events,list(all_events[0]))
 # game reconciliation audit against actual results, and conservation; not expected to equal run differential
 aud={'status':'PASS','source_archive':'2025plays(1).zip','source_archive_sha256':hashlib.sha256(plays.read_bytes()).hexdigest(),
     'mlb_total_plays':sum(len(x['plays']) for x in games.values()),'mlb_games_total':len(games),
     'mlb_game_types':dict(game_kinds),'tor_games':len(matched),
     'tor_regular_games':sum(m['kind']=='R' for m in matched),'tor_postseason_games':sum(m['kind']=='P' for m in matched),
     'tor_total_plays':sum(m['n_plays'] for m in matched),
     'tor_regular_plays':span_counts['R'],'tor_postseason_plays':span_counts['P'],
     'tor_offense_event_rows':len(olay),'tor_postseason_offense_event_rows':sum(r['kind']=='P' for r in olay),
     'tor_batter_PA_rows_regular':sum(r['is_PA'] for r in olay if r['kind']=='R'),
     'tor_batter_PA_rows_postseason':sum(r['is_PA'] for r in olay if r['kind']=='P'),
     'n_player_role_season_records':len(records),'re24_states':len(rw),
     'run_expected_base':'MLB 2025 regular season only, excludes walk-off censored partial innings',
     'method':'Event RE24=event runs + next-base/out run expectancy - pre-event run expectancy. Ending inning/game after RE=0.',
     'run_expectancy_not':'Not player skill, adjusted WAR or WPA. Pitcher-context values include team defense and inherited-run risk.',
     'conservation':{f'{k[0]}_{k[1]}':round(v,3) for k,v in conservation.items()},
     'notice':rp.LICENSE_NOTICE}
 (out / 'coverage_audit.json').write_text(json.dumps(aud,indent=2,ensure_ascii=False))
 print(json.dumps(aud,indent=2,ensure_ascii=False))
 for season in ['Regular season','Postseason']:
  print('\nTOP',season,'hitting:')
  for x in [a for a in records if a['season']==season and a['role']=='Batter (PA)'][:12]:
   print(x['player_name'],x['pa'],x['re24'],x['re24_per_100_pa'])
  print('BOTTOM:')
  for x in [a for a in records if a['season']==season and a['role']=='Batter (PA)'][-8:]:print(x['player_name'],x['pa'],x['re24'])
if __name__ == '__main__':
    args = analysis_arguments(__doc__)
    main(args.plays, args.out)
