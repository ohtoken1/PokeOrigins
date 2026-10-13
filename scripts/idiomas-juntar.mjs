// Junta as traduções de scripts/idiomas/*.tsv nos dicionários shared/data/idiomas/en.json e es.json.
// Cada linha: número do texto (posição em shared/data/idiomas/_numerados.json) ou o próprio texto em português,
// depois a tradução em inglês e a em espanhol, separados por TAB. Coluna vazia = fica como está.
// "~" na ponta vale um espaço (para não se perder no fim da linha); "\n" vale quebra de linha.
import fs from 'node:fs';
const numerados = JSON.parse(fs.readFileSync('shared/data/idiomas/_numerados.json', 'utf8'));
const en = {}, es = {};
const limpar = (s) => s.replace(/^~/, ' ').replace(/~$/, ' ').replace(/\\n/g, '\n');
let linhas = 0;
for (const arq of fs.readdirSync('scripts/idiomas').filter((f) => f.endsWith('.tsv')).sort()) {
  for (const linha of fs.readFileSync(`scripts/idiomas/${arq}`, 'utf8').split(/\r?\n/)) {
    if (!linha.trim() || linha.startsWith('#')) continue;
    const [chave, ingles = '', espanhol = ''] = linha.split('\t');
    const pt = /^\d+$/.test(chave) ? numerados[Number(chave)] : limpar(chave);
    if (pt === undefined) throw new Error(`${arq}: número ${chave} não existe`);
    linhas++;
    for (const [d, t] of [[en, ingles], [es, espanhol]]) {
      if (!t) continue;
      const valor = limpar(t);
      // as partes que mudam têm de ser as mesmas dos dois lados
      const marcas = (s) => (s.match(/\{\d+\}/g) ?? []).sort().join();
      if (marcas(valor).split(',').some((m) => m && !pt.includes(m))) throw new Error(`${arq}: marca a mais em "${pt}" → "${valor}"`);
      if (valor !== pt) d[pt] = valor;
    }
  }
}
fs.writeFileSync('shared/data/idiomas/en.json', JSON.stringify(en, null, 0).replace(/","/g, '",\n"') + '\n');
fs.writeFileSync('shared/data/idiomas/es.json', JSON.stringify(es, null, 0).replace(/","/g, '",\n"') + '\n');
console.log(`${linhas} linhas → inglês: ${Object.keys(en).length} textos, espanhol: ${Object.keys(es).length} textos`);
