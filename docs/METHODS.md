# Analytical methods

The versioned CSV and JSON files support the numbers in the story. The results combine observed scores and play states, preseason benchmarks, a conditional simulation and an experimental model. Each answers a different question.

| Story question | Evidence | Result and scope |
| --- | --- | --- |
| What did the preseason team forecast expect? | FanGraphs’ February start-of-spring ZiPS standings | Toronto’s 82 projected wins anchor the comparison with 94 recorded wins. The chart uses the straight-line pace `82 × games played ÷ 162`. |
| Did several hitters supply more power than expected? | February Guru forecasts matched to 2025 Toronto batting lines | Twenty-one matched hitters are plotted by default. Nine of 12 with at least 200 actual plate appearances finished above their forecast slugging percentage. |
| Where did the wins show up? | The 162-game regular-season ledger | Toronto moved from 14–16 to 94–68, scored 798 and conceded 721, and won 27 of 47 one-run games. |
| How often would a comparable streak appear with the record fixed? | 150,000 permutations of the observed wins and losses | At least ten consecutive wins appeared in 22.524% of orderings. At least 23 wins in a 30-game window appeared in 35.6593%. |
| What happened on the Game 7 bunt? | The recorded Game 7 play state and a league-average run expectancy table | Guerrero advanced from second to third, Toronto used one out and the score stayed 5–4. The change in expected runs for that outcome was −0.222. A strategy comparison would require additional modelling. |

## Forecast and player comparison

The team forecast and the hitter forecasts use separate sources. The February 24, 2025 Baseball Guru workbook is the primary player benchmark. Observed Toronto batting lines come from Retrosheet-derived DS-04 v1.6 records. The default 21-dot plot includes every Guru match in the bundled Atlas data. The playing-time filter uses actual plate appearances. Whiffs supplies seven matched predictions each for ZiPS and Steamer. The exact timing of those archived player forecasts is unverified.

Slugging is total bases divided by at-bats. The signed gap is actual SLG minus the selected projection. Profiles rank the gap in the displayed cohort and recover observed total bases by rounding actual SLG times actual at-bats. The included observed total bases round-trip to the source slugging rates at their stored precision. The extra-total-bases figure compares observed total bases with Guru’s rate at the same actual at-bats. Batting RE24 and its per-100-plate-appearance rate are separate context measures.

## Score ledgers and the two replays

The review reconciled 162 regular-season finals and 18 postseason finals against Retrosheet by date, opponent, home or away and final scores. The crosswalk records the Retrosheet game IDs. Run differential is `runs scored − runs allowed`. A one-run game has an absolute final margin of one. The figures describe how Toronto built the record. A causal allocation of the 12-win gap or an estimate of the odds of winning the pennant would require a different analysis.

The 2015 ALDS replay uses the inning line from the box score and three seventh-inning scoring plays from MLB’s chronology. The final score is Toronto 6, Texas 3. Toronto’s ninth-inning line is null because it did not bat in that half. World Series Game 7 uses MLB’s end-of-inning line and eight Retrosheet play excerpts. Those play cards show the score and base-and-out situation immediately before a play. The plotted end-of-inning score can therefore differ from the score on a play card for that inning.

## Reproduce the shuffle

The included Phase 8 script uses NumPy’s seeded random generator to permute the 162 binary game outcomes, keeping 94 wins and 68 losses in every iteration. It takes each ordering’s maximum win streak and maximum wins over all 30-game windows. Comparing those maxima with the observed maxima accounts for finding the best stretch anywhere in the schedule. The conditional reference leaves out opponent, venue, pitching, player availability and serial structure. Its percentages describe the order of a fixed record.

Use Python and NumPy. The archived result was reproduced here with NumPy 2.3.5.

```bash
python3 -m pip install numpy==2.3.5
python3 season_streak_diagnostics.py --ledger data/tor_2025_regular_162.csv --out /tmp/season_streak_rerun.json --iterations 150000 --seed 20261114
cmp data/season_streak_diagnostics.json /tmp/season_streak_rerun.json
```

The histograms contain the complete counts. The threshold counts are 33,786 for the streak and 53,489 for the 30-game window.

## Run expectancy and modeled win probability

Run expectancy averages the runs remaining in a half-inning for each of the 24 combinations of runners and outs. Phase 9 built the table from complete half-innings in the 2,430 games of the 2025 MLB regular season. Walk-off-censored partial innings are excluded from the table fit. A play’s RE24 is `runs scored + expectancy after − expectancy before`, using zero for expectancy after an inning or game ends. Batting RE24 sums the plate-appearance values. The rate equals `100 × batting RE24 ÷ actual plate appearances`. These figures describe the game situations and plays a hitter actually faced.

The optional Game 7 probability trace uses a histogram gradient-boosted tree classifier of eventual home-team victory. The fit used 189,939 regular-season pre-play states from 2,430 games, with features from inning, half, score, outs and runners. Five-fold validation held out whole games. The archived out-of-fold Brier score is 0.1562 against a 0.2492 constant baseline, with ROC AUC 0.8500. The full feature list, parameters and checks are in [the model audit](../methods/wpa_model_audit.json). The trace applies that model to a postseason game with different extra-inning runner rules. Postseason calibration is pending.

For Kiner-Falefa’s observed sacrifice, subtract the expectancy with a runner on second and zero outs (1.10516) from the expectancy with a runner on third and one out (0.88279). No run scored on the play. The rounded change is −0.222 expected runs. A fair bunt-versus-swing comparison would model all plausible outcomes for both decisions from the same game state and retain batter, pitcher, runner and follow-on hitters. The story lets readers change the proposed objective between scoring at least one run that inning and eventually winning. The two questions can differ because one run extends the game and two end it.

## Reproduce the Phase 9 analysis

The two Phase 9 programs use the bundled Toronto ledgers and the [original Retrosheet parsed 2025 play ZIP](../research/source/2025plays.zip). The research code is the reviewed implementation with paths adapted for this package. The input checksum is recorded alongside the other [research inputs](SOURCES.md#included-evidence-and-provenance).

Use Python 3.11 or later for the optional research dependencies. The first command installs the versions used for verification. The two programs then use the play archive included in the repository.

```bash
python3 -m pip install -r research/requirements.txt
python3 research/phase9/phase9_complete_analysis.py --plays research/source/2025plays.zip --out /tmp/anatomy-phase9
python3 research/phase9/phase9_win_probability.py --plays research/source/2025plays.zip --out /tmp/anatomy-phase9
```

The first program writes the 24-state table, game crosswalk, coverage audit and player and play outputs. The second writes the model audit, reliability bins, and Toronto win-probability and WPA extracts. Compare the four archived files under `methods/` with their corresponding generated files.

## Reproduction scope

The site build renders the included evidence and checks that the season, cohort, shuffle and replay inputs reconcile. The shuffle can be regenerated from the bundled ledger and code. The Phase 9 programs reproduce the four archived files with the included source ZIP. The player forecast joins, 2015 score edits and editorial selection of Game 7 play states enter the build as reviewed JSON extracts. The [source register](SOURCES.md) links those extracts to the original forecasts, box scores and play evidence.

## Postseason pitching and fielding

Filter the audited 180-game crosswalk to Toronto’s 18 postseason games. Assign every play to the side pitching or fielding and compare both sides in the same games. Toronto had 180 strikeouts in 714 completed plate appearances and opponents had 128 in 750. Walks, including intentional walks, were 77 and 61, respectively.

The count grid reconstructs the count before each actual pitch from Retrosheet’s complete sequence on the terminal plate-appearance row. It skips pickoff and runner markers and advances the count for automatic balls or strikes without counting them as thrown pitches. The comparison contains 2,788 pitches by Toronto and 2,754 by opponents. The three outcomes are misses on swings or bunt attempts, called strikes and balls put in play. The two percentages in each square use the teams’ respective pitch totals at that count. Colour shows which side had the higher rate. Darker colour shows a larger gap in percentage points. [Retrosheet pitch sequence codes](https://www.retrosheet.org/eventfile.htm).

The fielding diagram assigns each non-home-run ball in play to Retrosheet’s first fielding position. A play counts once if one or more outs are recorded. Toronto converted 316 of 422 fielded balls and opponents converted 359 of 522. The contact filter groups grounders and bunts together and groups fly balls, liners and popups together. These are actual play outcomes conditioned on each side’s contact mix and fielding locations. Individual range, handling difficulty and runs saved would require a separate tracking-based analysis. [Retrosheet parsed field definitions](https://www.retrosheet.org/downloads/plays.html).

```bash
python3 research/build_postseason_outs.py --out /tmp/postseason_outs.json
cmp data/postseason_outs.json /tmp/postseason_outs.json
```

## Pitch tracking from behind home plate

In the publisher’s Statcast search, choose pitcher-level pitch details for the 2025 postseason from October 4 through November 1. Leave team and pitcher filters open so the export includes Toronto and the teams it faced. Save the pitch-level CSV and select it in the story. To preload an export into the standalone page, place it at `data/statcast_postseason.csv` and run `python3 scripts/build.py`. [Baseball Savant Statcast Search](https://baseballsavant.mlb.com/statcast_search).

The parser reads date, teams and half-inning to identify the pitcher’s team, the audited matchup keys to select Toronto’s games, and game, at-bat and pitch identifiers to remove duplicates. It retains matched games with at least one tracked pitch from each side and reports coverage and pitch counts for the selected series. Pitcher, type, release speed, plate-crossing location and recorded batter strike-zone bounds are used for the marks and details. The plotted vertical value is `(plate_z − sz_bot) ÷ (sz_top − sz_bot)`. The shown zone is drawn at 17 inches wide and both panels share their coordinate and velocity scales. [Statcast CSV field definitions](https://baseballsavant.mlb.com/csv-docs).

The location heatmaps divide the area around the plate into a 9 by 9 grid. The drawn zone covers the middle three rows and columns. Each cell shows the number of pitches in that area divided by all tracked pitches for that side under the selected filters. Both teams use a colour scale from zero to the highest cell share across the two maps. Pitches outside the displayed area remain in the denominator and appear in the header’s off-map count. **Individual pitches** plots all selected records and provides the pitcher, type, velocity and location for each.

The distributed page includes the Retrosheet comparison and a link to the real Game 7 chart. The location heatmaps draw from a supplied Statcast export. [Baseball Savant Game 7 chart](https://baseballsavant.mlb.com/gamefeed?batSide=&chartType=pitch&count=&date=11%2F1%2F2025&descFilter=&gamePk=813024&hf=illustrator&inning=&legendType=pitchName&liveAb=&pitchHand=&playerType=pitcher&ptFilter=&resultFilter=&sportId=1).
