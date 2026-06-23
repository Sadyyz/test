// assets/ficha.js — PHANTASOS: Contos Distorcidos

const params   = new URLSearchParams(location.search);
const FICHA_ID = params.get('id');
let state      = null;
let activeTab  = 'principal';

// ══════════════════════════════════════════════════
//  AVATAR
// ══════════════════════════════════════════════════
let _avatarCache = null;

async function loadAvatar() {
  if (!FICHA_ID) return;
  try {
    const r = await fetch(`/api/avatar?id=${FICHA_ID}`);
    if (r.ok) { const d = await r.json(); _avatarCache = d.avatar || null; }
  } catch {}
  updateAvatarSlot();
}

function getAvatarHTML() {
  if (_avatarCache) {
    return `<img src="${_avatarCache}" class="avatar-img" alt="Avatar"><div class="avatar-overlay">Trocar</div>`;
  }
  return `<div class="avatar-placeholder"><span class="avatar-placeholder-icon">✒</span>Retrato</div><div class="avatar-overlay">Adicionar</div>`;
}

function updateAvatarSlot() {
  const slot = document.getElementById('avatar-slot');
  if (slot) slot.innerHTML = getAvatarHTML();
}

function openAvatarPicker(event) {
  if (event && (event.button === 2 || event.ctrlKey)) {
    if (_avatarCache && confirm('Remover imagem do personagem?')) removeAvatar();
    return;
  }
  const input = document.getElementById('avatar-input');
  if (input) input.click();
}

async function removeAvatar() {
  try {
    await fetch(`/api/avatar?id=${FICHA_ID}`, { method: 'DELETE' });
    _avatarCache = null; updateAvatarSlot();
  } catch { alert('Erro ao remover avatar.'); }
}

function handleAvatarUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const MAX = 256;
      let w = img.width, h = img.height;
      if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } }
      else        { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      saveAvatar(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

async function saveAvatar(dataUrl) {
  const slot = document.getElementById('avatar-slot');
  if (slot) slot.innerHTML = '<span class="avatar-placeholder" style="font-size:.8rem;opacity:.6">⟳</span>';
  try {
    const r = await fetch(`/api/avatar?id=${FICHA_ID}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar: dataUrl })
    });
    if (r.ok) { _avatarCache = dataUrl; updateAvatarSlot(); }
    else { const err = await r.json(); alert('Erro: ' + (err.error || r.status)); updateAvatarSlot(); }
  } catch { alert('Erro de conexão.'); updateAvatarSlot(); }
}

// ══════════════════════════════════════════════════
//  UTILS
// ══════════════════════════════════════════════════
function esc(v) {
  return String(v ?? '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// Modificador do Phantasos: sobe a cada 5 pontos
function calcMod(val) {
  if (val < 5)  return 0;
  if (val < 10) return 1;
  if (val < 15) return 2;
  if (val < 20) return 3;
  if (val < 25) return 4;
  return 5;
}
function fmtMod(m) { return m >= 0 ? '+' + m : String(m); }

const ATTR_FULL = {
  razao: 'Razão',
  vigor: 'Vigor',
  vontade: 'Vontade',
  expressao: 'Expressão'
};

const ATTR_SHORT = {
  razao: 'RAZ',
  vigor: 'VIG',
  vontade: 'VON',
  expressao: 'EXP'
};

const PERICIAS_DEF = {
  'Investigação':              { attr: 'razao' },
  'Medicina':                  { attr: 'razao' },
  'Ocultismo':                 { attr: 'razao' },
  'Idiomas Antigos':           { attr: 'razao' },
  'Luta':                      { attr: 'vigor' },
  'Furtividade':               { attr: 'vigor' },
  'Sobrevivência':             { attr: 'vigor' },
  'Resiliência':               { attr: 'vontade' },
  'Foco':                      { attr: 'vontade' },
  'Resist. ao Paranormal':     { attr: 'vontade' },
  'Leitura de Contos':         { attr: 'expressao' },
  'Escrita':                   { attr: 'expressao' },
  'Interpretação Narrativa':   { attr: 'expressao' },
  'Ident. de Corrupção':       { attr: 'expressao' },
};

const GENEROS = ['Drama', 'Investigação', 'Romance', 'Suspense', 'Aventura', 'Fantasia'];

// Bônus de perícias e debuffs de combate por gênero
const GENERO_RULES = {
  'Drama': {
    cor: '#8a4070',
    bonus_pericias: ['Resiliência', 'Foco'],
    debuff_combate: 'Penalidade de -2 em Iniciativa',
    desc_bonus: 'Escritores de Drama suportam pressão emocional com mais firmeza.',
    desc_debuff: 'Conflito físico os paralisa — -2 em Iniciativa em combate.',
  },
  'Investigação': {
    cor: '#4a70a0',
    bonus_pericias: ['Investigação', 'Ident. de Corrupção'],
    debuff_combate: 'Penalidade de -2 em CA',
    desc_bonus: 'Mentes investigativas percebem o que outros ignoram.',
    desc_debuff: 'Preferem observar a reagir — -2 em CA durante combate.',
  },
  'Romance': {
    cor: '#a04060',
    bonus_pericias: ['Leitura de Contos', 'Interpretação Narrativa'],
    debuff_combate: 'Penalidade de -1d4 em dano causado',
    desc_bonus: 'Leitores de emoção decifram narrativas com mais intuição.',
    desc_debuff: 'Relutam em ferir — -1d4 no dano causado em combate.',
  },
  'Suspense': {
    cor: '#507050',
    bonus_pericias: ['Furtividade', 'Resist. ao Paranormal'],
    debuff_combate: 'Penalidade de -2 em testes de Vigor',
    desc_bonus: 'Vivem no fio da navalha — furtividade e controle sob pressão.',
    desc_debuff: 'Preferem evitar o confronto direto — -2 em testes de Vigor.',
  },
  'Aventura': {
    cor: '#806030',
    bonus_pericias: ['Sobrevivência', 'Luta'],
    debuff_combate: 'Penalidade de -2 em testes de Expressão ao ler livros em combate',
    desc_bonus: 'Corpos treinados para resistir ao que o mundo joga contra eles.',
    desc_debuff: 'Agir com a cabeça em combate é difícil — -2 em Expressão ao ler livros sob pressão.',
  },
  'Fantasia': {
    cor: '#604080',
    bonus_pericias: ['Ocultismo', 'Escrita'],
    debuff_combate: 'Penalidade de -3 em testes de Razão contra ilusões do conto',
    desc_bonus: 'Familiarizados com o impossível — ocultismo e escrita fluem naturalmente.',
    desc_debuff: 'O mundo dos contos os confunde mais — -3 em Razão contra ilusões.',
  },
};

// Custo de sanidade ao ler livros por compatibilidade de gênero
function custoSanidadeLeitura(generoLivro, generoPrincipal, generoFraqueza) {
  if (generoLivro === generoPrincipal) return '−2 Sanidade (gênero familiar)';
  if (generoLivro === generoFraqueza)  return '−8 Sanidade (gênero fraqueza)';
  return '−5 Sanidade (gênero neutro)';
}

const SANIDADE_ESTAGIOS = [
  { min: 81,  max: 100, nome: 'Estável',        cor: 'alto' },
  { min: 61,  max: 80,  nome: 'Ecos',           cor: 'alto' },
  { min: 41,  max: 60,  nome: 'Distorção',      cor: 'medio' },
  { min: 11,  max: 40,  nome: 'Incorporação',   cor: 'baixo' },
  { min: 1,   max: 10,  nome: 'Colapso',        cor: 'critico' },
  { min: 0,   max: 0,   nome: 'Fim do Capítulo',cor: 'critico' },
];

function getSanidadeEstagio(val) {
  for (const e of SANIDADE_ESTAGIOS) {
    if (val >= e.min && val <= e.max) return e;
  }
  return SANIDADE_ESTAGIOS[SANIDADE_ESTAGIOS.length - 1];
}

function sanidadePercent(val, max) {
  return Math.max(0, Math.min(100, Math.round((val / (max || 100)) * 100)));
}

function exposicaoPercent(val) {
  return Math.max(0, Math.min(100, val));
}

// ══════════════════════════════════════════════════
//  ESTADO INICIAL
// ══════════════════════════════════════════════════
function defaultState() {
  const pericias = {};
  for (const [nome, def] of Object.entries(PERICIAS_DEF)) {
    pericias[nome] = { attr: def.attr, pontos: 0 };
  }
  return {
    nome: '',
    subtitulo: '',
    genero_principal: 'Investigação',
    genero_fraqueza: 'Romance',
    obra_titulo: '',
    obra_descricao: '',
    atributos: { razao: 1, vigor: 1, vontade: 1, expressao: 1 },
    pericias,
    sanidade: { atual: 100, max: 100 },
    vida: { atual: 10, max: 10 },
    exposicao: 0,
    ca: 10,
    iniciativa: 0,
    ataques: [],
    livros: [],
    caracteristicas: [],
    equipamento: [],
    notas: '',
    hist_origem: '',
    hist_motivacao: '',
    hist_tracos: '',
    hist_ideal: '',
    hist_vinculo: '',
    hist_fraqueza_pessoal: '',
    hist_idade: '',
    hist_aparencia: '',
    hist_relacoes: [],
  };
}

// ══════════════════════════════════════════════════
//  MODAL
// ══════════════════════════════════════════════════
function openModal({ title, fields, onSave, onDelete }) {
  const overlay = document.getElementById('skill-modal');
  overlay.classList.remove('hidden');
  document.getElementById('modal-title').textContent = title;

  const body = document.getElementById('modal-body');
  body.innerHTML = '';

  fields.forEach(f => {
    const wrap = document.createElement('div');
    wrap.className = 'modal-field';
    let input;

    if (f.type === 'textarea') {
      input = document.createElement('textarea');
      input.className = 'modal-textarea';
    } else if (f.type === 'select') {
      input = document.createElement('select');
      input.className = 'modal-select';
      f.options.forEach(o => {
        const opt = document.createElement('option');
        opt.value = o.value; opt.textContent = o.label;
        if (f.value === o.value) opt.selected = true;
        input.appendChild(opt);
      });
    } else {
      input = document.createElement('input');
      input.type = f.type || 'text';
      input.className = 'modal-input';
      input.placeholder = f.placeholder || '';
    }

    if (f.type !== 'select') input.value = f.value || '';
    input.dataset.field = f.key;
    input.id = 'mf-' + f.key;

    const label = document.createElement('label');
    label.className = 'modal-label';
    label.textContent = f.label;
    label.htmlFor = 'mf-' + f.key;

    wrap.appendChild(label);
    wrap.appendChild(input);
    body.appendChild(wrap);
  });

  const foot = document.getElementById('modal-foot');
  foot.innerHTML = '';
  const leftSide = document.createElement('div');

  if (onDelete) {
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-modal-delete';
    delBtn.textContent = '✕ Remover';
    delBtn.addEventListener('click', () => {
      if (confirm('Remover este item?')) { closeModal(); onDelete(); }
    });
    leftSide.appendChild(delBtn);
  }

  const rightSide = document.createElement('div');
  rightSide.className = 'modal-foot-right';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn-modal-cancel';
  cancelBtn.textContent = 'Cancelar';
  cancelBtn.addEventListener('click', closeModal);

  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn-modal-save';
  saveBtn.textContent = 'Salvar';
  saveBtn.addEventListener('click', () => {
    const values = {};
    fields.forEach(f => {
      const el = document.getElementById('mf-' + f.key);
      values[f.key] = el ? el.value.trim() : '';
    });
    if (onSave(values) !== false) closeModal();
  });

  rightSide.appendChild(cancelBtn);
  rightSide.appendChild(saveBtn);
  foot.appendChild(leftSide);
  foot.appendChild(rightSide);

  setTimeout(() => {
    const first = body.querySelector('input,textarea,select');
    if (first) first.focus();
  }, 50);
}

function closeModal() {
  document.getElementById('skill-modal').classList.add('hidden');
}

// ══════════════════════════════════════════════════
//  MODAIS DE CONTEUDO
// ══════════════════════════════════════════════════
function openAtaqueModal(idx) {
  const isNew = idx === -1;
  const atk = isNew ? { nome: '', bonus: '', dano: '' } : state.ataques[idx];
  openModal({
    title: isNew ? '✦ Novo Ataque' : '✦ Editar Ataque',
    fields: [
      { key: 'nome',  label: 'Nome', placeholder: 'Ex: Bengala', value: atk.nome },
      { key: 'bonus', label: 'Bônus', placeholder: 'Ex: +3', value: atk.bonus },
      { key: 'dano',  label: 'Dano', placeholder: 'Ex: 1d6+1', value: atk.dano },
    ],
    onSave(vals) {
      if (!vals.nome) { alert('Nome é obrigatório.'); return false; }
      if (!state.ataques) state.ataques = [];
      const obj = { nome: vals.nome, bonus: vals.bonus, dano: vals.dano };
      if (isNew) state.ataques.push(obj); else state.ataques[idx] = obj;
      render(); scheduleSave();
    },
    onDelete: isNew ? null : () => { state.ataques.splice(idx, 1); render(); scheduleSave(); }
  });
}

function openLivroModal(idx) {
  const isNew = idx === -1;
  const livro = isNew ? { titulo: '', autor: '', genero: 'Terror', conto: '', custo: '', efeito: '' }
                      : state.livros[idx];
  openModal({
    title: isNew ? '✦ Novo Livro' : '✦ Editar Livro',
    fields: [
      { key: 'titulo', label: 'Título do Conto', placeholder: 'Ex: Chapeuzinho Vermelho', value: livro.titulo },
      { key: 'autor',  label: 'Autor Original', placeholder: 'Ex: Irmãos Grimm', value: livro.autor },
      { key: 'genero', label: 'Gênero', type: 'select', value: livro.genero,
        options: GENEROS.map(g => ({ value: g, label: g })) },
      { key: 'conto',  label: 'Resumo do Conto', type: 'textarea',
        placeholder: 'O que a versão original conta...', value: livro.conto },
      { key: 'custo',  label: 'Custo de Sanidade', placeholder: 'Ex: -5 Sanidade', value: livro.custo },
      { key: 'efeito', label: 'Efeito ao Ler', type: 'textarea',
        placeholder: 'O que acontece quando o personagem lê este livro...', value: livro.efeito },
    ],
    onSave(vals) {
      if (!vals.titulo) { alert('Título é obrigatório.'); return false; }
      if (!state.livros) state.livros = [];
      const obj = { titulo: vals.titulo, autor: vals.autor, genero: vals.genero,
                    conto: vals.conto, custo: vals.custo, efeito: vals.efeito };
      if (isNew) state.livros.push(obj); else state.livros[idx] = obj;
      render(); scheduleSave();
    },
    onDelete: isNew ? null : () => { state.livros.splice(idx, 1); render(); scheduleSave(); }
  });
}

function openCaracteristicaModal(idx) {
  const isNew = idx === -1;
  const c = isNew ? { titulo: '', texto: '' } : state.caracteristicas[idx];
  openModal({
    title: isNew ? '✦ Nova Característica' : '✦ Editar Característica',
    fields: [
      { key: 'titulo', label: 'Título', placeholder: 'Ex: Voz do Narrador', value: c.titulo },
      { key: 'texto',  label: 'Descrição', type: 'textarea', placeholder: 'Descreva o efeito...', value: c.texto },
    ],
    onSave(vals) {
      if (!vals.titulo) { alert('Título é obrigatório.'); return false; }
      if (!state.caracteristicas) state.caracteristicas = [];
      const obj = { titulo: vals.titulo, texto: vals.texto };
      if (isNew) state.caracteristicas.push(obj); else state.caracteristicas[idx] = obj;
      render(); scheduleSave();
    },
    onDelete: isNew ? null : () => { state.caracteristicas.splice(idx, 1); render(); scheduleSave(); }
  });
}

function openEquipModal(idx) {
  const isNew = idx === -1;
  const eq = isNew ? { nome: '', info: '' } : state.equipamento[idx];
  openModal({
    title: isNew ? '✦ Novo Item' : '✦ Editar Item',
    fields: [
      { key: 'nome', label: 'Nome do Item', placeholder: 'Ex: Lanterna de óleo', value: eq.nome },
      { key: 'info', label: 'Descrição', placeholder: 'Ex: Dura 4 horas', value: eq.info || '' },
    ],
    onSave(vals) {
      if (!vals.nome) { alert('Nome é obrigatório.'); return false; }
      if (!state.equipamento) state.equipamento = [];
      const obj = { nome: vals.nome, info: vals.info };
      if (isNew) state.equipamento.push(obj); else state.equipamento[idx] = obj;
      render(); scheduleSave();
    },
    onDelete: isNew ? null : () => { state.equipamento.splice(idx, 1); render(); scheduleSave(); }
  });
}

// ══════════════════════════════════════════════════
//  RENDER
// ══════════════════════════════════════════════════
function render() {
  const s = state;
  if (!s.vida) s.vida = { atual: 10, max: 10 };
  const atrs = s.atributos;
  const san = s.sanidade || { atual: 100, max: 100 };
  const estagio = getSanidadeEstagio(san.atual);
  const sanPct = sanidadePercent(san.atual, san.max);
  const expPct = exposicaoPercent(s.exposicao || 0);

  document.getElementById('page').innerHTML = `
    <!-- HEADER -->
    <header class="char-header">
      <div class="avatar-slot" id="avatar-slot" title="Clique para mudar • Ctrl+Clique para remover"
        onclick="openAvatarPicker(event)" oncontextmenu="openAvatarPicker(event);return false;">
        ${getAvatarHTML()}
      </div>
      <input type="file" id="avatar-input" accept="image/*" style="display:none" onchange="handleAvatarUpload(event)">
      <div class="header-body">
        <input id="f-nome" class="char-name" data-field="nome" value="${esc(s.nome)}" placeholder="Nome do Escritor">
        <input id="f-subtitulo" class="char-subtitle" data-field="subtitulo" value="${esc(s.subtitulo)}" placeholder="Subtítulo">
        <div class="char-divider"></div>
        <div class="char-tags">
          <span class="char-tag">Genero: ${esc(s.genero_principal || '—')}</span>
          <span class="char-tag" style="border-color:var(--crimson);">Fraqueza: ${esc(s.genero_fraqueza || '—')}</span>
          <span class="char-tag">SAN ${san.atual}/${san.max}</span>
          <span class="char-tag" style="border-color:var(--teal-lt);color:var(--teal-lt);">EXP ${s.exposicao || 0}%</span>
        </div>
      </div>
    </header>

    <!-- TABS -->
    <nav class="tab-nav">
      <button class="tab-btn" data-tab="principal">Principal</button>
      <button class="tab-btn" data-tab="acervo">Acervo</button>
      <button class="tab-btn" data-tab="habilidades">Habilidades</button>
      <button class="tab-btn" data-tab="dados">Dados</button>
      <button class="tab-btn" data-tab="historia">História</button>
      <button class="tab-btn" data-tab="notas">Notas</button>
    </nav>

    <!-- ABA: PRINCIPAL -->
    <div class="tab-panel" data-panel="principal">
      <div class="principal-grid">

        <div class="principal-left">

          <div class="section-label">Atributos</div>
          <div class="attr-grid">
            ${Object.entries(atrs).map(([k, v]) => `
              <div class="attr-card">
                <span class="attr-abbr">${ATTR_SHORT[k] || k}</span>
                <div class="attr-score">${v}</div>
                <span class="attr-mod">${fmtMod(calcMod(v))}</span>
                <div class="attr-controls">
                  <button class="attr-btn" data-attrdelta="${k}" data-d="-1">−</button>
                  <button class="attr-btn" data-attrdelta="${k}" data-d="1">+</button>
                </div>
              </div>`).join('')}
          </div>

          <div class="section-label">Sanidade</div>
          <div class="sanidade-block">
            <div class="sanidade-label-row">
              <span class="sanidade-label">Sanidade — ${estagio.nome}</span>
              <div class="sanidade-nums">
                <input type="number" min="0" max="${san.max}" value="${san.atual}" data-san="atual"> 
                <span class="sanidade-sep">/</span>
                <input type="number" min="0" max="100" value="${san.max}" data-san="max">
              </div>
            </div>
            <div class="sanidade-bar-wrap">
              <div class="sanidade-bar ${estagio.cor}" id="san-bar" style="width:${sanPct}%"></div>
            </div>
            <div class="sanidade-estagio">${estagio.nome} · ${san.atual} pontos</div>
          </div>

          <div class="section-label">Exposição</div>
          <div class="exposicao-block">
            <div class="exp-row">
              <span class="exp-label">Nível de Exposição</span>
              <span class="exp-val">${s.exposicao || 0}%</span>
            </div>
            <div class="exp-bar-wrap">
              <div class="exp-bar" id="exp-bar" style="width:${expPct}%"></div>
            </div>
            <div class="exp-controles">
              <button class="exp-btn" data-expdelta="-1">− 1</button>
              <button class="exp-btn" data-expdelta="-3">− 3</button>
              <button class="exp-btn" data-expdelta="1">+ 1</button>
              <button class="exp-btn" data-expdelta="3">+ 3</button>
              <button class="exp-btn" data-expdelta="5">+ 5</button>
            </div>
          </div>

          <div class="section-label">Vida</div>
          <div class="sanidade-block" style="border-color:var(--crimson);">
            <div class="sanidade-label-row">
              <span class="sanidade-label" style="color:var(--crimson-lt);">Pontos de Vida</span>
              <div class="sanidade-nums">
                <input type="number" min="0" max="${s.vida?.max || 20}" value="${s.vida?.atual ?? s.vida?.max ?? 10}" data-vida="atual">
                <span class="sanidade-sep">/</span>
                <input type="number" min="0" max="999" value="${s.vida?.max ?? 10}" data-vida="max">
              </div>
            </div>
            <div class="sanidade-bar-wrap">
              <div id="vida-bar" style="height:100%;background:var(--crimson-lt);transition:width .4s ease;width:${Math.max(0,Math.min(100,Math.round(((s.vida?.atual ?? s.vida?.max ?? 10) / (s.vida?.max || 10)) * 100)))}%"></div>
            </div>
            <div style="display:flex;gap:6px;margin-top:8px;">
              <button class="exp-btn" data-vidadelta="-1" style="color:var(--crimson-lt);border-color:var(--crimson);">− 1</button>
              <button class="exp-btn" data-vidadelta="-5" style="color:var(--crimson-lt);border-color:var(--crimson);">− 5</button>
              <button class="exp-btn" data-vidadelta="1" style="color:#4a8a40;border-color:#4a8a40;">+ 1</button>
              <button class="exp-btn" data-vidadelta="5" style="color:#4a8a40;border-color:#4a8a40;">+ 5</button>
            </div>
          </div>

          <div class="section-label">Status de Combate</div>
          <div class="status-grid">
            <div class="status-cell">
              <span class="s-label">CA</span>
              <div class="s-val"><input data-core="ca" type="number" value="${esc(s.ca)}"></div>
            </div>
            <div class="status-cell">
              <span class="s-label">Iniciativa</span>
              <div class="s-val"><input data-core="iniciativa" type="number" value="${esc(s.iniciativa)}"></div>
            </div>
            <div class="status-cell">
              <span class="s-label">Movimento</span>
              <div class="s-val"><input data-core="movimento" type="number" value="${esc(s.movimento || 9)}"></div>
            </div>
          </div>

        </div>

        <div class="principal-right">

          <div class="section-label">Gênero Literário</div>
          <div class="genero-grid">
            <div class="genero-card principal">
              <span class="genero-titulo">Gênero Principal</span>
              <select class="genero-select" data-field="genero_principal">
                ${GENEROS.map(g => `<option value="${g}" ${s.genero_principal === g ? 'selected' : ''}>${g}</option>`).join('')}
              </select>
              ${s.genero_principal && GENERO_RULES[s.genero_principal] ? `
                <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);">
                  <div style="font-family:'Cinzel',serif;font-size:.44rem;letter-spacing:.12em;text-transform:uppercase;color:var(--teal-lt);margin-bottom:3px;">✦ Bônus</div>
                  <div style="font-size:.72rem;color:var(--ink-2);line-height:1.5;">${GENERO_RULES[s.genero_principal].bonus_pericias.join(', ')}</div>
                  <div style="font-size:.65rem;color:var(--ink-dim);margin-top:2px;font-style:italic;">${GENERO_RULES[s.genero_principal].desc_bonus}</div>
                </div>` : ''}
            </div>
            <div class="genero-card fraqueza">
              <span class="genero-titulo">Fraqueza Narrativa</span>
              <select class="genero-select" data-field="genero_fraqueza">
                ${GENEROS.map(g => `<option value="${g}" ${s.genero_fraqueza === g ? 'selected' : ''}>${g}</option>`).join('')}
              </select>
              ${s.genero_fraqueza && GENERO_RULES[s.genero_fraqueza] ? `
                <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);">
                  <div style="font-family:'Cinzel',serif;font-size:.44rem;letter-spacing:.12em;text-transform:uppercase;color:var(--crimson-lt);margin-bottom:3px;">✕ Debuff em Combate</div>
                  <div style="font-size:.72rem;color:var(--ink-2);line-height:1.5;">${GENERO_RULES[s.genero_fraqueza].debuff_combate}</div>
                  <div style="font-size:.65rem;color:var(--ink-dim);margin-top:2px;font-style:italic;">${GENERO_RULES[s.genero_fraqueza].desc_debuff}</div>
                </div>` : ''}
            </div>
          </div>
          ${s.genero_principal && s.genero_fraqueza && s.genero_principal === s.genero_fraqueza ? `
            <div style="margin-top:6px;padding:8px 12px;border:1px solid var(--gold);background:var(--gold-dim);font-family:'Cinzel',serif;font-size:.5rem;letter-spacing:.12em;color:var(--gold);text-transform:uppercase;">
              ⚠ Gênero Principal e Fraqueza iguais — debuffs dobrados ao ler livros deste gênero
            </div>` : ''}

          <div class="section-label">Obra Inacabada</div>
          <div class="obra-card">
            <div class="obra-titulo">A história que ficou para trás</div>
            <input class="obra-input" data-field="obra_titulo" value="${esc(s.obra_titulo)}"
              placeholder="Título da obra inacabada...">
            <textarea class="obra-textarea" data-field="obra_descricao"
              placeholder="O que era essa história. Por que ficou para trás...">${esc(s.obra_descricao)}</textarea>
          </div>

          <div class="section-label">Perícias</div>
          <div class="check-list">
            ${Object.entries(s.pericias || {}).map(([nome, p]) => {
              const attrVal = atrs[p.attr] || 1;
              const mod = calcMod(attrVal) + (p.pontos || 0);
              return `<div class="check-row">
                <div class="chk ${p.pontos > 0 ? 'on' : ''}" data-skill="${nome}" title="Clique para alternar ponto"></div>
                <span class="check-attr">${ATTR_SHORT[p.attr] || p.attr}</span>
                <div class="check-name">${nome}</div>
                <div class="check-bonus">${fmtMod(mod)}</div>
              </div>`;
            }).join('')}
          </div>

        </div>

      </div>
    </div>

    <!-- ABA: ACERVO -->
    <div class="tab-panel" data-panel="acervo">
      <div class="section-label">Livros do Acervo</div>
      ${s.livros?.length ? s.livros.map((l, i) => {
        const custoAuto = custoSanidadeLeitura(l.genero, s.genero_principal, s.genero_fraqueza);
        const corCusto = l.genero === s.genero_fraqueza ? 'var(--crimson-lt)' : l.genero === s.genero_principal ? 'var(--teal-lt)' : 'var(--ink-dim)';
        return `
        <div class="livro-item" id="livro-${i}">
          <div class="livro-header" data-livro="${i}">
            <div class="livro-dot"></div>
            <div class="livro-titulo">${esc(l.titulo)}</div>
            <div class="livro-genero">${esc(l.genero)}</div>
            <div class="livro-custo" style="color:${corCusto}">${custoAuto}</div>
            <div class="item-actions">
              <button class="btn-edit-item" data-edit-livro="${i}" title="Editar">✎</button>
              <button class="btn-del-item" data-del-livro="${i}" title="Remover">✕</button>
            </div>
            <div class="livro-arrow">▶</div>
          </div>
          <div class="livro-body">
            ${l.autor ? `<div style="font-family:'Cinzel',serif;font-size:.55rem;letter-spacing:.15em;color:var(--ink-dim);text-transform:uppercase;margin-bottom:6px;">Autor: ${esc(l.autor)}</div>` : ''}
            ${l.conto ? `<div style="margin-bottom:8px;font-style:italic;color:var(--ink-2);">${esc(l.conto)}</div>` : ''}
            ${l.efeito ? `<div style="color:var(--gold-lt);font-size:.78rem;"><strong>Efeito:</strong> ${esc(l.efeito)}</div>` : ''}
          </div>
        </div>`}).join('')
      : `<div class="empty-hint">Nenhum livro no acervo.</div>`}
      <button class="btn-add-skill" id="btn-add-livro"><span class="btn-icon">+</span> Adicionar Livro</button>
    </div>

    <!-- ABA: HABILIDADES -->
    <div class="tab-panel" data-panel="habilidades">

      <div class="section-label">Ataques</div>
      ${s.ataques?.length ? `
        <div>
          ${s.ataques.map((a, i) => `
            <div class="feat-item">
              <div class="feat-header" style="cursor:default;">
                <div class="feat-dot"></div>
                <div class="feat-name">${esc(a.nome)}</div>
                <div style="font-family:'Cinzel',serif;font-size:.55rem;color:var(--gold);margin-right:8px;">${esc(a.bonus)} · ${esc(a.dano)}</div>
                <div class="item-actions">
                  <button class="btn-edit-item" data-edit-ataque="${i}">✎</button>
                  <button class="btn-del-item" data-del-ataque="${i}">✕</button>
                </div>
              </div>
            </div>`).join('')}
        </div>` : `<div class="empty-hint">Nenhum ataque cadastrado.</div>`}
      <button class="btn-add-skill" id="btn-add-ataque"><span class="btn-icon">+</span> Adicionar Ataque</button>

      <div class="section-label" style="margin-top:20px">Características</div>
      ${s.caracteristicas?.length ? s.caracteristicas.map((c, i) => `
        <div class="feat-item" id="feat-${i}">
          <div class="feat-header" data-feat="${i}">
            <div class="feat-dot"></div>
            <div class="feat-name">${esc(c.titulo)}</div>
            <div class="item-actions">
              <button class="btn-edit-item" data-edit-caract="${i}">✎</button>
              <button class="btn-del-item" data-del-caract="${i}">✕</button>
            </div>
            <div class="feat-arrow">▶</div>
          </div>
          <div class="feat-body">
            <div class="feat-desc">${esc(c.texto)}</div>
          </div>
        </div>`).join('')
      : `<div class="empty-hint">Nenhuma característica cadastrada.</div>`}
      <button class="btn-add-skill" id="btn-add-caract"><span class="btn-icon">+</span> Adicionar Característica</button>

      <div class="section-label" style="margin-top:20px">Equipamento</div>
      ${s.equipamento?.length ? `
        <div>
          ${s.equipamento.map((e, i) => `
            <div class="feat-item">
              <div class="feat-header" style="cursor:default;">
                <div class="feat-dot"></div>
                <div class="feat-name">${esc(e.nome)}</div>
                ${e.info ? `<div style="font-size:.75rem;color:var(--ink-dim);flex:1;">${esc(e.info)}</div>` : ''}
                <div class="item-actions">
                  <button class="btn-edit-item" data-edit-equip="${i}">✎</button>
                  <button class="btn-del-item" data-del-equip="${i}">✕</button>
                </div>
              </div>
            </div>`).join('')}
        </div>` : `<div class="empty-hint">Nenhum item cadastrado.</div>`}
      <button class="btn-add-skill" id="btn-add-equip"><span class="btn-icon">+</span> Adicionar Item</button>

    </div>

    <!-- ABA: DADOS -->
    <div class="tab-panel" data-panel="dados">
      <div class="dice-panel">
        <div class="roll-mode-row">
          <button class="roll-mode-btn active" data-mode="normal">Normal</button>
          <button class="roll-mode-btn" data-mode="vantagem">Vantagem</button>
          <button class="roll-mode-btn" data-mode="desvantagem">Desvantagem</button>
        </div>
        <div class="roll-mode-hint" id="roll-mode-hint">Role normalmente</div>

        <div class="dice-row">
          ${[4,6,8,10,12,20,100].map(d => `<div class="die" data-die="${d}">d${d}</div>`).join('')}
        </div>

        <div class="dice-result" id="dice-result">—</div>
        <div class="dice-detail" id="dice-detail"></div>

        <div class="section-label" style="margin-top:20px">Histórico</div>
        <div class="dice-log" id="dice-log"></div>
      </div>
    </div>

    <!-- ABA: HISTORIA -->
    <div class="tab-panel" data-panel="historia">

      <div class="section-label">Origem</div>
      <div class="hist-narrative">
        <span class="hist-meta-label">De onde veio este escritor</span>
        <textarea class="hist-textarea" data-field="hist_origem"
          placeholder="Cidade natal, família, formação, o que o levou a escrever...">${esc(s.hist_origem)}</textarea>
      </div>

      <div class="section-label">Motivação</div>
      <div class="hist-narrative">
        <span class="hist-meta-label">Por que ele acredita no que escreve</span>
        <textarea class="hist-textarea" data-field="hist_motivacao"
          placeholder="O que o move. Por que os finais felizes importam para ele...">${esc(s.hist_motivacao)}</textarea>
      </div>

      <div class="section-label">Personalidade</div>
      <div class="hist-traits-grid">
        <div class="hist-trait-card" data-accent="gold">
          <div class="hist-trait-icon">◈</div>
          <span class="hist-trait-label">Traços</span>
          <textarea class="hist-trait-area" data-field="hist_tracos"
            placeholder="Como este escritor age, fala, pensa...">${esc(s.hist_tracos)}</textarea>
        </div>
        <div class="hist-trait-card" data-accent="cyan">
          <div class="hist-trait-icon">✦</div>
          <span class="hist-trait-label">Ideal</span>
          <textarea class="hist-trait-area" data-field="hist_ideal"
            placeholder="O princípio que ele nunca abandona...">${esc(s.hist_ideal)}</textarea>
        </div>
        <div class="hist-trait-card" data-accent="green">
          <div class="hist-trait-icon">⚯</div>
          <span class="hist-trait-label">Vínculo</span>
          <textarea class="hist-trait-area" data-field="hist_vinculo"
            placeholder="Uma pessoa, lugar ou coisa de importância vital...">${esc(s.hist_vinculo)}</textarea>
        </div>
        <div class="hist-trait-card" data-accent="red">
          <div class="hist-trait-icon">☽</div>
          <span class="hist-trait-label">Fraqueza Pessoal</span>
          <textarea class="hist-trait-area" data-field="hist_fraqueza_pessoal"
            placeholder="Uma falha de caráter, fobia, ponto cego...">${esc(s.hist_fraqueza_pessoal)}</textarea>
        </div>
      </div>

      <div class="section-label">Aparência</div>
      <div class="hist-appearance-grid">
        <div class="hist-app-item">
          <span class="hist-meta-label">Idade</span>
          <input type="text" class="hist-meta-input" data-field="hist_idade" value="${esc(s.hist_idade)}" placeholder="Ex: 34 anos">
        </div>
        <div class="hist-app-item hist-app-full">
          <span class="hist-meta-label">Descrição Visual</span>
          <textarea class="hist-textarea hist-textarea--sm" data-field="hist_aparencia"
            placeholder="Como este escritor aparenta, como se veste, marcas...">${esc(s.hist_aparencia)}</textarea>
        </div>
      </div>

      <div class="section-label">Relações</div>
      <div class="hist-relations" id="hist-relations-list">
        ${buildRelacoes(s.hist_relacoes)}
      </div>
      <button class="hist-add-btn" id="hist-add-rel" type="button">＋ Adicionar Relação</button>

    </div>

    <!-- ABA: NOTAS -->
    <div class="tab-panel" data-panel="notas">
      <div class="section-label">Anotações de Sessão</div>
      <textarea class="notes-area" id="notes"
        placeholder="Pistas encontradas, suspeitas, eventos importantes...">${esc(s.notas)}</textarea>
    </div>
  `;

  attachEvents();
  setActiveTab(activeTab);
}

// ══════════════════════════════════════════════════
//  HELPERS DE HISTORIA
// ══════════════════════════════════════════════════
function buildRelacoes(relacoes) {
  if (!Array.isArray(relacoes) || relacoes.length === 0) {
    return `<p class="hist-empty">Nenhuma relação registrada ainda.</p>`;
  }
  return relacoes.map((r, i) => `
    <div class="hist-rel-card" data-idx="${i}">
      <div class="hist-rel-header">
        <input type="text" class="hist-rel-nome" data-rel-idx="${i}" data-rel-field="nome"
          value="${esc(r.nome)}" placeholder="Nome da pessoa / organização">
        <select class="hist-rel-tipo" data-rel-idx="${i}" data-rel-field="tipo">
          ${['Aliado','Inimigo','Neutro','Família','Mentor','Rival','Desconhecido']
            .map(t => `<option value="${t}" ${r.tipo===t?'selected':''}>${t}</option>`).join('')}
        </select>
        <button class="hist-rel-del" data-rel-idx="${i}" type="button">✕</button>
      </div>
      <textarea class="hist-rel-desc" data-rel-idx="${i}" data-rel-field="descricao"
        placeholder="História em comum, última vez que se viram...">${esc(r.descricao)}</textarea>
    </div>
  `).join('');
}

// ══════════════════════════════════════════════════
//  EVENTS
// ══════════════════════════════════════════════════
function setActiveTab(name) {
  activeTab = name;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === name));
}

function attachEvents() {
  // Tabs
  document.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', () => setActiveTab(b.dataset.tab)));

  // Campos diretos — selects de gênero re-renderizam, outros só salvam
  document.querySelectorAll('[data-field]').forEach(el => {
    const needsRender = ['genero_principal', 'genero_fraqueza'].includes(el.dataset.field);
    el.addEventListener('input', () => {
      state[el.dataset.field] = el.value;
      if (needsRender) render(); else scheduleSave();
    });
    el.addEventListener('change', () => {
      state[el.dataset.field] = el.value;
      if (needsRender) { render(); scheduleSave(); } else scheduleSave();
    });
  });

  // Atributos
  document.querySelectorAll('[data-attrdelta]').forEach(el => el.addEventListener('click', () => {
    const k = el.dataset.attrdelta;
    const d = parseInt(el.dataset.d);
    state.atributos[k] = Math.max(1, Math.min(25, (state.atributos[k] || 1) + d));
    render(); scheduleSave();
  }));

  // Core inputs
  document.querySelectorAll('[data-core]').forEach(el => el.addEventListener('input', () => {
    state[el.dataset.core] = parseInt(el.value) || 0;
    scheduleSave();
  }));

  // Sanidade
  document.querySelectorAll('[data-san]').forEach(el => el.addEventListener('input', () => {
    if (!state.sanidade) state.sanidade = { atual: 100, max: 100 };
    state.sanidade[el.dataset.san] = Math.max(0, Math.min(100, parseInt(el.value) || 0));
    const bar = document.getElementById('san-bar');
    if (bar) {
      const pct = sanidadePercent(state.sanidade.atual, state.sanidade.max);
      const est = getSanidadeEstagio(state.sanidade.atual);
      bar.style.width = pct + '%';
      bar.className = 'sanidade-bar ' + est.cor;
    }
    atualizarEfeitosHorror();
    scheduleSave();
  }));

  // Vida inputs
  document.querySelectorAll('[data-vida]').forEach(el => el.addEventListener('input', () => {
    if (!state.vida) state.vida = { atual: 10, max: 10 };
    state.vida[el.dataset.vida] = Math.max(0, parseInt(el.value) || 0);
    atualizarEfeitosHorror();
    const bar = document.getElementById('vida-bar');
    if (bar) {
      const pct = Math.max(0, Math.min(100, Math.round((state.vida.atual / (state.vida.max || 1)) * 100)));
      bar.style.width = pct + '%';
    }
    scheduleSave();
  }));

  // Vida delta
  document.querySelectorAll('[data-vidadelta]').forEach(el => el.addEventListener('click', () => {
    if (!state.vida) state.vida = { atual: 10, max: 10 };
    const d = parseInt(el.dataset.vidadelta);
    state.vida.atual = Math.max(0, Math.min(state.vida.max, state.vida.atual + d));
    atualizarEfeitosHorror();
    render(); scheduleSave();
  }));

  // Exposição
  document.querySelectorAll('[data-expdelta]').forEach(el => el.addEventListener('click', () => {
    const d = parseInt(el.dataset.expdelta);
    state.exposicao = Math.max(0, Math.min(100, (state.exposicao || 0) + d));
    const bar = document.getElementById('exp-bar');
    if (bar) bar.style.width = state.exposicao + '%';
    render(); scheduleSave();
  }));

  // Perícias
  document.querySelectorAll('[data-skill]').forEach(el => el.addEventListener('click', () => {
    const k = el.dataset.skill;
    if (!state.pericias[k]) state.pericias[k] = { attr: 'razao', pontos: 0 };
    state.pericias[k].pontos = state.pericias[k].pontos > 0 ? 0 : 1;
    render(); scheduleSave();
  }));

  // Acorrdion livros
  document.querySelectorAll('[data-livro]').forEach(el => el.addEventListener('click', e => {
    if (e.target.closest('.item-actions')) return;
    const item = document.getElementById('livro-' + el.dataset.livro);
    if (item) item.classList.toggle('open');
  }));

  // Accordion features
  document.querySelectorAll('[data-feat]').forEach(el => el.addEventListener('click', e => {
    if (e.target.closest('.item-actions')) return;
    const item = document.getElementById('feat-' + el.dataset.feat);
    if (item) item.classList.toggle('open');
  }));

  // Botoes add
  document.getElementById('btn-add-livro')  ?.addEventListener('click', () => openLivroModal(-1));
  document.getElementById('btn-add-ataque') ?.addEventListener('click', () => openAtaqueModal(-1));
  document.getElementById('btn-add-caract') ?.addEventListener('click', () => openCaracteristicaModal(-1));
  document.getElementById('btn-add-equip')  ?.addEventListener('click', () => openEquipModal(-1));

  // Editar
  document.querySelectorAll('[data-edit-livro]').forEach(el => el.addEventListener('click', e => {
    e.stopPropagation(); openLivroModal(parseInt(el.dataset.editLivro));
  }));
  document.querySelectorAll('[data-edit-ataque]').forEach(el => el.addEventListener('click', e => {
    e.stopPropagation(); openAtaqueModal(parseInt(el.dataset.editAtaque));
  }));
  document.querySelectorAll('[data-edit-caract]').forEach(el => el.addEventListener('click', e => {
    e.stopPropagation(); openCaracteristicaModal(parseInt(el.dataset.editCaract));
  }));
  document.querySelectorAll('[data-edit-equip]').forEach(el => el.addEventListener('click', e => {
    e.stopPropagation(); openEquipModal(parseInt(el.dataset.editEquip));
  }));

  // Deletar
  document.querySelectorAll('[data-del-livro]').forEach(el => el.addEventListener('click', e => {
    e.stopPropagation();
    if (confirm('Remover este livro?')) { state.livros.splice(parseInt(el.dataset.delLivro), 1); render(); scheduleSave(); }
  }));
  document.querySelectorAll('[data-del-ataque]').forEach(el => el.addEventListener('click', e => {
    e.stopPropagation();
    if (confirm('Remover?')) { state.ataques.splice(parseInt(el.dataset.delAtaque), 1); render(); scheduleSave(); }
  }));
  document.querySelectorAll('[data-del-caract]').forEach(el => el.addEventListener('click', e => {
    e.stopPropagation();
    if (confirm('Remover?')) { state.caracteristicas.splice(parseInt(el.dataset.delCaract), 1); render(); scheduleSave(); }
  }));
  document.querySelectorAll('[data-del-equip]').forEach(el => el.addEventListener('click', e => {
    e.stopPropagation();
    if (confirm('Remover?')) { state.equipamento.splice(parseInt(el.dataset.delEquip), 1); render(); scheduleSave(); }
  }));

  // Dados
  let rollMode = 'normal';
  document.querySelectorAll('[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      rollMode = btn.dataset.mode;
      document.querySelectorAll('[data-mode]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const hints = { normal: 'Role normalmente', vantagem: 'Rola 2 — usa o maior', desvantagem: 'Rola 2 — usa o menor' };
      const hint = document.getElementById('roll-mode-hint');
      if (hint) { hint.textContent = hints[rollMode]; hint.className = 'roll-mode-hint ' + rollMode; }
    });
  });

  document.querySelectorAll('[data-die]').forEach(el => el.addEventListener('click', () => {
    const d = parseInt(el.dataset.die);
    const isCrit20 = d === 20;

    // Animação do hexágono: spin rápido
    el.classList.remove('roll'); void el.offsetWidth; el.classList.add('roll');

    // Contador animado antes de revelar o resultado
    const res = document.getElementById('dice-result');
    const det = document.getElementById('dice-detail');
    res.className = 'dice-result rolling-counting';
    res.textContent = '…';
    det.innerHTML = '';

    let ticks = 0;
    const tickMax = 10;
    const tickInterval = setInterval(() => {
      ticks++;
      res.textContent = Math.floor(Math.random() * d) + 1;
      if (ticks >= tickMax) {
        clearInterval(tickInterval);

        // Resultado real
        const r1 = Math.floor(Math.random() * d) + 1;
        let result, detail = '', isCritical = false, isFumble = false;

        if (rollMode === 'vantagem') {
          const r2 = Math.floor(Math.random() * d) + 1;
          result = Math.max(r1, r2);
          isCritical = isCrit20 && result === 20;
          detail = `↑ [${result} <s style="opacity:.4">${Math.min(r1,r2)}</s>] · d${d} com vantagem`;
        } else if (rollMode === 'desvantagem') {
          const r2 = Math.floor(Math.random() * d) + 1;
          result = Math.min(r1, r2);
          isFumble = isCrit20 && result === 1;
          detail = `↓ [${result} <s style="opacity:.4">${Math.max(r1,r2)}</s>] · d${d} com desvantagem`;
        } else {
          result = r1;
          isCritical = isCrit20 && result === 20;
          isFumble = isCrit20 && result === 1;
          detail = `d${d}`;
        }

        if (isCritical) {
          res.textContent = result;
          res.className = 'dice-result critico';
          det.innerHTML = `<span style="color:var(--gold);letter-spacing:.2em;font-family:'Cinzel',serif;font-size:.75rem;animation:critText .4s ease both">✦ CRÍTICO ✦</span>`;
          dispararCritico();
        } else if (isFumble) {
          res.textContent = result;
          res.className = 'dice-result fumble';
          det.innerHTML = `<span style="color:var(--crimson-lt);letter-spacing:.2em;font-family:'Cinzel',serif;font-size:.75rem">✕ FALHA CRÍTICA ✕</span>`;
        } else {
          res.textContent = result;
          res.className = rollMode === 'vantagem' ? 'dice-result vantagem-result' : rollMode === 'desvantagem' ? 'dice-result desvantagem-result' : 'dice-result reveal';
          det.innerHTML = `<span style="color:var(--ink-dim)">${detail}</span>`;
        }

        // Log
        const log = document.getElementById('dice-log');
        const entry = document.createElement('div');
        entry.style.cssText = 'padding:3px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;';
        entry.innerHTML = `<span>d${d}</span><span style="color:${isCritical?'var(--gold)':isFumble?'var(--crimson-lt)':rollMode==='vantagem'?'var(--teal-lt)':rollMode==='desvantagem'?'var(--crimson-lt)':'var(--ink)'}">${isCritical?'✦ ':isFumble?'✕ ':''}${result}</span>`;
        log.prepend(entry);
      }
    }, 55);
  }));

  function dispararCritico() {
    // Cria partículas de crítico ao redor do resultado
    const panel = document.querySelector('[data-panel="dados"].active');
    if (!panel) return;
    const resultEl = document.getElementById('dice-result');
    if (!resultEl) return;
    const rect = resultEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    for (let i = 0; i < 18; i++) {
      const spark = document.createElement('div');
      spark.style.cssText = `
        position:fixed;z-index:9999;pointer-events:none;
        left:${cx}px;top:${cy}px;
        width:${3 + Math.random()*4}px;height:${3 + Math.random()*4}px;
        border-radius:50%;
        background:${Math.random()>.5?'var(--gold)':'var(--gold-lt)'};
        box-shadow:0 0 6px var(--gold);
      `;
      document.body.appendChild(spark);
      const angle = (i / 18) * Math.PI * 2 + (Math.random() - .5) * .5;
      const dist = 60 + Math.random() * 80;
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist;
      spark.animate([
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(0)`, opacity: 0 }
      ], { duration: 600 + Math.random() * 400, easing: 'cubic-bezier(.2,1,.4,1)', fill: 'forwards' })
        .onfinish = () => spark.remove();
    }

    // Flash na tela
    const flash = document.createElement('div');
    flash.style.cssText = 'position:fixed;inset:0;z-index:9998;pointer-events:none;background:radial-gradient(ellipse at center,rgba(200,160,40,.18) 0%,transparent 70%);';
    document.body.appendChild(flash);
    flash.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: 'forwards' }).onfinish = () => flash.remove();
  }

  // Historia
  attachHistoriaEvents();

  // Notas
  const notes = document.getElementById('notes');
  if (notes) notes.addEventListener('input', e => { state.notas = e.target.value; scheduleSave(); });
}

function attachHistoriaEvents() {
  document.querySelectorAll('#page [data-field]').forEach(el => {
    el.addEventListener('input', () => { state[el.dataset.field] = el.value; scheduleSave(); });
    el.addEventListener('change', () => { state[el.dataset.field] = el.value; scheduleSave(); });
  });

  const addBtn = document.getElementById('hist-add-rel');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      if (!Array.isArray(state.hist_relacoes)) state.hist_relacoes = [];
      state.hist_relacoes.push({ nome: '', tipo: 'Neutro', descricao: '' });
      rerenderRelacoes(); scheduleSave();
    });
  }
  attachRelEventDelegation();
}

function rerenderRelacoes() {
  const list = document.getElementById('hist-relations-list');
  if (!list) return;
  list.innerHTML = buildRelacoes(state.hist_relacoes);
  attachRelEventDelegation();
}

function attachRelEventDelegation() {
  const list = document.getElementById('hist-relations-list');
  if (!list) return;
  list.querySelectorAll('[data-rel-idx]').forEach(el => {
    const i = parseInt(el.dataset.relIdx);
    const field = el.dataset.relField;
    if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && field) {
      el.addEventListener('input', () => {
        if (!Array.isArray(state.hist_relacoes)) return;
        state.hist_relacoes[i][field] = el.value; scheduleSave();
      });
    }
    if (el.tagName === 'SELECT' && field) {
      el.addEventListener('change', () => {
        if (!Array.isArray(state.hist_relacoes)) return;
        state.hist_relacoes[i][field] = el.value; scheduleSave();
      });
    }
  });
  list.querySelectorAll('.hist-rel-del').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.dataset.relIdx);
      if (!Array.isArray(state.hist_relacoes)) return;
      state.hist_relacoes.splice(i, 1); rerenderRelacoes(); scheduleSave();
    });
  });
}

// ══════════════════════════════════════════════════
//  EFEITOS DE HORROR — SANIDADE E VIDA
// ══════════════════════════════════════════════════

let _horrorInterval = null;
const _alucinacoes = [
  'ela está reescrevendo',
  'você não escolheu estar aqui',
  'o final já foi escrito',
  'Marisul',
  'não foi',
  'pages that bleed',
  'o conto vence',
  'você é personagem',
  '✦',
  'leia',
  'o manuscrito já terminou',
  'quem segura a pena?',
  'the story ends here',
  'você sabia disso',
];

function getIntensidadeSanidade() {
  const san = state?.sanidade?.atual ?? 100;
  return san <= 20 ? Math.max(0.05, (20 - san) / 20) : 0;
}

function getIntensidadeVida() {
  const vida = state?.vida?.atual ?? 10;
  const max  = state?.vida?.max   ?? 10;
  const pct  = max > 0 ? (vida / max) * 100 : 100;
  return pct <= 25 ? Math.max(0.05, (25 - pct) / 25) : 0;
}

function atualizarEfeitosHorror() {
  const si = getIntensidadeSanidade();
  const vi = getIntensidadeVida();

  // ── vinheta de sanidade ──
  let vS = document.getElementById('vinheta-san');
  if (si > 0) {
    if (!vS) {
      vS = document.createElement('div');
      vS.id = 'vinheta-san';
      vS.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:8997;';
      document.body.appendChild(vS);
    }
    const op = 0.12 + si * 0.38;
    const sp = Math.max(0.5, 1.8 - si * 1.2);
    vS.style.background = `radial-gradient(ellipse at center,transparent 35%,rgba(120,0,0,${op}) 100%)`;
    vS.style.animation  = `vinhPulse ${sp}s ease-in-out infinite`;
  } else if (vS) {
    vS.remove();
  }

  // ── escurecimento de vida ──
  let vV = document.getElementById('vida-overlay');
  if (vi > 0) {
    if (!vV) {
      vV = document.createElement('div');
      vV.id = 'vida-overlay';
      vV.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:8996;';
      document.body.appendChild(vV);
    }
    const dk = 0.12 + vi * 0.44;
    const sp = Math.max(0.8, 2.2 - vi * 1.0);
    vV.style.background = `rgba(0,0,0,${dk})`;
    vV.style.animation  = `respirar ${sp}s ease-in-out infinite`;
  } else if (vV) {
    vV.remove();
  }

  // ── loop de alucinações ──
  if (si > 0 && !_horrorInterval) {
    _horrorInterval = setInterval(tickHorror, 900);
  } else if (si === 0 && _horrorInterval) {
    clearInterval(_horrorInterval);
    _horrorInterval = null;
    const ov = document.getElementById('horror-overlay');
    if (ov) ov.remove();
    const gs = document.getElementById('glitch-style');
    if (gs) gs.remove();
  }
}

function tickHorror() {
  const si = getIntensidadeSanidade();
  if (si === 0) return;

  // texto alucinógeno
  if (Math.random() < 0.18 + si * 0.42) {
    let ov = document.getElementById('horror-overlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'horror-overlay';
      ov.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9000;overflow:hidden;';
      document.body.appendChild(ov);
    }
    const txt  = document.createElement('div');
    const x    = 5 + Math.random() * 85;
    const y    = 5 + Math.random() * 82;
    const sz   = 0.5 + Math.random() * 0.55 * si;
    const alp  = 0.25 + si * 0.55;
    const dur  = 900 + Math.random() * 1400;
    txt.style.cssText = `position:absolute;left:${x}%;top:${y}%;font-family:'IM Fell English',serif;font-size:${sz}rem;color:rgba(180,20,20,${alp});pointer-events:none;white-space:nowrap;font-style:italic;letter-spacing:.08em;text-shadow:0 0 10px rgba(180,20,20,.5);animation:alucinaFade ${dur}ms ease both;`;
    txt.textContent = _alucinacoes[Math.floor(Math.random() * _alucinacoes.length)];
    ov.appendChild(txt);
    setTimeout(() => txt.remove(), dur + 100);
  }

  // glitch
  if (Math.random() < 0.12 + si * 0.38) {
    let gs = document.getElementById('glitch-style');
    if (!gs) { gs = document.createElement('style'); gs.id = 'glitch-style'; document.head.appendChild(gs); }
    const t1  = (Math.random() - .5) * 14 * si;
    const t2  = (Math.random() - .5) * 9  * si;
    const dur = 70 + Math.random() * 110;
    gs.textContent = `@keyframes gN{0%{transform:translate(0);filter:none}25%{transform:translate(${t1}px,0);filter:hue-rotate(${Math.random()*80}deg) saturate(2)}55%{transform:translate(${t2}px,${(Math.random()-.5)*4}px);filter:hue-rotate(${-Math.random()*40}deg)}80%{transform:translate(${-t1*.3}px,0)}100%{transform:translate(0);filter:none}}body{animation:gN ${dur}ms steps(2) both}`;
    setTimeout(() => { if (gs.parentNode) gs.textContent = ''; }, dur + 60);
  }
}

// ══════════════════════════════════════════════════
async function loadState() {
  if (!FICHA_ID) return null;
  try { const r = await fetch(`/api/ficha?id=${FICHA_ID}`); if (r.ok) { const d = await r.json(); if (d?.nome !== undefined) return d; } } catch {}
  try { const r = await fetch(`personagens/${FICHA_ID}.json`); if (r.ok) return await r.json(); } catch {}
  const local = localStorage.getItem('phantasos_' + FICHA_ID);
  if (local) return JSON.parse(local);
  return null;
}

let saveTimeout = null;
function scheduleSave() { clearTimeout(saveTimeout); saveTimeout = setTimeout(saveState, 700); }

async function saveState() {
  const btn = document.getElementById('save-btn');
  const status = document.getElementById('sync-status');
  btn.className = 'saving'; btn.textContent = 'SALVANDO…';
  localStorage.setItem('phantasos_' + FICHA_ID, JSON.stringify(state));
  try {
    const r = await fetch(`/api/ficha?id=${FICHA_ID}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(state)
    });
    if (r.ok) { btn.className = 'saved'; btn.textContent = 'SALVO ✓'; status.textContent = 'sincronizado'; status.classList.add('visible'); }
    else throw new Error();
  } catch {
    btn.className = 'error'; btn.textContent = 'SALVO LOCAL';
    status.textContent = 'salvo neste navegador'; status.classList.add('visible');
  }
  setTimeout(() => { btn.textContent = 'SALVAR'; btn.className = ''; status.classList.remove('visible'); }, 2600);
}

// ══════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════
(async function init() {
  state = await loadState();
  if (!state) {
    if (FICHA_ID) {
      state = defaultState();
      state.nome = FICHA_ID.charAt(0).toUpperCase() + FICHA_ID.slice(1);
    } else {
      document.getElementById('page').innerHTML = `
        <div class="error">
          Nenhum personagem especificado.<br>
          Use: <code>ficha.html?id=nome-do-escritor</code><br><br>
          <a href="index.html" style="color:var(--gold);font-size:.85rem;letter-spacing:.15em;text-decoration:none;border-bottom:1px solid var(--gold-dim)">⟵ Voltar</a>
        </div>`;
      return;
    }
  }

  // Garante campos novos em fichas antigas
  if (!state.sanidade) state.sanidade = { atual: 100, max: 100 };
  if (!state.vida) state.vida = { atual: 10, max: 10 };
  if (state.exposicao === undefined) state.exposicao = 0;
  if (!state.pericias) {
    state.pericias = {};
    for (const [nome, def] of Object.entries(PERICIAS_DEF)) {
      state.pericias[nome] = { attr: def.attr, pontos: 0 };
    }
  }
  if (!state.livros) state.livros = [];
  if (!state.caracteristicas) state.caracteristicas = [];
  if (!state.equipamento) state.equipamento = [];
  if (!state.ataques) state.ataques = [];

  render();
  loadAvatar();
  atualizarEfeitosHorror();

  const btn = document.getElementById('save-btn');
  btn.style.display = 'block';
  btn.addEventListener('click', saveState);

  // Modal fechar
  document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);
  document.getElementById('skill-modal')?.addEventListener('click', e => {
    if (e.target === document.getElementById('skill-modal')) closeModal();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
})();
