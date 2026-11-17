"""Boundary checks for the historical comparison's unit of observation."""
import unittest

from build_bunt_comparison import select_cases, summarize, wilson


def row(pn, **changes):
    result = dict(gid="TEST202501010", pn=str(pn), inning="1", top_bot="0", vis_home="0",
                  batteam="TOR", pitteam="LAN", score_v="4", score_h="5", batter="batter",
                  pitcher="pitcher", pa="1", outs_pre="0", outs_post="1", br1_pre="",
                  br2_pre="runner", br3_pre="", runs="0", pitches="X", bunt="0", sh="0",
                  iw="0", event="63")
    result.update({key: str(value) for key, value in changes.items()})
    return result


def select(*rows):
    return select_cases({("TEST202501010", 1, 0): list(rows)})


def end(pn, **changes):
    return row(pn, outs_pre=2, outs_post=3, br2_pre="", **changes)


class BuntComparisonTests(unittest.TestCase):
    def test_failed_bunt_stays_in_attempt_group(self):
        cases, _ = select(row(1, pitches="LMS", event="K"), end(2))
        self.assertEqual(cases[0]["cohort"], "bunt")
        self.assertEqual(cases[0]["sacrifice_credited"], 0)

    def test_bunt_in_play_without_bunt_pitch_code(self):
        cases, _ = select(row(1, pitches="X", bunt=1, event="FC/BG1.2X3(15)"), end(2))
        self.assertEqual(cases[0]["cohort"], "bunt")

    def test_runner_reaching_second_mid_pa_is_not_a_matched_start(self):
        cases, _ = select(row(1, pa=0, outs_post=0, br1_pre="runner", br2_pre="", event="SB2"),
                          row(2), end(3))
        self.assertEqual(cases, [])

    def test_runner_movement_during_pa_preserves_the_original_start(self):
        cases, _ = select(row(1, pa=0, outs_post=0, event="WP.2-3"),
                          row(2, br2_pre="", br3_pre="runner", runs=1, event="SF.3-H"), end(3))
        self.assertEqual(cases[0]["runs_remaining"], 1)
        self.assertEqual(cases[0]["pa_rows"], 2)

    def test_one_opportunity_per_half_inning_and_all_later_runs_count(self):
        cases, audit = select(row(1, outs_post=0, runs=1, event="D8.2-H"),
                              row(2, runs=1, event="S7.2-H"), end(3, runs=0))
        self.assertEqual(len(cases), 1)
        self.assertEqual(cases[0]["runs_remaining"], 2)
        self.assertEqual(audit["later_qualifying_starts_excluded"], 1)
        summary = summarize(cases)
        self.assertEqual(summary["metrics"]["one"]["count"], 1)
        self.assertEqual(summary["metrics"]["two"]["count"], 1)

    def test_incomplete_half_inning_is_excluded(self):
        cases, audit = select(row(1, runs=1))
        self.assertEqual(cases, [])
        self.assertEqual(audit["incomplete_half_innings_excluded"], 1)

    def test_score_margin_is_from_batting_team_perspective(self):
        cases, _ = select(row(1), end(2))
        self.assertEqual(cases[0]["score_diff"], -1)
        cases, _ = select(row(1, vis_home=1, score_v=5, score_h=4), end(2))
        self.assertEqual(cases[0]["score_diff"], -1)

    def test_sampling_interval_handles_boundary_counts(self):
        self.assertAlmostEqual(wilson(0, 10)[0], 0)
        self.assertAlmostEqual(wilson(10, 10)[1], 1)
        self.assertLess(wilson(5, 10)[0], .5)
        self.assertGreater(wilson(5, 10)[1], .5)


if __name__ == "__main__":
    unittest.main()
