#!/usr/bin/env python3
"""Assemble the standalone site from the files in this repository."""

import argparse
import base64
import csv
from html import escape
import json
from pathlib import Path
import re
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
SOURCE = ROOT / "src"


def read(path):
    return path.read_text(encoding="utf-8")


def load_csv(path):
    with path.open(encoding="utf-8", newline="") as stream:
        return list(csv.DictReader(stream))


def require(condition, message):
    if not condition:
        raise SystemExit(message)


def check_evidence(games, evidence, diagnostic, bat_flip):
    regular = load_csv(DATA / "tor_2025_regular_162.csv")
    postseason = load_csv(DATA / "tor_2025_postseason_18.csv")
    fields = {
        "n": "game_number", "date": "date", "opp": "opponent", "site": "site",
        "for": "runs_for", "against": "runs_against", "diff": "run_diff",
        "result": "result", "wins": "cumulative_wins", "losses": "cumulative_losses",
    }
    require(len(games) == len(regular) == diagnostic["games"] == 162, "Expected 162 regular-season games.")
    for game, row in zip(games, regular, strict=True):
        require(
            all(str(game[key]) == row[column] for key, column in fields.items()),
            f"Chart and ledger disagree at regular-season game {game['n']}.",
        )
    require(len(postseason) == 18, "Expected 18 postseason games.")
    require((games[-1]["wins"], games[-1]["losses"]) == (diagnostic["wins"], diagnostic["losses"]) == (94, 68),
            "Final regular-season record disagrees with the shuffle input.")
    require((games[29]["wins"], games[29]["losses"]) == (14, 16), "April checkpoint is out of sync.")
    one_run = [game for game in games if abs(game["diff"]) == 1]
    require((len(one_run), sum(game["result"] == "W" for game in one_run)) == (47, 27),
            "One-run results are out of sync.")
    require((sum(game["for"] for game in games), sum(game["against"] for game in games)) == (798, 721),
            "Run totals are out of sync.")

    players = evidence["players"]
    require([sum(player.get(source) is not None for player in players) for source in ("guru", "zips", "steamer")]
            == [21, 7, 7], "Player forecast samples are out of sync.")
    matched = [player for player in players if player["pa"] >= 200 and player.get("guru") is not None]
    require((len(matched), sum(player["actual"] > player["guru"] for player in matched)) == (12, 9),
            "The 200-PA player comparison is out of sync.")

    require(diagnostic["status"] == "PASS" and diagnostic["permutations"] == 150_000,
            "Expected the reviewed shuffle outputs.")
    for histogram, threshold, probability in (
        ("histogram_max_streak", "longest_win_streak_observed", "p_conditional_longest_streak_at_least_observed"),
        ("histogram_max30", "max_30_game_wins_observed", "p_conditional_max30_at_least_observed"),
    ):
        counts = diagnostic[histogram]
        require(sum(counts.values()) == diagnostic["permutations"], f"Shuffle count mismatch in {histogram}.")
        hits = sum(count for value, count in counts.items() if int(value) >= diagnostic[threshold])
        require(hits / diagnostic["permutations"] == diagnostic[probability],
                f"Shuffle probability mismatch in {histogram}.")

    innings = evidence["innings"]
    require((sum(innings["lad"]), sum(innings["tor"]), len(evidence["events"])) == (5, 4, 8),
            "The World Series Game 7 replay is out of sync.")
    bunt = next(event for event in evidence["events"] if event["pn"] == 99)
    require((bunt["preLad"], bunt["preTor"], bunt["outs"], bunt["bases"], bunt["runRE24"]) == (5, 4, 0, 2, -0.222),
            "The recorded sacrifice is out of sync.")
    for team, final in (("tor", 6), ("tex", 3)):
        runs = bat_flip["innings"][team]
        require(len(runs) == 9 and sum(runs[:6]) == 2 and sum(run or 0 for run in runs) == final,
                f"The 2015 line score is out of sync for {team}.")
        require(runs[6] == sum(play[team] for play in bat_flip["seventh"]),
                f"The 2015 seventh-inning scoring plays do not reconcile for {team}.")


def render_story():
    substitutions = {}
    for name, image in (
        ("HERO_ART", "hero-baseball"),
        ("MEMORY_ART", "rogers-centre-memory"),
        ("GAME_ART", "game-7-night"),
    ):
        binary = (ROOT / "assets" / "illustrations" / f"{image}.webp").read_bytes()
        substitutions[name] = "data:image/webp;base64," + base64.b64encode(binary).decode("ascii")
    for name, image in (
        ("FAMILY_JERSEY", "hayes-17"),
        ("FAMILY_SEATS", "watching-the-game"),
        ("FAMILY_FIRST_GAME", "first-game-certificate"),
        ("FAMILY_TOGETHER", "together-at-the-ballpark"),
    ):
        binary = (ROOT / "assets" / "family" / f"{image}.jpg").read_bytes()
        substitutions[name] = "data:image/jpeg;base64," + base64.b64encode(binary).decode("ascii")
    for key, clip in json.loads(read(DATA / "videos.json")).items():
        url = urlsplit(clip["url"])
        require(url.scheme == "https" and url.hostname, f"Invalid clip URL for {key}.")
        substitutions[f"VIDEO_{key.upper()}"] = escape(clip["url"], quote=True)
    return re.sub(r"\{\{([A-Z0-9_]+)\}\}", lambda match: substitutions[match[1]], read(SOURCE / "story.html"))


def embed_data(tag, payload):
    serialized = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")
    return f'<script id="{tag}" type="application/json">{serialized}</script>'


def build():
    evidence = json.loads(read(DATA / "atlas_game7_evidence.json"))
    games = json.loads(read(DATA / "tor_2025_162_games.json"))
    diagnostic = json.loads(read(DATA / "season_streak_diagnostics.json"))
    bat_flip = json.loads(read(DATA / "bat_flip_2015.json"))
    postseason_outs = json.loads(read(DATA / "postseason_outs.json"))
    bunt_comparison = json.loads(read(DATA / "bunt_comparison.json"))
    bunt_cases = load_csv(ROOT / "methods" / "bunt_comparison_cases.csv")
    require(len({(row["gid"], row["inning"], row["top_bot"]) for row in bunt_cases}) == len(bunt_cases),
            "Bunt comparison must use disjoint half-innings.")
    for scope, sample in bunt_comparison["samples"].items():
        selected = [row for row in bunt_cases if scope == "all" or int(row["score_diff"]) == -1]
        require(len(selected) == sample["n"], "Bunt comparison sample count is out of sync.")
        for name, cohort in sample["cohorts"].items():
            cases = [row for row in selected if row["cohort"] == name]
            require(len(cases) == cohort["n"] == sum(cohort["runs"].values()), "Bunt cohort counts disagree.")
            for key, threshold in (("one", 1), ("two", 2)):
                hits = sum(int(row["runs_remaining"]) >= threshold for row in cases)
                metric = cohort["metrics"][key]
                require(hits == metric["count"] and hits / len(cases) == metric["rate"],
                        "Bunt comparison rate is out of sync with its case ledger.")
    statcast_export = DATA / "statcast_postseason.csv"
    check_evidence(games, evidence, diagnostic, bat_flip)
    require(
        [postseason_outs[group]["games"] for group in ("NYY", "SEA", "LAD", "all")] == [4, 7, 7, 18]
        and [postseason_outs["all"][side]["runs"] for side in ("toronto", "opponents")] == [75, 105],
        "Postseason pitching and fielding evidence must reconcile to the 18-game ledger.",
    )

    styles = SOURCE / "styles"
    scripts = SOURCE / "scripts"
    return "\n".join((
        read(SOURCE / "head.html").rstrip("\n"),
        "<style>",
        *(read(styles / f"{file}.css") for file in ("base", "editorial", "scrollytelling", "replays", "outs", "methods", "bunt_comparison", "family")),
        "</style>\n</head>\n<body>",
        render_story(),
        embed_data("evidence-json", evidence),
        embed_data("season-json", games),
        embed_data("diagnostic-json", diagnostic),
        embed_data("bat-flip-json", bat_flip),
        embed_data("postseason-outs-json", postseason_outs),
        embed_data("bunt-comparison-json", bunt_comparison),
        embed_data("statcast-postseason-json", read(statcast_export) if statcast_export.is_file() else ""),
        "<script>\n(() => {\n'use strict';",
        *(read(scripts / f"{file}.js") for file in ("atlas_charts", "atlas", "game", "bat_flip", "outs", "pitch_tracking")),
        "})();\n</script>",
        "<script>",
        *(read(scripts / f"{file}.js") for file in ("season", "journey", "bunt_comparison", "definitions")),
        "</script>\n</body>\n</html>\n",
    )).encode("utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Verify the checked-in index.html without rewriting it.")
    args = parser.parse_args()
    target = ROOT / "index.html"
    generated = build()
    if args.check:
        require(target.is_file() and target.read_bytes() == generated, "index.html is stale. Run python3 scripts/build.py.")
        print("index.html matches its sources. Evidence reconciliation passed.")
    else:
        target.write_bytes(generated)
        print(f"Built index.html ({len(generated):,} bytes). Evidence reconciliation passed.")


if __name__ == "__main__":
    main()
