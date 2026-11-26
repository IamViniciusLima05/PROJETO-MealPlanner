/* MealPlanner — cardápio semanal, estimativa de calorias e lista de compras */

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const escapar = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const banco = {
  ler(k, padrao) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? padrao; } catch { return padrao; } },
  salvar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem storage */ } }
};

const REFEICOES = [{ id: 'cafe', nome: 'Café da manhã', ic: '☕' }, { id: 'almoco', nome: 'Almoço', ic: '🍽️' }, { id: 'lanche', nome: 'Lanche', ic: '🍎' }, { id: 'jantar', nome: 'Jantar', ic: '🌙' }];
const TIPOS = { cafe: { nome: 'Café da manhã', cor: '#e0a526' }, principal: { nome: 'Prato principal', cor: '#5b7a2e' }, lanche: { nome: 'Lanche', cor: '#3f88c5' }, sobremesa: { nome: 'Sobremesa', cor: '#c2577a' } };
const SUGESTAO = { cafe: 'cafe', almoco: 'principal', lanche: 'lanche', jantar: 'principal' };
const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

// categorias da lista de compras, por palavra-chave
const CATEGORIAS = [
  ['🫙 Mercearia', /molho|extrato|leite de coco|granola|aveia|castanha|curry|azeite|champignon/i],
  ['🥬 Hortifrúti', /alface|tomate|cebola|alho|cenoura|batata|banana|maçã|morango|limão|abobrinha|brócolis|pimentão|cheiro|salsinha|mamão|abacate|rúcula|pepino|mandioca|fruta|laranja/i],
  ['🥩 Carnes e ovos', /frango|carne|patinho|peixe|tilápia|ovo|presunto|bacon|salmão|atum|linguiça/i],
  ['🧀 Laticínios', /leite|queijo|iogurte|manteiga|requeijão|creme de leite|ricota/i],
  ['🍞 Padaria', /pão|tapioca|torrada|wrap|tortilha/i],
  ['🫙 Mercearia', /.*/]
];

function receitasExemplo() {
  const r = (id, nome, tipo, kcal, rende, ing) => ({ id, nome, tipo, kcal, rende, ing: ing.split('\n').map(parseIng).filter(Boolean) });
  return [
    r(1, 'Omelete de legumes', 'cafe', 280, 1, '2 un ovo\n30 g tomate\n20 g cebola\n20 g queijo minas'),
    r(2, 'Iogurte com granola e fruta', 'cafe', 320, 1, '170 g iogurte natural\n40 g granola\n1 un banana'),
    r(3, 'Pão integral com ovo e queijo', 'cafe', 350, 1, '2 fatia pão integral\n1 un ovo\n30 g queijo minas'),
    r(4, 'Tapioca de frango', 'cafe', 330, 1, '60 g tapioca\n80 g frango desfiado\n20 g requeijão'),
    r(5, 'Arroz, feijão e frango grelhado', 'principal', 560, 4, '400 g arroz\n300 g feijão\n600 g peito de frango\n1 un cebola\n4 dente alho\n200 g alface'),
    r(6, 'Strogonoff de carne', 'principal', 620, 4, '600 g patinho\n200 g creme de leite\n150 g champignon\n1 un cebola\n2 colher extrato de tomate\n400 g arroz'),
    r(7, 'Tilápia com legumes', 'principal', 430, 2, '400 g tilápia\n1 un abobrinha\n200 g brócolis\n1 un limão\n2 colher azeite'),
    r(8, 'Macarrão à bolonhesa', 'principal', 650, 4, '500 g macarrão\n500 g carne moída\n500 g molho de tomate\n1 un cebola\n3 dente alho\n50 g queijo parmesão'),
    r(9, 'Salada completa com atum', 'principal', 380, 2, '1 un alface\n2 un tomate\n1 un pepino\n2 lata atum\n2 un ovo\n2 colher azeite'),
    r(10, 'Sopa de legumes', 'principal', 290, 4, '3 un batata\n2 un cenoura\n1 un abobrinha\n300 g carne\n1 un cebola\n2 dente alho'),
    r(11, 'Frango ao curry com arroz', 'principal', 590, 3, '500 g peito de frango\n200 ml leite de coco\n2 colher curry\n1 un cebola\n300 g arroz'),
    r(12, 'Wrap de frango', 'lanche', 410, 2, '2 un tortilha\n200 g frango desfiado\n1 un tomate\n4 folha alface\n2 colher requeijão'),
    r(13, 'Vitamina de banana', 'lanche', 260, 1, '250 ml leite\n1 un banana\n20 g aveia'),
    r(14, 'Mix de castanhas e fruta', 'lanche', 220, 1, '30 g castanhas\n1 un maçã'),
    r(15, 'Pão de queijo', 'lanche', 240, 1, '120 g pão de queijo'),
    r(16, 'Salada de frutas', 'sobremesa', 150, 4, '1 un mamão\n2 un banana\n2 un maçã\n250 g morango\n2 un laranja')
  ];
}
function parseIng(linha) {
  linha = linha.trim(); if (!linha) return null;
  const m = linha.match(/^(\d+(?:[.,]\d+)?|\d+\/\d+)\s+(\S+)\s+(.+)$/);
  if (!m) return { q: 1, u: 'un', n: linha.toLowerCase() };
  let q = m[1].includes('/') ? m[1].split('/').reduce((a, b) => a / b) : parseFloat(m[1].replace(',', '.'));
  return { q, u: m[2].toLowerCase(), n: m[3].trim().toLowerCase() };
}

let receitas = banco.ler('mp_receitas', null) ?? receitasExemplo();
let plano = banco.ler('mp_plano', null); // { 'AAAA-MM-DD': { cafe: {rec, porc}, ... } }
let metaKcal = banco.ler('mp_meta', 2000);
let marcados = banco.ler('mp_marcados', {}); // chave da semana -> lista de itens marcados
let extras = banco.ler('mp_extras', {}); // chave da semana -> [texto]
const salvarTudo = () => { banco.salvar('mp_receitas', receitas); banco.salvar('mp_plano', plano); banco.salvar('mp_marcados', marcados); banco.salvar('mp_extras', extras); };

const iso = (d) => new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
function segundaDe(d) { const x = new Date(d); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
let inicioSemana = segundaDe(new Date());
const diasDaSemana = () => Array.from({ length: 7 }, (_, i) => { const d = new Date(inicioSemana); d.setDate(d.getDate() + i); return d; });
const chaveSemana = () => iso(inicioSemana);

if (!plano) {
  // semana de exemplo já montada para a semana atual
  plano = {};
  const ex = [[1, 5, 13, 9], [2, 6, 14, 10], [3, 7, 15, 11], [4, 8, 13, 9], [1, 5, 12, 7], [2, 6, 16, 8], [3, null, 15, 10]];
  diasDaSemana().forEach((d, i) => {
    const k = iso(d); plano[k] = {};
    REFEICOES.forEach((r, j) => { if (ex[i][j]) plano[k][r.id] = { rec: ex[i][j], porc: j === 1 || j === 3 ? 2 : 1 }; });
  });
  delete plano[iso(diasDaSemana()[6])].almoco;
}

/* ---------- Cálculos ---------- */
const rec = (id) => receitas.find((r) => r.id === id);
function kcalDia(k) {
  const d = plano[k] || {};
  return Object.values(d).reduce((s, x) => s + (rec(x.rec)?.kcal || 0), 0); // por pessoa: 1 porção de cada prato
}
function listaCompras() {
  const mapa = new Map();
  diasDaSemana().forEach((d) => {
    Object.values(plano[iso(d)] || {}).forEach((x) => {
      const r = rec(x.rec); if (!r) return;
      const fator = x.porc / (r.rende || 1);
      r.ing.forEach((i) => {
        const chave = `${i.n}|${i.u}`;
        const atual = mapa.get(chave) || { n: i.n, u: i.u, q: 0 };
        atual.q += i.q * fator; mapa.set(chave, atual);
      });
    });
  });
  return [...mapa.values()];
}
function fmtQtd(q, u) {
  if (u === 'g' && q >= 1000) return `${(q / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`;
  if (u === 'ml' && q >= 1000) return `${(q / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} L`;
  const arred = ['g', 'ml'].includes(u) ? Math.ceil(q / 10) * 10 : Math.ceil(q - 1e-9); // compra-se em quantidades redondas
  return `${arred.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${u}`;
}

/* ---------- Desenho ---------- */
const mobile = () => matchMedia('(max-width: 640px)').matches;
function slotHtml(k, ref, comRotulo) {
  const x = plano[k]?.[ref.id], r = x && rec(x.rec);
  const rot = comRotulo ? `<span class="rot">${ref.ic} ${ref.nome}</span>` : '';
  if (!r) return `<button class="slot vazio" data-dia="${k}" data-ref="${ref.id}" aria-label="${ref.nome} de ${k}: adicionar prato">${comRotulo ? rot : '+'}</button>`;
  return `<button class="slot cheio" draggable="true" data-dia="${k}" data-ref="${ref.id}" style="--c:${TIPOS[r.tipo].cor}" aria-label="${ref.nome}: ${escapar(r.nome)}">${rot}<b>${escapar(r.nome)}</b><small><span>${r.kcal} kcal</span><span>${x.porc} ${x.porc === 1 ? 'porção' : 'porções'}</span></small></button>`;
}
function desenharGrade() {
  const dias = diasDaSemana(), hoje = iso(new Date());
  const ini = dias[0], fim = dias[6];
  $('#sem-label').textContent = `${ini.getDate()} ${ini.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')} – ${fim.getDate()} ${fim.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}`;
  const cab = (d, i) => { const k = iso(d), kc = kcalDia(k); return `<div class="cab ${k === hoje ? 'hoje' : ''}"><b>${DIAS[i]} <small>${d.getDate()}/${d.getMonth() + 1}</small></b><span class="kcal-dia ${kc > metaKcal ? 'acima' : ''}">${kc ? `${kc} kcal` : '—'}</span></div>`; };
  if (mobile()) {
    $('#grade').innerHTML = dias.map((d, i) => `<section class="dia-mob">${cab(d, i)}<div class="slots">${REFEICOES.map((r) => slotHtml(iso(d), r, true)).join('')}</div></section>`).join('');
  } else {
    let h = '<div></div>' + dias.map(cab).join('');
    REFEICOES.forEach((r) => { h += `<div class="refeicao"><span aria-hidden="true">${r.ic}</span>${r.nome}</div>` + dias.map((d) => slotHtml(iso(d), r)).join(''); });
    $('#grade').innerHTML = h;
  }
}
function desenharResumo() {
  const dias = diasDaSemana().map(iso), kcs = dias.map(kcalDia), comPlano = kcs.filter(Boolean);
  const media = comPlano.length ? Math.round(comPlano.reduce((s, x) => s + x, 0) / comPlano.length) : 0;
  const refs = dias.reduce((s, k) => s + Object.keys(plano[k] || {}).length, 0);
  const max = Math.max(metaKcal * 1.15, ...kcs);
  $('#resumo').innerHTML = `
    <div class="card-res"><small>Média por dia</small><b>${media || '—'} <span>kcal</span></b></div>
    <div class="card-res"><small>Meta diária</small><label class="meta"><input type="number" id="meta" min="800" max="6000" step="50" value="${metaKcal}" aria-label="Meta diária de calorias"> <span>kcal</span></label></div>
    <div class="card-res"><small>Refeições planejadas</small><b>${refs} <span>de 28</span></b></div>
    <div class="card-res"><small>Calorias por dia (uma porção de cada prato)</small><div class="barras" aria-hidden="true"><span class="linha-meta" style="bottom:${16 + (metaKcal / max) * 40}px" title="Meta"></span>${kcs.map((k, i) => `<div><i class="${k > metaKcal ? 'acima' : ''}" style="height:${Math.max(k ? 3 : 0, (k / max) * 40)}px" title="${k} kcal"></i>${DIAS[i][0]}</div>`).join('')}</div></div>`;
  $('#meta').addEventListener('change', (e) => { metaKcal = Math.min(6000, Math.max(800, +e.target.value || 2000)); banco.salvar('mp_meta', metaKcal); desenhar(); });
  $('#n-compras').textContent = listaCompras().length + (extras[chaveSemana()]?.length || 0);
}
function desenhar() { desenharGrade(); desenharResumo(); }

/* ---------- Navegação ---------- */
$('#sem-ant').addEventListener('click', () => { inicioSemana.setDate(inicioSemana.getDate() - 7); desenhar(); });
$('#sem-prox').addEventListener('click', () => { inicioSemana.setDate(inicioSemana.getDate() + 7); desenhar(); });
let largAnt = mobile();
addEventListener('resize', () => { if (mobile() !== largAnt) { largAnt = mobile(); desenharGrade(); } });

/* ---------- Escolher prato ---------- */
let slot = null, recSel = null, porc = 1;
function abrirSlot(dia, ref) {
  slot = { dia, ref }; const x = plano[dia]?.[ref];
  recSel = x?.rec ?? null; porc = x?.porc ?? 1;
  const d = new Date(dia + 'T12:00');
  $('#ds-titulo').textContent = `${REFEICOES.find((r) => r.id === ref).nome} · ${d.toLocaleDateString('pt-BR', { weekday: 'long' })}`;
  $('#busca-rec').value = ''; desenharEscolha(); $('#porc').textContent = porc;
  $('#limpar-slot').hidden = !x;
  $('#dlg-slot').showModal();
}
function desenharEscolha() {
  const f = $('#busca-rec').value.trim().toLowerCase(), sug = SUGESTAO[slot.ref];
  const lista = receitas.filter((r) => !f || r.nome.toLowerCase().includes(f) || r.ing.some((i) => i.n.includes(f)));
  const ordem = [sug, ...Object.keys(TIPOS).filter((t) => t !== sug)];
  $('#escolha').innerHTML = ordem.map((t) => {
    const rs = lista.filter((r) => r.tipo === t); if (!rs.length) return '';
    return `<li class="grupo">${TIPOS[t].nome}</li>` + rs.map((r) => `<li><button data-rec="${r.id}" aria-pressed="${r.id === recSel}"><span>${escapar(r.nome)}</span><small>${r.kcal} kcal</small></button></li>`).join('');
  }).join('') || '<li class="vazio-txt">Nenhuma receita encontrada.</li>';
}
$('#busca-rec').addEventListener('input', desenharEscolha);
$('#escolha').addEventListener('click', (e) => { const b = e.target.closest('[data-rec]'); if (!b) return; recSel = +b.dataset.rec; $$('#escolha [data-rec]').forEach((x) => x.setAttribute('aria-pressed', x === b)); });
$('#escolha').addEventListener('dblclick', (e) => { if (e.target.closest('[data-rec]')) $('#salvar-slot').click(); });
$('#porc-menos').addEventListener('click', () => { porc = Math.max(1, porc - 1); $('#porc').textContent = porc; });
$('#porc-mais').addEventListener('click', () => { porc = Math.min(20, porc + 1); $('#porc').textContent = porc; });
$('#salvar-slot').addEventListener('click', () => {
  if (!recSel) { toast('Escolha um prato'); return; }
  (plano[slot.dia] ||= {})[slot.ref] = { rec: recSel, porc };
  salvarTudo(); desenhar(); $('#dlg-slot').close();
});
$('#limpar-slot').addEventListener('click', () => { delete plano[slot.dia]?.[slot.ref]; salvarTudo(); desenhar(); $('#dlg-slot').close(); });

/* clique e arrastar entre os espaços (no computador) */
let origem = null;
$('#grade').addEventListener('click', (e) => { const s = e.target.closest('.slot'); if (s) abrirSlot(s.dataset.dia, s.dataset.ref); });
$('#grade').addEventListener('dragstart', (e) => { const s = e.target.closest('.slot.cheio'); if (!s) return; origem = { dia: s.dataset.dia, ref: s.dataset.ref }; s.classList.add('arrastando'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'x'); });
$('#grade').addEventListener('dragover', (e) => { const s = e.target.closest('.slot'); if (!s || !origem) return; e.preventDefault(); $$('.slot.alvo').forEach((x) => x.classList.remove('alvo')); s.classList.add('alvo'); });
$('#grade').addEventListener('dragend', () => { origem = null; $$('.arrastando, .alvo').forEach((x) => x.classList.remove('arrastando', 'alvo')); });
$('#grade').addEventListener('drop', (e) => {
  const s = e.target.closest('.slot'); if (!s || !origem) return; e.preventDefault();
  const a = plano[origem.dia]?.[origem.ref], b = plano[s.dataset.dia]?.[s.dataset.ref];
  (plano[s.dataset.dia] ||= {})[s.dataset.ref] = a;
  if (b) plano[origem.dia][origem.ref] = b; else delete plano[origem.dia][origem.ref]; // troca de lugar
  salvarTudo(); desenhar();
});

/* ---------- Receitas ---------- */
let recEdit = null;
function desenharReceitas() {
  $('#rec-lista').innerHTML = [...receitas].sort((a, b) => a.nome.localeCompare(b.nome)).map((r) => `<li><button data-editar="${r.id}" aria-current="${r === recEdit}"><span>${escapar(r.nome)}</span><small>${r.kcal} kcal</small></button></li>`).join('');
}
function editarReceita(r) {
  recEdit = r;
  $('#rf-titulo').textContent = r ? 'Editar receita' : 'Nova receita';
  $('#r-nome').value = r?.nome ?? ''; $('#r-tipo').value = r?.tipo ?? 'principal'; $('#r-kcal').value = r?.kcal ?? ''; $('#r-rende').value = r?.rende ?? 1;
  $('#r-ing').value = r ? r.ing.map((i) => `${String(Math.round(i.q * 100) / 100).replace('.', ',')} ${i.u} ${i.n}`).join('\n') : '';
  const ex = $('#r-excluir'); ex.hidden = !r; ex.textContent = 'Excluir';
  desenharReceitas();
}
$('#abrir-receitas').addEventListener('click', () => { editarReceita(null); $('#dlg-receitas').showModal(); });
$('#rec-lista').addEventListener('click', (e) => { const b = e.target.closest('[data-editar]'); if (b) editarReceita(rec(+b.dataset.editar)); });
$('#r-nova').addEventListener('click', () => { editarReceita(null); $('#r-nome').focus(); });
$('#rec-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const d = { nome: $('#r-nome').value.trim(), tipo: $('#r-tipo').value, kcal: Math.round(+$('#r-kcal').value || 0), rende: Math.max(1, +$('#r-rende').value || 1), ing: $('#r-ing').value.split('\n').map(parseIng).filter(Boolean) };
  if (recEdit) Object.assign(recEdit, d); else { recEdit = { id: Date.now(), ...d }; receitas.push(recEdit); }
  salvarTudo(); desenharReceitas(); desenhar(); toast('Receita salva');
});
$('#r-excluir').addEventListener('click', (e) => {
  const usos = Object.values(plano).reduce((s, d) => s + Object.values(d).filter((x) => x.rec === recEdit.id).length, 0);
  if (e.target.textContent === 'Excluir') { e.target.textContent = usos ? `Confirmar (sai de ${usos} refeições)` : 'Confirmar'; return; }
  Object.values(plano).forEach((d) => Object.keys(d).forEach((k) => { if (d[k].rec === recEdit.id) delete d[k]; }));
  receitas = receitas.filter((r) => r !== recEdit); salvarTudo(); editarReceita(null); desenhar(); toast('Receita excluída');
});

/* ---------- Lista de compras ---------- */
function desenharCompras() {
  const sem = chaveSemana(), feitos = new Set(marcados[sem] || []);
  const itens = listaCompras(), ext = extras[sem] || [];
  const grupos = new Map(CATEGORIAS.map(([n]) => [n, []])); // nomes repetidos (Mercearia) caem no mesmo grupo
  itens.forEach((i) => { const cat = CATEGORIAS.find(([, re]) => re.test(i.n))[0]; grupos.get(cat).push(i); });
  const linha = (id, txt, q) => `<li class="${feitos.has(id) ? 'ok' : ''}"><label><input type="checkbox" data-item="${escapar(id)}" ${feitos.has(id) ? 'checked' : ''}><span>${escapar(txt)}</span>${q ? `<span class="q">${q}</span>` : ''}</label></li>`;
  let html = [...grupos].filter(([, l]) => l.length).map(([n, l]) => `<section><h3>${n}</h3><ul>${l.sort((a, b) => a.n.localeCompare(b.n)).map((i) => linha(`${i.n}|${i.u}`, i.n[0].toUpperCase() + i.n.slice(1), fmtQtd(i.q, i.u))).join('')}</ul></section>`).join('');
  if (ext.length) html += `<section><h3>➕ Extras</h3><ul>${ext.map((t) => linha('extra:' + t, t, '')).join('')}</ul></section>`;
  $('#compras').innerHTML = html || '<p class="vazio-txt">Monte o cardápio da semana para gerar a lista.</p>';
  const total = itens.length + ext.length;
  $('#compras-sub').textContent = total ? `${total} itens para a semana · ${feitos.size} já comprados` : '';
}
$('#abrir-compras').addEventListener('click', () => { desenharCompras(); $('#dlg-compras').showModal(); });
$('#compras').addEventListener('change', (e) => {
  const id = e.target.dataset.item; if (!id) return;
  const sem = chaveSemana(), s = new Set(marcados[sem] || []);
  e.target.checked ? s.add(id) : s.delete(id); marcados[sem] = [...s];
  salvarTudo(); desenharCompras();
});
$('#add-extra').addEventListener('click', () => {
  const t = $('#extra').value.trim(); if (!t) return;
  (extras[chaveSemana()] ||= []).push(t); $('#extra').value = ''; salvarTudo(); desenharCompras(); desenharResumo();
});
$('#extra').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('#add-extra').click(); } });
$('#desmarcar').addEventListener('click', () => { marcados[chaveSemana()] = []; salvarTudo(); desenharCompras(); });
$('#copiar-lista').addEventListener('click', async () => {
  const feitos = new Set(marcados[chaveSemana()] || []);
  const txt = [...$('#compras').querySelectorAll('section')].map((s) => {
    const its = [...s.querySelectorAll('li')].filter((li) => !feitos.has(li.querySelector('input').dataset.item)).map((li) => `• ${li.querySelector('span').textContent}${li.querySelector('.q') ? ` — ${li.querySelector('.q').textContent}` : ''}`);
    return its.length ? `${s.querySelector('h3').textContent}\n${its.join('\n')}` : '';
  }).filter(Boolean).join('\n\n');
  if (!txt) { toast('Nada pendente na lista'); return; }
  try { await navigator.clipboard.writeText(`🛒 Lista de compras — semana de ${$('#sem-label').textContent}\n\n${txt}`); toast('Lista copiada'); } catch { toast('Não foi possível copiar'); }
});

$$('[data-fechar]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));
let timerToast;
function toast(msg) { const t = $('#toast'); (document.querySelector('dialog[open]') || document.body).append(t); t.textContent = msg; t.hidden = false; clearTimeout(timerToast); timerToast = setTimeout(() => { t.hidden = true; }, 2400); }

salvarTudo();
desenhar();
