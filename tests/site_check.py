"""Check the generated static artifact with the standard-library HTML parser."""
import json
import re
import unittest
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class PageInventory(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.elements = []
        self.scripts = []
        self.script = None
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        self.elements.append((tag, attributes))
        if tag == "script":
            self.script = {"attributes": attributes, "text": ""}
            self.scripts.append(self.script)

    def handle_data(self, data):
        if self.script is not None:
            self.script["text"] += data

    def handle_endtag(self, tag):
        if tag == "script":
            self.script = None


class StaticWebsiteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.text = (ROOT / "site/index.html").read_text()
        cls.page = PageInventory(cls.text)

    def test_generated_copies_and_pages_marker(self):
        self.assertEqual(self.text, (ROOT / "index.html").read_text())
        self.assertTrue((ROOT / ".nojekyll").is_file())
        self.assertTrue((ROOT / "site/.nojekyll").is_file())
        self.assertNotRegex(self.text, r"\{\{(?:METADATA|DATA|STYLES|CORE|APP)\}\}")

    def test_shell_has_named_landmarks_and_unique_ids(self):
        ids = [attrs["id"] for _, attrs in self.page.elements if "id" in attrs]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(sum(tag == "main" for tag, _ in self.page.elements), 1)
        self.assertIn(("html", {"lang": "en", "data-theme": "system"}), self.page.elements)
        self.assertTrue(any(tag == "dialog" and attrs.get("aria-labelledby") == "dialog-title" for tag, attrs in self.page.elements))

    def test_complete_course_and_provenance_are_embedded(self):
        payloads = {item["attributes"].get("id"): json.loads(item["text"]) for item in self.page.scripts if item["attributes"].get("type") == "application/json"}
        course = payloads["course-data"]
        self.assertEqual(len(course["lessons"]), 48)
        self.assertEqual(len(course["modules"]), 16)
        self.assertEqual(len(course["sources"]), 40)
        self.assertTrue(payloads["snowflake-report-metadata"]["dataSources"])

    def test_no_remote_assets_or_inline_event_handlers(self):
        for tag, attrs in self.page.elements:
            self.assertFalse(any(name.startswith("on") for name in attrs), (tag, attrs))
            self.assertFalse(any((value or "").strip().lower().startswith("javascript:") for value in attrs.values()), (tag, attrs))
            if tag in {"script", "iframe", "img", "audio", "video", "source", "object", "embed"}:
                for attribute in {"src", "srcset", "data", "poster"} & attrs.keys():
                    self.assertTrue((attrs[attribute] or "").startswith("data:"), (tag, attrs))
            if tag == "link":
                self.assertEqual(attrs.get("rel"), "icon")
                self.assertTrue(attrs.get("href", "").startswith("data:"))

    def test_network_and_embedded_frames_are_blocked(self):
        policy = next(attrs["content"] for tag, attrs in self.page.elements if tag == "meta" and attrs.get("http-equiv") == "Content-Security-Policy")
        for directive in ["default-src 'none'", "connect-src 'none'", "frame-src 'none'", "object-src 'none'", "form-action 'none'"]:
            self.assertIn(directive, policy)

    def test_published_code_contains_no_machine_details_or_keys(self):
        for marker in ["/Users/", "BEGIN OPENSSH PRIVATE KEY", "BEGIN RSA PRIVATE KEY", "SNOWHOUSE_", "@snowflake.com"]:
            self.assertNotIn(marker, self.text)
        executable = "\n".join(item["text"] for item in self.page.scripts if item["attributes"].get("type") != "application/json")
        for pattern in [r"\beval\s*\(", r"new\s+Function\s*\(", r"\bfetch\s*\(", r"\bXMLHttpRequest\b", r"\bWebSocket\b", r"\bsendBeacon\b", r"\bAudioContext\b"]:
            self.assertIsNone(re.search(pattern, executable), pattern)


if __name__ == "__main__":
    unittest.main(verbosity=2)