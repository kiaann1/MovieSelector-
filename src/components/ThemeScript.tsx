import { DEFAULT_THEME, THEME_IDS, THEME_STORAGE_KEY } from "@/lib/themes";

/** Inline boot script — applies saved theme before paint to avoid flash. */
export function ThemeScript() {
  const ids = JSON.stringify(THEME_IDS);
  const script = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var ids=${ids};var t=localStorage.getItem(k);if(!t||ids.indexOf(t)<0)t=${JSON.stringify(DEFAULT_THEME)};document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme',${JSON.stringify(DEFAULT_THEME)});}})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
