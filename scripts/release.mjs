// Publishes a built Voga version as a GitHub release of feliperohde/voga: the installers people download
// from the site (Mac .dmg, Windows setup .exe, Linux .deb and AppImage), and the updater's files
// (Voga.app.tar.gz, the .exe and the AppImage, their .sig, and latest.json) the app checks.
//
// In the app repo, first: bump the version and write its RELEASE_NOTES.md entry, then
// `cd frontend && pnpm tauri:build` (the standard build, named Voga) for the Mac, and push the tag
// (git tag v<version> && git push origin v<version>): its GitHub Actions build (.github/workflows/build.yml
// in feliperohde/voga-app) makes the Windows and Linux files, which this downloads. Then, here:
//   node scripts/release.mjs [app repo, default ../voga] [--dry-run]
// --dry-run checks the files and prints the gh command without running it. Needs `gh auth login`.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const REPO = 'feliperohde/voga';
const APP_REPO = 'feliperohde/voga-app';
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const app = resolve(args.find((arg) => !arg.startsWith('--')) ?? '../voga');

const fail = (message) => {
	console.error(`✗ ${message}`);
	process.exit(1);
};

const conf = join(app, 'frontend/src-tauri/tauri.conf.json');
if (!existsSync(conf)) fail(`not the Voga app repo: ${conf} is missing`);
const { version } = JSON.parse(readFileSync(conf, 'utf8'));
const tag = `v${version}`;

const bundle = join(app, 'target/release/bundle');
const dmg = join(bundle, 'dmg', `Voga_${version}_aarch64.dmg`);
const updater = join(bundle, 'macos/Voga.app.tar.gz');
if (!existsSync(dmg)) {
	const found = existsSync(join(bundle, 'dmg')) ? readdirSync(join(bundle, 'dmg')).filter((name) => name.endsWith('.dmg')) : [];
	fail(`${dmg} is missing (found: ${found.join(', ') || 'no .dmg'}). Build ${version} with pnpm tauri:build`);
}
if (!existsSync(updater) || !existsSync(`${updater}.sig`)) fail(`${updater} and its .sig are missing: the build signs them with ~/.voga/updater.key`);
// The updater's archive is packed from this .app: it must be the version being released
const plist = join(bundle, 'macos/Voga.app/Contents/Info.plist');
const built = existsSync(plist) ? execFileSync('plutil', ['-extract', 'CFBundleShortVersionString', 'raw', plist], { encoding: 'utf8' }).trim() : 'unknown';
if (built !== version) fail(`the app in ${join(bundle, 'macos')} is version ${built}, not ${version}: build again`);

// The version's entry in RELEASE_NOTES.md ("## [x.y.z] - date" up to the next "## [")
const lines = readFileSync(join(app, 'RELEASE_NOTES.md'), 'utf8').split('\n');
const start = lines.findIndex((line) => line.startsWith(`## [${version}]`));
if (start === -1) fail(`RELEASE_NOTES.md has no "## [${version}]" entry`);
const end = lines.findIndex((line, i) => i > start && line.startsWith('## ['));
const notes = lines.slice(start + 1, end === -1 ? undefined : end).join('\n').trim();

const work = mkdtempSync(join(tmpdir(), 'voga-release-'));
const notesFile = join(work, 'notes.md');
writeFileSync(notesFile, `${notes}\n\n---\nPara Mac com Apple Silicon (.dmg), Windows 10 e 11 de 64 bits (Voga_${version}_x64-setup.exe) e Linux de 64 bits (.deb para Ubuntu, Debian e Mint; AppImage para as outras distribuições). Como instalar: https://feliperohde.github.io/voga/#instalar\n`);

// Windows and Linux: the files of the tag's last successful build in the app repo's GitHub Actions
const runs = JSON.parse(execFileSync('gh', ['run', 'list', '--repo', APP_REPO, '--workflow', 'build.yml', '--branch', tag, '--status', 'success', '--limit', '1', '--json', 'databaseId'], { encoding: 'utf8' }));
if (!runs.length) fail(`no successful build of ${tag} in ${APP_REPO}'s Actions: push the tag there (git push origin ${tag}) and wait for it`);
const ci = join(work, 'ci');
execFileSync('gh', ['run', 'download', String(runs[0].databaseId), '--repo', APP_REPO, '--dir', ci], { stdio: 'inherit' });
const exe = join(ci, 'voga-Windows/nsis', `Voga_${version}_x64-setup.exe`);
const deb = join(ci, 'voga-Linux/deb', `Voga_${version}_amd64.deb`);
const appImage = join(ci, 'voga-Linux/appimage', `Voga_${version}_amd64.AppImage`);
for (const file of [exe, `${exe}.sig`, deb, appImage, `${appImage}.sig`]) if (!existsSync(file)) fail(`${file} is missing from ${APP_REPO}'s build of ${tag}`);

// latest.json, by the app's own script, from one folder with each system's signed updater file.
// Only the setup .exe for Windows: an .msi next to it would be skipped anyway.
const signed = join(work, 'updater');
mkdirSync(signed);
for (const file of [updater, exe, appImage]) for (const name of [file, `${file}.sig`]) copyFileSync(name, join(signed, name.split('/').pop()));
const manifest = join(work, 'latest.json');
execFileSync('node', [join(app, 'scripts/generate-update-manifest-github.js'), version, signed, manifest], { stdio: ['ignore', 'ignore', 'inherit'] });
const { platforms } = JSON.parse(readFileSync(manifest, 'utf8'));
const expected = { 'darwin-aarch64': 'Voga.app.tar.gz', 'windows-x86_64': `Voga_${version}_x64-setup.exe`, 'linux-x86_64': `Voga_${version}_amd64.AppImage` };
for (const [platform, file] of Object.entries(expected)) {
	const target = platforms[platform];
	if (!target?.signature || !target.url.endsWith(`/download/${tag}/${file}`)) fail(`unexpected latest.json: ${JSON.stringify(platforms)}`);
}

const ghArgs = ['release', 'create', tag, '--repo', REPO, '--title', `Voga ${version}`, '--notes-file', notesFile,
	`${dmg}#Voga ${version} para Mac (Apple Silicon)`, updater, `${updater}.sig`,
	`${exe}#Voga ${version} para Windows (instalador)`, `${exe}.sig`,
	`${deb}#Voga ${version} para Linux (.deb)`,
	`${appImage}#Voga ${version} para Linux (AppImage)`, `${appImage}.sig`,
	manifest];

if (dryRun) {
	console.log(`\nWould run:\ngh ${ghArgs.map((arg) => (/\s/.test(arg) ? JSON.stringify(arg) : arg)).join(' ')}\n\nNotes (${notesFile}):\n${notes.slice(0, 400)}…`);
	process.exit(0);
}

// A published version is never replaced: the updater and people's downloads already point at it
try {
	execFileSync('gh', ['release', 'view', tag, '--repo', REPO], { stdio: 'ignore' });
	fail(`${tag} is already released on ${REPO}. Bump the version for a new one`);
} catch (error) {
	if (error.status === undefined) throw error;
}
execFileSync('gh', ghArgs, { stdio: 'inherit' });
console.log(`✓ https://github.com/${REPO}/releases/tag/${tag}`);
