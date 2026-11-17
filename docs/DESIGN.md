# Design approach

## Intention and inspiration

The story begins inside the author’s memory of watching Game 7 with his son. It turns the urge to know whether the run was a fluke into a series of questions a reader can investigate. The 82-win forecast anchors the surprise. The hitters show how several players changed the shape of the lineup. The game ledger shows when the gap opened. The final inning makes the emotional stakes and the limits of the models tangible.

The visual baseline comes from the D13-07 editorial composition studies, restored in D13-09 and developed into the D13-10 story. A tightly cropped baseball opens the piece. The Toronto stadium illustration supports the author’s earlier memories, and the night illustration marks the return to Game 7. The scoreboards, inning breakouts and score lines draw on the way fans follow a game. The 2015 bat flip and the 2025 postseason footage supply the historical moments on their publishers’ pages. The three in-story images are concept illustrations. [Sources and clips](SOURCES.md).

## Reading sequence

| Chapter | What the reader needs here | Design choice |
| --- | --- | --- |
| Opening and memory | Feel the stakes before seeing the analysis. | Lead with the scene with the author’s son and the certainty that built over the season. Recall the Jays of his childhood, the championships and being at Rogers Centre in 2015. Show Bautista’s clip when the reader selects his home run in the 2015 score chart. |
| The forecast | Understand the size of the surprise. | Put the 82-win preseason benchmark beside the 94-win actual result. Ask what February missed and hand off to the hitters. |
| The players | See the lineup pattern, then ask who drove it. | Start with the equality line and all 21 matched Guru hitters. Follow with ranked gaps and batting RE24 per 100 plate appearances. Keep the compact profile connected to the selection. |
| The season | See when the wins arrived and test the impression that the streak was extraordinary. | Move through 14–16, ten straight wins and 94–68. Keep all 162 games available and put the fixed-record shuffle after the wins chart. |
| Postseason | See how the Jays reached the last game. | Put Springer’s swing under the Seattle series and Barger’s swing under the Dodgers series. Give each clip a short game-state description. |
| Postseason pitching and fielding | See how the clubs got outs across the same games. | Put both rates in each ball-strike square and use colour to show the direction and size of the gap. The field diagram shows the first fielding position. Loaded pitch locations open as two catcher-view heatmaps with a shared colour scale and linked area selection. |
| Game 7 | Re-enter the last game with enough context to read the choices. | Switch to a night palette, guide three moments, then offer eight play states and the experimental probability view. Link the 11th-inning replay to the optional bunt analysis, where the clip sits with the observed sacrifice. |
| Epilogue and sources | Get an answer and see what it rests on. | Name the additional power, +77 run differential and 27 one-run wins. Use the last inning to bring the reader back from a season of evidence to a handful of plays, then close with the author and his son. Put the methods, source links and glossary after the story, with numbered links from the evidence. |

On roomy displays, the Atlas and season charts may stay in view while their short text beats pass alongside. Pinning requires a viewport at least 1,051 px wide and 760 px tall, room for the chart below the header, and a motion preference that allows it. On narrower or shorter displays the narrative and charts flow in document order, with links and controls to reach each view. The player profile opens in a compact dialog on widths of 1,050 px or less. Keyboard-operable controls, text labels, tables, focus restoration and hover, focus or tap definitions support readers moving at their own pace.

The visual hierarchy keeps one question at the centre of each chapter. Newspaper-like serif headings and openings give the narrative space. Compact sans-serif controls carry comparisons and actions, with monospace accents for scores. The stylesheet names Newsreader, IBM Plex Sans and IBM Plex Mono and specifies serif, system sans-serif and monospace fallbacks. The page uses locally available fonts and includes no font downloads.

## Colour

Values are taken from the stylesheet and chart code. Shared tokens set the editorial tone, while chart-specific shades keep marks and text clear on the surface where they appear.

| Colour and value | Job |
| --- | --- |
| Paper `#F3EFE7` and ink `#162B3D` | Warm reading surface and dark text for the narrative, analytical chapters and source notes. |
| Blue `#1F5A96` and deep blue `#174B75` | The Atlas selection ring and emphasis on controls or links. The pale `#DCE9F4` selection surface carries the signal into the profile. |
| Teal `#0A6D65` and coral `#A44D42` | Positive and negative comparison accents. In the forecast plot, above-forecast dots use `#167462` over `#EAF2EA` and below-forecast dots use `#A45344` over `#F3EAE1`. Position and region labels repeat the meaning. |
| Season blue `#1D659C` and ochre `#886333` | Recorded wins use the solid line. The dashed ochre line shows the constant pace to the forecast total. |
| Midnight `#0D1B2B` and replay card `#0B2032` | Carry the Game 7 chapter into the night setting while keeping the analytical exhibit readable. |
| Game 7 blue `#80C5F8`, coral `#F19C88` and gold `#DEC489` | Toronto is labelled and solid, Los Angeles is labelled and dashed, and a separate vertical gold marker locates the chosen inning or play. |

## Gestalt and pattern perception

| Principle | Where it appears | Reading task it supports |
| --- | --- | --- |
| Proximity | The chart, selected-player panel, forecast values and exact gap sit beside one another on wide screens. The play description sits beside its state and score in the replays. | Associate the evidence with the selected player or play. |
| Similarity | Each eligible hitter is the same type of mark in the expectation chart. Buttons in each step group share type and shape. | See a cohort of comparable observations and recognise controls that make the same kind of change. |
| Common region | The expectation line divides shaded above- and below-forecast regions. The 2015 seventh inning and selected 2025 inning have their own bands. | Read membership in a group before looking at the exact values. |
| Good continuation | The season line preserves game order as the reader moves from April to the streak to the finale. The 2015 and Game 7 score lines move by discrete score changes. | Follow a sequence through time and see where the recorded course changes. |
| Figure and ground | The focus ring and stronger annotations pull a selected hitter forward against quieter marks and gridlines. | Keep the whole distribution visible while attending to one player. |
| Connectedness | The selected hitter’s guide connects the equal-forecast point with the observed point at the same projected value. | Tie the signed gap to the vertical distance the reader sees. |

The Atlas puts projected and actual slugging on the same numerical range. A point above the equality line answers the direction question quickly. The ranking then aligns signed bar lengths to one zero baseline for size comparisons. The season chart keeps the recorded and benchmark wins on one scale and labels the reference. Team labels, line dashes, text and position repeat meaning alongside colour. These choices make differences and runs of games easier to spot. The ledger and permutation test give readers a way to check the apparent pattern.

For the design vocabulary, see [Palmer and Rock on connectedness](https://doi.org/10.3758/BF03200760), [Nielsen Norman Group on proximity](https://www.nngroup.com/articles/gestalt-proximity/) and [common region](https://www.nngroup.com/articles/common-region/). The choices about position and length draw on principles described in [Cleveland and McGill’s graphical perception research](https://doi.org/10.1080/01621459.1984.10478080). The combination of guided beats and exploratory views can be read through [Segel and Heer’s narrative visualization framework](https://doi.org/10.1109/TVCG.2010.179).
