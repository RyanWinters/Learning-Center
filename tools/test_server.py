#!/usr/bin/env python3
"""Tests for server.py merge rules and the served-file allowlist.  Usage: python tools/test_server.py"""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
import server  # noqa: E402


class Merge(unittest.TestCase):
    def test_stale_device_cannot_lower_xp(self):
        phone = {"updatedAt": 100, "xp": 50}
        desktop_offline = {"updatedAt": 120, "xp": 0, "lessons": {"a": {"status": "in-progress", "updatedAt": 120}}}
        self.assertEqual(server.merge(phone, desktop_offline)["xp"], 50)

    def test_reset_wins_over_older_documents(self):
        before = {"updatedAt": 100, "xp": 500}
        reset = {"updatedAt": 200, "resetAt": 200, "xp": 0}
        merged = server.merge(before, reset)
        self.assertEqual(merged["xp"], 0)
        stale = {"updatedAt": 150, "xp": 900}
        self.assertEqual(server.merge(merged, stale)["xp"], 0)

    def test_progress_after_reset_counts(self):
        after = server.merge({"updatedAt": 200, "resetAt": 200, "xp": 0}, {"updatedAt": 300, "resetAt": 200, "xp": 40})
        self.assertEqual(after["xp"], 40)

    def test_items_merge_independently(self):
        a = {"updatedAt": 1, "lessons": {"x": {"status": "complete", "updatedAt": 10}}}
        b = {"updatedAt": 2, "lessons": {"x": {"status": "in-progress", "updatedAt": 5}, "y": {"status": "complete", "updatedAt": 6}}}
        m = server.merge(a, b)["lessons"]
        self.assertEqual(m["x"]["status"], "complete")
        self.assertEqual(m["y"]["status"], "complete")

    def test_poisoned_record_is_dropped(self):
        bad = {"updatedAt": "abc", "xp": True, "lessons": {"y": {"updatedAt": "abc"}, "z": "nope", "ok": {"updatedAt": 3}}}
        clean = server.sanitize(bad)
        self.assertNotIn("updatedAt", clean)
        self.assertNotIn("xp", clean)
        self.assertEqual(list(clean["lessons"]), ["ok"])
        server.merge(clean, server.sanitize({"lessons": {"y": {"updatedAt": 9}}}))  # must not raise


class Allowlist(unittest.TestCase):
    def test_serves_app_files(self):
        for p in ["/", "/index.html", "/assets/css/app.css", "/content/lessons/plc-timers.js", "/content/lessons/plc-timers.js?x=1"]:
            self.assertIsNotNone(server.public_path(p), p)

    def test_blocks_everything_else(self):
        for p in ["/.git/config", "/data/progress.json", "/%64ata/progress.json", "//data/progress.json",
                  "/assets/../data/progress.json", "/assets/%2e%2e/data/progress.json", "/server.py",
                  "/docs/PLAN.md", "/tools/validate.js", "/content/.hidden", "/.gitignore"]:
            self.assertIsNone(server.public_path(p), p)


if __name__ == "__main__":
    unittest.main(verbosity=1)
