# Family photographs

Original photographs supplied by Christopher Hayes for *Anatomy of an Almost*. These are earlier family memories, not images from the 2025 postseason. All four JPEG files retain the uploaded bytes. The page preserves their full portrait compositions and natural colours, with captions outside the photographs.

| File | Supplied filename | Placement | Caption evidence |
| --- | --- | --- | --- |
| `hayes-17.jpg` | `IMG_20180429_140135.jpg` | Our Jays opening | Hayes and number 17 are visible on the jersey. |
| `watching-the-game.jpg` | `IMG_20170415_135823.jpg` | Our first games | Child watching from the stadium seats; described by the author as an earlier family game. |
| `first-game-certificate.jpg` | `PXL_20230811_222417731.jpg` | Our first games | The certificate visibly states August 11, 2023, Blue Jays vs. Cubs. |
| `together-at-the-ballpark.jpg` | `PXL_20230813_181537610.jpg` | Closing reflection | Family selfie supplied by the author as an earlier ballpark memory. |

The author described the set as first games together with his daughter and son. Captions do not assign identities to individual children or infer exact dates from filenames. Only the date printed on the certificate appears as a dated caption. No EXIF metadata was present in the supplied JPEGs.

`scripts/build.py` embeds these originals into `index.html`, retaining the standalone/offline experience. HTML dimensions reserve the correct proportions; lazy image decoding/loading avoids rendering the distant closing image immediately. Embedding keeps the HTML self-contained but means all photo bytes are part of the initial document download (approximately 4.5 MB total HTML).

Photo credit: Christopher Hayes.
