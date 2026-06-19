// assets/ficha.js
// Motor da ficha: lê ?id= da URL, carrega dados, renderiza e salva.

const params = new URLSearchParams(location.search);
const FICHA_ID = params.get('id');
let state = null;
let activeTab = 'principal';

const MODS = (score) => Math.floor((score - 10) / 2);
const fmtMod = (m) => (m >= 0 ? '+' + m : m);
const attrLabel = (k) => ({forca:'Força',destreza:'Destreza',constituicao:'Constituição',inteligencia:'Inteligência',sabedoria:'Sabedoria',carisma:'Carisma'}[k] || k);
const attrShort = (k) => ({forca:'FOR',destreza:'DES',constituicao:'CON',inteligencia:'INT',sabedoria:'SAB',carisma:'CAR'}[k] || k.slice(0,3).toUpperCase());

async function loadState() {
  if (!FICHA_ID) return null;
  try {
    const r = await fetch(`/api/ficha?id=${FICHA_ID}`);
    if (r.ok) { const data = await r.json(); if (data && data.nome) return data; }
  } catch (e) {}
  try {
    const r2 = await fetch(`personagens/${FICHA_ID}.json`);
    if (r2.ok) return await r2.json();
  } catch (e) {}
  const local = localStorage.getItem('ficha_' + FICHA_ID);
  if (local) return JSON.parse(local);
  return null;
}

function render() {
  const s = state;
  document.getElementById('page').innerHTML = `
    <div class="header">
      <div>
        <div class="char-name">${s.nome}</div>
        <div class="char-subtitle">${s.subtitulo || ''}</div>
        <div class="char-meta"><span>${s.raca||''}</span><span>${s.classe||''}</span><span>Nível ${s.nivel??'-'}</span><span>${s.antecedente||''}</span></div>
      </div>
      <div class="char-art"></div>
    </div>

    <div class="tab-nav">
      <button class="tab-btn" data-tab="principal">Principal</button>
      <button class="tab-btn" data-tab="habilidades">Habilidades</button>
      <button class="tab-btn" data-tab="magias">Magias</button>
      <button class="tab-btn" data-tab="dados">Dados</button>
      <button class="tab-btn" data-tab="notas">Notas</button>
    </div>

    <div class="tab-panel" data-panel="principal">
      <div class="section-label">Atributos</div>
      <div class="abilities-grid">
        ${Object.entries(s.atributos).map(([k,v]) => `
          <div class="ability">
            <div class="ability-name">${attrShort(k)}</div>
            <div class="ability-score"><input data-attr="${k}" type="number" value="${v}"></div>
            <div class="ability-mod">${fmtMod(MODS(v))}</div>
            <div class="ability-ctrl"><button data-attrdelta="${k}" data-d="-1">−</button><button data-attrdelta="${k}" data-d="1">+</button></div>
          </div>`).join('')}
      </div>

      <div class="section-label">Status</div>
      <div class="core-stats">
        <div class="stat-box"><span class="stat-label">CA</span><div class="stat-value"><input data-core="ca" type="number" value="${s.core.ca}"></div></div>
        <div class="stat-box"><span class="stat-label">Iniciativa</span><div class="stat-value"><input data-core="iniciativa" type="number" value="${s.core.iniciativa}"></div></div>
        <div class="stat-box"><span class="stat-label">Deslocamento</span><div class="stat-value"><input data-core="deslocamento" type="number" value="${s.core.deslocamento}"></div></div>
        <div class="stat-box"><span class="stat-label">Bônus Prof.</span><div class="stat-value"><input data-core="bonusProf" type="number" value="${s.core.bonusProf}"></div></div>
      </div>
      <div class="hp-box">
        <span class="stat-label">Pontos de Vida</span>
        <div class="hp-row">
          <input data-core="hpAtual" type="number" value="${s.core.hpAtual}"><span class="hp-sep">/</span><input data-core="hpMax" type="number" value="${s.core.hpMax}">
          <span class="hp-temp">temp <input data-core="hpTemp" type="number" value="${s.core.hpTemp}"></span>
        </div>
      </div>

      <div class="two-col">
        <div>
          <div class="section-label">Salvaguardas</div>
          ${Object.entries(s.salvaguardas).map(([k,v]) => {
            const mod = MODS(s.atributos[k]) + (v.prof ? s.core.bonusProf : 0);
            return `<div class="save-row"><div class="chk ${v.prof?'on':''}" data-save="${k}"></div><div class="skill-name">${attrLabel(k)}</div><div class="skill-bonus">${fmtMod(mod)}</div></div>`;
          }).join('')}
        </div>
        <div>
          <div class="section-label">Perícias</div>
          ${Object.entries(s.pericias).map(([name,p]) => {
            const mod = MODS(s.atributos[p.attr]) + (p.prof ? s.core.bonusProf : 0);
            return `<div class="skill-row"><div class="chk ${p.prof?'on':''}" data-skill="${name}"></div><div class="skill-name">${name}</div><div class="skill-bonus">${fmtMod(mod)}</div></div>`;
          }).join('')}
        </div>
      </div>

      <div class="section-label">Dinheiro</div>
      <div class="gold-row">
        ${Object.entries(s.dinheiro||{ouro:0,prata:0,cobre:0}).map(([m,v]) => `
          <div class="gold-ctrl"><button data-money="${m}" data-delta="-1">−</button><span class="gold-val" data-moneyval="${m}">${v}</span><button data-money="${m}" data-delta="1">+</button><span class="gold-label">${m}</span></div>`).join('')}
      </div>

      <div class="section-label" style="margin-top:32px">Testes de Morte</div>
      <div class="death-section">
        <div class="death-box"><div class="death-label">Sucessos</div><div class="death-circles">${[0,1,2].map(i=>`<div class="death-circle death-success ${i<(s.mortesSalvas?.sucessos||0)?'filled':''}" data-death="sucessos" data-idx="${i}"></div>`).join('')}</div></div>
        <div class="death-box"><div class="death-label">Falhas</div><div class="death-circles">${[0,1,2].map(i=>`<div class="death-circle death-fail ${i<(s.mortesSalvas?.falhas||0)?'filled':''}" data-death="falhas" data-idx="${i}"></div>`).join('')}</div></div>
      </div>
    </div>

    <div class="tab-panel" data-panel="habilidades">
      ${s.ataques && s.ataques.length ? `
      <div class="section-label">Ataques</div>
      <div class="features-grid">
        ${s.ataques.map(a => `<div class="feature-card"><div class="feature-title"><span class="dot"></span>${a.nome}</div><div class="feature-text">${a.bonus} para acertar — ${a.dano}</div></div>`).join('')}
      </div>` : ''}

      ${s.features && s.features.length ? `
      <div class="section-label">Características</div>
      <div class="features-grid">
        ${s.features.map(f => `<div class="feature-card"><div class="feature-title"><span class="dot"></span>${f.titulo}</div><div class="feature-text">${f.texto}</div></div>`).join('')}
      </div>` : ''}

      ${s.equipamento && s.equipamento.length ? `
      <div class="section-label">Equipamento</div>
      <div style="margin-bottom:8px">
        ${s.equipamento.map(e => `<div class="equip-item"><span class="equip-name">${e.nome}</span><span class="equip-info">${e.info||''}</span></div>`).join('')}
      </div>` : ''}
    </div>

    <div class="tab-panel" data-panel="magias">
      ${s.magias && s.magias.conhecidas && s.magias.conhecidas.length ? `
      <div class="section-label">Espaços de Magia</div>
      <div class="spell-slots-row">
        ${(s.magias.slots||[]).map((lvl,li) => `
          <div class="spell-level">
            <div class="spell-level-num">Nível ${lvl.nivel}</div>
            <div class="spell-level-slots">${lvl.total-lvl.usados}/${lvl.total}</div>
            <div class="slot-circles">${Array.from({length:lvl.total}).map((_,i)=>`<div class="slot-circle ${i<lvl.usados?'used':''}" data-slotlevel="${li}" data-slotidx="${i}"></div>`).join('')}</div>
          </div>`).join('')}
      </div>
      <div class="section-label">Magias Conhecidas</div>
      <div class="spells-known">
        ${s.magias.conhecidas.map(m => `<div class="spell-entry">${m.nome}<span class="spell-school">${m.escola} · nível ${m.nivel}</span></div>`).join('')}
      </div>` : `<div class="feature-text" style="opacity:.5;font-style:italic">Este personagem não possui magias.</div>`}
    </div>

    <div class="tab-panel" data-panel="dados">
      <div class="dice-layout">
        <div>
          <div class="section-label">Rolar Dados</div>
          <div class="dice-grid">
            ${[4,6,8,10,12,20,100].map(d => `
              <button class="die-btn" data-die="${d}">
                <div class="die-shape d${d}">d${d}</div>
                <div class="die-label">${d===100?'percentual':'rolar'}</div>
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

    <div class="tab-panel" data-panel="notas">
      ${s.antecedenteTexto ? `<div class="section-label">Antecedente</div><div class="bg-box">${s.antecedenteTexto}</div>` : ''}
      <div class="section-label">Anotações</div>
      <textarea class="notes-area" id="notes" placeholder="Escreva aqui suas anotações de sessão…">${s.notas||''}</textarea>
    </div>
  `;
  attachEvents();
  setActiveTab(activeTab);
}

function setActiveTab(name) {
  activeTab = name;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab===name));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.dataset.panel===name));
}

function attachEvents() {
  document.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', () => setActiveTab(b.dataset.tab)));

  document.querySelectorAll('[data-attr]').forEach(el => el.addEventListener('input', () => {
    state.atributos[el.dataset.attr] = parseInt(el.value)||0; render();
  }));
  document.querySelectorAll('[data-attrdelta]').forEach(el => el.addEventListener('click', () => {
    const k = el.dataset.attrdelta; state.atributos[k] = Math.max(1,(state.atributos[k]||10)+parseInt(el.dataset.d)); render(); scheduleSave();
  }));
  document.querySelectorAll('[data-core]').forEach(el => el.addEventListener('input', () => { state.core[el.dataset.core] = parseInt(el.value)||0; }));
  document.querySelectorAll('[data-save]').forEach(el => el.addEventListener('click', () => { const k=el.dataset.save; state.salvaguardas[k].prof=!state.salvaguardas[k].prof; render(); scheduleSave(); }));
  document.querySelectorAll('[data-skill]').forEach(el => el.addEventListener('click', () => { const k=el.dataset.skill; state.pericias[k].prof=!state.pericias[k].prof; render(); scheduleSave(); }));
  document.querySelectorAll('[data-slotlevel]').forEach(el => el.addEventListener('click', () => {
    const li=parseInt(el.dataset.slotlevel), idx=parseInt(el.dataset.slotidx), lvl=state.magias.slots[li];
    lvl.usados = idx<lvl.usados ? idx : idx+1; render(); scheduleSave();
  }));
  document.querySelectorAll('[data-money]').forEach(el => el.addEventListener('click', () => {
    const m=el.dataset.money; state.dinheiro[m]=Math.max(0,(state.dinheiro[m]||0)+parseInt(el.dataset.delta));
    document.querySelector(`[data-moneyval="${m}"]`).textContent = state.dinheiro[m]; scheduleSave();
  }));
  document.querySelectorAll('[data-death]').forEach(el => el.addEventListener('click', () => {
    const tipo=el.dataset.death, idx=parseInt(el.dataset.idx);
    if(!state.mortesSalvas) state.mortesSalvas={sucessos:0,falhas:0};
    const atual=state.mortesSalvas[tipo]||0; state.mortesSalvas[tipo] = idx<atual ? idx : idx+1; render(); scheduleSave();
  }));
  const notes = document.getElementById('notes');
  if (notes) notes.addEventListener('input', e => { state.notas = e.target.value; });
  document.querySelectorAll('[data-die]').forEach(el => el.addEventListener('click', () => {
    const d = parseInt(el.dataset.die), result = Math.floor(Math.random()*d)+1;
    el.classList.remove('roll'); void el.offsetWidth; el.classList.add('roll');
    document.getElementById('dice-result').textContent = `d${d} → ${result}`;
    const log = document.getElementById('dice-log');
    const entry = document.createElement('div'); entry.textContent = `d${d}: ${result}`;
    log.prepend(entry);
  }));
  document.getElementById('page').addEventListener('input', scheduleSave);
}

let saveTimeout = null;
function scheduleSave() { clearTimeout(saveTimeout); saveTimeout = setTimeout(saveState, 600); }

async function saveState() {
  const btn = document.getElementById('save-btn'), status = document.getElementById('sync-status');
  btn.className='saving'; btn.textContent='SALVANDO…';
  localStorage.setItem('ficha_'+FICHA_ID, JSON.stringify(state));
  try {
    const r = await fetch(`/api/ficha?id=${FICHA_ID}`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(state)});
    if (r.ok) { btn.className='saved'; btn.textContent='SALVO ✓'; status.textContent='sincronizado'; status.classList.add('visible'); }
    else throw new Error('fail');
  } catch (e) {
    btn.className='error'; btn.textContent='SALVO LOCAL'; status.textContent='salvo apenas neste navegador'; status.classList.add('visible');
  }
  setTimeout(() => { btn.textContent='SALVAR'; btn.className=''; status.classList.remove('visible'); }, 2500);
}

(async function init() {
  state = await loadState();
  if (!state) {
    document.getElementById('page').innerHTML = `<div class="error">${FICHA_ID ? `Personagem "${FICHA_ID}" não encontrado.<br>Crie personagens/${FICHA_ID}.json` : 'Nenhum personagem especificado.<br>Use: ficha.html?id=mikhail'}</div>`;
    return;
  }
  render();
  const btn = document.getElementById('save-btn');
  btn.style.display='block';
  btn.addEventListener('click', saveState);
})();
