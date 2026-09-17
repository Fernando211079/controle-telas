import { readFileSync, writeFileSync } from 'fs';

const raw = readFileSync('assets/seed.js', 'utf8');
const json = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
const seed = JSON.parse(json);

const q = s => s === null || s === undefined ? 'null' : "'" + String(s).replace(/'/g, "''") + "'";
const monthIdx = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const write = (name, stmts) => { writeFileSync(`scripts/seed_${name}.sql`, stmts.join('\n') + '\n'); console.log(name, stmts.length); };

write('cadastros', [
  ...seed.operadores.map(r => `insert into operadores (nome) values (${q(r)}) on conflict (nome) do nothing;`),
  ...seed.motivos.map(r => `insert into motivos (nome) values (${q(r)}) on conflict (nome) do nothing;`),
  ...seed.tamanhos.map(r => `insert into tamanhos_tela (nome) values (${q(r)}) on conflict (nome) do nothing;`)
]);

const oc = seed.ocorrencias.map(r => `insert into telas_rasgadas (data, operador, motivo, tamanho, observacao) values (${q(r.data)}, ${q(r.operador)}, ${q(r.motivo)}, ${q(r.tamanho)}, ${q(r.observacao || '')});`);
for (let i = 0; i < oc.length; i += 60) write(`ocorrencias_${String(i / 60 + 1).padStart(2, '0')}`, oc.slice(i, i + 60));

const dp = seed.desplaques.map(r => {
  const mes = monthIdx.indexOf(r.mes) + 1;
  const data = mes ? `2026-${String(mes).padStart(2, '0')}-01` : null;
  return `insert into desplaques (data, unidade, quantidade) values (${q(data)}, ${q(r.unidade)}, ${Number(r.quantidade)});`;
});
write('desplaques', dp);

write('banhos', seed.banhos.map(r => `insert into banhos_removedor (data_inicio, data_fim, total_telas) values (${q(r.data_inicio)}, ${q(r.data_fim)}, ${r.total_telas ?? 'null'});`));

const dc = seed.descartes.map(r => `insert into quadros_descartados (data, tamanho, motivo, observacao) values (${q(r.data)}, ${q(r.tamanho)}, ${q(r.motivo)}, ${q(r.observacao || '')});`);
for (let i = 0; i < dc.length; i += 60) write(`descartes_${String(i / 60 + 1).padStart(2, '0')}`, dc.slice(i, i + 60));
