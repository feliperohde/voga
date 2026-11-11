// The theme toggle, the menus (the phone's and the download choices), and the download links, which
// point at the latest release's files on GitHub: [data-download="windows|mac|deb|appimage"] at that
// system's file. Without JavaScript (or when GitHub doesn't answer) they open the releases page.

const REPO = 'feliperohde/voga';
const THEME_KEY = 'voga-site-theme';
const SYSTEMS = 'Windows, Mac e Linux';

// Each download's file in the release
const DOWNLOADS = {
	windows: /-setup\.exe$/,
	mac: /aarch64\.dmg$/,
	deb: /\.deb$/,
	appimage: /\.AppImage$/,
};

const root = document.documentElement;
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
const currentTheme = () => root.dataset.theme ?? (systemDark.matches ? 'dark' : 'light');

const toggle = document.querySelector('[data-theme-toggle]');
function labelToggle() {
	toggle.setAttribute('aria-label', currentTheme() === 'dark' ? 'Usar o tema claro' : 'Usar o tema escuro');
}
toggle.addEventListener('click', () => {
	const next = currentTheme() === 'dark' ? 'light' : 'dark';
	root.dataset.theme = next;
	try {
		localStorage.setItem(THEME_KEY, next);
	} catch {
		// Private windows can refuse storage: the theme still changes for this visit
	}
	labelToggle();
});
systemDark.addEventListener('change', labelToggle);
labelToggle();

// A menu closes after a choice (a section or a download), on Escape, and on a click elsewhere
const menus = document.querySelectorAll('details.menu, details.download-menu');
for (const menu of menus) {
	menu.addEventListener('click', (event) => {
		if (event.target.closest('a')) menu.open = false;
	});
}
document.addEventListener('keydown', (event) => {
	if (event.key !== 'Escape') return;
	for (const menu of menus) {
		if (!menu.open) continue;
		menu.open = false;
		menu.querySelector('summary').focus();
	}
});
document.addEventListener('click', (event) => {
	for (const menu of menus) if (menu.open && !menu.contains(event.target)) menu.open = false;
});

const meta = document.querySelector('[data-release-meta]');
const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
const sizeFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

async function findLatestRelease() {
	meta.textContent = `Procurando a versão mais recente… · ${SYSTEMS}`;
	try {
		const response = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' } });
		if (response.status === 404) {
			meta.textContent = `A primeira versão ainda não foi publicada. Os links abrem a página de versões no GitHub. · ${SYSTEMS}`;
			return;
		}
		if (!response.ok) throw new Error(`GitHub: ${response.status}`);
		const release = await response.json();
		// A file missing from the release keeps its links on the releases page
		for (const [name, file] of Object.entries(DOWNLOADS)) {
			const asset = release.assets.find(({ name: fileName }) => file.test(fileName));
			if (!asset) continue;
			for (const link of document.querySelectorAll(`[data-download="${name}"]`)) {
				link.href = asset.browser_download_url;
				// The menus' choices say their size after what they need
				link.querySelector('span')?.append(` · ${sizeFormat.format(asset.size / 1e6)} MB`);
			}
		}
		const version = release.tag_name.replace(/^v/, '');
		const date = dateFormat.format(new Date(release.published_at));
		meta.textContent = `Versão ${version}, de ${date} · ${SYSTEMS}`;
	} catch {
		meta.textContent = `Não consegui consultar a versão mais recente agora. Os links abrem a página de versões no GitHub. · ${SYSTEMS}`;
	}
}

findLatestRelease();
