#!/usr/bin/env python3
"""Retrosheet 2025 cross-game out-of-fold run-state WPA model.

NOT historical official WPA or individualized forecast. Performance estimated out of game,
training on regular season games only; playoff probabilities from full regular model.
Models states rather than plays. Teams are deliberately not predictors; raw context only.
"""
from collections import defaultdict
from pathlib import Path
import json
import sys

import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import brier_score_loss, roc_auc_score
from sklearn.model_selection import GroupKFold
sys.path.insert(0,str(Path(__file__).parent))
import phase9_retrosheet_pipeline as rp
from phase9_complete_analysis import NAME, POST, REG, analysis_arguments, write

FEATURES=['inning','bottom','outs','basemask','runners','home_lead','abs_lead',
 'inning_x_lead','lead_per_remaining','late','extra_innings','home_batting_with_runners']

def feats(p):
 inning=int(p['inning']);bottom=int(p['top_bot']);outs=int(p['outs_pre']);
 bm=rp.state(p,'pre')[1];diff=int(p['score_h'])-int(p['score_v']);remaining=max(1, 9-inning)
 return [min(16,inning),bottom,outs,bm,int(bm&1>0)+int(bm&2>0)+int(bm&4>0),
     max(-12,min(12,diff)),min(12,abs(diff)),min(16,inning)*max(-12,min(12,diff)),
     max(-12,min(12,diff))/remaining,int(inning>=7),int(inning>=10),bottom*int(bm!=0)]

def run(plays, out):
 groups=defaultdict(list)
 for p in rp.ingest_rows(plays): groups[p['gid']].append(p)
 games={gid:rp.compute_game(gid,ps) for gid,ps in groups.items()}
 ledger=rp.load_ledger(REG,POST); matched=rp.match_games(games,ledger)
 tor_ids={x['gid']:x for x in matched}
 regular=[(gid,g) for gid,g in games.items() if g['plays'][0]['gametype']=='regular']
 reg_gid=[k for k,g in regular]
 reg_groups=[]; reg_labels=[]; reg_feats=[]; row_gid=[]; row_pn=[]
 for gid,g in regular:
  win=int(g['score_h']>g['score_v'])
  for p in g['plays']:
   reg_feats.append(feats(p));reg_labels.append(win);reg_groups.append(gid);row_gid.append(gid);row_pn.append(int(p['pn']))
 X=np.asarray(reg_feats,dtype=np.float32);y=np.asarray(reg_labels,dtype=np.int8);groups=np.asarray(reg_groups)
 gid_to_indices=defaultdict(list)
 for i,gid in enumerate(row_gid):gid_to_indices[gid].append(i)
 model_kwargs=dict(max_iter=85,max_leaf_nodes=25,learning_rate=.085,min_samples_leaf=120,
                   l2_regularization=90,max_bins=180,random_state=20261114,early_stopping=False)
 cross=GroupKFold(n_splits=5)
 preds=np.full(len(y),np.nan)
 for fold,(tr,te) in enumerate(cross.split(X,y,groups),1):
  mdl=HistGradientBoostingClassifier(**model_kwargs)
  mdl.fit(X[tr],y[tr]);preds[te]=mdl.predict_proba(X[te])[:,1]
  print('fold',fold,'tr/te',len(tr),len(te),'Brier',round(brier_score_loss(y[te],preds[te]),5),flush=True)
 assert np.isfinite(preds).all()
 # Never train on the examined regular season game's target; these are per-game OOF predictions.
 full=HistGradientBoostingClassifier(**model_kwargs);full.fit(X,y)
 post_ids=[(gid,g) for gid,g in games.items() if gid in tor_ids and tor_ids[gid]['kind']=='P']
 postp={}
 if post_ids:
  ps=[p for gid,g in post_ids for p in g['plays']]
  pp=full.predict_proba(np.asarray([feats(p) for p in ps],dtype=np.float32))[:,1]
  postp={ (p['gid'],int(p['pn'])):float(pr) for p,pr in zip(ps,pp)}
 oofp={(gid,pn):float(preds[i]) for i,(gid,pn) in enumerate(zip(row_gid,row_pn)) if gid in tor_ids}
 game_wpa=[];row_wpa=[];acc=defaultdict(lambda:[0,0.0]);pre_wp=[];tor_start=[]
 for match in matched:
  gid=match['gid'];g=games[gid];h=(g['home']=='TOR');win=(g['score_h']>g['score_v'])==h
  pmap=oofp if match['kind']=='R' else postp
  pred=[pmap[(gid,int(p['pn']))] for p in g['plays']]
  if match['kind']=='P':assert len(pred)==len(g['plays'])
  start_tor=pred[0] if h else 1-pred[0];tor_start.append((match['kind'],start_tor))
  sumdiff=0.0
  for i,p in enumerate(g['plays']):
   before=pred[i];after=pred[i+1] if i+1<len(pred) else int(g['score_h']>g['score_v']);
   delta= (after-before) if h else (before-after)
   sumdiff+=delta
   is_pa=int(p['pa'])
   batting=(p['batteam']=='TOR');kind=match['kind']
   if batting:
    role='Batter (PA)' if is_pa else 'Other offensive event (non-PA)'
    player=p['batter'] if is_pa else 'UNASSIGNED_NON_PA'
   else:
    role='Pitcher/team run-prevention context';player=p['pitcher']
   val=acc[(kind,role,player)];val[0]+=1;val[1]+=delta
   row_wpa.append({'gid':gid,'date':match['date'],'season':'Regular season' if kind=='R' else 'Postseason',
    'series':g['plays'][0]['gametype'],'opponent':match['opponent'], 'site':match['site'],
    'pn':int(p['pn']),'inning':int(p['inning']),'top_bot':int(p['top_bot']),
    'batteam':p['batteam'],'role':role,'player_id':player,'player_name':NAME.get(player,player),
    'batter_id':p['batter'],'event':p['event'],'outs_before':int(p['outs_pre']),
    'bases_before':rp.state(p,'pre')[1], 'tor_score_pre':int(p['score_h']) if h else int(p['score_v']),
    'opp_score_pre':int(p['score_v']) if h else int(p['score_h']),
    'runs':int(p['runs']),'tor_wp_before':round(before if h else 1-before,6),
    'tor_wp_after':round(after if h else 1-after,6),'tor_wpa':round(delta,6),
    'probability_type':'5-fold out-of-game' if kind=='R' else 'regular-season-trained playoff extrapolation'})
  assert abs(sumdiff-((1 if win else 0)-start_tor))<1e-8,(gid,sumdiff,win,start_tor)
  game_wpa.append({'gid':gid,'date':match['date'],'season':match['kind'],'opponent':match['opponent'],
    'site':match['site'],'TOR_won':int(win),'TOR_start_wp':round(start_tor,6),
    'TOR_WPA_sum':round(sumdiff,6),'plays':len(pred)})
 players=[{'season':'Regular season' if kind=='R' else 'Postseason','role':role,
            'player_id':player,'player_name':NAME.get(player,player),'events':n,
            'model_wpa':round(wpa,4),'percentage_points':round(100*wpa,2),
            'interpretation':'2025 game-state model context, not official WPA; not causal/skill adjusted'}
          for (kind,role,player),(n,wpa) in acc.items()]
 players.sort(key=lambda r:(r['season']!='Regular season',r['role'],-r['model_wpa']))
 bins=[]
 for k in range(10):
  idx=(preds>=k/10)&(preds<(k+1)/10 if k<9 else preds<=1)
  bins.append({'probability_bin':f'{k*10}-{(k+1)*10}%', 'n':int(idx.sum()),
      'mean_pred':round(float(np.mean(preds[idx])),5) if idx.any() else None,
      'actual_win_fraction':round(float(np.mean(y[idx])),5) if idx.any() else None})
 write(out / 'tor_win_probability_events.csv',row_wpa,list(row_wpa[0]))
 write(out / 'tor_player_model_wpa_regular_postseason.csv',players,list(players[0]))
 write(out / 'tor_wpa_game_reconciliation.csv',game_wpa,list(game_wpa[0]))
 write(out / 'model_reliability_10_bins.csv',bins,list(bins[0]))
 predpost=[r for r in row_wpa if r['season']=='Postseason']
 summary={
    'status':'PASS','wp_model':'HistGradientBoostingClassifier on 2025 MLB regular-season play states only',
    'features':FEATURES,'params':model_kwargs,'cross_validation':'5-fold GroupKFold: non-overlapping games, OOF for regular-season event WPA',
    'regular_train_games':len(regular),'regular_train_rows':len(X),'tor_games':len(game_wpa),
    'tor_regular_model_play_rows':sum(r['season']=='Regular season' for r in row_wpa),
    'tor_postseason_model_play_rows':len(predpost),'brier_oof':float(brier_score_loss(y,preds)),
    'brier_baseline_constant':float(brier_score_loss(y,np.repeat(float(y.mean()),len(y)))),
    'mean_abs_calibration_error_10_bin':float(sum(b['n']*abs(b['actual_win_fraction']-b['mean_pred']) for b in bins)/len(y)),
    'roc_auc_oof':float(roc_auc_score(y,preds)),
    'tor_regular_actual_wins':sum(r['TOR_won'] for r in game_wpa if r['season']=='R'),
    'tor_regular_initial_wp_sum':round(sum(w for s,w in tor_start if s=='R'),3),
    'tor_regular_model_wpa_sum':round(sum(r['TOR_WPA_sum'] for r in game_wpa if r['season']=='R'),3),
    'tor_postseason_actual_wins':sum(r['TOR_won'] for r in game_wpa if r['season']=='P'),
    'tor_postseason_initial_wp_sum':round(sum(w for s,w in tor_start if s=='P'),3),
    'tor_postseason_model_wpa_sum':round(sum(r['TOR_WPA_sum'] for r in game_wpa if r['season']=='P'),3),
    'caveat':'Model WPA is conditional on generic score/inning/out/base state, not opponent quality, lineup, leverage skill, defense, umpire, team effects; postseason extrapolation unvalidated. No claim that model is official WPA.'}
 (out / 'wpa_model_audit.json').write_text(json.dumps(summary,indent=2))
 print(json.dumps(summary,indent=2),flush=True)
 for sn in ['Regular season','Postseason']:
  print('\n',sn,'BATTER model WPA:')
  for r in [x for x in players if x['season']==sn and x['role']=='Batter (PA)'][:15]:print(r['player_name'],r['events'],r['model_wpa'])
if __name__ == '__main__':
    args = analysis_arguments(__doc__)
    run(args.plays, args.out)
