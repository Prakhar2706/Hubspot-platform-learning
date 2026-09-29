# HubSpot Learning Lab

A friendly, independent HubSpot learning website for people starting from zero. Learn in plain English, try an idea safely, and build up to more advanced work.

**No login. No paid backend. No Snowflake hosting. No sound effects.**

Repository: [Prakhar2706/Hubspot-platform-learning](https://github.com/Prakhar2706/Hubspot-platform-learning)

After GitHub Pages is enabled, the website address is:

**https://prakhar2706.github.io/Hubspot-platform-learning/**

## Start learning

1. Open the website and choose **Start my first lesson**.
2. Read the explanation and the fictional BrightPath Workshops example.
3. Follow **Try it, step by step**. Real-account work is optional and must stay within your permissions and subscription.
4. Answer the two questions. Read the explanations and retry whenever you want.
5. Mark the lesson complete when you feel ready, then open the next lesson.

Use **30-day plan** for a suggested routine. Take longer whenever you need. Use **Simple glossary** when a word is new.

## What is included

- 16 ordered modules and 48 complete lessons, with marketing-first examples.
- 96 original questions with explained answers and retry support.
- Six interactive practice labs: contact records, import mapping, audiences, email personalization, workflows, and deal pipelines.
- 72 plain-English glossary entries, official references, and a 30-day plan.
- An end-to-end fictional project, checklist, and example solution.
- Original illustrations, interactive flow diagrams, and gentle animations.
- Saved notes, bookmarks, lesson completion, quiz results, and practice drafts.
- Light/dark appearance, device reduced-motion support, and a motion-off setting.
- Downloadable fictional contacts, a project checklist, progress backups, and a printable learning record.

The path covers CRM foundations, account safety, records, clean data, lifecycle stages, segments, forms, landing pages, email, campaigns, workflows, sales, service, reporting, administration, integrations, API concepts, AI, and a final project. Advanced topics introduce safe approaches; this course does not promise expertise or unrestricted product access.

## Publish on GitHub Pages

The generated `index.html` is already included. You do not need to install Node or run a build just to publish this version.

1. Open this repository on GitHub.
2. Go to **Settings > Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select **main** and **/(root)**, then choose **Save**.
5. Wait for the Pages deployment to finish. The Pages screen will show **Visit site**.

For free hosting, use a public repository. GitHub requires repository admin or maintainer access to change the Pages source. An SSH deploy key can upload the files but cannot change that setting through the GitHub API. If the site returns 404, check the Pages source and the **Actions** tab before changing the website code.

Share the site URL or a lesson URL, for example:

```text
https://prakhar2706.github.io/Hubspot-platform-learning/#/lesson/what-is-crm
```

Hash routes work under the repository path without custom server rewrites. A `.nojekyll` file tells Pages to serve the generated files without Jekyll processing. Other static hosts can publish only the contents of `site/`.

See [GitHub's official Pages instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Keep your learning record safe

Progress stays in this browser using IndexedDB. There is no account or cloud sync. Browser profiles, devices, and site paths have separate records. Clearing browser data or using private browsing can remove progress. Prefer one learning tab at a time; simultaneous edits in multiple tabs are not merged.

- **My progress > Export progress** downloads a JSON backup, including your notes and practice inputs.
- **My progress > Import progress** validates a backup and asks before replacing the current record. Import replaces; it does not merge.
- **Reset my learning data** asks for confirmation and only resets this site's learning record.
- If storage is blocked, the site remains usable for the current page session and shows an export warning. Export before reloading or closing it.

Keep backups private. Never commit them to this repository. Do not enter customer information, credentials, or confidential work. Sharing a lesson link does not share notes or progress. GitHub's own hosting privacy practices still apply, and following an official reference opens another website.

## Preview or edit the site

For an immediate offline preview, open `index.html` in a modern browser. For more predictable browser storage, use the local server below. No package installation is needed for the website.

Install [Node.js](https://nodejs.org/) 20 or later; Node 24 LTS is recommended. In this project folder, run:

```sh
npm run build
npm start
```

Open **http://127.0.0.1:4173/**. Press `Ctrl+C` in the terminal to stop the server. The server listens only on your machine and does not rebuild automatically. After edits, run `npm run build` again and refresh the browser.

The equivalent commands, without npm, are:

```sh
node scripts/build.mjs
node scripts/serve.mjs
```

### Where to make changes

| File | Purpose |
| --- | --- |
| `src/content/modules.mjs` | Module order and lesson identifiers |
| `src/content/beginner.mjs` | First 18 lessons |
| `src/content/marketing.mjs` | Forms, email, campaigns, and automation |
| `src/content/sales-service.mjs` | Sales and service lessons |
| `src/content/advanced.mjs` | Reports, administration, advanced topics, and final project |
| `src/content/resources.mjs` | Glossary, study plan, and project checklist |
| `src/content/sources.mjs` | Official source URLs, review methods, and dates |
| `src/core.js` | Pure lab logic and progress-file validation |
| `src/app.js` | Page rendering, interactions, and IndexedDB storage |
| `src/styles.css` | Layout, themes, and motion |
| `src/index.html` | Accessible HTML shell and security policy |

Edit the source, not the generated `index.html` files. The build creates identical copies at `index.html` and `site/index.html`, with all content, artwork, styles, and scripts embedded. After building and testing, commit the source and both generated copies. The GitHub check rejects stale generated output.

### Refresh the learning material

1. Read the relevant official reference and current product catalog.
2. Update the explanation, steps, access caveat, quiz, and lab together if behavior changed.
3. Record what you actually reviewed. Do not change an excerpt-only review to a full-page review without reading the page.
4. Update the review date only after a genuine content review. A successful link check is not proof the teaching is still correct.
5. Build, test, and push the refreshed source and generated site.

## Verification

Dependency-free content and logic tests:

```sh
npm run build
npm test
python3 tests/site_check.py
```

Optional full browser checks use Python and Playwright, as development tools only:

```sh
python3 -m pip install -r tests/requirements.txt
python3 -m playwright install chromium webkit firefox
```

Keep `npm start` running in one terminal. In another terminal, run:

```sh
python3 tests/browser_smoke.py --browser all
```

You can also select `--browser chromium`, `--browser webkit`, or `--browser firefox`. The test visits the repository-style path, tests the lessons and labs, checks backup restore and unavailable storage, verifies keyboard controls, and checks layouts from 360 to 1440 pixels. Screenshots stay in ignored `test-results/`. WebKit on macOS uses Option+Tab when full keyboard access is disabled. Browser binaries can be blocked by operating-system policy; a failed launch is not a completed browser test.

The `.github/workflows/verify.yml` check builds the site, runs the Node tests and Python static checks, and checks for stale generated output. It does not change Pages settings or require a personal token.

## Sources, limits, and independence

Content was reviewed against official HubSpot references on **2026-09-29**. Each lesson links to its sources and discloses whether the review used a full page, relevant sections, or an official search excerpt. All 40 source URLs returned HTTP 200, following redirects, in a separate link-reachability check on that date. This is not a claim that every feature was tested in every HubSpot subscription.

Menus, product names, seats, permissions, packaging, and limits can change. Open the live official guide before making a real account change. Learning here is free; many advanced features inside HubSpot require eligible paid subscriptions.

The lessons, quizzes, examples, and illustrations are original teaching material. Practice screens are simplified simulations, not HubSpot screenshots. They do not connect to HubSpot, send messages, create records, take payments, or activate workflows. Example email addresses use the reserved `.example` domain.

This project is not affiliated with, endorsed by, or certified by HubSpot. Its completion record is **not an official HubSpot certification**. HubSpot is a trademark of its owner. Use the linked HubSpot Academy courses for official learning and certification requirements.