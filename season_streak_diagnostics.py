#!/usr/bin/env python3
"""Conditional-exchangeability diagnostics, NOT predictive probability of team skill.
Preserves the exact 94 wins and 68 losses; destroys opponents, calendar, venue,
injuries and serial structure. Quantifies how unusual a visible streak looks under
that intentionally simplified null, including the multiple-window search.
"""
import argparse,csv,json
from pathlib import Path
import numpy as np

def longest_streak(bits):
    maximum=current=0
    for b in bits:
        current=current+1 if b else 0
        maximum=max(current,maximum)
    return maximum

def run(csvpath,out,iterations=150000,seed=20261114):
    with open(csvpath,newline='') as f:games=list(csv.DictReader(f))
    wins=np.array([1 if r['result']=='W' else 0 for r in games],dtype=np.int8)
    if len(games)!=162 or int(wins.sum())!=94:raise ValueError('Input is not reconciled 94–68 season')
    window=30
    observed_30=int(np.convolve(wins,np.ones(window,dtype=np.int8),'valid').max())
    observed_streak=longest_streak(wins)
    r=np.random.default_rng(seed)
    better30=better_streak=0
    hist30={};hist_streak={}
    for _ in range(iterations):
        sim=r.permutation(wins)
        m30=int(np.convolve(sim,np.ones(window,dtype=np.int8),'valid').max())
        st=longest_streak(sim)
        hist30[m30]=hist30.get(m30,0)+1
        hist_streak[st]=hist_streak.get(st,0)+1
        better30+=m30>=observed_30
        better_streak+=st>=observed_streak
    first=[i for i in range(len(wins)-window+1) if int(wins[i:i+window].sum())==observed_30][0]
    result={
     'status':'PASS','games':162,'wins':94,'losses':68,'seed':seed,
     'permutations':iterations,'max_30_game_wins_observed':observed_30,
     'max_30_game_first_start':games[first]['date'],
     'max_30_game_first_end':games[first+window-1]['date'],
     'p_conditional_max30_at_least_observed':better30/iterations,
     'longest_win_streak_observed':observed_streak,
     'p_conditional_longest_streak_at_least_observed':better_streak/iterations,
     'null':'Random permutation of 94 W and 68 L, preserving season total',
     'limitations':'Not a probability that team was lucky; no opponent, schedule, venue, injuries or player ability adjustment',
     'histogram_max30':dict(sorted(hist30.items())),
     'histogram_max_streak':dict(sorted(hist_streak.items()))}
    out=Path(out);out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(result,indent=2)+'\n')
    return result

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--ledger',default='data/tor_2025_regular_162.csv')
    p.add_argument('--out',default='output/season_streak_diagnostics.json')
    p.add_argument('--iterations',type=int,default=150000)
    p.add_argument('--seed',type=int,default=20261114)
    a=p.parse_args();print(json.dumps(run(a.ledger,a.out,a.iterations,a.seed),indent=2))
