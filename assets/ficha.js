// assets/ficha.js — Codex Edition + Sistema de Habilidades

const params   = new URLSearchParams(location.search);
const FICHA_ID = params.get('id');
let state      = null;
let activeTab  = 'principal';

const MODS    = s => Math.floor((s - 10) / 2);
const fmtMod  = m => (m >= 0 ? '+' + m : String(m));
const ATTR_FULL  = { forca:'Força', destreza:'Destreza', constituicao:'Constituição', inteligencia:'Inteligência', sabedoria:'Sabedoria', carisma:'Carisma' };
const ATTR_SHORT = { forca:'FOR', destreza:'DES', constituicao:'CON', inteligencia:'INT', sabedoria:'SAB', carisma:'CAR' };
const MONEY_ICON = { ouro:'🪙', prata:'🥈', cobre:'🟫' };

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
      <div class="header-seal">
        <svg class="seal-ring seal-ring-outer" viewBox="0 0 120 120" fill="none">
          <polygon points="60,4 116,32 116,88 60,116 4,88 4,32"
            stroke="url(#sg1)" stroke-width="1.2" fill="none" stroke-dasharray="5 4"/>
          <defs>
            <linearGradient id="sg1" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#c8922a"/><stop offset="50%" stop-color="#f2d078"/><stop offset="100%" stop-color="#c8922a"/>
            </linearGradient>
          </defs>
        </svg>
        <svg class="seal-ring seal-ring-inner" viewBox="0 0 80 80" fill="none">
          <polygon points="40,3 77,21 77,59 40,77 3,59 3,21"
            stroke="url(#sg2)" stroke-width=".8" fill="none"/>
          <defs>
            <linearGradient id="sg2" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#f2d078"/><stop offset="100%" stop-color="#5a3e10"/>
            </linearGradient>
          </defs>
        </svg>
        <div class="seal-core">⚔</div>
      </div>
      <div class="header-body">
        <div class="char-name">${s.nome}</div>
        ${s.subtitulo ? `<div class="char-subtitle">${s.subtitulo}</div>` : ''}
        <div class="char-divider"></div>
        <div class="char-tags">
          ${[s.raca, s.classe, `Nível ${s.nivel ?? '-'}`, s.antecedente, s.alinhamento].filter(Boolean).map(t => `<span class="char-tag">${t}</span>`).join('')}
        </div>
      </div>
    </header>

    <!-- ── TABS ── -->
    <nav class="tab-nav">
      <button class="tab-btn" data-tab="principal">Principal</button>
      <button class="tab-btn" data-tab="habilidades">Habilidades</button>
      <button class="tab-btn" data-tab="magias">Magias</button>
      <button class="tab-btn" data-tab="dados">Dados</button>
      <button class="tab-btn" data-tab="notas">Notas</button>
    </nav>

    <!-- ══════════════════════════
         ABA: PRINCIPAL
    ══════════════════════════ -->
    <div class="tab-panel" data-panel="principal">
      <div class="principal-grid">

        <!-- Coluna Esquerda -->
        <div class="principal-left">

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
    <div class="tab-panel" data-panel="notas">
      ${s.antecedenteTexto ? `
        <div class="section-label">Antecedente</div>
        <div class="bg-box">${s.antecedenteTexto}</div>` : ''}
      <div class="section-label">Anotações</div>
      <textarea class="notes-area" id="notes" placeholder="Escreva aqui suas anotações de sessão…">${s.notas || ''}</textarea>
    </div>
  `;

  attachEvents();
  setActiveTab(activeTab);
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

function attachEvents() {
  // Tabs
  document.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', () => setActiveTab(b.dataset.tab)));

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
  const btn = document.getElementById('save-btn');
  btn.style.display = 'block';
  btn.addEventListener('click', saveState);
})();
