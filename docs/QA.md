# Verification

## Family photographs update — November 24, 2026

- Four embedded JPEGs match the supplied originals byte for byte. Each has descriptive alt text, explicit natural dimensions, and an external caption. The source and compiled page have no unresolved photo placeholders or duplicate element IDs.
- Reviewed the Our Jays passage, paired first-game photographs and closing selfie in Chromium at a 1,348 px desktop content width and 320, 390 and 768 px frames (305, 375 and 753 px inner widths). No horizontal overflow. Portraits retain their natural proportions without clipping or colour filters; the pair stacks on phone widths.
- All four photographs loaded when their sections were reached. Corrected the closing caption colours and verified the final desktop and phone rendering. Captions distinguish these earlier visits from 2025; the certificate caption records its printed August 11, 2023 date.
- The standalone rebuild passes its evidence reconciliation and byte-for-byte `--check`. All embedded data blocks and executable scripts are unchanged from the preceding release.
- Rechecked the bunt comparison in the narrow phone frame: the initial one-run rates are 61.8% and 61.4%; selecting two or more runs and trailing by one updates the rates to 18.8% and 25.0%. No site-script errors were observed.

## Story and interaction

| Area | Checked |
| --- | --- |
| Hosting path | Opened the compiled page in Chromium from a local repository-style subpath. The three illustrations loaded, the internal links resolved, and the glossary contained 13 definitions. |
| Narrative | Reviewed the new opening paragraph after the Game 7 scene and the expanded ending. The epilogue gives the regular-season and postseason evidence, then returns to the author and his son. |
| 2015 replay | Opened the disclosure from its deep link and selected all three scoring plays. The score read 2–3, then 3–3, then 6–3 for Toronto. Bautista’s clip appeared on his home-run step and disappeared on the other plays. |
| Postseason clips | Checked Springer under Seattle and Barger under Los Angeles. The short descriptions and links sit in series order. Matched their destinations and Bautista’s to MLB and the bunt to Baseball Savant. Playback is on publisher pages. |
| Player Atlas | Checked all 21 Guru dots, 12 with the 200-PA filter and seven in the archived ZiPS comparison. The Atlas retains the regular-season player evidence. |
| Responsive layout | Checked the 1,348 px desktop content area and 768, 390 and 320 px frame widths. The postseason cards stack on phone widths. At 390 px the two clips and nine fielding positions had targets at least 44 px high, and the expanded exhibit fit without horizontal overflow. |
| Mobile profile | Opened Barger’s profile with the keyboard from the expectation chart in a form-restricted phone frame. Pointer and Escape both closed the dialog and returned focus to the player mark. The chapter menu and tap-to-open slugging definition responded. |
| 2025 season and Game 7 | Confirmed all 162 game markers, run-margin view and both shuffle results. The Game 7 replay switched between observed score and experimental probability and labelled the pending calibration. |
| Sacrifice bunt | The 11th-inning guided play exposed the bunt analysis link. The observed-play card displays the exact Baseball Savant link. The updated objectives change the rates, intervals, counts and interpretation. The score filter updates the sample and outcome table. The return link selects the recorded sacrifice with a runner on second before the play. |
| Postseason pitching and fielding | Checked the 12 labelled count cells, nine fielding positions, World Series filter and called-strike mode. Verified the actual 0–2 swing-and-miss comparison of 23 of 162 for Toronto and 18 of 181 for opponents. The rate labels fit at 320 and 390 px. |
| Location heatmaps | A labelled test fixture exercised the default 81-cell heatmaps, equal colours for equal shares from unequal samples, linked area selection, keyboard navigation and an off-map pitch. Also checked switching to individual pitches, the velocity key, series and pitch-type filters, and an empty team selection. The release draws these maps from a supplied Statcast export. Test pitches are excluded from the release. |

## Build and numbers

- The repository archive opens into a standalone `index.html` and its sources. The build check verifies a byte-for-byte rebuild from the archive contents.
- The regular-season JSON reconciles with the 162 CSV rows. The four baseline embedded data blocks match the reviewed edition.
- With NumPy 2.3.5, the included 150,000-shuffle program reproduced the archived result file byte for byte. It recorded 33,786 orderings at or above the streak threshold and 53,489 at or above the 30-game threshold.
- The two Phase 9 programs reproduced the archived coverage audit, crosswalk, 24-state run expectancy table and model audit byte for byte using the documented source snapshot and dependency versions. The observed bunt’s −0.222 RE24 follows from the two archived state values.
- Rebuilt the postseason pitch and fielding aggregates from the bundled play archive and crosswalk. The 18 games include 2,788 thrown pitches for Toronto and 2,754 for opponents on completed plate appearances. The fielding comparison covers 422 and 522 fielded balls, respectively.

## Bunt comparison update — November 17, 2026

- Reproduced the summary and 2,033-case ledger from the checksum-locked source archive. A second run with `--check` matched both outputs exactly. The site build reconciles every displayed objective rate and cohort size to the ledger; the rebuilt standalone HTML passes `--check`.
- Eight focused analytical tests pass: failed bunt attempts, bunts in play, runner movement into second during a PA, movement out of second during a matched PA, overlapping starts, incomplete innings, batting-team score margins and interval endpoints.
- In Chromium, checked all four combinations of scoring objective and sample. The all-scoreline two-run view reads 24.2% and 28.3%; trailing-by-one reads 18.8% and 25.0%. Returning to the one-run objective reads 65.6% and 57.5% for the narrow sample. Changing sample preserves the selected objective.
- Opened the outcome table and verified 11/15/6 and 97/74/57 in the narrow sample. Confirmed the smaller-sample message and the distinction from a personalized Game 7 forecast.
- Checked the desktop layout and 320, 390 and 768 px responsive frames (305, 375 and 753 px inner widths after the scrollbar). No horizontal document overflow. Objective buttons are at least 44 px high. Activated an objective with Enter; followed the return link to “Kiner-Falefa sacrifices” at LAD 5 · TOR 4 and back to the expanded comparison. No errors from the site’s scripts were observed.
