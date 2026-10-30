# Voga site

The public home of Voga, published as the GitHub repository `feliperohde/voga`: the site in `site/` (GitHub Pages, https://feliperohde.github.io/voga/) and the app's versions in its Releases. The app's source code is **not** here and must never be: it lives in the app repo (`../voga`), public at https://github.com/feliperohde/voga-app under the GPL-3.0. This repo has to stay public, because the app's updater reads `https://github.com/feliperohde/voga/releases/latest/download/latest.json` and people download the `.dmg` from the same releases.

`design.md` is the design system (tokens, type, layout). Read it before changing styles.

## Stack

- Plain static files, no build: `site/index.html`, `site/styles.css`, `site/main.js`. One page, in Brazilian Portuguese.
- Fonts are served by the site (`site/fonts/`, Source Serif 4, Source Sans 3 and Source Code Pro, latin subset, OFL): no Google Fonts and no analytics, so the only third party a visitor's browser talks to is GitHub's API.
- `.github/workflows/pages.yml` publishes `site/` on every push to `main` that touches it. In the repository settings, Pages › Source must be "GitHub Actions".

## Commands

- Preview: `python3 -m http.server -d site 8080`, then http://localhost:8080.
- Screenshots of the app: in the app repo `cd frontend && pnpm build:mock`, then here `node scripts/screenshots.mjs ../voga/frontend/out-mock [claims map live home compare]`. It serves the demo itself, in Portuguese, in both themes, and writes `site/screenshots/{name}-{light|dark}.webp` (1440×900 at 2x). Before each view it sets what is open in the app (`voga.context` in localStorage): the demo's politics investigation (`inv-demo`) for claims, map and live, nothing for Home, and `inv-demo` with the mayor's `inv-prefeita` for the comparison. The Map's layout differs on every load: the script finds the biggest company on the canvas, opens its panel and asks for its public data. The live view starts a session and waits for the demo's scripted debate.
- Release: see below.

## Publishing a version

In the app repo, bump the version and write its `RELEASE_NOTES.md` entry (the app's CLAUDE.md says how), then `cd frontend && pnpm tauri:build` (the standard build, named Voga, signs the updater files with `~/.voga/updater.key`). Then, here:

```bash
node scripts/release.mjs ../voga --dry-run   # checks the files, prints the gh command
node scripts/release.mjs ../voga             # creates the release (needs gh auth login)
```

It uploads `target/release/bundle/dmg/Voga_<version>_aarch64.dmg`, `bundle/macos/Voga.app.tar.gz` + `.sig` and the `latest.json` made by the app's `scripts/generate-update-manifest-github.js`, with the version's release notes as the body. It refuses when the `.app` in `bundle/macos` is another version (the `bundle/dmg` folder keeps old builds) and when the tag is already released: a published version is never replaced, people and the updater already point at it.

The site needs no change for a new version: `main.js` asks GitHub's API for the latest release and points every `[data-download]` link at its `aarch64` `.dmg`, with the version, date and size under the hero buttons. Without JavaScript, with no release yet (404) or when the API refuses (60 requests an hour per visitor's IP), the links keep their `href`, the releases page, and the line under the buttons says so.

## Content rules

- Brazilian Portuguese, for people who follow politics, not developers. Say what the app does with the app's own names for things (Início, Visão geral, Promessas, Mapa, Ao vivo, Fontes, Perguntar, Jornal, Comparação, Acompanhamentos).
- No em dash. None of: poderoso, revolucionário, inteligente, fácil, simples, incrível, or their English equivalents. No marketing numbers, no testimonials. Buttons name the action ("Baixar para Mac", "Ver como instalar").
- Voga never presents a finding as fact: write "possível contradição", "sugestão", "você confirma". It is the app's core rule.
- Never write that data never leaves the computer. The "Seus dados" table lists every place something goes, from the app's code: the sources' sites and services (with IBGE, to find a mayor's city, and the transparency portals of São Paulo, Minas Gerais, Espírito Santo and Bahia), the news sites (their pictures), Bing News and YouTube (the followed names), minhareceita.org (CNPJs), the CGU and the State of São Paulo (sanctions lists), Hugging Face and GitHub (model and yt-dlp downloads), GitHub (update check), and only if set up, the connected AI provider and Brave Search or SearXNG. Update the table when the app starts talking to something new: `grep -rhoE 'https?://[A-Za-z0-9.-]+' frontend/src-tauri/src` in the app repo lists the hosts.
- Screenshots come only from the app's demo (`pnpm build:mock`), whose people, parties, companies and outlets are fictional. Never show a real politician. The example in the hero uses the demo's Marina Exemplo and is labeled as an example.
- The trial features (from the app's `entitlement::FEATURE_IDS`, flowsint left out): Perguntar, Mapa, Ao vivo, Fontes oficiais, Descoberta automática.
- The app's code is linked at https://github.com/feliperohde/voga-app: in the FAQ ("O código do Voga é aberto?"), under "Seus dados" (so anyone can check the table) and in the footer.
- Contact is only through the repository's GitHub issues (no email on the site for now), including requests for a license key. The app is signed and notarized by Apple, so the install steps have no Gatekeeper workaround: only macOS's "app downloaded from the internet" prompt on the first open.

## Still pending

- If the site moves to its own domain: `canonical`, the `og:` URLs and the JSON-LD in `index.html`, and the install link in `scripts/release.mjs`.
