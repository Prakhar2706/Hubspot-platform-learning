"""Exercise the built site in an isolated local browser. No third-party requests."""
import argparse
import json
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright, expect


ROOT = Path(__file__).resolve().parents[1]
RESULTS = ROOT / "test-results"


def run(browser_type, url):
    RESULTS.mkdir(exist_ok=True)
    browser = browser_type.launch(headless=True)
    context = browser.new_context(viewport={"width": 1440, "height": 1000}, reduced_motion="reduce", accept_downloads=True)
    page = context.new_page()
    errors = []
    outside = []
    origin = urlsplit(url)[:2]
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("request", lambda request: outside.append(request.url) if urlsplit(request.url)[:2] != origin and urlsplit(request.url).scheme not in {"data", "blob"} else None)
    page.goto(url)
    expect(page.locator("#main")).to_have_attribute("aria-busy", "false")
    expect(page.locator("h1")).to_contain_text("A little learning")
    data = page.locator("#course-data").text_content()
    course = json.loads(data)
    page.screenshot(path=str(RESULTS / f"home-{browser_type.name}.png"), full_page=True)

    def go(route):
        page.goto(url + "#/" + route)
        expect(page.locator("#main")).to_have_attribute("aria-busy", "false")
        page.wait_for_timeout(35)

    go("lesson/first-contact")
    page.locator(".skip-link").focus()
    page.keyboard.press("Enter")
    expect(page).to_have_url(url + "#/lesson/first-contact")
    expect(page.locator("#main")).to_be_focused()
    page.locator('[data-action="scroll"][data-value="practice"]').click()
    expect(page.locator("#practice")).to_be_focused()
    expect(page.locator("#practice")).to_be_in_viewport()

    go("path")
    expect(page.locator(".module-card")).to_have_count(16)
    expect(page.locator(".lesson-link")).to_have_count(48)
    page.get_by_role("button", name="Advanced", exact=True).click()
    expect(page.locator(".module-card")).to_have_count(4)
    page.get_by_role("button", name="All 16 modules", exact=True).click()
    expect(page.locator(".module-card")).to_have_count(16)

    for lesson in course["lessons"]:
        go("lesson/" + lesson["id"])
        expect(page.locator("h1")).to_have_text(lesson["title"])
        expect(page.locator(".quiz-card")).to_have_count(2)
        expect(page.locator("#sources a")).to_have_count(len(lesson["sources"]))

    go("lesson/what-is-crm")
    page.locator('[data-action="grade"]').click()
    expect(page.locator("#toast")).to_contain_text("Choose an answer")
    for index, question in enumerate(course["lessons"][0]["quiz"]):
        page.locator(f'input[name="question-{index}"][value="{question["answer"]}"]').check()
    page.locator('[data-action="grade"]').click()
    expect(page.locator("#quiz-summary")).to_contain_text("2 of 2")
    page.locator('[data-action="retry"]').click()
    expect(page.locator('input[type="radio"]:checked')).to_have_count(0)
    page.locator("#lesson-notes").fill('<img src=x onerror="window.injected=true"> My own note')
    page.locator('[data-action="bookmark"]').click()
    page.locator('[data-action="complete"]').click()
    page.wait_for_timeout(250)
    page.reload()
    expect(page.locator("#main")).to_have_attribute("aria-busy", "false")
    expect(page.locator('[data-action="complete"]')).to_contain_text("not finished")
    expect(page.locator("#lesson-notes")).to_contain_text("My own note")
    assert page.evaluate("window.injected === undefined")
    page.locator('[data-action="diagram-next"]').click()
    expect(page.locator('.flow-node.active')).to_have_attribute('data-index', '1')

    go("lab/contact")
    page.locator("#lab-email").fill("real@not-an-example.com")
    page.locator('[data-action="lab-contact"]').click()
    expect(page.locator("#lab-feedback")).to_contain_text(".example")
    page.locator("#lab-email").fill("maya@cedar.example")
    page.locator('[data-action="lab-contact"]').click()
    expect(page.locator("#lab-feedback")).to_contain_text("No HubSpot record")

    go("lab/import")
    page.locator('[data-action="lab-import"]').click()
    expect(page.locator("#lab-feedback")).to_contain_text("belongs in")
    for column, prop in {"given": "firstname", "family": "lastname", "email": "email", "city": "city"}.items():
        page.locator(f"#map-{column}").select_option(prop)
    page.locator('[data-action="lab-import"]').click()
    expect(page.locator("#lab-feedback")).to_contain_text("All four columns")

    go("lab/segments")
    expect(page.locator("#segment-results .matched")).to_have_count(4)
    page.locator("#lab-operator").select_option("AND")
    expect(page.locator("#segment-results .matched")).to_have_count(2)
    page.locator('[data-lab-field="subscribedOnly"]').check()
    expect(page.locator("#segment-results .matched")).to_have_count(1)
    page.locator('[data-action="lab-segments"]').click()
    expect(page.locator("#lab-feedback")).to_contain_text("Maya is the only match")
    page.locator('[data-action="lab-snapshot"]').click()
    page.locator("#segment-interest").select_option("Writing")
    expect(page.locator("#segment-results .matched")).to_have_count(1)
    expect(page.locator("#segment-results .matched")).to_contain_text("Maya")
    page.locator("#segment-mode").select_option("active")
    expect(page.locator("#segment-results .matched")).to_have_count(0)

    go("lab/email")
    page.locator('[data-action="lab-missing-name"]').click()
    expect(page.locator("#email-preview")).to_contain_text("Hello there,")
    page.locator("#lab-message").fill('<img src="https://example.org/tracker"> This is plain text.')
    expect(page.locator("#email-preview img")).to_have_count(0)
    for checkbox in page.locator('[data-email-check]').all():
        checkbox.check()
    page.locator('[data-action="lab-email"]').click()
    expect(page.locator("#lab-feedback")).to_contain_text("Nothing was sent")

    go("lab/workflow")
    for sample in ["maya", "noah", "leo"]:
        page.locator("#workflow-sample").select_option(sample)
        page.locator('[data-action="lab-workflow"]').click()
    expect(page.locator("#lab-feedback")).to_contain_text("more than the happy path")
    expect(page.locator("#workflow-results")).to_contain_text("No actions run")

    go("lab/pipeline")
    page.locator("#deal-cedar").select_option("Closed won")
    expect(page.locator("#pipeline-view")).to_contain_text("2,400")
    page.locator('#pipeline-answer input[value="won-not-cash"]').check()
    page.locator('[data-action="lab-pipeline"]').click()
    expect(page.locator("#lab-feedback")).to_contain_text("not proof of collected cash")
    page.locator('[data-action="lab-reset"]').click()
    page.get_by_role("button", name="Keep my work").click()
    expect(page.locator("#deal-cedar")).to_have_value("Closed won")

    go("glossary")
    page.locator("#glossary-search").fill("re-enrollment")
    expect(page.locator(".glossary-card")).to_have_count(1)
    page.locator("#glossary-search").fill("zzznomatch")
    expect(page.locator(".empty-state")).to_be_visible()
    page.locator("#search-open").click()
    page.locator("#lesson-search").fill("first contact")
    assert page.locator(".search-result").count() > 0
    page.keyboard.press("Escape")

    go("study")
    expect(page.locator(".study-day")).to_have_count(30)
    go("resources")
    with page.expect_download() as csv_info:
        page.locator('[data-action="download-contacts"]').click()
    csv = Path(csv_info.value.path()).read_text()
    assert csv.count(".example") == 6

    go("progress")
    expect(page.locator(".print-record")).to_contain_text("6/6 practice labs")
    assert page.evaluate("window.injected === undefined")
    expect(page.locator(".note-entry img")).to_have_count(0)
    with page.expect_download() as download_info:
        page.locator('[data-action="export"]').click()
    exported = json.loads(Path(download_info.value.path()).read_text())
    assert exported["completed"] == ["what-is-crm"]
    assert len(exported["labs"]) == 6
    assert exported["quizzes"]["what-is-crm"]["score"] == 2
    page.locator("#progress-file").set_input_files({"name": "broken.json", "mimeType": "application/json", "buffer": b'{"version":9}'})
    expect(page.locator("#toast")).to_contain_text("not a supported")
    expect(page.locator(".progress-card")).to_contain_text("1 of 48")
    page.locator('[data-action="reset"]').click()
    page.locator('[data-action="confirm-reset"]').click()
    expect(page.locator(".progress-card")).to_contain_text("0 of 48")
    page.locator("#progress-file").set_input_files({"name": "backup.json", "mimeType": "application/json", "buffer": json.dumps(exported).encode()})
    expect(page.locator("#dialog")).to_be_visible()
    page.locator('[data-action="confirm-import"]').click()
    expect(page.locator(".progress-card")).to_contain_text("1 of 48")
    page.wait_for_timeout(250)
    page.reload()
    expect(page.locator("#main")).to_have_attribute("aria-busy", "false")
    expect(page.locator(".progress-card")).to_contain_text("1 of 48")
    expect(page.locator(".print-record")).to_contain_text("6/6 practice labs")

    page.locator("#settings-open").click()
    page.locator("#theme-setting").select_option("dark")
    page.locator("#motion-setting").select_option("off")
    page.keyboard.press("Escape")
    expect(page.locator("html")).to_have_attribute("data-theme", "dark")
    expect(page.locator("html")).to_have_attribute("data-motion", "off")
    page.wait_for_timeout(250)
    page.reload()
    expect(page.locator("#main")).to_have_attribute("aria-busy", "false")
    expect(page.locator("html")).to_have_attribute("data-theme", "dark")
    expect(page.locator("html")).to_have_attribute("data-motion", "off")
    go("home")
    page.screenshot(path=str(RESULTS / f"dark-{browser_type.name}.png"), full_page=True)

    for width in [360, 390, 768, 1024, 1440]:
        page.set_viewport_size({"width": width, "height": 900})
        for route in ["home", "path", "lesson/first-form", "lab/contact", "lab/import", "lab/segments", "lab/email", "lab/workflow", "lab/pipeline", "progress", "resources", "study", "about"]:
            go(route)
            assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), f"Horizontal page overflow: {width} {route}"
    page.set_viewport_size({"width": 360, "height": 800})
    go("home")
    assert page.locator("#sidebar").evaluate("element => element.inert")
    page.locator(".skip-link").focus()
    # macOS WebKit uses Option+Tab when full keyboard access is disabled.
    page.keyboard.press("Alt+Tab" if browser_type.name == "webkit" else "Tab")
    expect(page.locator("#menu-toggle")).to_be_focused()
    page.locator("#menu-toggle").click()
    expect(page.locator("#menu-toggle")).to_have_attribute("aria-expanded", "true")
    assert not page.locator("#sidebar").evaluate("element => element.inert")
    page.keyboard.press("Escape")
    expect(page.locator("#menu-toggle")).to_have_attribute("aria-expanded", "false")
    expect(page.locator("#menu-toggle")).to_be_focused()
    page.locator("#settings-open").focus()
    page.keyboard.press("Enter")
    assert page.locator("#dialog").evaluate("element => element.scrollWidth <= element.clientWidth + 1")
    page.keyboard.press("Escape")
    expect(page.locator("#settings-open")).to_be_focused()
    page.screenshot(path=str(RESULTS / f"mobile-{browser_type.name}.png"), full_page=True)
    go("lesson/not-a-lesson")
    expect(page.locator("h1")).to_contain_text("wrong turn")
    assert not errors, errors
    assert not outside, outside
    context.close()

    blocked = browser.new_context(viewport={"width": 1280, "height": 900})
    blocked.add_init_script("Object.defineProperty(window, 'indexedDB', {get(){throw new Error('blocked for test')}})")
    unavailable = blocked.new_page()
    unavailable.goto(url + "#/lesson/what-is-crm")
    expect(unavailable.locator("#main")).to_have_attribute("aria-busy", "false")
    expect(unavailable.locator("#storage-warning")).to_be_visible()
    expect(unavailable.locator("h1")).to_have_text("What is a CRM, really?")
    unavailable.locator('[data-action="complete"]').click()
    go_url = url + "#/progress"
    unavailable.goto(go_url)
    expect(unavailable.locator(".progress-card")).to_contain_text("1 of 48")
    blocked.close()

    local = browser.new_context()
    local_page = local.new_page()
    local_page.goto((ROOT / "site/index.html").as_uri() + "#/lesson/what-is-crm")
    expect(local_page.locator("#main")).to_have_attribute("aria-busy", "false")
    expect(local_page.locator("h1")).to_have_text("What is a CRM, really?")
    local.close()
    browser.close()
    print(f"PASS {browser_type.name}: 48 lesson routes, six labs, quizzes, storage, export/import, 5 viewport widths, no runtime external requests")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://127.0.0.1:4173/Hubspot-platform-learning/")
    parser.add_argument("--browser", choices=["chromium", "webkit", "firefox", "all"], default="chromium")
    args = parser.parse_args()
    with sync_playwright() as playwright:
        names = ["chromium", "webkit", "firefox"] if args.browser == "all" else [args.browser]
        for name in names:
            run(getattr(playwright, name), args.url)