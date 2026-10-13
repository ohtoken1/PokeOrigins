// Lista todos os textos em português que o jogador pode ler (client/src, shared, server/src), para traduzir.
// Uso: node scripts/idiomas-extrair.mjs            → grava shared/data/idiomas/_textos.json e mostra quantos faltam
// Texto fixo vira ele mesmo; texto montado (`Você ganhou ${n} moedas`) vira "Você ganhou {0} moedas".
import fs from 'node:fs';
import path from 'node:path';
import { parseAst } from 'rolldown/parseAst';

const PASTAS = ['client/src', 'shared', 'server/src'];
const FORA = ['node_modules', 'data', 'showdown'];
const arquivos = [];
const andar = (d) => {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) { if (!FORA.includes(f.name)) andar(p); }
    else if (f.name.endsWith('.ts') && !f.name.endsWith('.d.ts')) arquivos.push(p);
  }
};
PASTAS.forEach(andar);

/** propriedades cujo valor nunca é texto para o jogador */
const PROP_TECNICA = /^(class|classe|type|src|href|id|tela|secao|acao|folha|key|chave|sprite|imagem|icone|method|metodo|name|for|role|rel|target|autocomplete|inputmode|pattern|value|categoria|grupo|tipo|moeda|cor|corCabelo|cabelo|pele|camiseta|calca|tenis|estampa|corpo|peca|slug|regiao|canal|t|easing|fill|font|fontFamily|color|backgroundColor|stroke|align|origem|servico|era|raridade|letra|simbolo|forma|padrao|operacao|motivo|sexo|anim|data-[\w-]+)$/;
/** funções cujo 1º argumento nunca é texto: a tag do el(), seletores, eventos, armazenamento… */
const CHAMADA_TECNICA = /^(el|querySelector|querySelectorAll|closest|matches|addEventListener|removeEventListener|getItem|setItem|removeItem|createElement|getElementById|getContext|includes|startsWith|endsWith|split|join|replace|replaceAll|padStart|padEnd|match|test|exec|indexOf|get|set|has|delete|prepare|getAttribute|setAttribute|removeAttribute|toLocaleString|toLocaleDateString|toLocaleTimeString|api|fetch|play|exists|addCanvas|add|create|generateTexture|emit|on|once|off|getScene|start|toggle|remove|contains|ed|importar)$/;
const temLetra = (s) => /[A-Za-zÀ-ÿ]/.test(s);
/** parece texto de gente (e não um identificador, caminho, cor ou classe de CSS)? */
function ehTexto(s) {
  const t = s.trim();
  if (!t || !temLetra(t)) return false;
  if (/^(https?:|\/|\.\/|\.\.\/|#[0-9a-f]{3,8}$|rgb|data:)/i.test(t)) return false;
  if (/^[\w$.-]+\.(png|svg|jpg|webp|mp3|json|ts|css|gif)$/i.test(t)) return false;
  if (/[À-ÿ]/.test(t)) return true; // acento: português
  if (/^[a-z0-9_\-.:/[\]=>#%,() ]+$/.test(t) && !/^ | $/.test(s)) return false; // só minúsculas: id, classe, seletor
  if (/^[A-Z0-9_]+$/.test(t) && t.length > 1) return false; // CONSTANTE
  if (/^[a-z]+[A-Z]\w*$/.test(t)) return false; // camelCase
  if (/^(SELECT|INSERT|UPDATE|DELETE|CREATE|PRAGMA|ALTER|DROP)\b/.test(t)) return false; // SQL
  return true;
}

const achados = new Map(); // texto → primeiro lugar
const guardar = (texto, arq, linha) => { if (ehTexto(texto) && !achados.has(texto)) achados.set(texto, `${arq}:${linha}`); };

for (const arq of arquivos) {
  const codigo = fs.readFileSync(arq, 'utf8');
  const rel = arq.split(path.sep).join('/');
  const programa = parseAst(codigo, { lang: 'ts' });
  const linhaDe = (n) => codigo.slice(0, n.start).split(/\n/).length;
  const nomeDe = (n) => (n?.type === 'Identifier' ? n.name : n?.type === 'Literal' ? String(n.value) : n?.type === 'MemberExpression' ? nomeDe(n.property) : '');
  const tecnico = (n, p) => {
    if (!p) return true;
    if (/^(ImportDeclaration|ExportNamedDeclaration|ExportAllDeclaration|ImportExpression|TSLiteralType|TSExternalModuleReference|SwitchCase|TSEnumMember)$/.test(p.type)) return true;
    if (p.type === 'Property' && p.key === n && !p.computed) return true;
    if (p.type === 'Property' && p.value === n && PROP_TECNICA.test(nomeDe(p.key))) return true;
    if (p.type === 'MemberExpression' && p.property === n) return true;
    if (p.type === 'BinaryExpression' && /^(===|!==|==|!=)$/.test(p.operator)) return true;
    if (p.type === 'CallExpression' && p.arguments[0] === n && CHAMADA_TECNICA.test(nomeDe(p.callee))) return true;
    return false;
  };
  const visitar = (n, p) => {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'Literal' && typeof n.value === 'string') {
      if (!tecnico(n, p)) guardar(n.value, rel, linhaDe(n));
    } else if (n.type === 'TemplateLiteral' && !tecnico(n, p)) {
      let texto = n.quasis[0].value.cooked ?? '';
      for (let k = 1; k < n.quasis.length; k++) texto += '{' + (k - 1) + '}' + (n.quasis[k].value.cooked ?? '');
      if (ehTexto(texto.replace(/\{\d+\}/g, ''))) guardar(texto, rel, linhaDe(n));
    }
    for (const chave in n) {
      if (chave === 'type' || chave === 'start' || chave === 'end') continue;
      const v = n[chave];
      if (Array.isArray(v)) v.forEach((x) => visitar(x, n));
      else if (v && typeof v === 'object') visitar(v, n);
    }
  };
  visitar(programa, null);
}

fs.mkdirSync('shared/data/idiomas', { recursive: true });
const lista = [...achados.entries()].map(([texto, onde]) => ({ texto, onde }));
fs.writeFileSync('shared/data/idiomas/_textos.json', JSON.stringify(lista, null, 0).replace(/\},\{/g, '},\n{'));
const porArquivo = {};
for (const { onde } of lista) { const a = onde.split(':')[0]; porArquivo[a] = (porArquivo[a] ?? 0) + 1; }
console.log(`${lista.length} textos em ${Object.keys(porArquivo).length} arquivos; ${lista.reduce((s, x) => s + x.texto.length, 0)} letras`);
for (const idioma of ['en', 'es']) {
  const f = `shared/data/idiomas/${idioma}.json`;
  const d = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
  const faltam = lista.filter((x) => !(x.texto in d));
  fs.writeFileSync(`shared/data/idiomas/_faltam-${idioma}.json`, JSON.stringify(faltam.map((x) => x.texto), null, 0).replace(/","/g, '",\n"'));
  console.log(`${idioma}: ${lista.length - faltam.length} traduzidos, faltam ${faltam.length}`);
}
if (process.argv[2] === 'arquivos') console.log(Object.entries(porArquivo).sort((a, b) => b[1] - a[1]).map(([a, n]) => `${String(n).padStart(4)} ${a}`).join('\n'));
