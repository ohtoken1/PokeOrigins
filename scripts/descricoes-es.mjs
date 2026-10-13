// Descrições de itens, golpes e Abilities em espanhol.
//   node scripts/descricoes-es.mjs listar  → grava scripts/idiomas/descricoes/_modelos.txt (o que falta traduzir)
//   node scripts/descricoes-es.mjs         → junta scripts/idiomas/descricoes/es-*.txt em shared/data/traducoes-es.json
// As descrições em inglês (chaves de shared/data/traducoes.json) viram "modelos": o nome de tipo vira <T> (os nomes
// de tipo ficam em inglês nos três idiomas), então "Holder's Fire-type attacks…" e "Holder's Water-type attacks…"
// são traduzidos uma vez só. Cada linha dos arquivos es-*.txt: número do modelo, TAB, tradução.
import fs from 'node:fs';
const PASTA = 'scripts/idiomas/descricoes';
const TIPOS = ['Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy', 'Stellar'];
const RE_TIPO = new RegExp(`\\b(${TIPOS.join('|')})(?=[- ]type|/| or |, )`, 'g');
const originais = Object.keys(JSON.parse(fs.readFileSync('shared/data/traducoes.json', 'utf8')));
/** modelo de um texto e os tipos que saíram dele, na ordem */
function modelar(texto) {
  const tipos = [];
  return { modelo: texto.replace(RE_TIPO, (t) => (tipos.push(t), '<T>')), tipos };
}
const modelos = [...new Set(originais.map((t) => modelar(t).modelo))];
fs.mkdirSync(PASTA, { recursive: true });
if (process.argv[2] === 'listar') {
  fs.writeFileSync(`${PASTA}/_modelos.txt`, modelos.map((m, i) => `${i}\t${m}`).join('\n') + '\n');
  console.log(`${originais.length} descrições → ${modelos.length} modelos`);
} else {
  const traducao = new Map();
  for (const arq of fs.readdirSync(PASTA).filter((f) => /^es-.*\.txt$/.test(f)).sort()) {
    for (const linha of fs.readFileSync(`${PASTA}/${arq}`, 'utf8').split(/\r?\n/)) {
      if (!linha.trim()) continue;
      const [n, ...resto] = linha.split('\t');
      const texto = resto.join('\t').trim();
      if (!/^\d+$/.test(n) || !modelos[Number(n)] || !texto) throw new Error(`${arq}: linha inválida "${linha.slice(0, 60)}"`);
      const [tem, quer] = [(texto.match(/<T>/g) ?? []).length, (modelos[Number(n)].match(/<T>/g) ?? []).length];
      if (tem !== quer) throw new Error(`${arq}: modelo ${n} tem ${quer} <T>, a tradução tem ${tem}`);
      traducao.set(modelos[Number(n)], texto);
    }
  }
  const saida = {};
  let faltam = 0;
  for (const original of originais) {
    const { modelo, tipos } = modelar(original);
    const t = traducao.get(modelo);
    if (!t) { faltam++; continue; }
    let i = 0;
    saida[original] = t.replace(/<T>/g, () => tipos[i++]);
  }
  fs.writeFileSync('shared/data/traducoes-es.json', JSON.stringify(saida, null, 0).replace(/","/g, '",\n"') + '\n');
  console.log(`${Object.keys(saida).length} descrições em espanhol; faltam ${faltam}`);
}
