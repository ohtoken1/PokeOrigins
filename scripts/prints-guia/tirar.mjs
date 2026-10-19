// Tira as prints do Guia do jogo com o Edge sem janela (Chrome DevTools Protocol), com o `npm run dev` ligado.
// Uso: node scripts/prints-guia/tirar.mjs <token de uma conta de teste ADMIN> scripts/prints-guia/cenas.mjs client/public/guia [cena1,cena2]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const [token, arqCenas, saida] = process.argv.slice(2);
const { CENAS, PREPARO } = await import('file:///' + arqCenas.split(String.fromCharCode(92)).join('/'));
const PORTA = 9333;
const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', `--remote-debugging-port=${PORTA}`, '--window-size=1280,860', '--force-device-scale-factor=1', '--mute-audio', `--user-data-dir=${process.env.TEMP ?? '.'}/pokeorigins-prints-edge`, 'about:blank'], { stdio: 'ignore' });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
let alvos;
for (let i = 0; i < 50; i++) { try { alvos = await (await fetch(`http://127.0.0.1:${PORTA}/json/list`)).json(); break; } catch { await espera(200); } }
const pagina = alvos.find((a) => a.type === 'page');
const ws = new WebSocket(pagina.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const js = async (expr) => { const r = await cdp('Runtime.evaluate', { expression: `(async () => { ${expr} })()`, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails)); return r.result?.result?.value; };
await cdp('Page.enable'); await cdp('Runtime.enable');
await cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 860, deviceScaleFactor: 1, mobile: false });
await cdp('Page.navigate', { url: 'http://localhost:5173/' }); await espera(1500);
await js(`sessionStorage.setItem('jogo-claude:sessao', ${JSON.stringify(token)}); localStorage.setItem('jogo-claude:sons', JSON.stringify({ mudo: true })); return 1`);
await cdp('Page.navigate', { url: 'http://localhost:5173/' }); await espera(5000);
if (PREPARO) await js(PREPARO);
const so = process.argv[5];
for (const c of CENAS) {
  if (so && !so.split(',').includes(c.nome)) continue;
  try {
    await js(`document.querySelectorAll('.janela-fundo').forEach((x) => x.querySelector('.fechar')?.click()); document.querySelectorAll('.janela-fundo, .cura-fundo').forEach((x) => x.remove()); return 1`);
    await js(c.abrir);
    await espera(c.espera ?? 1500);
    const ret = await js(`const e = ${c.alvo ? `document.querySelector(${JSON.stringify(c.alvo)})` : 'null'}; if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }`);
    const clip = ret ? { x: Math.max(0, ret.x), y: Math.max(0, ret.y), width: Math.min(ret.w, 1280), height: Math.min(ret.h, 860), scale: 1 } : { x: 0, y: 0, width: 1280, height: 860, scale: 1 };
    const shot = await cdp('Page.captureScreenshot', { format: 'webp', quality: 82, clip });
    fs.writeFileSync(`${saida}/${c.nome}.webp`, Buffer.from(shot.result.data, 'base64'));
    console.log('ok', c.nome, Math.round(clip.width), 'x', Math.round(clip.height), ret ? '' : '(tela inteira)');
  } catch (e) { console.log('ERRO', c.nome, String(e).slice(0, 300)); }
}
ws.close(); edge.kill();
