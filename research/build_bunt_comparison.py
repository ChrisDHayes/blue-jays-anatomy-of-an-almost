#!/usr/bin/env python3
"""Reproduce descriptive bunt/no-recorded-bunt outcomes from the bundled archive.

No counterfactual treatment effect or individualized Game 7 forecast is fitted.
Use the first qualifying plate-appearance start in each complete half-inning,
innings 1–8 of the 2025 regular season. These innings avoid automatic runners
and ordinary walk-off censoring. Preserve runner events within each PA.
"""
import argparse
from collections import Counter, defaultdict
import csv
import hashlib
import io
import json
from math import sqrt
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE_SHA256 = "ea7f4be3464825b332ed6f8c19e15310858458ea9eddf3e91a954e5b47f69d73"
FIELDS = ("gid", "pn", "inning", "top_bot", "vis_home", "gametype", "batteam", "pitteam",
          "score_v", "score_h", "batter", "pitcher", "pa", "outs_pre", "outs_post",
          "br1_pre", "br2_pre", "br3_pre", "runs", "pitches", "bunt", "sh", "iw", "event")


def occupied(value):
    return str(value or "").strip() not in ("", ".", "0", "?", "NA")


def eligible(row):
    return (int(row["outs_pre"]) == 0 and occupied(row["br2_pre"])
            and not occupied(row["br1_pre"]) and not occupied(row["br3_pre"]))


def plate_appearances(rows):
    current = []
    for row in rows:
        current.append(row)
        if int(row["pa"]) == 1:
            yield current
            current = []
    if current:
        yield current


def select_cases(halves):
    cases = []
    audit = Counter()
    for key in sorted(halves):
        rows = sorted(halves[key], key=lambda row: int(row["pn"]))
        assert len({row["pn"] for row in rows}) == len(rows), "Duplicate source plays"
        if int(rows[-1]["outs_post"]) != 3:
            audit["incomplete_half_innings_excluded"] += 1
            continue
        audit["complete_half_innings"] += 1
        found = False
        for group in plate_appearances(rows):
            start, last = group[0], group[-1]
            if not eligible(start):
                continue
            if found:
                audit["later_qualifying_starts_excluded"] += 1
                continue
            found = True
            assert int(last["pa"]) == 1, "Qualifying opportunity lacks a completed PA"
            attempted = any(int(row["bunt"]) == 1 or int(row["sh"]) == 1
                            or bool(set(row["pitches"]) & set("LMO")) for row in group)
            remaining = sum(int(row["runs"]) for row in rows if int(row["pn"]) >= int(start["pn"]))
            score_diff = int(start["score_h"]) - int(start["score_v"])
            if int(start["vis_home"]) == 0:
                score_diff = -score_diff
            cases.append({
                "gid": start["gid"], "inning": int(start["inning"]), "top_bot": int(start["top_bot"]),
                "start_pn": int(start["pn"]), "end_pa_pn": int(last["pn"]),
                "batteam": start["batteam"], "pitteam": start["pitteam"],
                "batter": last["batter"], "pitcher": start["pitcher"],
                "score_diff": score_diff, "outs_pre": 0, "bases_pre": 2,
                "cohort": "bunt" if attempted else "no_bunt",
                "runs_remaining": remaining, "sacrifice_credited": int(last["sh"]),
                "bunt_in_play": int(any(int(row["bunt"]) for row in group)),
                "pa_rows": len(group), "pitches": last["pitches"], "terminal_event": last["event"],
            })
            if not last["pitches"] and last["iw"] != "1":
                audit["missing_pitch_sequence"] += 1
            if set(last["pitches"]) & set("UK"):
                audit["unknown_pitch_codes"] += 1
    assert len({(row["gid"], row["inning"], row["top_bot"]) for row in cases}) == len(cases)
    return cases, dict(audit)


def wilson(hits, n):
    if not n:
        return [None, None]
    z = 1.959963984540054
    p = hits / n
    denominator = 1 + z * z / n
    center = (p + z * z / (2 * n)) / denominator
    half = z * sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / denominator
    return [max(0, center - half), min(1, center + half)]


def summarize(cases):
    n = len(cases)
    bins = Counter(min(row["runs_remaining"], 2) for row in cases)
    histogram = Counter(row["runs_remaining"] for row in cases)
    metrics = {}
    for key, threshold in (("one", 1), ("two", 2)):
        hits = sum(row["runs_remaining"] >= threshold for row in cases)
        metrics[key] = {"count": hits, "rate": hits / n if n else None, "interval95": wilson(hits, n)}
    return {
        "n": n, "games": len({row["gid"] for row in cases}),
        "runs": {str(key): bins[key] for key in (0, 1, 2)},
        "histogram": {str(key): histogram[key] for key in sorted(histogram)},
        "mean_runs": sum(row["runs_remaining"] for row in cases) / n if n else None,
        "sacrifices_credited": sum(row["sacrifice_credited"] for row in cases),
        "bunts_in_play": sum(row["bunt_in_play"] for row in cases),
        "metrics": metrics,
    }


def build(archive):
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    assert digest == SOURCE_SHA256, "Source changed: review the new snapshot before rebuilding"
    halves = defaultdict(list)
    regular_games = set()
    with zipfile.ZipFile(archive) as z:
        with z.open("2025plays.csv") as binary:
            for row in csv.DictReader(io.TextIOWrapper(binary, encoding="utf-8-sig", newline="")):
                if row["gametype"] != "regular":
                    continue
                regular_games.add(row["gid"])
                if 1 <= int(row["inning"]) <= 8:
                    halves[(row["gid"], int(row["inning"]), int(row["top_bot"]))].append(
                        {field: row[field] for field in FIELDS})
    assert len(regular_games) == 2430, "Expected full 2025 MLB regular-season coverage"
    cases, audit = select_cases(halves)
    assert audit.get("missing_pitch_sequence", 0) == audit.get("unknown_pitch_codes", 0) == 0, "Review unknown bunt classification"
    samples = {}
    for key, label in (("all", "All scorelines"), ("down_one", "Trailing by one")):
        selected = [row for row in cases if key == "all" or row["score_diff"] == -1]
        samples[key] = {"label": label, "n": len(selected), "cohorts": {
            cohort: summarize([row for row in selected if row["cohort"] == cohort])
            for cohort in ("bunt", "no_bunt")
        }}
    return {
        "edition": "2025-observed-1", "source": "Retrosheet 2025 parsed plays, bundled snapshot",
        "source_sha256": digest, "regular_games": len(regular_games),
        "scope": "2025 regular season; complete half-innings 1–8; first PA start with only a runner on second and no outs",
        "bunt_definition": "A recorded bunt in play, sacrifice credit, or pitch code L, M or O anywhere in the next PA",
        "no_bunt_definition": "No recorded bunt attempt in the next PA; includes hits, walks, strikeouts and other outcomes",
        "interval_method": "95% Wilson binomial intervals; illustrative sampling uncertainty, without team/game clustering or causal adjustment",
        "limits": ["Players, pitchers, runners, lineups, inning and tactics differ across cohorts.",
                   "Bunt intent when no attempt was recorded is unknown; some attempts ended with a swing or walk.",
                   "These are observed rest-of-inning outcomes, not Game 7 forecasts or eventual win probabilities."],
        "audit": audit, "samples": samples,
    }, cases


def artifacts(summary, cases):
    output = io.StringIO(newline="")
    writer = csv.DictWriter(output, fieldnames=list(cases[0]), lineterminator="\n")
    writer.writeheader()
    writer.writerows(cases)
    return {ROOT / "data/bunt_comparison.json": json.dumps(summary, indent=2, ensure_ascii=False) + "\n",
            ROOT / "methods/bunt_comparison_cases.csv": output.getvalue()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    summary, cases = build(ROOT / "research/source/2025plays.zip")
    for path, content in artifacts(summary, cases).items():
        if args.check:
            assert path.read_text(encoding="utf-8") == content, f"Stale output: {path.name}"
        else:
            path.write_text(content, encoding="utf-8")
    print(json.dumps({"status": "PASS", "cases": len(cases), "samples": summary["samples"], "audit": summary["audit"]}))


if __name__ == "__main__":
    main()
