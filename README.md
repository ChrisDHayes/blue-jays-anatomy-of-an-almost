# Anatomy of an Almost

**How the 2025 Toronto Blue Jays went from 82 projected wins to one last at-bat in the World Series.** An interactive story by Christopher Hayes, built around a question that stuck with him after Game 7 with his son. How did a team that surprised him get that close?

The story begins with family and the memory of José Bautista’s bat flip, then tests the 2025 surprise against preseason forecasts, player performance and the full game ledger. It returns to the close of Game 7 with an answer about how the Jays got there and where chance still mattered.

## Read and explore

[Open the interactive story](https://chrisdhayes.github.io/blue-jays-anatomy-of-an-almost/). To run a local copy, open `index.html` in a browser. The story, charts, definitions and illustrations run from the file itself. Video clips and publisher references open on their original sites. Bautista’s clip appears when his home run is selected in the 2015 replay. Springer and Barger’s clips sit under their respective postseason series in **One more win.** The Game 7 replay leads to Kiner-Falefa’s clip and the analysis of the recorded sacrifice.

Open **How Toronto got outs in October** for the pitch-count heatmap and fielding comparison. The count heatmap shows both teams’ rates in every square. Load a pitch-level Statcast CSV under **Where pitches crossed the plate** for side-by-side location heatmaps. Switch to **Individual pitches** to inspect speed, type and pitcher. [Getting a tracking export](docs/METHODS.md#pitch-tracking-from-behind-home-plate).

## Build and check

Use Python 3.10 or later. The build uses the standard library.

```bash
python3 scripts/build.py
python3 scripts/build.py --check
python3 -m http.server 8000
```

The build reads the story, CSS, JavaScript, illustrations and display data from this repository and writes `index.html`. The check rebuilds in memory and compares it with the file. For a local server preview, open [localhost:8000](http://localhost:8000). Update the video URLs in [data/videos.json](data/videos.json) and rebuild to update all the relevant links together.

## GitHub Pages

The ZIP already has the repository files at its root. Put those files in your repository root, including `index.html` and `.nojekyll`. To use branch publishing, select **Settings → Pages → Deploy from a branch**, choose your publishing branch and select **/ (root)**. The checked-in HTML is the published file. See the [GitHub Pages publishing guide](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Design and evidence

| Document | What it covers |
| --- | --- |
| [Design approach](docs/DESIGN.md) | Intention, inspiration, chapter sequence, palette, layout, Gestalt principles and chart perception |
| [Analytical methods](docs/METHODS.md) | Forecast comparisons, ledger reconciliation, permutation test, RE24, Game 7 model and sacrifice-bunt comparison |
| [Sources and references](docs/SOURCES.md) | Publisher links, clip details and the role and provenance of each bundled dataset |
| [Verification](docs/QA.md) | Rebuild, browser and numerical checks for this edition |
| [Credits and attribution](NOTICE.md) | Story, illustrative art, baseball data and publisher-hosted video |

The site build uses the evidence extracts in `data/`. The package also contains the supporting audits in `methods/`, the research code and the original Retrosheet play archive. The methods document explains how to [rerun the 150,000 shuffles](docs/METHODS.md#reproduce-the-shuffle), [rebuild the Phase 9 outputs](docs/METHODS.md#reproduce-the-phase-9-analysis) and [reproduce the postseason comparisons](docs/METHODS.md#postseason-pitching-and-fielding). [Retrosheet credits and data-use terms](NOTICE.md#retrosheet).
