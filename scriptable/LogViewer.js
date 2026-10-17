// Log Viewer for Scriptable (iOS). Opens a shared log file straight in the DarkHorse viewer.
// Use: share a .csv from Telegram / WhatsApp / Mail / Files -> "Run Script" (Scriptable) -> LogViewer
// or call it from a Shortcut with the "Run Script" action and the shortcut input as parameter.
const VIEWER = 'https://darkhorse-alex.github.io/logs/';

const local = FileManager.local();
const cloud = (() => { try { return FileManager.iCloud(); } catch (e) { return null; } })();

async function readPath(p) {
  for (const fm of [local, cloud]) {
    if (!fm) continue;
    try {
      if (!fm.fileExists(p)) continue;
      if (fm.isFileStoredIniCloud && fm.isFileStoredIniCloud(p) && !fm.isFileDownloaded(p)) await fm.downloadFileFromiCloud(p);
      const t = fm.readString(p);
      if (t != null) return t;
      const d = fm.read(p);
      if (d) return d.toRawString();
    } catch (e) {}
  }
  return null;
}

let text = null, name = 'log.csv';
const paths = (args.fileURLs && args.fileURLs.length) ? args.fileURLs : [];
if (paths.length) {
  const p = decodeURIComponent(String(paths[0]).replace(/^file:\/\//, ''));
  name = p.split('/').pop();
  text = await readPath(p);
} else if (args.shortcutParameter != null) {
  const v = args.shortcutParameter;
  const s = typeof v === 'string' ? v : (Array.isArray(v) ? String(v[0]) : String(v));
  const p = s.replace(/^file:\/\//, '');
  if (p.startsWith('/')) { name = p.split('/').pop(); text = await readPath(decodeURIComponent(p)); }
  if (text == null) text = s;
} else if (args.plainTexts && args.plainTexts.length) {
  text = args.plainTexts[0];
}

// viewer page: fresh from the site, cached copy when offline
const cache = local.joinPath(local.documentsDirectory(), 'logviewer.html');
let html = null;
try { const r = new Request(VIEWER + 'index.html?t=' + Date.now()); r.timeoutInterval = 8; html = await r.loadString(); if (html && html.includes('openLogText')) local.writeString(cache, html); else html = null; } catch (e) {}
if (!html && local.fileExists(cache)) html = local.readString(cache);
if (!html) { const a = new Alert(); a.title = 'Viewer not available'; a.message = 'No internet and no cached copy yet. Run once while online.'; a.addAction('OK'); await a.present(); Script.complete(); return; }

const wv = new WebView();
await wv.loadHTML(html, VIEWER);
if (text) {
  await wv.evaluateJavaScript(`window.openLogText(${JSON.stringify(text)}, ${JSON.stringify(name)}); 0`);
}
await wv.present(true);
Script.complete();
