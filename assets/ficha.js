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

const GENEROS = ['Terror', 'Suspense', 'Romance', 'Aventura', 'Tragédia'];

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
    genero_principal: 'Terror',
    genero_fraqueza: 'Romance',
    obra_titulo: '',
    obra_descricao: '',
    atributos: { razao: 1, vigor: 1, vontade: 1, expressao: 1 },
    pericias,
    sanidade: { atual: 100, max: 100 },
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
            </div>
            <div class="genero-card fraqueza">
              <span class="genero-titulo">Fraqueza Narrativa</span>
              <select class="genero-select" data-field="genero_fraqueza">
                ${GENEROS.map(g => `<option value="${g}" ${s.genero_fraqueza === g ? 'selected' : ''}>${g}</option>`).join('')}
              </select>
            </div>
          </div>

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
      ${s.livros?.length ? s.livros.map((l, i) => `
        <div class="livro-item" id="livro-${i}">
          <div class="livro-header" data-livro="${i}">
            <div class="livro-dot"></div>
            <div class="livro-titulo">${esc(l.titulo)}</div>
            <div class="livro-genero">${esc(l.genero)}</div>
            ${l.custo ? `<div class="livro-custo">${esc(l.custo)}</div>` : ''}
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
        </div>`).join('')
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

  // Campos diretos
  document.querySelectorAll('[data-field]').forEach(el => {
    el.addEventListener('input', () => { state[el.dataset.field] = el.value; scheduleSave(); });
    el.addEventListener('change', () => { state[el.dataset.field] = el.value; scheduleSave(); });
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
    scheduleSave();
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
    el.classList.remove('roll'); void el.offsetWidth; el.classList.add('roll');
    const r1 = Math.floor(Math.random() * d) + 1;
    let result, detail = '';
    if (rollMode === 'vantagem') {
      const r2 = Math.floor(Math.random() * d) + 1;
      result = Math.max(r1, r2);
      detail = `<span class="dice-roll-detail vantagem">↑ [${result} <s>${Math.min(r1,r2)}</s>] d${d} com vantagem</span>`;
    } else if (rollMode === 'desvantagem') {
      const r2 = Math.floor(Math.random() * d) + 1;
      result = Math.min(r1, r2);
      detail = `<span class="dice-roll-detail desvantagem">↓ [${result} <s>${Math.max(r1,r2)}</s>] d${d} com desvantagem</span>`;
    } else {
      result = r1;
      detail = `<span class="dice-roll-detail">d${d}</span>`;
    }
    const res = document.getElementById('dice-result');
    res.textContent = result;
    res.className = rollMode === 'vantagem' ? 'rolling vantagem-result' : rollMode === 'desvantagem' ? 'rolling desvantagem-result' : 'rolling';
    void res.offsetWidth;
    const det = document.getElementById('dice-detail');
    if (det) det.innerHTML = detail;
    const log = document.getElementById('dice-log');
    const entry = document.createElement('div');
    entry.textContent = `d${d} → ${result}`;
    if (rollMode === 'vantagem') entry.style.color = 'var(--teal-lt)';
    if (rollMode === 'desvantagem') entry.style.color = 'var(--crimson-lt)';
    log.prepend(entry);
  }));

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
//  SAVE / LOAD
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
