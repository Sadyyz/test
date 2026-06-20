// assets/ficha.js — Codex Edition + Sistema de Habilidades

const params   = new URLSearchParams(location.search);
const FICHA_ID = params.get('id');
let state      = null;
let activeTab  = 'principal';

// ══════════════════════════════════════════════════
//  SISTEMA DE AVATAR
// ══════════════════════════════════════════════════

// Avatar é carregado da API e cacheado aqui durante a sessão
let _avatarCache = null;

async function loadAvatar() {
  if (!FICHA_ID) return;
  try {
    const r = await fetch(`/api/avatar?id=${FICHA_ID}`);
    if (r.ok) {
      const d = await r.json();
      _avatarCache = d.avatar || null;
    }
  } catch {}
  updateAvatarSlot();
}

function getAvatarHTML() {
  if (_avatarCache) {
    return `<img src="${_avatarCache}" class="avatar-img" alt="Avatar"><div class="avatar-overlay">Trocar</div>`;
  }
  return `<div class="avatar-placeholder"><span class="avatar-placeholder-icon">🖼</span>Imagem</div><div class="avatar-overlay">Adicionar</div>`;
}

function updateAvatarSlot() {
  const slot = document.getElementById('avatar-slot');
  if (slot) slot.innerHTML = getAvatarHTML();
}

function openAvatarPicker(event) {
  // Clique direito ou ctrl+clique = remover avatar
  if (event && (event.button === 2 || event.ctrlKey)) {
    if (_avatarCache) {
      if (confirm('Remover imagem do personagem?')) {
        removeAvatar();
      }
    }
    return;
  }
  const input = document.getElementById('avatar-input');
  if (input) input.click();
}

async function removeAvatar() {
  try {
    await fetch(`/api/avatar?id=${FICHA_ID}`, { method: 'DELETE' });
    _avatarCache = null;
    updateAvatarSlot();
  } catch {
    alert('Erro ao remover avatar. Tente novamente.');
  }
}

function handleAvatarUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Comprime a imagem antes de enviar
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      // Redimensiona para no máximo 256x256 mantendo proporção
      const MAX = 256;
      let w = img.width, h = img.height;
      if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } }
      else        { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      saveAvatar(dataUrl);
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
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar: dataUrl })
    });
    if (r.ok) {
      _avatarCache = dataUrl;
      updateAvatarSlot();
    } else {
      const err = await r.json();
      alert('Erro ao salvar avatar: ' + (err.error || r.status));
      updateAvatarSlot(); // restaura o que tinha
    }
  } catch {
    alert('Erro de conexão ao salvar avatar.');
    updateAvatarSlot();
  }
}


const MODS    = s => Math.floor((s - 10) / 2);
const fmtMod  = m => (m >= 0 ? '+' + m : String(m));
const ATTR_FULL  = { forca:'Força', destreza:'Destreza', constituicao:'Constituição', inteligencia:'Inteligência', sabedoria:'Sabedoria', carisma:'Carisma' };
const ATTR_SHORT = { forca:'FOR', destreza:'DES', constituicao:'CON', inteligencia:'INT', sabedoria:'SAB', carisma:'CAR' };
const MONEY_ICON = { ouro:'🪙', prata:'🥈', cobre:'🟫' };

// Escapa texto para uso seguro em atributos value="" e em conteúdo de textarea
function esc(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Bônus de proficiência padrão (regras D&D 5e) conforme o nível
function profBonusForLevel(lvl) {
  lvl = parseInt(lvl) || 1;
  if (lvl >= 17) return 6;
  if (lvl >= 13) return 5;
  if (lvl >= 9)  return 4;
  if (lvl >= 5)  return 3;
  return 2;
}

async function loadState() {
  if (!FICHA_ID) return null;
  try { const r = await fetch(`/api/ficha?id=${FICHA_ID}`); if (r.ok) { const d = await r.json(); if (d?.nome) return d; } } catch {}
  try { const r = await fetch(`personagens/${FICHA_ID}.json`); if (r.ok) return await r.json(); } catch {}
  const local = localStorage.getItem('ficha_' + FICHA_ID);
  if (local) return JSON.parse(local);
  return null;
}

function hpPercent() {
  const s = state.core;
  return Math.max(0, Math.min(100, Math.round((s.hpAtual / (s.hpMax || 1)) * 100)));
}

// ══════════════════════════════════════════════════
//  MODAL SYSTEM
// ══════════════════════════════════════════════════

let modalCallback = null;

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

  // Footer buttons
  const foot = document.getElementById('modal-foot');
  foot.innerHTML = '';

  const leftSide = document.createElement('div');
  if (onDelete) {
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-modal-delete';
    delBtn.textContent = '⛌ Remover';
    delBtn.addEventListener('click', () => {
      if (confirm('Remover este item?')) {
        closeModal();
        onDelete();
      }
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

  // Focus first input
  setTimeout(() => {
    const first = body.querySelector('input,textarea,select');
    if (first) first.focus();
  }, 50);
}

function closeModal() {
  document.getElementById('skill-modal').classList.add('hidden');
}

// ══════════════════════════════════════════════════
//  MODAL: ATAQUE
// ══════════════════════════════════════════════════

function openAttackModal(idx) {
  const isNew = idx === -1;
  const atk = isNew ? { nome: '', bonus: '', dano: '' } : state.ataques[idx];

  openModal({
    title: isNew ? '⚔ Novo Ataque' : '⚔ Editar Ataque',
    fields: [
      { key: 'nome',  label: 'Nome do Ataque', placeholder: 'Ex: Espada Longa', value: atk.nome },
      { key: 'bonus', label: 'Bônus de Ataque', placeholder: 'Ex: +5', value: atk.bonus },
      { key: 'dano',  label: 'Dano', placeholder: 'Ex: 1d8+3 cortante', value: atk.dano },
    ],
    onSave(vals) {
      if (!vals.nome) { alert('Nome é obrigatório.'); return false; }
      if (!state.ataques) state.ataques = [];
      const obj = { nome: vals.nome, bonus: vals.bonus, dano: vals.dano };
      if (isNew) state.ataques.push(obj);
      else state.ataques[idx] = obj;
      render(); scheduleSave();
    },
    onDelete: isNew ? null : () => {
      state.ataques.splice(idx, 1);
      render(); scheduleSave();
    }
  });
}

// ══════════════════════════════════════════════════
//  MODAL: FEATURE
// ══════════════════════════════════════════════════

function openFeatureModal(idx) {
  const isNew = idx === -1;
  const feat = isNew ? { titulo: '', texto: '' } : state.features[idx];

  openModal({
    title: isNew ? '✦ Nova Característica' : '✦ Editar Característica',
    fields: [
      { key: 'titulo', label: 'Título', placeholder: 'Ex: Pacto da Lâmina', value: feat.titulo },
      { key: 'texto',  label: 'Descrição', type: 'textarea', placeholder: 'Descreva o efeito…', value: feat.texto },
    ],
    onSave(vals) {
      if (!vals.titulo) { alert('Título é obrigatório.'); return false; }
      if (!state.features) state.features = [];
      const obj = { titulo: vals.titulo, texto: vals.texto };
      if (isNew) state.features.push(obj);
      else state.features[idx] = obj;
      render(); scheduleSave();
    },
    onDelete: isNew ? null : () => {
      state.features.splice(idx, 1);
      render(); scheduleSave();
    }
  });
}

// ══════════════════════════════════════════════════
//  MODAL: EQUIPAMENTO
// ══════════════════════════════════════════════════

function openEquipModal(idx) {
  const isNew = idx === -1;
  const eq = isNew ? { nome: '', info: '' } : state.equipamento[idx];

  openModal({
    title: isNew ? '⚜ Novo Equipamento' : '⚜ Editar Equipamento',
    fields: [
      { key: 'nome', label: 'Nome do Item', placeholder: 'Ex: Armadura de Placas', value: eq.nome },
      { key: 'info', label: 'Informação / Propriedade', placeholder: 'Ex: CA base 18, Desvantagem em Furtividade', value: eq.info || '' },
    ],
    onSave(vals) {
      if (!vals.nome) { alert('Nome é obrigatório.'); return false; }
      if (!state.equipamento) state.equipamento = [];
      const obj = { nome: vals.nome, info: vals.info };
      if (isNew) state.equipamento.push(obj);
      else state.equipamento[idx] = obj;
      render(); scheduleSave();
    },
    onDelete: isNew ? null : () => {
      state.equipamento.splice(idx, 1);
      render(); scheduleSave();
    }
  });
}

// ══════════════════════════════════════════════════
//  MODAL: MAGIA
// ══════════════════════════════════════════════════

const ESCOLAS = ['Abjuração','Adivinhação','Conjuração','Encantamento','Evocação','Ilusão','Necromancia','Transmutação'];

function openSpellModal(idx) {
  const isNew = idx === -1;
  const m = isNew ? { nome: '', escola: 'Evocação', nivel: 1 } : state.magias.conhecidas[idx];

  openModal({
    title: isNew ? '✦ Nova Magia' : '✦ Editar Magia',
    fields: [
      { key: 'nome',   label: 'Nome da Magia', placeholder: 'Ex: Bola de Fogo', value: m.nome },
      { key: 'escola', label: 'Escola', type: 'select',
        value: m.escola,
        options: ESCOLAS.map(e => ({ value: e, label: e })) },
      { key: 'nivel',  label: 'Nível (0 = Truque)', type: 'number', placeholder: '0–9', value: String(m.nivel) },
    ],
    onSave(vals) {
      if (!vals.nome) { alert('Nome é obrigatório.'); return false; }
      if (!state.magias) state.magias = { slots: [], conhecidas: [] };
      if (!state.magias.conhecidas) state.magias.conhecidas = [];
      const obj = { nome: vals.nome, escola: vals.escola, nivel: parseInt(vals.nivel) || 0 };
      if (isNew) state.magias.conhecidas.push(obj);
      else state.magias.conhecidas[idx] = obj;
      render(); scheduleSave();
    },
    onDelete: isNew ? null : () => {
      state.magias.conhecidas.splice(idx, 1);
      render(); scheduleSave();
    }
  });
}

// ══════════════════════════════════════════════════
//  MODAL: SLOT DE MAGIA
// ══════════════════════════════════════════════════

function openSlotModal(idx) {
  const isNew = idx === -1;
  const slot = isNew ? { nivel: 1, total: 2, usados: 0 } : state.magias.slots[idx];

  openModal({
    title: isNew ? '◈ Novo Espaço de Magia' : '◈ Editar Espaço',
    fields: [
      { key: 'nivel', label: 'Nível do Espaço', type: 'number', placeholder: '1–9', value: String(slot.nivel) },
      { key: 'total', label: 'Total de Espaços',  type: 'number', placeholder: 'Ex: 3', value: String(slot.total) },
      { key: 'usados', label: 'Espaços Usados',   type: 'number', placeholder: '0', value: String(slot.usados) },
    ],
    onSave(vals) {
      const nivel  = Math.max(1, Math.min(9, parseInt(vals.nivel)  || 1));
      const total  = Math.max(1, Math.min(9, parseInt(vals.total)  || 1));
      const usados = Math.max(0, Math.min(total, parseInt(vals.usados) || 0));
      if (!state.magias) state.magias = { slots: [], conhecidas: [] };
      if (!state.magias.slots) state.magias.slots = [];
      const obj = { nivel, total, usados };
      if (isNew) state.magias.slots.push(obj);
      else state.magias.slots[idx] = obj;
      // ordenar por nível
      state.magias.slots.sort((a, b) => a.nivel - b.nivel);
      render(); scheduleSave();
    },
    onDelete: isNew ? null : () => {
      state.magias.slots.splice(idx, 1);
      render(); scheduleSave();
    }
  });
}

// ══════════════════════════════════════════════════
//  RENDER
// ══════════════════════════════════════════════════

function render() {
  const s = state;
  const atrs = s.atributos;

  document.getElementById('page').innerHTML = `
    <!-- ── HEADER ── -->
    <header class="char-header">
      <div class="avatar-slot" id="avatar-slot" title="Clique para mudar imagem • Ctrl+Clique para remover" onclick="openAvatarPicker(event)" oncontextmenu="openAvatarPicker(event);return false;">
        ${getAvatarHTML()}
      </div>
      <input type="file" id="avatar-input" accept="image/*" style="display:none" onchange="handleAvatarUpload(event)">
      <div class="header-body">
        <input id="f-nome" class="char-name" data-field="nome" value="${esc(s.nome)}" placeholder="Nome do Personagem">
        <input id="f-subtitulo" class="char-subtitle" data-field="subtitulo" value="${esc(s.subtitulo)}" placeholder="Subtítulo (ex: raça, classes, etc.)">
        <div class="char-divider"></div>
        <div class="char-tags">
          <input id="f-raca" class="char-tag" data-field="raca" value="${esc(s.raca)}" placeholder="Raça">
          <input id="f-classe" class="char-tag" data-field="classe" value="${esc(s.classe)}" placeholder="Classe">
          <span class="char-tag" id="tag-nivel">Nível ${s.nivel ?? 1}</span>
          <input id="f-antecedente" class="char-tag" data-field="antecedente" value="${esc(s.antecedente)}" placeholder="Antecedente">
          <input id="f-alinhamento" class="char-tag" data-field="alinhamento" value="${esc(s.alinhamento)}" placeholder="Alinhamento">
        </div>
      </div>
    </header>

    <!-- ── TABS ── -->
    <nav class="tab-nav">
      <button class="tab-btn" data-tab="principal">Principal</button>
      <button class="tab-btn" data-tab="habilidades">Habilidades</button>
      <button class="tab-btn" data-tab="magias">Magias</button>
      <button class="tab-btn" data-tab="dados">Dados</button>
      <button class="tab-btn" data-tab="historia">História</button>
      <button class="tab-btn" data-tab="notas">Notas</button>
    </nav>

    <!-- ══════════════════════════
         ABA: PRINCIPAL
    ══════════════════════════ -->
    <div class="tab-panel" data-panel="principal">
      <div class="principal-grid">

        <!-- Coluna Esquerda -->
        <div class="principal-left">

          <div class="section-label">Nível &amp; Experiência</div>
          <div class="level-block">
            <div class="level-row">
              <span class="s-label">Nível</span>
              <div class="level-controls">
                <button class="attr-btn" data-leveldelta="-1" title="Diminuir nível">−</button>
                <input id="f-nivel" type="number" min="1" max="20" value="${s.nivel ?? 1}">
                <button class="attr-btn" data-leveldelta="1" title="Aumentar nível">+</button>
              </div>
            </div>
            <div class="level-row">
              <span class="s-label">XP</span>
              <input id="f-xp" type="number" min="0" value="${s.xp ?? 0}">
            </div>
            <div class="level-row">
              <span class="s-label">Bônus de Proficiência</span>
              <div class="level-profbonus" id="level-profbonus">${fmtMod(s.core.bonusProf)}</div>
            </div>
          </div>

          <div class="section-label">Atributos</div>
          <div class="attr-grid">
            ${Object.entries(atrs).map(([k, v]) => `
              <div class="attr-card">
                <span class="attr-abbr">${ATTR_SHORT[k] || k}</span>
                <div class="attr-score">${v}</div>
                <span class="attr-mod">${fmtMod(MODS(v))}</span>
                <div class="attr-controls">
                  <button class="attr-btn" data-attrdelta="${k}" data-d="-1">−</button>
                  <button class="attr-btn" data-attrdelta="${k}" data-d="1">+</button>
                </div>
              </div>`).join('')}
          </div>

          <div class="section-label">Status</div>
          <div class="status-block">
            <div class="status-grid">
              <div class="status-cell">
                <span class="s-label">CA</span>
                <div class="s-val"><input data-core="ca" type="number" value="${s.core.ca}"></div>
              </div>
              <div class="status-cell">
                <span class="s-label">Iniciativa</span>
                <div class="s-val"><input data-core="iniciativa" type="number" value="${s.core.iniciativa}"></div>
              </div>
              <div class="status-cell">
                <span class="s-label">Desloc.</span>
                <div class="s-val"><input data-core="deslocamento" type="number" value="${s.core.deslocamento}"></div>
              </div>
              <div class="status-cell">
                <span class="s-label">Prof.</span>
                <div class="s-val"><input data-core="bonusProf" type="number" value="${s.core.bonusProf}"></div>
              </div>
            </div>

            <div class="hp-track">
              <span class="hp-label">HP</span>
              <div class="hp-bar-wrap">
                <div class="hp-bar" id="hp-bar" style="width:${hpPercent()}%"></div>
              </div>
              <div class="hp-nums">
                <input data-core="hpAtual" type="number" value="${s.core.hpAtual}" id="hp-atual">
                <span class="hp-sep">/</span>
                <input data-core="hpMax" type="number" value="${s.core.hpMax}" id="hp-max">
              </div>
              <div class="hp-temp-wrap">
                <input data-core="hpTemp" type="number" value="${s.core.hpTemp}">
                <span class="hp-temp-label">temp</span>
              </div>
            </div>
          </div>

          <div class="section-label">Dinheiro</div>
          <div class="money-strip">
            ${Object.entries(s.dinheiro || { ouro: 0, prata: 0, cobre: 0 }).map(([m, v]) => `
              <div class="money-cell">
                <div class="money-icon">${MONEY_ICON[m] || '💰'}</div>
                <div class="money-val" data-moneyval="${m}">${v}</div>
                <div class="money-name">${m}</div>
                <div class="money-btns">
                  <button data-money="${m}" data-delta="-1">−</button>
                  <button data-money="${m}" data-delta="1">+</button>
                </div>
              </div>`).join('')}
          </div>

          <div class="section-label">Testes de Morte</div>
          <div class="death-row">
            <div class="death-group">
              <span class="death-lbl">Sucessos</span>
              <div class="death-dots">
                ${[0,1,2].map(i => `<div class="death-dot success ${i < (s.mortesSalvas?.sucessos || 0) ? 'on' : ''}" data-death="sucessos" data-idx="${i}"></div>`).join('')}
              </div>
            </div>
            <div class="death-group">
              <span class="death-lbl">Falhas</span>
              <div class="death-dots">
                ${[0,1,2].map(i => `<div class="death-dot fail ${i < (s.mortesSalvas?.falhas || 0) ? 'on' : ''}" data-death="falhas" data-idx="${i}"></div>`).join('')}
              </div>
            </div>
          </div>

        </div><!-- /principal-left -->

        <!-- Coluna Direita -->
        <div class="principal-right">

          <div class="section-label">Salvaguardas</div>
          <div class="check-list">
            ${Object.entries(s.salvaguardas).map(([k, v]) => {
              const mod = MODS(atrs[k]) + (v.prof ? s.core.bonusProf : 0);
              return `<div class="check-row">
                <div class="chk ${v.prof ? 'on' : ''}" data-save="${k}"></div>
                <div class="check-name">${ATTR_FULL[k] || k}</div>
                <div class="check-bonus">${fmtMod(mod)}</div>
              </div>`;
            }).join('')}
          </div>

          <div class="section-label">Perícias</div>
          <div class="check-list">
            ${Object.entries(s.pericias).map(([name, p]) => {
              const mod = MODS(atrs[p.attr]) + (p.prof ? s.core.bonusProf : 0);
              return `<div class="check-row">
                <div class="chk ${p.prof ? 'on' : ''}" data-skill="${name}"></div>
                <div class="check-name">${name}</div>
                <div class="check-bonus">${fmtMod(mod)}</div>
              </div>`;
            }).join('')}
          </div>

        </div><!-- /principal-right -->

      </div><!-- /principal-grid -->
    </div>

    <!-- ══════════════════════════
         ABA: HABILIDADES (com edição)
    ══════════════════════════ -->
    <div class="tab-panel" data-panel="habilidades">

      <!-- ATAQUES -->
      <div class="section-label">Ataques</div>
      ${s.ataques?.length ? `
        <div class="attack-strip">
          ${s.ataques.map((a, i) => `
            <div class="attack-item">
              <div class="attack-n">${a.nome}</div>
              <div class="attack-hit">${a.bonus}</div>
              <div class="attack-dmg">${a.dano}</div>
              <div class="item-actions">
                <button class="btn-edit-item" data-edit-attack="${i}" title="Editar">✎</button>
                <button class="btn-del-item"  data-del-attack="${i}"  title="Remover">✕</button>
              </div>
            </div>`).join('')}
        </div>` : `<div class="empty-hint">Nenhum ataque cadastrado.</div>`}
      <button class="btn-add-skill" id="btn-add-attack">
        <span class="btn-icon">+</span> Adicionar Ataque
      </button>

      <!-- CARACTERÍSTICAS -->
      <div class="section-label" style="margin-top:18px">Características de Classe</div>
      ${s.features?.length ? `
        <div>
          ${s.features.map((f, i) => `
            <div class="feat-item" id="feat-${i}">
              <div class="feat-header" data-feat="${i}">
                <div class="feat-dot"></div>
                <div class="feat-name">${f.titulo}</div>
                <div class="item-actions">
                  <button class="btn-edit-item" data-edit-feat="${i}" title="Editar">✎</button>
                  <button class="btn-del-item"  data-del-feat="${i}"  title="Remover">✕</button>
                </div>
                <div class="feat-arrow">▶</div>
              </div>
              <div class="feat-body">
                <div class="feat-desc">${f.texto}</div>
              </div>
            </div>`).join('')}
        </div>` : `<div class="empty-hint">Nenhuma característica cadastrada.</div>`}
      <button class="btn-add-skill" id="btn-add-feat">
        <span class="btn-icon">+</span> Adicionar Característica
      </button>

      <!-- EQUIPAMENTO -->
      <div class="section-label" style="margin-top:18px">Equipamento</div>
      ${s.equipamento?.length ? `
        <div class="equip-grid">
          ${s.equipamento.map((e, i) => `
            <div class="equip-card">
              <div class="equip-n">${e.nome}</div>
              ${e.info ? `<div class="equip-info">${e.info}</div>` : ''}
              <div class="item-actions">
                <button class="btn-edit-item" data-edit-equip="${i}" title="Editar">✎</button>
                <button class="btn-del-item"  data-del-equip="${i}"  title="Remover">✕</button>
              </div>
            </div>`).join('')}
        </div>` : `<div class="empty-hint">Nenhum equipamento cadastrado.</div>`}
      <button class="btn-add-skill" id="btn-add-equip">
        <span class="btn-icon">+</span> Adicionar Equipamento
      </button>

    </div>

    <!-- ══════════════════════════
         ABA: MAGIAS
    ══════════════════════════ -->
    <div class="tab-panel" data-panel="magias">

      <!-- SLOTS DE MAGIA -->
      <div class="section-label">Espaços de Magia</div>
      ${(s.magias?.slots?.length) ? `
        <div class="slot-track">
          ${(s.magias.slots).map((lvl, li) => `
            <div class="slot-badge">
              <div class="slot-lv">Nível ${lvl.nivel}</div>
              <div class="slot-ct">${lvl.total - lvl.usados}/${lvl.total}</div>
              <div class="slot-circles">
                ${Array.from({ length: lvl.total }).map((_, i) =>
                  `<div class="slot-pip ${i < lvl.usados ? 'used' : ''}" data-slotlevel="${li}" data-slotidx="${i}"></div>`
                ).join('')}
              </div>
              <div class="slot-actions">
                <button class="btn-edit-item" data-edit-slot="${li}" title="Editar slot">✎</button>
                <button class="btn-del-item"  data-del-slot="${li}"  title="Remover slot">✕</button>
              </div>
            </div>`).join('')}
        </div>` : `<div class="empty-hint">Nenhum espaço de magia cadastrado.</div>`}
      <button class="btn-add-skill" id="btn-add-slot">
        <span class="btn-icon">+</span> Adicionar Espaço de Magia
      </button>

      <!-- MAGIAS CONHECIDAS -->
      <div class="section-label" style="margin-top:18px">Magias Conhecidas</div>
      ${s.magias?.conhecidas?.length ? `
        <div id="spell-list">
          ${s.magias.conhecidas.map((m, i) => `
            <div class="spell-row" data-spell-idx="${i}">
              <span class="spell-nome">${m.nome}</span>
              <span class="spell-sch">${m.escola} · nível ${m.nivel}</span>
              <div class="item-actions spell-actions">
                <button class="btn-edit-item" data-edit-spell="${i}" title="Editar">✎</button>
                <button class="btn-del-item"  data-del-spell="${i}"  title="Remover">✕</button>
              </div>
            </div>`).join('')}
        </div>` : `<div class="empty-hint">Nenhuma magia cadastrada.</div>`}
      <button class="btn-add-skill" id="btn-add-spell">
        <span class="btn-icon">+</span> Adicionar Magia
      </button>

    </div>

    <!-- ══════════════════════════
         ABA: DADOS
    ══════════════════════════ -->
    <div class="tab-panel" data-panel="dados">
      <div class="dice-layout">
        <div>
          <div class="section-label">Rolar Dados</div>
          <div class="dice-grid">
            ${[4,6,8,10,12,20,100].map(d => `
              <button class="die-btn" data-die="${d}">
                <span class="die-face">d${d}</span>
                <span class="die-sub">rolar</span>
              </button>`).join('')}
          </div>

          <div class="section-label" style="margin-top:18px">Modo de Rolagem</div>
          <div class="roll-mode-group">
            <button class="roll-mode-btn active" data-mode="normal">
              <span class="roll-mode-icon">⛀</span>
              <span class="roll-mode-label">Normal</span>
            </button>
            <button class="roll-mode-btn vantagem" data-mode="vantagem">
              <span class="roll-mode-icon">↑↑</span>
              <span class="roll-mode-label">Vantagem</span>
            </button>
            <button class="roll-mode-btn desvantagem" data-mode="desvantagem">
              <span class="roll-mode-icon">↓↓</span>
              <span class="roll-mode-label">Desvantagem</span>
            </button>
          </div>
          <div id="roll-mode-hint" class="roll-mode-hint">Role normalmente</div>
        </div>
        <div>
          <div class="section-label">Resultado</div>
          <div id="dice-result">—</div>
          <div id="dice-detail"></div>
          <div id="dice-log"></div>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════
         ABA: NOTAS
    ══════════════════════════ -->
    <div class="tab-panel" data-panel="historia">

      <!-- BLOCO: Narrativa de origem -->
      <div class="section-label">Origem &amp; Passado</div>
      <div class="hist-origin-block">
        <div class="hist-meta-grid">
          <div class="hist-meta-item">
            <span class="hist-meta-label">Antecedente</span>
            <input type="text" class="hist-meta-input" data-field="antecedente" value="${esc(s.antecedente)}" placeholder="Ex: Nobre Caído">
          </div>
          <div class="hist-meta-item">
            <span class="hist-meta-label">Raça</span>
            <input type="text" class="hist-meta-input" data-field="raca" value="${esc(s.raca)}" placeholder="Ex: Tiefling">
          </div>
          <div class="hist-meta-item">
            <span class="hist-meta-label">Alinhamento</span>
            <input type="text" class="hist-meta-input" data-field="alinhamento" value="${esc(s.alinhamento)}" placeholder="Ex: Leal e Neutro">
          </div>
          <div class="hist-meta-item">
            <span class="hist-meta-label">Divindade / Patrono</span>
            <input type="text" class="hist-meta-input" data-field="hist_divindade" value="${esc(s.hist_divindade)}" placeholder="Ex: Levistus">
          </div>
        </div>
        <div class="hist-narrative">
          <span class="hist-meta-label">História do personagem</span>
          <textarea class="hist-textarea" data-field="antecedenteTexto" placeholder="Escreva aqui a história completa do personagem — sua origem, família, o evento que mudou tudo, o que o motivou a aventurar…">${esc(s.antecedenteTexto)}</textarea>
        </div>
      </div>

      <!-- BLOCO: Traços de personalidade -->
      <div class="section-label">Personalidade</div>
      <div class="hist-traits-grid">
        <div class="hist-trait-card" data-accent="gold">
          <div class="hist-trait-icon">◈</div>
          <span class="hist-trait-label">Traços de Personalidade</span>
          <textarea class="hist-trait-area" data-field="hist_tracos" placeholder="Como este personagem age? Manias, hábitos, forma de falar…">${esc(s.hist_tracos)}</textarea>
        </div>
        <div class="hist-trait-card" data-accent="cyan">
          <div class="hist-trait-icon">✦</div>
          <span class="hist-trait-label">Ideal</span>
          <textarea class="hist-trait-area" data-field="hist_ideal" placeholder="O que move este personagem? O princípio que ele nunca abandona…">${esc(s.hist_ideal)}</textarea>
        </div>
        <div class="hist-trait-card" data-accent="green">
          <div class="hist-trait-icon">⚯</div>
          <span class="hist-trait-label">Vínculo</span>
          <textarea class="hist-trait-area" data-field="hist_vinculo" placeholder="Uma pessoa, lugar ou objeto de importância vital para ele…">${esc(s.hist_vinculo)}</textarea>
        </div>
        <div class="hist-trait-card" data-accent="red">
          <div class="hist-trait-icon">☽</div>
          <span class="hist-trait-label">Fraqueza</span>
          <textarea class="hist-trait-area" data-field="hist_fraqueza" placeholder="Uma falha de caráter, fobia ou ponto fraco que pode ser explorado…">${esc(s.hist_fraqueza)}</textarea>
        </div>
      </div>

      <!-- BLOCO: Aparência -->
      <div class="section-label">Aparência Física</div>
      <div class="hist-appearance-grid">
        <div class="hist-app-item">
          <span class="hist-meta-label">Idade</span>
          <input type="text" class="hist-meta-input" data-field="hist_idade" value="${esc(s.hist_idade)}" placeholder="Ex: 28 anos">
        </div>
        <div class="hist-app-item">
          <span class="hist-meta-label">Altura</span>
          <input type="text" class="hist-meta-input" data-field="hist_altura" value="${esc(s.hist_altura)}" placeholder="Ex: 1,85m">
        </div>
        <div class="hist-app-item">
          <span class="hist-meta-label">Peso</span>
          <input type="text" class="hist-meta-input" data-field="hist_peso" value="${esc(s.hist_peso)}" placeholder="Ex: 82kg">
        </div>
        <div class="hist-app-item">
          <span class="hist-meta-label">Olhos</span>
          <input type="text" class="hist-meta-input" data-field="hist_olhos" value="${esc(s.hist_olhos)}" placeholder="Ex: Prata gelada">
        </div>
        <div class="hist-app-item">
          <span class="hist-meta-label">Cabelo</span>
          <input type="text" class="hist-meta-input" data-field="hist_cabelo" value="${esc(s.hist_cabelo)}" placeholder="Ex: Preto com mechas brancas">
        </div>
        <div class="hist-app-item">
          <span class="hist-meta-label">Pele / Traços</span>
          <input type="text" class="hist-meta-input" data-field="hist_pele" value="${esc(s.hist_pele)}" placeholder="Ex: Azulada, chifres curvos">
        </div>
        <div class="hist-app-item hist-app-full">
          <span class="hist-meta-label">Descrição Visual</span>
          <textarea class="hist-textarea hist-textarea--sm" data-field="hist_aparencia" placeholder="Descrição geral da aparência: marcas, cicatrizes, forma de se vestir…">${esc(s.hist_aparencia)}</textarea>
        </div>
      </div>

      <!-- BLOCO: Relações -->
      <div class="section-label">Relações &amp; Facções</div>
      <div class="hist-relations" id="hist-relations-list">
        ${buildRelacoes(s.hist_relacoes)}
      </div>
      <button class="hist-add-btn" id="hist-add-rel" type="button">＋ Adicionar Relação</button>

    </div>

    <div class="tab-panel" data-panel="notas">
      <div class="section-label">Anotações</div>
      <textarea class="notes-area" id="notes" placeholder="Escreva aqui suas anotações de sessão…">${esc(s.notas)}</textarea>
    </div>
  `;

  attachEvents();
  setActiveTab(activeTab);
}

// ══════════════════════════════════════════════════
//  HISTÓRIA — helpers
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
          ${['Aliado','Inimigo','Neutro','Família','Mentor','Rival','Organização','Desconhecido']
            .map(t => `<option value="${t}" ${r.tipo===t?'selected':''}>${t}</option>`).join('')}
        </select>
        <button class="hist-rel-del" data-rel-idx="${i}" type="button" title="Remover">✕</button>
      </div>
      <textarea class="hist-rel-desc" data-rel-idx="${i}" data-rel-field="descricao"
        placeholder="Descreva a relação, história em comum, última vez que se viram…">${esc(r.descricao)}</textarea>
    </div>
  `).join('');
}

function attachHistoriaEvents() {
  // inputs e textareas simples — data-field
  document.querySelectorAll('#page [data-field]').forEach(el => {
    const field = el.dataset.field;
    if (!field) return;
    el.addEventListener('input', () => {
      state[field] = el.value;
      scheduleSave();
    });
  });

  // Botão adicionar relação
  const addBtn = document.getElementById('hist-add-rel');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      if (!Array.isArray(state.hist_relacoes)) state.hist_relacoes = [];
      state.hist_relacoes.push({ nome: '', tipo: 'Neutro', descricao: '' });
      rerenderRelacoes();
      scheduleSave();
    });
  }

  // Delegação nos cards de relação
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
        state.hist_relacoes[i][field] = el.value;
        scheduleSave();
      });
    }
    if (el.tagName === 'SELECT' && field) {
      el.addEventListener('change', () => {
        if (!Array.isArray(state.hist_relacoes)) return;
        state.hist_relacoes[i][field] = el.value;
        scheduleSave();
      });
    }
  });

  list.querySelectorAll('.hist-rel-del').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.dataset.relIdx);
      if (!Array.isArray(state.hist_relacoes)) return;
      state.hist_relacoes.splice(i, 1);
      rerenderRelacoes();
      scheduleSave();
    });
  });
}

function setActiveTab(name) {
  activeTab = name;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === name));
}

function updateHpBar() {
  const bar = document.getElementById('hp-bar');
  if (bar) bar.style.width = hpPercent() + '%';
}

// Aplica mudança de nível: clampa 1–20, recalcula bônus de proficiência
// e re-renderiza (perícias/salvaguardas dependem do bônus de proficiência).
function applyLevelChange(novoNivel) {
  novoNivel = Math.max(1, Math.min(20, parseInt(novoNivel) || 1));
  state.nivel = novoNivel;
  state.core.bonusProf = profBonusForLevel(novoNivel);
  render();
  scheduleSave();
}

function attachEvents() {
  // Tabs
  document.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', () => setActiveTab(b.dataset.tab)));

  // História
  attachHistoriaEvents();

  // Campos de texto simples (nome, subtítulo, raça, classe, antecedente, alinhamento, história, etc.)
  document.querySelectorAll('input[data-field], textarea[data-field]').forEach(el => {
    el.addEventListener('input', () => {
      state[el.dataset.field] = el.value;
      scheduleSave();
    });
  });

  // Nível (digitado diretamente) — atualiza bônus de proficiência automaticamente
  const nivelInput = document.getElementById('f-nivel');
  if (nivelInput) nivelInput.addEventListener('change', () => {
    applyLevelChange(parseInt(nivelInput.value) || 1);
  });

  // Nível (botões + / −)
  document.querySelectorAll('[data-leveldelta]').forEach(el => el.addEventListener('click', () => {
    const atual = parseInt(state.nivel) || 1;
    applyLevelChange(atual + parseInt(el.dataset.leveldelta));
  }));

  // XP
  const xpInput = document.getElementById('f-xp');
  if (xpInput) xpInput.addEventListener('input', () => {
    state.xp = parseInt(xpInput.value) || 0;
    scheduleSave();
  });

  // Atributos delta
  document.querySelectorAll('[data-attrdelta]').forEach(el => el.addEventListener('click', () => {
    const k = el.dataset.attrdelta;
    state.atributos[k] = Math.max(1, (state.atributos[k] || 10) + parseInt(el.dataset.d));
    render(); scheduleSave();
  }));

  // Core inputs
  document.querySelectorAll('[data-core]').forEach(el => el.addEventListener('input', () => {
    state.core[el.dataset.core] = parseInt(el.value) || 0;
    updateHpBar();
    scheduleSave();
  }));

  // Salvaguardas
  document.querySelectorAll('[data-save]').forEach(el => el.addEventListener('click', () => {
    const k = el.dataset.save; state.salvaguardas[k].prof = !state.salvaguardas[k].prof;
    render(); scheduleSave();
  }));

  // Perícias
  document.querySelectorAll('[data-skill]').forEach(el => el.addEventListener('click', () => {
    const k = el.dataset.skill; state.pericias[k].prof = !state.pericias[k].prof;
    render(); scheduleSave();
  }));

  // Spell slots
  document.querySelectorAll('[data-slotlevel]').forEach(el => el.addEventListener('click', () => {
    const li = parseInt(el.dataset.slotlevel), idx = parseInt(el.dataset.slotidx);
    const lvl = state.magias.slots[li];
    lvl.usados = idx < lvl.usados ? idx : idx + 1;
    render(); scheduleSave();
  }));

  // Dinheiro
  document.querySelectorAll('[data-money]').forEach(el => el.addEventListener('click', () => {
    const m = el.dataset.money;
    state.dinheiro[m] = Math.max(0, (state.dinheiro[m] || 0) + parseInt(el.dataset.delta));
    document.querySelector(`[data-moneyval="${m}"]`).textContent = state.dinheiro[m];
    scheduleSave();
  }));

  // Morte
  document.querySelectorAll('[data-death]').forEach(el => el.addEventListener('click', () => {
    const tipo = el.dataset.death, idx = parseInt(el.dataset.idx);
    if (!state.mortesSalvas) state.mortesSalvas = { sucessos: 0, falhas: 0 };
    const atual = state.mortesSalvas[tipo] || 0;
    state.mortesSalvas[tipo] = idx < atual ? idx : idx + 1;
    render(); scheduleSave();
  }));

  // Feature accordion
  document.querySelectorAll('[data-feat]').forEach(el => el.addEventListener('click', e => {
    // Não expandir se clicou num botão de ação
    if (e.target.closest('.item-actions')) return;
    const item = document.getElementById('feat-' + el.dataset.feat);
    if (item) item.classList.toggle('open');
  }));

  // Notas
  const notes = document.getElementById('notes');
  if (notes) notes.addEventListener('input', e => { state.notas = e.target.value; scheduleSave(); });

  // Dados
  let rollMode = 'normal';

  // Modo de rolagem
  document.querySelectorAll('[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      rollMode = btn.dataset.mode;
      document.querySelectorAll('[data-mode]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const hints = { normal: 'Role normalmente', vantagem: 'Rola 2 dados — usa o maior', desvantagem: 'Rola 2 dados — usa o menor' };
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
      const lo = Math.min(r1, r2);
      detail = `<span class="dice-roll-detail vantagem">↑ [${result} <s>${lo}</s>] d${d} com vantagem</span>`;
    } else if (rollMode === 'desvantagem') {
      const r2 = Math.floor(Math.random() * d) + 1;
      result = Math.min(r1, r2);
      const hi = Math.max(r1, r2);
      detail = `<span class="dice-roll-detail desvantagem">↓ [${result} <s>${hi}</s>] d${d} com desvantagem</span>`;
    } else {
      result = r1;
      detail = `<span class="dice-roll-detail">d${d} normal</span>`;
    }

    const res = document.getElementById('dice-result');
    res.textContent = `${result}`;
    res.className = rollMode === 'vantagem' ? 'rolling vantagem-result' : rollMode === 'desvantagem' ? 'rolling desvantagem-result' : 'rolling';
    void res.offsetWidth; res.classList.add('rolling');

    const det = document.getElementById('dice-detail');
    if (det) det.innerHTML = detail;

    const log = document.getElementById('dice-log');
    const entry = document.createElement('div');
    const modeTag = rollMode !== 'normal' ? ` (${rollMode})` : '';
    entry.textContent = `d${d}${modeTag} → ${result}`;
    if (rollMode === 'vantagem') entry.style.color = 'var(--teal-lt)';
    if (rollMode === 'desvantagem') entry.style.color = 'var(--crimson-lt)';
    log.prepend(entry);
  }));

  // ── HABILIDADES: botões de adicionar ──
  document.getElementById('btn-add-attack')?.addEventListener('click', () => openAttackModal(-1));
  document.getElementById('btn-add-feat')  ?.addEventListener('click', () => openFeatureModal(-1));
  document.getElementById('btn-add-equip') ?.addEventListener('click', () => openEquipModal(-1));

  // ── HABILIDADES: editar ──
  document.querySelectorAll('[data-edit-attack]').forEach(el => el.addEventListener('click', e => {
    e.stopPropagation();
    openAttackModal(parseInt(el.dataset.editAttack));
  }));
  document.querySelectorAll('[data-edit-feat]').forEach(el => el.addEventListener('click', e => {
    e.stopPropagation();
    openFeatureModal(parseInt(el.dataset.editFeat));
  }));
  document.querySelectorAll('[data-edit-equip]').forEach(el => el.addEventListener('click', e => {
    e.stopPropagation();
    openEquipModal(parseInt(el.dataset.editEquip));
  }));

  // ── HABILIDADES: remover rápido (✕) ──
  document.querySelectorAll('[data-del-attack]').forEach(el => el.addEventListener('click', e => {
    e.stopPropagation();
    if (confirm('Remover este ataque?')) {
      state.ataques.splice(parseInt(el.dataset.delAttack), 1);
      render(); scheduleSave();
    }
  }));
  document.querySelectorAll('[data-del-feat]').forEach(el => el.addEventListener('click', e => {
    e.stopPropagation();
    if (confirm('Remover esta característica?')) {
      state.features.splice(parseInt(el.dataset.delFeat), 1);
      render(); scheduleSave();
    }
  }));
  document.querySelectorAll('[data-del-equip]').forEach(el => el.addEventListener('click', e => {
    e.stopPropagation();
    if (confirm('Remover este equipamento?')) {
      state.equipamento.splice(parseInt(el.dataset.delEquip), 1);
      render(); scheduleSave();
    }
  }));

  // ── MAGIAS: botões de adicionar ──
  document.getElementById('btn-add-spell')?.addEventListener('click', () => openSpellModal(-1));
  document.getElementById('btn-add-slot') ?.addEventListener('click', () => openSlotModal(-1));

  // ── MAGIAS: editar ──
  document.querySelectorAll('[data-edit-spell]').forEach(el => el.addEventListener('click', e => {
    e.stopPropagation();
    openSpellModal(parseInt(el.dataset.editSpell));
  }));
  document.querySelectorAll('[data-edit-slot]').forEach(el => el.addEventListener('click', e => {
    e.stopPropagation();
    openSlotModal(parseInt(el.dataset.editSlot));
  }));

  // ── MAGIAS: remover rápido ──
  document.querySelectorAll('[data-del-spell]').forEach(el => el.addEventListener('click', e => {
    e.stopPropagation();
    if (confirm('Remover esta magia?')) {
      state.magias.conhecidas.splice(parseInt(el.dataset.delSpell), 1);
      render(); scheduleSave();
    }
  }));
  document.querySelectorAll('[data-del-slot]').forEach(el => el.addEventListener('click', e => {
    e.stopPropagation();
    if (confirm('Remover este espaço de magia?')) {
      state.magias.slots.splice(parseInt(el.dataset.delSlot), 1);
      render(); scheduleSave();
    }
  }));
}

let saveTimeout = null;
function scheduleSave() { clearTimeout(saveTimeout); saveTimeout = setTimeout(saveState, 700); }

async function saveState() {
  const btn = document.getElementById('save-btn');
  const status = document.getElementById('sync-status');
  btn.className = 'saving'; btn.textContent = 'SALVANDO…';
  localStorage.setItem('ficha_' + FICHA_ID, JSON.stringify(state));
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

(async function init() {
  state = await loadState();
  if (!state) {
    document.getElementById('page').innerHTML = `<div class="error">${FICHA_ID
      ? `Personagem "${FICHA_ID}" não encontrado.<br>Crie personagens/${FICHA_ID}.json`
      : 'Nenhum personagem especificado.<br>Use: ficha.html?id=mikhail'}</div>`;
    return;
  }
  render();
  loadAvatar(); // carrega avatar da API de forma assíncrona
  const btn = document.getElementById('save-btn');
  btn.style.display = 'block';
  btn.addEventListener('click', saveState);
})();
