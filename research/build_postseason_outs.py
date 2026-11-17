#!/usr/bin/env python3
"""Reproduce the pitch and fielding comparisons for Toronto's 18 playoff games."""

import argparse
from collections import Counter
import csv
import io
import json
from pathlib import Path
from zipfile import ZipFile


REPO = Path(__file__).resolve().parents[1]
OPPONENTS = ("NYY", "SEA", "LAD")
COUNTS = tuple(f"{balls}-{strikes}" for balls in range(4) for strikes in range(3))
THROWN = set("BCFHIKLMOPQRSTXY")
PITCH_RESULTS = {"M": "miss", "Q": "miss", "S": "miss", "C": "called", "X": "play", "Y": "play"}
POSITIONS = tuple(str(position) for position in range(1, 10))


def counts_before_pitches(row):
    """Use the full sequence on the completed PA, ignoring scorer markers and pickoffs."""
    codes = [code for code in row["pitches"] if code.isalpha() and code != "N"]
    if not codes:
        raise ValueError(f"Missing pitch sequence for {row['gid']} play {row['pn']}")
    balls = strikes = 0
    final_count = (int(row["balls"]), int(row["strikes"]))
    for index, code in enumerate(codes):
        if balls > 3 or strikes > 2 or code not in THROWN | {"A", "V"}:
            raise ValueError(f"Unrecognized count or pitch code for {row['gid']} play {row['pn']}")
        if index == len(codes) - 1 and row["iw"] == "0" and (balls, strikes) != final_count:
            raise ValueError(f"Reconstructed count does not match {row['gid']} play {row['pn']}")
        if code in THROWN:
            yield f"{balls}-{strikes}", code
        if code in "BIPV":
            balls += 1
        elif code in "ACKLMOQST" or (code in "FR" and strikes < 2):
            strikes += 1


def blank_side():
    return {
        "pa": 0, "strikeouts": 0, "walks": 0, "runs": 0,
        "pitches": {count: {"total": 0, "miss": 0, "called": 0, "play": 0} for count in COUNTS},
        "fielding": {
            contact: {position: {"balls": 0, "out": 0} for position in POSITIONS}
            for contact in ("all", "ground", "air")
        },
    }


def add_play(side, row):
    side["runs"] += int(row["runs"])
    if row["pa"] != "1":
        return
    side["pa"] += 1
    side["strikeouts"] += int(row["k"])
    side["walks"] += int(row["walk"])
    for count, code in counts_before_pitches(row):
        bucket = side["pitches"][count]
        bucket["total"] += 1
        if code in PITCH_RESULTS:
            bucket[PITCH_RESULTS[code]] += 1

    if row["bip"] != "1" or row["hr"] == "1":
        return
    position = row["firstf"]
    hit = row["hittype"]
    if position not in POSITIONS or hit not in {"G", "BG", "BL", "F", "L", "P"}:
        raise ValueError(f"Unexpected fielded ball for {row['gid']} play {row['pn']}")
    shape = "ground" if hit.startswith(("G", "B")) else "air"
    recorded_out = int(row["outs_post"]) > int(row["outs_pre"])
    for kind in ("all", shape):
        bucket = side["fielding"][kind][position]
        bucket["balls"] += 1
        bucket["out"] += recorded_out


def build():
    with (REPO / "methods/tor_180_retrosheet_crosswalk.csv").open(newline="", encoding="utf-8") as source:
        playoff_rows = [row for row in csv.DictReader(source) if row["kind"] == "P"]
    games = {row["gid"]: row["opponent"] for row in playoff_rows}
    game_counts = Counter(games.values())
    if game_counts != {"NYY": 4, "SEA": 7, "LAD": 7}:
        raise ValueError("The crosswalk must cover the four Yankees, seven Mariners and seven Dodgers games.")
    result = {
        group: {"games": game_counts[group], "toronto": blank_side(), "opponents": blank_side()}
        for group in OPPONENTS
    }
    result["all"] = {"games": len(games), "toronto": blank_side(), "opponents": blank_side()}
    for group in result:
        result[group]["dates"] = sorted(row["date"] for row in playoff_rows if group in ("all", row["opponent"]))
    seen = set()
    with ZipFile(REPO / "research/source/2025plays.zip") as archive, archive.open("2025plays.csv") as stream:
        rows = csv.DictReader(io.TextIOWrapper(stream, encoding="utf-8-sig", newline=""))
        for row in rows:
            game = row["gid"]
            if game not in games:
                continue
            if "TOR" not in (row["batteam"], row["pitteam"]):
                raise ValueError(f"Toronto missing in matched game {game}")
            seen.add(game)
            side = "toronto" if row["pitteam"] == "TOR" else "opponents"
            add_play(result[games[game]][side], row)
            add_play(result["all"][side], row)
    if seen != games.keys():
        raise ValueError("Postseason coverage does not match the crosswalk.")
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=REPO / "data/postseason_outs.json")
    args = parser.parse_args()
    args.out.write_text(json.dumps(build(), indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
