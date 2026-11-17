# Sources and references

The numbered sections in the story’s **Sources and methods** footer map to the first column. The season and player exhibits use fixed snapshots from the reviewed research. Publisher pages supply context and allow cross-checks.

| Note | Evidence used in the story | Publisher or original source |
| --- | --- | --- |
| 1 | February start-of-spring Toronto team projection of 82 wins | [FanGraphs ZiPS American League standings](https://blogs.fangraphs.com/the-2025-start-of-spring-zips-projected-standings-american-league/) |
| 2 | Hitter forecasts and reconstructed batting lines | [Baseball Guru archive](https://baseballguru.com/bbinside4.html) · [February 2025 Guru workbook](https://baseballguru.com/GURU_mForecast2025.xlsm) · [Whiffs archived ZiPS and Steamer samples](https://whiffs.lastplayerpicked.com/seasons/2025/) · [Retrosheet parsed play data](https://www.retrosheet.org/downloads/plays.html) |
| 3 | Regular-season scores, postseason scores and series sequence | [Baseball Almanac schedule](https://www.baseball-almanac.com/teamstats/schedule.php?t=TOR&y=2025) · [MLB 2025 standings](https://www.mlb.com/standings/2025) · [Sports DB ledger source](https://sports-db.live/mlb/teams/toronto-blue-jays/2025) · [MLB postseason results](https://www.mlb.com/postseason/history/2025) · [Retrosheet parsed play data](https://www.retrosheet.org/downloads/plays.html) |
| 4 | Conditional streak and 30-game permutation comparisons | [Regular-season ledger](../data/tor_2025_regular_162.csv) · [Reproduction script](../season_streak_diagnostics.py) · [Seed and histograms](../data/season_streak_diagnostics.json) |
| 5 | 2015 Game 5 line score and seventh-inning events | [Baseball Almanac box score](https://www.baseball-almanac.com/box-scores/boxscore.php?boxid=201510140TOR) · [MLB seventh-inning recap](https://www.mlb.com/news/blue-jays-ride-wild-seventh-past-rangers-c154473866) |
| 6 | World Series Game 7 final, inning line and recorded play states | [MLB Game 7 Gameday](https://www.mlb.com/gameday/dodgers-vs-blue-jays/2025/11/01/813024/final) · [MLB Film Room](https://www.mlb.com/video/game/813024) · [Baseball-Reference box score](https://www.baseball-reference.com/boxes/TOR/TOR202511010.shtml) · [Retrosheet parsed play data](https://www.retrosheet.org/downloads/plays.html) |
| 7 | RE24 baseline, exploratory Game 7 probabilities and the postseason rules boundary | [Retrosheet parsed play data](https://www.retrosheet.org/downloads/plays.html) · [FanGraphs RE24 definition](https://library.fangraphs.com/misc/re24/) · [MLB extra-inning runner rule](https://www.mlb.com/glossary/rules/designated-runner) |
| 8 | Count-level pitch outcomes, first fielding position and tracking-field definitions | [Retrosheet pitch sequence codes](https://www.retrosheet.org/eventfile.htm) · [Retrosheet fielding fields](https://www.retrosheet.org/downloads/plays.html) · [Statcast CSV definitions](https://baseballsavant.mlb.com/csv-docs) |

The metric glossary in the story provides short definitions for 13 terms. The underlying stat definitions include [MLB on slugging](https://www.mlb.com/glossary/standard-stats/slugging-percentage), [MLB on plate appearances](https://www.mlb.com/glossary/standard-stats/plate-appearance) and [FanGraphs on RE24](https://library.fangraphs.com/misc/re24/).

## Official replay clips

| Play | Game and date | Where it appears | Publisher |
| --- | --- | --- | --- |
| José Bautista’s go-ahead three-run homer and bat flip | 2015 ALDS Game 5, October 14, 2015 | 2015 replay, with the Bautista home run selected | [Watch on MLB](https://www.mlb.com/video/bautista-fuels-blue-jays-to-alcs) |
| George Springer’s go-ahead three-run homer against Seattle | 2025 ALCS Game 7, October 20, 2025 | Postseason path, Seattle series | [Watch on MLB](https://www.mlb.com/video/george-springer-homers-4-on-a-fly-ball-to-left-center-field-addison-barge/) |
| Addison Barger’s sixth-inning pinch-hit grand slam against Los Angeles | 2025 World Series Game 1, October 24, 2025 | Postseason path, Dodgers series | [Watch on MLB](https://www.mlb.com/bluejays/video/addison-barger-hits-a-grand-slam-3-to-center-field-nathan-lukes-scores-an) |
| Isiah Kiner-Falefa’s 11th-inning sacrifice bunt, which advanced Vladimir Guerrero Jr. to third | 2025 World Series Game 7, November 1, 2025 | Bunt analysis, with the observed sacrifice | [Watch the exact play on Baseball Savant](https://baseballsavant.mlb.com/sporty-videos?playId=8c5c0c39-5e5c-3407-b8e4-56170ebdec38) |

## Included evidence and provenance

| File | Origin and role |
| --- | --- |
| [Player and Game 7 evidence](../data/atlas_game7_evidence.json) | Reviewed Atlas player extract, eight Retrosheet play states, MLB inning score and the Phase 9 experimental probability trace. |
| [162-game chart ledger](../data/tor_2025_162_games.json) and [regular-season CSV](../data/tor_2025_regular_162.csv) | D13-09 chart data and canonical Phase 8 ledger. The build checks the values game by game. |
| [18-game postseason ledger](../data/tor_2025_postseason_18.csv) | Phase 8 score ledger in series order, reconciled in Phase 9. |
| [2015 ALDS Game 5 replay](../data/bat_flip_2015.json) | Recorded inning scores and three seventh-inning scoring plays from the box score and MLB recap. |
| [Shuffle results](../data/season_streak_diagnostics.json) | Phase 8 conditional diagnostic results, threshold counts, maximum-statistic histograms and seed. |
| [Game crosswalk](../methods/tor_180_retrosheet_crosswalk.csv) and [coverage audit](../methods/coverage_audit.json) | The Phase 9 crosswalk identifies all 180 Toronto games in the 2025 Retrosheet archive. The audit logs coverage, game types and row counts. |
| [24 run expectancy states](../methods/mlb_regular_2025_re24_states.csv) | Phase 9 counts and league-average runs remaining by bases and outs. |
| [Win probability model audit](../methods/wpa_model_audit.json) | Phase 9 features, model parameters, held-out regular-season validation and limits of the postseason application. |
| [Retrosheet 2025 play archive](../research/source/2025plays.zip) | Original parsed play-by-play input used for Phase 9. The original ZIP is included for exact research reruns. |
| [Postseason pitching and fielding](../data/postseason_outs.json) | Count-level pitch outcomes, strikeouts, walks, and fielding outcomes by position for both sides in Toronto’s 18 postseason games. |
| [Video register](../data/videos.json) | Publisher, date, game, play and URL for the four direct links. |

The included parsed 2025 Retrosheet archive has SHA-256 `ea7f4be3464825b332ed6f8c19e15310858458ea9eddf3e91a954e5b47f69d73`. [Retrosheet archive listing](https://www.retrosheet.org/downloads/plays.html) · [Credits and attribution](../NOTICE.md).

The first-person recollections are by Christopher Hayes. The three generated concept illustrations come from the D13-07 editorial compositions and were carried forward through the reviewed story. The [design notes](DESIGN.md) record the palette, visual decisions and design references.
