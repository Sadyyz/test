// assets/ficha.js — Codex Edition

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

function render() {
  const s = state;
  const atrs = s.atributos;

  document.getElementById('page').innerHTML = `
    <!-- ── HEADER ── -->
    <header class="char-header">
      <div class="header-accent"></div>
      <div class="header-info">
        <div class="char-name">${s.nome}</div>
        <div class="char-subtitle">${s.subtitulo || ''}</div>
        <div class="char-tags">
          ${[s.raca, s.classe, `Nível ${s.nivel ?? '-'}`, s.antecedente, s.alinhamento].filter(Boolean).map(t => `<span class="char-tag">${t}</span>`).join('')}
        </div>
      </div>
      <div class="header-crest">
        <svg class="crest-svg" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="40,3 77,21 77,59 40,77 3,59 3,21"
            stroke="url(#cg)" stroke-width="1" fill="none" stroke-dasharray="4 3"/>
          <circle cx="40" cy="40" r="35" stroke="url(#cg)" stroke-width=".5" fill="none" opacity=".4" stroke-dasharray="2 6"/>
          <text x="40" y="49" text-anchor="middle" font-family="serif" font-size="22" fill="url(#cg)">⚔</text>
          <defs>
            <linearGradient id="cg" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#e8be68"/><stop offset="50%" stop-color="#f2d078"/>
              <stop offset="100%" stop-color="#c8922a"/>
            </linearGradient>
          </defs>
        </svg>
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
         ABA: HABILIDADES
    ══════════════════════════ -->
    <div class="tab-panel" data-panel="habilidades">

      ${s.ataques?.length ? `
        <div class="section-label">Ataques</div>
        <div class="attack-strip">
          ${s.ataques.map(a => `
            <div class="attack-item">
              <div class="attack-n">${a.nome}</div>
              <div class="attack-hit">${a.bonus}</div>
              <div class="attack-dmg">${a.dano}</div>
            </div>`).join('')}
        </div>` : ''}

      ${s.features?.length ? `
        <div class="section-label">Características de Classe</div>
        <div>
          ${s.features.map((f, i) => `
            <div class="feat-item" id="feat-${i}">
              <div class="feat-header" data-feat="${i}">
                <div class="feat-dot"></div>
                <div class="feat-name">${f.titulo}</div>
                <div class="feat-arrow">▶</div>
              </div>
              <div class="feat-body">
                <div class="feat-desc">${f.texto}</div>
              </div>
            </div>`).join('')}
        </div>` : ''}

      ${s.equipamento?.length ? `
        <div class="section-label">Equipamento</div>
        <div class="equip-grid">
          ${s.equipamento.map(e => `
            <div class="equip-card">
              <div class="equip-n">${e.nome}</div>
              ${e.info ? `<div class="equip-info">${e.info}</div>` : ''}
            </div>`).join('')}
        </div>` : ''}

    </div>

    <!-- ══════════════════════════
         ABA: MAGIAS
    ══════════════════════════ -->
    <div class="tab-panel" data-panel="magias">
      ${s.magias?.conhecidas?.length ? `
        <div class="spell-header">Espaços de Magia</div>
        <div class="slot-track">
          ${(s.magias.slots || []).map((lvl, li) => `
            <div class="slot-badge">
              <div class="slot-lv">Nível ${lvl.nivel}</div>
              <div class="slot-ct">${lvl.total - lvl.usados}/${lvl.total}</div>
              <div class="slot-circles">
                ${Array.from({ length: lvl.total }).map((_, i) =>
                  `<div class="slot-pip ${i < lvl.usados ? 'used' : ''}" data-slotlevel="${li}" data-slotidx="${i}"></div>`
                ).join('')}
              </div>
            </div>`).join('')}
        </div>

        <div class="section-label">Magias Conhecidas</div>
        <div>
          ${s.magias.conhecidas.map(m => `
            <div class="spell-row">
              ${m.nome}
              <span class="spell-sch">${m.escola} · nível ${m.nivel}</span>
            </div>`).join('')}
        </div>
      ` : `<p style="color:var(--ink-dim);font-style:italic;padding:40px 0;text-align:center;">Este personagem não possui magias.</p>`}
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
        </div>
        <div>
          <div class="section-label">Resultado</div>
          <div id="dice-result">—</div>
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
  document.querySelectorAll('[data-feat]').forEach(el => el.addEventListener('click', () => {
    const item = document.getElementById('feat-' + el.dataset.feat);
    item.classList.toggle('open');
  }));

  // Notas
  const notes = document.getElementById('notes');
  if (notes) notes.addEventListener('input', e => { state.notas = e.target.value; scheduleSave(); });

  // Dados
  document.querySelectorAll('[data-die]').forEach(el => el.addEventListener('click', () => {
    const d = parseInt(el.dataset.die);
    const result = Math.floor(Math.random() * d) + 1;
    el.classList.remove('roll'); void el.offsetWidth; el.classList.add('roll');
    const res = document.getElementById('dice-result');
    res.textContent = `${result}`;
    res.classList.remove('rolling'); void res.offsetWidth; res.classList.add('rolling');
    const log = document.getElementById('dice-log');
    const entry = document.createElement('div');
    entry.textContent = `d${d} → ${result}`;
    log.prepend(entry);
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
