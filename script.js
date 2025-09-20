// BEGIN script.js
/* =========================================================
   POBJ • script.js  —  cards, tabela em árvore, ranking e visão executiva
   (com fixes: svh/topbar, z-index, listeners únicos, a11y)
   ========================================================= */

/* ===== Config ===== */
const DATA_SOURCE = "mock";
const API_URL = "/api";
const TICKET_URL = "https://botpj.com/index.php?class=LoginForm";

/* ===== Chat Config ===== */
// MODO 1 (recomendado): "iframe" — cole a URL do seu agente (Copilot Studio / SharePoint)
// MODO 2 (alternativo): "http"  — envia para um endpoint seu que responde { answer }
const CHAT_MODE = "iframe";  // "iframe" | "http"
const CHAT_IFRAME_URL = "";  // cole aqui a URL do canal "Website" do seu agente (se usar iframe)
const AGENT_ENDPOINT = "/api/agent"; // seu endpoint (se usar http)


const $  = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const fmtBRL = new Intl.NumberFormat("pt-BR", { style:"currency", currency:"BRL" });
const fmtINT = new Intl.NumberFormat("pt-BR");

/* ===== Ajusta altura conforme topbar (svh) ===== */
const setTopbarH = () => {
  const h = document.querySelector('.topbar')?.offsetHeight || 56;
  document.documentElement.style.setProperty('--topbar-h', `${h}px`);
};
window.addEventListener('load', setTopbarH);
window.addEventListener('resize', setTopbarH);
setTopbarH();

/* ===== Visões (chips) da tabela ===== */
const TABLE_VIEWS = [
  { id:"diretoria", label:"Diretoria regional", key:"diretoria" },
  { id:"gerencia",  label:"Gerência regional",  key:"gerenciaRegional" },
  { id:"agencia",   label:"Agência",            key:"agencia" },
  { id:"gGestao",   label:"Gerente de gestão",  key:"gerenteGestao" },
  { id:"gerente",   label:"Gerente",            key:"gerente" },
  { id:"familia",   label:"Família",            key:"familia" },
  { id:"prodsub",   label:"Produto/Subproduto", key:"prodOrSub" },
];

/* === Seções e cards === */
const CARD_SECTIONS_DEF = [
  { id:"financeiro", label:"FINANCEIRO", items:[
    { id:"rec_vencidos_59",     nome:"Recuperação de Vencidos até 59 dias",      icon:"ti ti-rotate-rectangle", peso:6, metric:"valor" },
    { id:"rec_vencidos_50mais", nome:"Recuperação de Vencidos acima de 50 dias", icon:"ti ti-rotate-rectangle", peso:5, metric:"valor" },
    { id:"rec_credito",         nome:"Recuperação de Crédito",                    icon:"ti ti-cash",             peso:5, metric:"valor" },
  ]},
  { id:"captacao", label:"CAPTAÇÃO", items:[
    { id:"captacao_bruta",   nome:"Captação Bruta",                           icon:"ti ti-pig-money",       peso:4, metric:"valor" },
    { id:"captacao_liquida", nome:"Captação Líquida",                         icon:"ti ti-arrows-exchange", peso:4, metric:"valor" },
    { id:"portab_prev",      nome:"Portabilidade de Previdência Privada",     icon:"ti ti-shield-check",    peso:3, metric:"valor" },
    { id:"centralizacao",    nome:"Centralização de Caixa",                   icon:"ti ti-briefcase",       peso:3, metric:"valor" },
  ]},
  { id:"credito", label:"CRÉDITO", items:[
    { id:"prod_credito_pj", nome:"Produção de Crédito PJ",               icon:"ti ti-building-bank",  peso:8, metric:"valor" },
    { id:"rotativo_pj_vol", nome:"Limite Rotativo PJ (Volume)",          icon:"ti ti-wallet",         peso:3, metric:"valor" },
    { id:"rotativo_pj_qtd", nome:"Limite Rotativo PJ (Quantidade)",      icon:"ti ti-list-numbers",   peso:3, metric:"qtd" },
  ]},
  { id:"ligadas", label:"LIGADAS", items:[
    { id:"cartoes",    nome:"Cartões",    icon:"ti ti-credit-card",   peso:4, metric:"perc" },
    { id:"consorcios", nome:"Consórcios", icon:"ti ti-building-bank", peso:3, metric:"perc" },
    { id:"seguros",    nome:"Seguros",    icon:"ti ti-shield-lock",   peso:5, metric:"perc" },
  ]},
  { id:"produtividade", label:"PRODUTIVIDADE", items:[
    { id:"sucesso_equipe_credito", nome:"Sucesso de Equipe Crédito", icon:"ti ti-activity", peso:10, metric:"perc" },
  ]},
  { id:"clientes", label:"CLIENTES", items:[
    { id:"conquista_qualif_pj", nome:"Conquista Qualificada Gerenciado PJ",      icon:"ti ti-user-star",   peso:3, metric:"qtd" },
    { id:"conquista_folha",     nome:"Conquista de Clientes Folha de Pagamento", icon:"ti ti-users-group", peso:3, metric:"qtd" },
    { id:"bradesco_expresso",   nome:"Bradesco Expresso",                        icon:"ti ti-bolt",        peso:2, metric:"perc" },
  ]},
];

/* Índice produto → seção/meta */
const PRODUCT_INDEX = (() => {
  const map = new Map();
  CARD_SECTIONS_DEF.forEach(sec => {
    sec.items.forEach(it => {
      map.set(it.id, { sectionId: sec.id, name: it.nome, icon: it.icon, metric: it.metric, peso: it.peso });
    });
  });
  return map;
})();

/* ===== Datas (UTC) ===== */
function firstDayOfMonthISO(d=new Date()){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`; }
function todayISO(d=new Date()){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function formatBRDate(iso){ if(!iso) return ""; const [y,m,day]=iso.split("-"); return `${day}/${m}/${y}`; }
function dateUTCFromISO(iso){ const [y,m,d]=iso.split("-").map(Number); return new Date(Date.UTC(y,m-1,d)); }
function isoFromUTCDate(d){ return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}`; }
function businessDaysBetweenInclusive(startISO,endISO){
  if(!startISO || !endISO) return 0;
  let s = dateUTCFromISO(startISO), e = dateUTCFromISO(endISO);
  if(s > e) return 0;
  let cnt=0;
  for(let d=new Date(s); d<=e; d.setUTCDate(d.getUTCDate()+1)){
    const wd = d.getUTCDay(); if(wd!==0 && wd!==6) cnt++;
  }
  return cnt;
}
function businessDaysRemainingFromToday(startISO,endISO){
  if(!startISO || !endISO) return 0;
  const today = todayISO();
  let t = dateUTCFromISO(today), s=dateUTCFromISO(startISO), e=dateUTCFromISO(endISO);
  if(t >= e) return 0;
  let startCount = new Date(t); startCount.setUTCDate(startCount.getUTCDate()+1);
  if(startCount < s) startCount = s;
  return businessDaysBetweenInclusive(isoFromUTCDate(startCount), endISO);
}

/* ===== Helpers de métrica ===== */
function formatByMetric(metric, value){
  if(metric === "perc") return `${Number(value).toFixed(1)}%`;
  if(metric === "qtd")  return fmtINT.format(Math.round(value));
  return fmtBRL.format(Math.round(value));
}
function makeRandomForMetric(metric){
  if(metric === "perc"){ const meta=100; const realizado=Math.round(45+Math.random()*75); return { meta, realizado }; }
  if(metric === "qtd"){ const meta=Math.round(1_000+Math.random()*19_000); const realizado=Math.round(meta*(0.75+Math.random()*0.6)); return { meta, realizado }; }
  const meta=Math.round(4_000_000+Math.random()*16_000_000);
  const realizado=Math.round(meta*(0.75+Math.random()*0.6));
  return { meta, realizado };
}

/* ===== API / MOCK ===== */
async function apiGet(path, params){
  const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
  const r = await fetch(`${API_URL}${path}${qs}`); if(!r.ok) throw new Error("Falha ao carregar dados");
  return r.json();
}
async function getData(){
  const period = state.period || { start:firstDayOfMonthISO(), end: todayISO() };

  // MOCK
  const hoje = new Date();
  const sections = CARD_SECTIONS_DEF.map(sec=>{
    const items = sec.items.map(it=>{
      const { meta, realizado } = makeRandomForMetric(it.metric);
      const ating = it.metric==="perc" ? (realizado/100) : (meta? realizado/meta : 0);
      return { ...it, meta, realizado, ating, atingido: ating>=1, ultimaAtualizacao: hoje.toLocaleDateString("pt-BR") };
    });
    return { id:sec.id, label:sec.label, items };
  });

  const allItems = sections.flatMap(s => s.items);
  const indicadoresTotal = allItems.length;
  const indicadoresAtingidos = allItems.filter(i => i.atingido).length;
  const pontosPossiveis = allItems.reduce((acc,i)=> acc + (i.peso||0), 0);
  const pontosAtingidos = allItems.filter(i=>i.atingido).reduce((acc,i)=> acc + (i.peso||0), 0);

  const dres  = ["DR 01","DR 02","DR 03"];
  const grs   = ["GR 01","GR 02","GR 03","GR 04"];
  const segs  = ["Empresas","Negócios","MEI"];
  const prodIds = [...PRODUCT_INDEX.keys()];
  const famsMacro = ["Crédito","Investimentos","Seguros","Consórcios","Previdência","Cartão de crédito"];

  const ranking = Array.from({length:140}, (_,i)=>{
    const produtoId = prodIds[i % prodIds.length];
    const metaProd  = PRODUCT_INDEX.get(produtoId);
    const subps = ["Aplicação","Resgate","A vista","Parcelado", ""];
    const subproduto = subps[Math.floor(Math.random()*subps.length)];
    const produtoNome = metaProd?.name || produtoId;

    const meta_mens = Math.round(2_000_000 + Math.random()*18_000_000);
    const real_mens = Math.round(meta_mens*(0.75+Math.random()*0.6));
    const fator = 1.2 + Math.random()*1.2;
    const meta_acum = Math.round(meta_mens * fator);
    const real_acum = Math.round(real_mens * fator);

    return {
      diretoria: dres[i % dres.length],
      gerenciaRegional: grs[i % grs.length],
      gerenteGestao: `GG ${String(1 + (i%3)).padStart(2,"0")}`,
      familia: famsMacro[i % famsMacro.length],
      produtoId,
      produto: produtoNome,
      prodOrSub: subproduto || produtoNome,
      subproduto,
      gerente: `Gerente ${1+(i%16)}`,
      agencia: `Ag ${1000+i}`,
      segmento: segs[i % segs.length],
      realizado: real_mens,
      meta:      meta_mens,
      qtd:       Math.round(50 + Math.random()*1950),
      data:      todayISO(),
      real_mens, meta_mens, real_acum, meta_acum
    };
  });
  ranking.forEach(r => r.ating = r.meta ? r.realizado/r.meta : 0);

  return {
    sections,
    summary:{
      indicadoresTotal,
      indicadoresAtingidos,
      indicadoresPct: indicadoresTotal ? indicadoresAtingidos/indicadoresTotal : 0,
      pontosPossiveis,
      pontosAtingidos,
      pontosPct: pontosPossiveis ? pontosAtingidos/pontosPossiveis : 0
    },
    ranking,
    period
  };
}

/* ===== Sidebar retrátil (criada por JS, sem CSS injetado) ===== */
function ensureSidebar(){
  if (document.getElementById("app-shell")) return;

  // pega elementos existentes
  const topbar = document.querySelector(".topbar");
  const main   = document.querySelector("main.container");
  if(!topbar || !main) return;

  // cria shell
  const shell = document.createElement("div");
  shell.id = "app-shell";
  shell.className = "app-shell";

  // cria sidebar
  const sb = document.createElement("aside");
  sb.id = "sidebar";
  sb.className = "sidebar sidebar--collapsed"; // começa recolhida em desktop
  sb.innerHTML = `
  <div class="sidebar__brand">
    <button id="sb-btn" class="hamburger" type="button" aria-label="Expandir/retrair menu" aria-expanded="false">
      <i class="ti ti-layout-sidebar-right"></i>
    </button>
    <span class="sidebar__title">Menu</span>
  </div>
  <nav class="sidebar__nav">
    <a class="sidebar__link is-active" href="#" data-route="pobj">
      <i class="ti ti-gauge"></i><span>POBJ</span>
    </a>
    <a class="sidebar__link" href="#" data-route="omega">
      <i class="ti ti-planet"></i><span>Omega</span>
    </a>
    <a class="sidebar__link" href="#" data-route="campanhas">
      <i class="ti ti-speakerphone"></i><span>Campanhas</span>
    </a>
    <a class="sidebar__link" href="#" data-route="portal">
      <i class="ti ti-building-bank"></i><span>Portal PJ</span>
    </a>
    <a class="sidebar__link" href="#" data-route="mapao">
      <i class="ti ti-map"></i><span>Mapão de Oportunidades</span>
    </a>
    <a class="sidebar__link" href="#" data-route="manuais">
      <i class="ti ti-book-2"></i><span>Manuais</span>
    </a>
  </nav>
`;

  // mover main para content
  const content = document.createElement("div");
  content.className = "content";
  content.appendChild(main);

  // backdrop pro mobile
  const backdrop = document.createElement("div");
  backdrop.className = "sidebar-backdrop";
  backdrop.id = "sidebar-backdrop";

  // injeta na página (logo abaixo da topbar)
  topbar.insertAdjacentElement("afterend", shell);
  shell.appendChild(sb);
  shell.appendChild(content);
  shell.appendChild(backdrop);

  // estado
  const LS_KEY = "pobj.sidebar.collapsed";
  // Reaproveita o hambúrguer que já está no HTML ou cria um se não existir
  let btnTop = document.querySelector(".topbar-hamburger");
  if(!btnTop){
    btnTop = document.createElement("button");
    btnTop.className = "topbar-hamburger";
    btnTop.innerHTML = `<i class="ti ti-menu-2"></i>`;
    document.querySelector(".topbar__left")?.prepend(btnTop);
  }
  btnTop.type = "button";

  const btnSB  = document.getElementById("sb-btn");

  // aplica colapso salvo
  try{
    const persisted = localStorage.getItem(LS_KEY);
    if(persisted === "0") sb.classList.remove("sidebar--collapsed");
    if(persisted === "1") sb.classList.add("sidebar--collapsed");
  }catch(_){}

  // sync aria-expanded inicial
  btnSB?.setAttribute("aria-expanded", String(!sb.classList.contains("sidebar--collapsed")));

  const isMobile = () => window.matchMedia("(max-width: 768px)").matches;

  function toggleDesktop(){
    sb.classList.toggle("sidebar--collapsed");
    btnSB?.setAttribute("aria-expanded", String(!sb.classList.contains("sidebar--collapsed")));
    try{ localStorage.setItem(LS_KEY, sb.classList.contains("sidebar--collapsed") ? "1" : "0"); }catch(_){}
  }
  function openMobile(){
    // guarda o estado original de colapso do desktop
    sb.dataset.restoreCollapsed = sb.classList.contains("sidebar--collapsed") ? "1" : "0";
    sb.classList.remove("sidebar--collapsed");   // <- garante que os textos apareçam
    sb.classList.add("sidebar--open");
    document.getElementById("sidebar-backdrop")?.classList.add("is-show");
    document.documentElement.classList.add("drawer-open");
    btnSB?.setAttribute("aria-expanded","true");
  }
  function closeMobile(){
    sb.classList.remove("sidebar--open");
    document.getElementById("sidebar-backdrop")?.classList.remove("is-show");
    document.documentElement.classList.remove("drawer-open");
    btnSB?.setAttribute("aria-expanded","false");

    // restaura o estado de colapso que o usuário tinha no desktop
    if (sb.dataset.restoreCollapsed === "1") {
      sb.classList.add("sidebar--collapsed");
    }
  }
  function toggleMobile(){
    if(sb.classList.contains("sidebar--open")) closeMobile(); else openMobile();
  }

  // listeners
  btnSB?.addEventListener("click", ()=> isMobile() ? toggleMobile() : toggleDesktop());
  btnTop?.addEventListener("click", ()=> isMobile() ? toggleMobile() : toggleDesktop());
  backdrop.addEventListener("click", closeMobile);
  window.addEventListener("resize", ()=> { if(!isMobile()) closeMobile(); });

  // navegação “fake”
  document.querySelectorAll(".sidebar__link").forEach(a=>{
    a.addEventListener("click", (e)=>{
      e.preventDefault();
      document.querySelectorAll(".sidebar__link").forEach(x=>x.classList.remove("is-active"));
      a.classList.add("is-active");
      if(isMobile()) closeMobile();
    });
  });
}


/* ===== Estado ===== */
const state = {
  _dataset:null,
  _rankingRaw:[],
  activeView:"cards",
  tableView:"diretoria",
  tableRendered:false,
  isAnimating:false,
  period: { start:firstDayOfMonthISO(), end: todayISO() },
  datePopover:null,
  compact:false,

  // ranking
  rk:{ mode:"mensal", level:"agencia" },

  // busca por contrato (usa o input #busca)
  tableSearchTerm:""
};

/* ===== Utils UI ===== */
function injectStyles(){
  if(document.getElementById("dynamic-styles")) return;
  const style = document.createElement("style");
  style.id = "dynamic-styles";
  style.textContent = `
  .view-panel{ opacity:1; transform:translateY(0); transition:opacity .28s ease, transform .28s ease; will-change:opacity, transform; }
  .view-panel.is-exit{ opacity:0; transform:translateY(8px); }
  .view-panel.is-enter{ opacity:0; transform:translateY(-6px); }
  .view-panel.is-enter-active{ opacity:1; transform:translateY(0); }
  .hidden{ display:none; }

  /* ===== KPI topo: versão mais “grossa” ===== */
  #kpi-summary.kpi-summary{
    display:flex !important;
    flex-wrap:wrap;
    gap:8px;
    margin:6px 0 8px;
    align-items:stretch;
  }
  #kpi-summary .kpi-pill{ padding:10px 12px; gap:10px; }
  #kpi-summary .kpi-icon{ width:28px; height:28px; }
  #kpi-summary .kpi-strip__label{ font-size:13px; }
  #kpi-summary .kpi-stat{ font-size:12px; }

  #kpi-summary .hitbar__track{ height:12px; border-width:1.5px; }
  #kpi-summary .hitbar strong{ font-size:12px; min-width:42px; max-width:60px; }

  #kpi-summary .kpi-pill{
    flex:1 1 0;
    min-width:188px;
    padding:6px 8px;
    display:flex; align-items:center; gap:8px;
    overflow:hidden; min-width:0;
  }

  .kpi-strip{ display:flex; align-items:center; gap:6px; width:100%; min-width:0; }
  .kpi-icon{
    width:22px; height:22px; border-radius:999px;
    display:grid; place-items:center;
    background:#eef2ff; color:#1d4ed8;
    flex:0 0 22px;
  }

  .kpi-strip__label{
    font-weight:800; color:#111827;
    font-size:12px; line-height:1;
    flex:0 1 78px; min-width:56px; max-width:120px;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  }
  .kpi-stat{
    color:#6b7280; font-size:11px; line-height:1;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    flex:0 1 92px; min-width:68px;
    font-variant-numeric: tabular-nums;
  }
  .kpi-stat strong{ color:#111827; }

  .hitbar{
    display:flex; align-items:center; gap:6px;
    flex:1 1 160px; margin-left:auto; min-width:0;
  }
  .hitbar__track{
    position:relative; flex:1 1 0; min-width:70px;
    height:8px; border-radius:999px;
    background:#eef2ff; border:1px solid #e5e7eb; overflow:hidden;
  }
  .hitbar__fill{ position:absolute; left:0; top:0; bottom:0; width:0%; }
  .hitbar--low  .hitbar__fill{ background:#fecaca; }
  .hitbar--warn .hitbar__fill{ background:#fed7aa; }
  .hitbar--ok   .hitbar__fill{ background:#bbf7d0; }

  .hitbar strong{
    flex:0 1 42px; min-width:36px; max-width:54px;
    overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
    text-align:right; font-weight:800; font-size:11px; color:#111827;
  }

  @media (max-width: 1280px){
    #kpi-summary .kpi-stat--total{ display:none; }
  }
  @media (max-width: 520px){
    #kpi-summary .kpi-pill{ min-width:100%; }
  }
`;
  document.head.appendChild(style);
  ["#view-cards", "#view-table"].forEach(sel => $(sel)?.classList.add("view-panel"));
}

/* ===== Popover de data ===== */
function openDatePopover(anchor){
  closeDatePopover();

  const pop = document.createElement("div");
  pop.className = "date-popover";
  pop.id = "date-popover";
  pop.innerHTML = `
    <h4>Alterar data</h4>
    <div class="row" style="margin-bottom:8px">
      <input id="inp-start" type="date" value="${state.period.start}" aria-label="Data inicial">
      <input id="inp-end"   type="date" value="${state.period.end}"   aria-label="Data final">
    </div>
    <div class="actions">
      <button type="button" class="btn-sec" id="btn-cancelar">Cancelar</button>
      <button type="button" class="btn-pri" id="btn-salvar">Salvar</button>
    </div>
  `;
  document.body.appendChild(pop);

  // Posiciona relativo à viewport (o popover é FIXO)
  const r = anchor.getBoundingClientRect();
  const w = pop.offsetWidth || 340;
  const h = pop.offsetHeight || 170;
  const pad = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let top  = r.bottom + 8;
  let left = r.right - w;
  if (top + h + pad > vh) top = Math.max(pad, r.top - h - 8);
  if (left < pad) left = pad;
  if (left + w + pad > vw) left = Math.max(pad, vw - w - pad);

  pop.style.top  = `${top}px`;
  pop.style.left = `${left}px`;

  pop.querySelector("#btn-cancelar").addEventListener("click", closeDatePopover);
  pop.querySelector("#btn-salvar").addEventListener("click", ()=>{
    const s = document.getElementById("inp-start").value;
    const e = document.getElementById("inp-end").value;
    if(!s || !e || new Date(s) > new Date(e)){ alert("Período inválido."); return; }
    state.period.start = s;
    state.period.end   = e;
    document.getElementById("lbl-periodo-inicio").textContent = formatBRDate(s);
    document.getElementById("lbl-periodo-fim").textContent    = formatBRDate(e);
    closeDatePopover();
    refresh();
  });

  const outside = (ev)=>{ if(ev.target===pop || pop.contains(ev.target) || ev.target===anchor) return; closeDatePopover(); };
  const esc     = (ev)=>{ if(ev.key==="Escape") closeDatePopover(); };
  document.addEventListener("mousedown", outside, { once:true });
  document.addEventListener("keydown", esc, { once:true });

  state.datePopover = pop;
}
function closeDatePopover(){
  if(state.datePopover?.parentNode) state.datePopover.parentNode.removeChild(state.datePopover);
  state.datePopover = null;
}

/* ===== Botão “Limpar filtros” ===== */
function wireClearFiltersButton() {
  const btn = $("#btn-limpar");
  if (!btn || btn.dataset.wired === "1") return;
  btn.dataset.wired = "1";
  btn.addEventListener("click", (ev) => {
    ev.preventDefault();
    btn.disabled = true;
    try { clearFilters(); } finally { setTimeout(() => (btn.disabled = false), 250); }
  });
}
function clearFilters() {
  [
    "#f-segmento","#f-diretoria","#f-gerencia","#f-gerente",
    "#f-agencia","#f-ggestao","#f-familia","#f-produto",
    "#f-status-kpi","#f-subproduto"
  ].forEach(sel => {
    const el = $(sel);
    if (!el) return;
    if (el.tagName === "SELECT") el.selectedIndex = 0;
    if (el.tagName === "INPUT")  el.value = "";
  });

  // valores padrão explícitos
  const st = $("#f-status-kpi"); if (st) st.value = "todos";
  const sb = $("#f-subproduto"); if (sb) sb.value = "";

  // limpa busca (contrato) e estado
  state.tableSearchTerm = "";
  if ($("#busca")) $("#busca").value = "";

  applyFiltersAndRender();
  if (state._dataset) renderFamilias(state._dataset.sections, state._dataset.summary);
  renderAppliedFilters();
  if (state.activeView === "ranking") renderRanking();
}

/* ===== Avançado ===== */
function ensureStatusFilterInAdvanced() {
  const adv = $("#advanced-filters");
  if (!adv) return;
  const host = adv.querySelector(".adv__grid") || adv;

  if (!$("#f-status-kpi")) {
    const wrap = document.createElement("div");
    wrap.className = "filters__group";
    wrap.innerHTML = `
      <label for="f-status-kpi">Status dos indicadores</label>
      <select id="f-status-kpi" class="input">
        <option value="todos" selected>Todos</option>
        <option value="atingidos">Atingidos</option>
        <option value="nao">Não atingidos</option>
      </select>`;
    host.appendChild(wrap);
    $("#f-status-kpi").addEventListener("change", () => {
      if (state._dataset) renderFamilias(state._dataset.sections, state._dataset.summary);
      applyFiltersAndRender();
      renderAppliedFilters();
    });
  }

  const gStart = $("#f-inicio")?.closest(".filters__group");
  if (gStart) gStart.remove();
}

/* ===== Chips (tabela) + Toolbar ===== */
function ensureChipBarAndToolbar() {
  if ($("#table-controls")) return;
  const card = $("#table-section"); if (!card) return;

  const holder = document.createElement("div");
  holder.id = "table-controls";
  holder.innerHTML = `
    <div id="applied-bar" class="applied-bar"></div>
    <div id="chipbar" class="chipbar"></div>
    <div id="tt-toolbar" class="table-toolbar"></div>`;
  const header = card.querySelector(".card__header") || card;
  header.insertAdjacentElement("afterend", holder);


  const chipbar = $("#chipbar");
  TABLE_VIEWS.forEach(v => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.dataset.view = v.id;
    chip.textContent = v.label;
    if (v.id === state.tableView) chip.classList.add("is-active");
    chip.addEventListener("click", () => {
      if (state.tableView === v.id) return;
      state.tableView = v.id;
      setActiveChip(v.id);
      renderTreeTable();
    });
    chipbar.appendChild(chip);
  });

  $("#tt-toolbar").innerHTML = `
    <button type="button" id="btn-expandir" class="btn btn--sm"><i class="ti ti-chevrons-down"></i> Expandir tudo</button>
    <button type="button" id="btn-recolher" class="btn btn--sm"><i class="ti ti-chevrons-up"></i> Recolher tudo</button>
    <button type="button" id="btn-compacto" class="btn btn--sm"><i class="ti ti-layout-collage"></i> Modo compacto</button>`;
  $("#btn-expandir").addEventListener("click", expandAllRows);
  $("#btn-recolher").addEventListener("click", collapseAllRows);
  $("#btn-compacto").addEventListener("click", () => {
    state.compact = !state.compact;
    $("#table-section")?.classList.toggle("is-compact", state.compact);
  });

  const headerSearch = $("#busca");
  if (headerSearch) headerSearch.placeholder = "Contrato (Ex.: CT-AAAA-999999)";
  $$('#table-section input[placeholder*="Contrato" i]').forEach(el => { if (el !== headerSearch) el.remove(); });

  renderAppliedFilters();
}
function setActiveChip(viewId) {
  $$("#chipbar .chip").forEach(c => c.classList.toggle("is-active", c.dataset.view === viewId));
}

/* ===== “Filtros aplicados” ===== */
function renderAppliedFilters() {
  const bar = $("#applied-bar"); if (!bar) return;
  const vals = getFilterValues();
  const items = [];

  const push = (k, v, resetFn) => {
    const chip = document.createElement("div");
    chip.className = "applied-chip";
    chip.innerHTML = `
      <span class="k">${k}</span>
      <span class="v">${v}</span>
      <button type="button" title="Limpar" class="applied-x" aria-label="Remover ${k}"><i class="ti ti-x"></i></button>`;
    chip.querySelector("button").addEventListener("click", () => {
      resetFn?.();
      applyFiltersAndRender();
      renderAppliedFilters();
      if (state._dataset) renderFamilias(state._dataset.sections, state._dataset.summary);
      if (state.activeView === "ranking") renderRanking();
    });
    items.push(chip);
  };

  bar.innerHTML = "";

  if (vals.segmento && vals.segmento !== "Todos") push("Segmento", vals.segmento, () => $("#f-segmento").selectedIndex = 0);
  if (vals.diretoria && vals.diretoria !== "Todas") push("Diretoria", vals.diretoria, () => $("#f-diretoria").selectedIndex = 0);
  if (vals.gerencia && vals.gerencia !== "Todas") push("Gerência", vals.gerencia, () => $("#f-gerencia").selectedIndex = 0);
  if (vals.agencia && vals.agencia !== "Todas") push("Agência", vals.agencia, () => $("#f-agencia").selectedIndex = 0);
  if (vals.ggestao && vals.ggestao !== "Todos") push("Gerente de gestão", vals.ggestao, () => $("#f-ggestao").selectedIndex = 0);
  if (vals.gerente && vals.gerente !== "Todos") push("Gerente", vals.gerente, () => $("#f-gerente").selectedIndex = 0);
  if (vals.produtoId && vals.produtoId !== "Todas") {
    const label = $("#f-familia")?.selectedOptions?.[0]?.text || vals.produtoId;
    push("Produto", label, () => $("#f-familia").selectedIndex = 0);
  }
  if (vals.subproduto) push("Subproduto", vals.subproduto, () => $("#f-subproduto").selectedIndex = 0);
  if (vals.status && vals.status !== "todos") push("Status", vals.status === "atingidos" ? "Atingidos" : "Não atingidos", () => $("#f-status-kpi").selectedIndex = 0);

  items.forEach(ch => bar.appendChild(ch));
}

/* ===== Filtros superiores ===== */
function ensureSegmentoField() {
  if ($("#f-segmento")) return;
  const filters = $(".filters");
  if (!filters) return;
  const actions = filters.querySelector(".filters__actions");
  const wrap = document.createElement("div");
  wrap.className = "filters__group";
  wrap.innerHTML = `<label>Segmento</label><select id="f-segmento" class="input"></select>`;
  filters.insertBefore(wrap, actions);
}
function getFilterValues() {
  const val = (sel) => $(sel)?.value || "";
  return {
    segmento: val("#f-segmento"),
    diretoria: val("#f-diretoria"),
    gerencia:  val("#f-gerencia"),
    agencia:   val("#f-agencia"),
    ggestao:   val("#f-ggestao"),
    gerente:   val("#f-gerente"),
    produtoId: val("#f-familia"),
    subproduto: val("#f-subproduto"),
    status:    val("#f-status-kpi"),
  };
}

/* ===== Busca por contrato ===== */
function rowMatchesSearch(r, term) {
  if (!term) return true;
  const t = term.toLowerCase();
  const contracts = ensureContracts(r);
  return contracts.some(c => (c.id || "").toLowerCase().includes(t));
}

/* ===== Filtro base ===== */
function filterRowsExcept(rows, except = {}, opts = {}) {
  const f = getFilterValues();
  const startISO = state.period.start, endISO = state.period.end;
  const searchTerm = (opts.searchTerm || "").trim();

  return rows.filter(r => {
    const okSeg = (f.segmento === "Todos" || f.segmento === "" || r.segmento === f.segmento);
    const okDR  = (except.diretoria) || (f.diretoria === "Todas" || f.diretoria === "" || r.diretoria === f.diretoria);
    const okGR  = (except.gerencia)  || (f.gerencia  === "Todas" || f.gerencia  === "" || r.gerenciaRegional === f.gerencia);
    const okAg  = (except.agencia)   || (f.agencia   === "Todas" || f.agencia   === "" || r.agencia === f.agencia);
    const okGG  = (f.ggestao   === "Todos" || f.ggestao   === "" || r.gerenteGestao === f.ggestao);
    const okGer = (except.gerente)   || (f.gerente   === "Todos" || f.gerente   === "" || r.gerente === f.gerente);
    const okProd= (f.produtoId === "Todas" || f.produtoId === "" || r.produtoId === f.produtoId);
    const okSub = (!f.subproduto || (r.subproduto || "") === f.subproduto);
    const okDt  = (!startISO || r.data >= startISO) && (!endISO || r.data <= endISO);

    const ating = r.meta ? (r.realizado / r.meta) : 0;
    const okStatus = (f.status === "todos") ? true : (f.status === "atingidos" ? (ating >= 1) : (ating < 1));

    const okSearch = rowMatchesSearch(r, searchTerm);

    return okSeg && okDR && okGR && okAg && okGG && okGer && okProd && okSub && okDt && okStatus && okSearch;
  });
}
function filterRows(rows) { return filterRowsExcept(rows, {}, { searchTerm: state.tableSearchTerm }); }

function autoSnapViewToFilters() {
  const f = getFilterValues();
  let snap = null;
  if (f.produtoId && f.produtoId !== "Todas") snap = "prodsub";
  else if (f.gerente && f.gerente !== "Todos") snap = "gerente";
  else if (f.gerencia && f.gerencia !== "Todas") snap = "gerencia";
  else if (f.diretoria && f.diretoria !== "Todas") snap = "diretoria";
  if (snap && state.tableView !== snap) { state.tableView = snap; setActiveChip(snap); }
}

/* ===== Árvore da tabela ===== */
function ensureContracts(r) {
  if (r._contracts) return r._contracts;
  const n = 2 + Math.floor(Math.random() * 3), arr = [];
  for (let i = 0; i < n; i++) {
    const id = `CT-${new Date().getFullYear()}-${String(Math.floor(1e6 + Math.random() * 9e6)).padStart(7, "0")}`;
    const valor = Math.round((r.realizado / n) * (0.6 + Math.random() * 0.9)),
          meta  = Math.round((r.meta       / n) * (0.6 + Math.random() * 0.9));
    const sp = r.subproduto || r.produto;
    arr.push({ id, produto: r.produto, subproduto: r.subproduto || "", prodOrSub: sp, qtd: 1, realizado: valor, meta, ating: meta ? (valor / meta) : 0, data: r.data, tipo: Math.random() > .5 ? "Venda direta" : "Digital" });
  }
  r._contracts = arr; return arr;
}
function buildTree(list, startKey) {
  const keyMap = { diretoria:"diretoria", gerencia:"gerenciaRegional", agencia:"agencia", gGestao:"gerenteGestao", gerente:"gerente", familia:"familia", prodsub:"prodOrSub", produto:"prodOrSub" };
  const NEXT   = { diretoria:"gerencia",  gerencia:"agencia",         agencia:"gGestao", gGestao:"gerente",       gerente:"prodsub", familia:"contrato",   prodsub:"contrato" };

  function group(arr, key){
    const m = new Map();
    arr.forEach(r => { const k = r[key] || "—"; const a = m.get(k) || []; a.push(r); m.set(k, a); });
    return [...m.entries()];
  }
  function agg(arr){
    const realizado = arr.reduce((a,b)=>a+(b.realizado||0),0),
          meta      = arr.reduce((a,b)=>a+(b.meta||0),0),
          qtd       = arr.reduce((a,b)=>a+(b.qtd||0),0),
          data      = arr.reduce((mx,b)=> b.data>mx?b.data:mx, "0000-00-00");
    return { realizado, meta, qtd, ating: meta? realizado/meta : 0, data };
  }

  function buildLevel(arr, levelKey, level){
    if (levelKey === "contrato") {
      return arr.flatMap(r => ensureContracts(r).map(c => ({
        type:"contrato", level, label:c.id, realizado:c.realizado, meta:c.meta, qtd:c.qtd, ating:c.ating, data:c.data,
        breadcrumb:[c.prodOrSub, r.gerente, r.gerenteGestao, r.agencia, r.gerenciaRegional, r.diretoria].filter(Boolean),
        children:[]
      })));
    }
    const mapKey = keyMap[levelKey] || levelKey;
    return group(arr, mapKey).map(([k, subset]) => {
      const a = agg(subset), next = NEXT[levelKey];
      return {
        type:"grupo", level, label:k, realizado:a.realizado, meta:a.meta, qtd:a.qtd, ating:a.ating, data:a.data,
        breadcrumb:[k], children: next ? buildLevel(subset, next, level+1) : []
      };
    });
  }
  return buildLevel(list, startKey, 0);
}

/* ===== UI ===== */
function initCombos() {
  ensureSegmentoField();

  const fill = (sel, arr) => {
    const el = $(sel); if (!el) return;
    el.innerHTML = "";
    arr.forEach(v => {
      const o = document.createElement("option");
      o.value = v.value; o.textContent = v.label; el.appendChild(o);
    });
  };

  // visíveis
  fill("#f-segmento", [{value:"Todos",label:"Todos"},{value:"Empresas",label:"Empresas"},{value:"Negócios",label:"Negócios"},{value:"MEI",label:"MEI"}]);
  fill("#f-diretoria", [{value:"Todas",label:"Todas"},{value:"DR 01",label:"DR 01"},{value:"DR 02",label:"DR 02"},{value:"DR 03",label:"DR 03"}]);
  fill("#f-gerencia",  [{value:"Todas",label:"Todas"},{value:"GR 01",label:"GR 01"},{value:"GR 02",label:"GR 02"},{value:"GR 03",label:"GR 03"},{value:"GR 04",label:"GR 04"}]);

  // avançado
  fill("#f-agencia",   [{value:"Todas",label:"Todas"},{value:"Ag 1001",label:"Ag 1001"},{value:"Ag 1002",label:"Ag 1002"},{value:"Ag 1003",label:"Ag 1003"},{value:"Ag 1004",label:"Ag 1004"}]);
  fill("#f-ggestao",   [{value:"Todos",label:"Todos"},{value:"GG 01",label:"GG 01"},{value:"GG 02",label:"GG 02"},{value:"GG 03",label:"GG 03"}]);
  fill("#f-gerente",   [{value:"Todos",label:"Todos"},{value:"Gerente 1",label:"Gerente 1"},{value:"Gerente 2",label:"Gerente 2"},{value:"Gerente 3",label:"Gerente 3"},{value:"Gerente 4",label:"Gerente 4"},{value:"Gerente 5",label:"Gerente 5"}]);

  // #f-familia = todos os cards
  const products = [{value:"Todas",label:"Todas"}].concat(
    [...PRODUCT_INDEX.entries()].map(([id,meta]) => ({ value:id, label: meta.name }))
  );
  fill("#f-familia", products);

  const produtosExemplo = [{value:"Todos",label:"Todos"},{value:"CDC",label:"CDC"},{value:"Cheque Especial",label:"Cheque Especial"},{value:"CDB",label:"CDB"},{value:"Seguro Vida",label:"Seguro Vida"}];
  fill("#f-produto", produtosExemplo);
}
function bindEvents() {
  $("#btn-consultar")?.addEventListener("click", () => {
    autoSnapViewToFilters();
    applyFiltersAndRender();
    if (state._dataset) renderFamilias(state._dataset.sections, state._dataset.summary);
    renderAppliedFilters();
  });

  $("#btn-abrir-filtros")?.addEventListener("click", () => {
    const adv = $("#advanced-filters");
    const isOpen = adv.classList.toggle("is-open");
    adv.setAttribute("aria-hidden", String(!isOpen));
    $("#btn-abrir-filtros").setAttribute("aria-expanded", String(isOpen));
    $("#btn-abrir-filtros").innerHTML = isOpen
      ? `<i class="ti ti-chevron-up"></i> Fechar filtros`
      : `<i class="ti ti-chevron-down"></i> Abrir filtros`;
    if (isOpen) ensureStatusFilterInAdvanced();
  });

  ensureExtraTabs();

  $$(".tab").forEach(t => {
    t.addEventListener("click", () => {
      if (t.classList.contains("is-active")) return;
      $$(".tab").forEach(x => x.classList.remove("is-active"));
      t.classList.add("is-active");
      const view = t.dataset.view;
      if (view === "table") switchView("table");
      else if (view === "ranking") switchView("ranking");
      else if (view === "exec") switchView("exec");
      else switchView("cards");
    });
  });

  ["#f-segmento","#f-diretoria","#f-gerencia","#f-agencia","#f-ggestao","#f-gerente","#f-familia","#f-subproduto","#f-status-kpi"].forEach(sel => {
    $(sel)?.addEventListener("change", () => {
      autoSnapViewToFilters();
      applyFiltersAndRender();
      if (state._dataset) renderFamilias(state._dataset.sections, state._dataset.summary);
      renderAppliedFilters();
      if (state.activeView === "ranking") renderRanking();
    });
  });

  $("#busca")?.addEventListener("input", (e) => {
    state.tableSearchTerm = (e.target.value || "").trim();
    applyFiltersAndRender();
  });

  $("#btn-export")?.remove();
}

/* Reordenar filtros */
function reorderFiltersUI() {
  const area = $(".filters"); if (!area) return;
  const adv = $("#advanced-filters .adv__grid") || $("#advanced-filters");

  const groupOf = (sel) => $(sel)?.closest?.(".filters__group") || null;

  const gSeg = groupOf("#f-segmento");
  const gDR  = groupOf("#f-diretoria");
  const gGR  = groupOf("#f-gerencia");
  const gAg  = groupOf("#f-agencia");
  const gGG  = groupOf("#f-ggestao");
  const gGer = groupOf("#f-gerente");
  const gFam = groupOf("#f-familia");
  const gProd= groupOf("#f-produto");
  const gStatus = groupOf("#f-status-kpi");
  const gSubp = groupOf("#f-subproduto");

  const actions = area.querySelector(".filters__actions") || area.lastElementChild;

  [gSeg,gDR,gGR].filter(Boolean).forEach(el => area.insertBefore(el, actions));
  [gAg,gGG,gGer,gFam,gProd,gStatus,gSubp].filter(Boolean).forEach(el => adv?.appendChild(el));

  const gStart = $("#f-inicio")?.closest(".filters__group"); if (gStart) gStart.remove();
}



/* ===== Loader overlay ===== */   // <- COLE AQUI O BLOCO INTEIRO
function ensureLoader(){
  if (document.getElementById('__loader')) return;
  const el = document.createElement('div');
  el.id = '__loader';
  el.className = 'loader is-hide';
  el.innerHTML = `
    <div>
      <div class="loader__spinner" aria-hidden="true"></div>
      <div class="loader__text" id="__loader_text">Carregando…</div>
    </div>`;
  document.body.appendChild(el);
}
function showLoader(text='Carregando…'){
  ensureLoader();
  const el = document.getElementById('__loader');
  el.querySelector('#__loader_text').textContent = text;
  el.classList.remove('is-hide');
}
function hideLoader(){
  const el = document.getElementById('__loader');
  if (el) el.classList.add('is-hide');
}
async function withSpinner(fn, text='Carregando…'){
  showLoader(text);
  await new Promise(r => requestAnimationFrame(() => r()));
  await new Promise(r => setTimeout(r, 0));
  try { await fn(); } finally { hideLoader(); }
}

/* ===== Chat widget (flutuante) ===== */
function ensureChatWidget(){
  if (document.getElementById("chat-widget")) return;

  const wrap = document.createElement("div");
  wrap.id = "chat-widget";
  wrap.className = "chatw";
  wrap.innerHTML = `
    <button id="chat-launcher" class="chatw__btn" aria-label="Abrir chat de dúvidas">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 4h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H8.4l-3.6 3a1 1 0 0 1-1.6-.8V6a2 2 0 0 1 2-2zm2 4v2h12V8H6zm0 4v2h9v-2H6z"/></svg>
    </button>
    <section id="chat-panel" class="chatw__panel" aria-hidden="true" role="dialog" aria-label="Chat POBJ">
      <header class="chatw__header">
        <div class="chatw__title">Assistente POBJ</div>
        <button id="chat-close" class="chatw__close" aria-label="Fechar chat"><i class="ti ti-x"></i></button>
      </header>

      <div id="chat-body">
        <!-- Se modo iframe, eu coloco aqui; senão, uso a UI nativa abaixo -->
      </div>

      <div id="chat-ui-native" style="display:none;">
        <div id="chat-messages" class="chatw__msgs" aria-live="polite"></div>
        <form id="chat-form" class="chatw__form" autocomplete="off">
          <input id="chat-input" type="text" placeholder="Pergunte sobre o POBJ…" required />
          <button id="chat-send" type="submit">Enviar</button>
        </form>
      </div>
    </section>
  `;
  document.body.appendChild(wrap);

  const launcher = document.getElementById("chat-launcher");
  const panel    = document.getElementById("chat-panel");
  const closeBtn = document.getElementById("chat-close");
  const body     = document.getElementById("chat-body");
  const uiNative = document.getElementById("chat-ui-native");

  // Montagem conforme o modo
  if (CHAT_MODE === "iframe" && CHAT_IFRAME_URL){
    const iframe = document.createElement("iframe");
    iframe.src = CHAT_IFRAME_URL;
    iframe.style.cssText = "width:100%;height:calc(520px - 48px);border:0;";
    iframe.setAttribute("title", "Chat do Assistente POBJ");
    body.appendChild(iframe);
  } else {
    // UI nativa (mensagens + input)
    uiNative.style.display = "block";
    body.style.display = "none";
    wireNativeChat();
  }

  // Abertura/fechamento
  const open = () => {
    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden","false");
    if (CHAT_MODE !== "iframe") setTimeout(()=> document.getElementById("chat-input")?.focus(), 50);
  };
  const close = () => {
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden","true");
    launcher.focus();
  };

  launcher.addEventListener("click", () => {
    if (panel.classList.contains("is-open")) close(); else open();
  });
  closeBtn.addEventListener("click", close);
  document.addEventListener("keydown", (e)=>{ if(e.key==="Escape" && panel.classList.contains("is-open")) close(); });

  /* ====== Nativa: UI + envio ====== */
  function wireNativeChat(){
    const msgs  = document.getElementById("chat-messages");
    const form  = document.getElementById("chat-form");
    const input = document.getElementById("chat-input");
    const send  = document.getElementById("chat-send");

    const scrollBottom = () => { msgs.scrollTop = msgs.scrollHeight; };

    const addMsg = (role, text, isTyping=false) => {
      const el = document.createElement("div");
      el.className = `msg msg--${role} ${isTyping?'msg--typing':''}`;
      el.innerHTML = isTyping
        ? `<div class="msg__bubble"><span class="dots"><i></i><i></i><i></i></span></div>`
        : `<div class="msg__bubble"></div>`;
      if (!isTyping) el.querySelector(".msg__bubble").textContent = text;
      msgs.appendChild(el);
      scrollBottom();
      return el;
    };

    const setTyping = (node, on) => {
      if (!node) return;
      node.classList.toggle("msg--typing", !!on);
      if (!on) node.innerHTML = `<div class="msg__bubble"></div>`;
    };

    // Mensagem de boas-vindas
    addMsg("bot","Olá! Posso ajudar com dúvidas sobre o POBJ. O que você quer saber?");

    form.addEventListener("submit", async (e)=>{
      e.preventDefault();
      const q = (input.value || "").trim();
      if (!q) return;

      addMsg("user", q);
      input.value = "";
      input.focus();
      send.disabled = true;

      const typing = addMsg("bot","", true);
      try{
        const answer = await sendToAgent(q);
        setTyping(typing, false);
        typing.querySelector(".msg__bubble").textContent = answer || "Desculpe, não consegui responder agora.";
      }catch(err){
        setTyping(typing, false);
        typing.querySelector(".msg__bubble").textContent = "Falha ao falar com o agente. Tente novamente.";
      }finally{
        send.disabled = false;
        scrollBottom();
      }
    });
  }

  /* ====== Integração ====== */
  async function sendToAgent(userText){
    if (CHAT_MODE === "http"){
      const r = await fetch(AGENT_ENDPOINT, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ question: userText })
      });
      if(!r.ok) throw new Error("HTTP "+r.status);
      const data = await r.json();
      return data.answer || "";
    }
    // Em modo IFRAME a conversa acontece dentro do próprio iframe,
    // então aqui só devolvemos vazio (não é usado).
    return "";
  }
}



/* ===== Troca de view (com spinner) ===== */
async function switchView(next) {
  const label =
    next === "table"   ? "Montando detalhamento…" :
    next === "ranking" ? "Calculando ranking…"    :
    next === "exec"    ? "Abrindo visão executiva…" :
                         "Carregando…";

  await withSpinner(async () => {
    const views = { cards:"#view-cards", table:"#view-table", ranking:"#view-ranking", exec:"#view-exec" };

    if (next === "ranking" && !$("#view-ranking")) createRankingView();
    if (next === "exec") createExecutiveView();


    Object.values(views).forEach(sel => $(sel)?.classList.add("hidden"));

    if (next === "table" && !state.tableRendered) {
      ensureChipBarAndToolbar();
      autoSnapViewToFilters();
      renderTreeTable();
      state.tableRendered = true;
    } else if (next === "table") {
      renderTreeTable();
    }

    if (next === "ranking") renderRanking();
    if (next === "exec")    renderExecutiveView();   // <- ADICIONE ESTA LINHA

    const el = $(views[next]) || $("#view-cards");
    el.classList.remove("hidden");
    state.activeView = next;
  }, label);
}



/* ===== Resumo (Indicadores / Pontos) ===== */
function hitbarClass(p){ return p<50 ? "hitbar--low" : (p<100 ? "hitbar--warn" : "hitbar--ok"); }
function renderResumoKPI(summary, visibleItemsHitCount, visiblePointsHit) {
  let kpi = $("#kpi-summary");
  if (!kpi) {
    kpi = document.createElement("div");
    kpi.id = "kpi-summary";
    kpi.className = "kpi-summary";
    $("#grid-familias").prepend(kpi);
  }

  const pctInd = summary.indicadoresTotal
    ? (visibleItemsHitCount / summary.indicadoresTotal)
    : (summary.indicadoresPct || 0);

  const pctPts = summary.pontosPossiveis
    ? (visiblePointsHit / summary.pontosPossiveis)
    : (summary.pontosPct || 0);

  const varPossivel = (summary.varPossivel != null)
    ? summary.varPossivel
    : Math.round((summary.pontosPossiveis || 0) * 1000);

  const varAtingido = (summary.varAtingido != null)
    ? summary.varAtingido
    : Math.round(varPossivel * pctPts);

  const pctVar = varPossivel ? (varAtingido / varPossivel) : 0;

  const f = { int:v=>fmtINT.format(v), brl:v=>fmtBRL.format(Math.round(v||0)) };

  const strip = (titulo, iconClass, atingidos, possiveis, pct, fmtType="int") => {
    const pct100 = Math.min(100, Math.max(0, pct * 100));
    const hbClass = pct100 < 50 ? "hitbar--low" : (pct100 < 100 ? "hitbar--warn" : "hitbar--ok");
    return `
      <div class="kpi-pill kpi-strip">
        <span class="kpi-icon"><i class="${iconClass}"></i></span>
        <span class="kpi-strip__label has-ellipsis" title="${titulo}">${titulo}</span>
        <span class="kpi-stat has-ellipsis" title="Atingidos: ${f[fmtType](atingidos)}">Atg: <strong title="${f[fmtType](atingidos)}">${f[fmtType](atingidos)}</strong></span>
        <span class="kpi-stat has-ellipsis" title="Total: ${f[fmtType](possiveis)}">Total: <strong title="${f[fmtType](possiveis)}">${f[fmtType](possiveis)}</strong></span>
        <span class="hitbar ${hbClass}">
          <span class="hitbar__track"><span class="hitbar__fill" style="width:${pct100}%"></span></span>
          <strong title="${pct100.toFixed(1)}%">${pct100.toFixed(1)}%</strong>
        </span>
      </div>`;
  };

  kpi.innerHTML =
    strip("Indicadores", "ti ti-list-check", visibleItemsHitCount, summary.indicadoresTotal || 0, pctInd, "int") +
    strip("Pontos",       "ti ti-medal",      visiblePointsHit,     summary.pontosPossiveis   || 0, pctPts, "int") +
    strip("Variável",     "ti ti-cash",       varAtingido,          varPossivel,                  pctVar, "brl");
}

/* ===== Tooltip dos cards ===== */
function buildCardTooltipHTML(item) {
  const start = state.period.start, end = state.period.end;
  const diasTotais     = businessDaysBetweenInclusive(start, end);
  const diasRestantes  = businessDaysRemainingFromToday(start, end);
  const diasDecorridos = Math.max(0, diasTotais - diasRestantes);

  let meta = item.meta, realizado = item.realizado;
  if (item.metric === "perc") meta = 100;
  const faltaTotal       = Math.max(0, meta - realizado);
  const necessarioPorDia = diasRestantes > 0 ? (faltaTotal / diasRestantes) : 0;
  const mediaDiaria      = diasDecorridos > 0 ? (realizado / diasDecorridos) : 0;
  const forecast         = mediaDiaria * diasTotais;

  const fmt = (m,v)=> m==="perc" ? `${v.toFixed(1)}%` : (m==="qtd" ? fmtINT.format(Math.round(v)) : fmtBRL.format(Math.round(v)));

  return `
    <div class="kpi-tip" role="dialog" aria-label="Detalhes do indicador">
      <h5>Projeção e metas</h5>
      <div class="row"><span>Dias úteis que faltam</span><span>${fmtINT.format(diasRestantes)}</span></div>
      <div class="row"><span>Falta para meta</span><span>${fmt(item.metric, faltaTotal)}</span></div>
      <div class="row"><span>Necessário por dia</span><span>${fmt(item.metric, necessarioPorDia)}</span></div>
      <div class="row"><span>Média diária atual</span><span>${fmt(item.metric, mediaDiaria)}</span></div>
      <div class="row"><span>Forecast (ritmo atual)</span><span>${fmt(item.metric, forecast)}</span></div>
    </div>
  `;
}
function positionTip(badge, tip) {
  const card = badge.closest(".prod-card"); if (!card) return;
  const b = badge.getBoundingClientRect();
  const c = card.getBoundingClientRect();
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  const vw = window.innerWidth, vh = window.innerHeight;

  let top = (b.bottom - c.top) + 8;
  if (b.bottom + th + 12 > vh) top = (b.top - c.top) - th - 8;

  let left = c.width - tw - 12;
  const absLeft = c.left + left;
  if (absLeft < 12) left = 12;
  if (absLeft + tw > vw - 12) left = Math.max(12, vw - 12 - c.left - tw);

  tip.style.top = `${top}px`;
  tip.style.left = `${left}px`;
}
function closeAllTips(){
  $$(".kpi-tip.is-open").forEach(t=>{ t.classList.remove("is-open"); t.style.left=""; t.style.top=""; });
  $$(".prod-card.is-tip-open").forEach(c=>c.classList.remove("is-tip-open"));
}

/* listeners globais para tooltips (uma vez) */
let __tipGlobalsWired = false;
function wireTipGlobalsOnce(){
  if(__tipGlobalsWired) return;
  __tipGlobalsWired = true;
  const close = () => closeAllTips();
  document.addEventListener("click", (e)=>{ if(!e.target.closest(".prod-card")) close(); });
  document.addEventListener("touchstart", (e)=>{ if(!e.target.closest(".prod-card")) close(); }, {passive:true});
  document.addEventListener("keydown", (e)=>{ if(e.key==="Escape") close(); });
  document.addEventListener("scroll", close, { capture:true, passive:true });
  window.addEventListener("resize", close);
}

function bindBadgeTooltip(card){
  const tip = card.querySelector(".kpi-tip");
  const badge = card.querySelector(".badge");
  if(!tip || !badge) return;

  const open = ()=>{
    closeAllTips();
    tip.classList.add("is-open");
    card.classList.add("is-tip-open");
    positionTip(badge, tip);
  };
  const close = ()=>{
    tip.classList.remove("is-open");
    card.classList.remove("is-tip-open");
    tip.style.left=""; tip.style.top="";
  };

  badge.addEventListener("mouseenter", open);
  card.addEventListener("mouseleave", close);
  badge.addEventListener("click",(e)=>{ e.stopPropagation(); if(tip.classList.contains("is-open")) close(); else open(e); });
  badge.addEventListener("touchstart",(e)=>{ e.stopPropagation(); if(tip.classList.contains("is-open")) close(); else open(e); }, {passive:true});

  wireTipGlobalsOnce();
}

/* ===== Cards por seção ===== */
function getStatusFilter(){ return $("#f-status-kpi")?.value || "todos"; }
function renderFamilias(sections, summary){
  const host = $("#grid-familias");
  host.innerHTML = "";
  host.style.display = "block";
  host.style.gap = "0";

  const status = getStatusFilter();
  const produtoFilterId = $("#f-familia")?.value || "Todas";

  let atingidosVisiveis = 0;
  let pontosAtingidosVisiveis = 0;

  const kpiHolder = document.createElement("div");
  kpiHolder.id = "kpi-summary";
  kpiHolder.className = "kpi-summary";
  host.appendChild(kpiHolder);

  sections.forEach(sec=>{
    if (produtoFilterId !== "Todas") {
      const secOfProduct = PRODUCT_INDEX.get(produtoFilterId)?.sectionId;
      if (sec.id !== secOfProduct) return;
    }

    const itemsFiltered = sec.items.filter(it=>{
      const okStatus = status === "atingidos" ? it.atingido : (status === "nao" ? !it.atingido : true);
      const okProduto = (produtoFilterId === "Todas" || it.id === produtoFilterId);
      return okStatus && okProduto;
    });
    if (!itemsFiltered.length) return;

    const sectionTotalPoints = sec.items.reduce((acc,i)=> acc + (i.peso||0), 0);
    const sectionPointsHit   = sec.items.filter(i=> i.atingido).reduce((acc,i)=> acc + (i.peso||0), 0);

    const sectionEl = document.createElement("section");
    sectionEl.className = "fam-section";
    sectionEl.id = `sec-${sec.id}`;
    sectionEl.innerHTML = `
      <header class="fam-section__header">
        <div class="fam-section__title">
          <span>${sec.label}</span>
          <small class="fam-section__meta">pontos: ${fmtINT.format(sectionPointsHit)}/${fmtINT.format(sectionTotalPoints)}</small>
        </div>
      </header>
      <div class="fam-section__grid"></div>`;
    const grid = sectionEl.querySelector(".fam-section__grid");

    itemsFiltered.forEach(f=>{
      if (f.atingido){ atingidosVisiveis += 1; pontosAtingidosVisiveis += (f.peso||0); }
      const pct = Math.max(0, Math.min(100, f.ating*100)); /* clamp 0..100 */
      const badgeClass = pct < 50 ? "badge--low" : (pct < 100 ? "badge--warn" : "badge--ok");
      const badgeTxt   = pct >= 100 ? `${Math.round(pct)}%` : `${pct.toFixed(1)}%`;
      const narrowStyle= badgeTxt.length >= 5 ? 'style="font-size:11px"' : '';

      const realizadoTxt = formatByMetric(f.metric, f.realizado);
      const metaTxt      = formatByMetric(f.metric, f.meta);

      grid.insertAdjacentHTML("beforeend", `
        <article class="prod-card" tabindex="0" data-prod-id="${f.id}">
          <div class="prod-card__title">
            <i class="${f.icon}"></i>
            <span class="prod-card__name has-ellipsis" title="${f.nome}">${f.nome}</span>
            <span class="badge ${badgeClass}" ${narrowStyle} aria-label="Atingimento" title="${badgeTxt}">${badgeTxt}</span>
          </div>

          <div class="prod-card__meta">
            <span class="pill">Pontos: ${fmtINT.format(f.peso)}/${fmtINT.format(sectionTotalPoints)}</span>
            <span class="pill">Peso: ${fmtINT.format(f.peso)}</span>
            <span class="pill">${f.metric === "valor" ? "Valor" : f.metric === "qtd" ? "Quantidade" : "Percentual"}</span>
          </div>

          <div class="prod-card__kpis">
            <div class="kv"><small>Realizado</small><strong class="has-ellipsis" title="${realizadoTxt}">${realizadoTxt}</strong></div>
            <div class="kv"><small>Meta</small><strong class="has-ellipsis" title="${metaTxt}">${metaTxt}</strong></div>
          </div>

          <div class="prod-card__foot">Atualizado em ${f.ultimaAtualizacao}</div>
          ${buildCardTooltipHTML(f)}
        </article>
      `);
    });

    host.appendChild(sectionEl);
  });

  renderResumoKPI(summary, atingidosVisiveis, pontosAtingidosVisiveis);

  $$(".prod-card").forEach(card=>{
    const tip = card.querySelector(".kpi-tip");
    const badge = card.querySelector(".badge");
    if (badge && tip) bindBadgeTooltip(card);

    card.addEventListener("click", (ev)=>{
      if (ev.target?.classList.contains("badge")) return;
      const prodId = card.getAttribute("data-prod-id");
      const sel = $("#f-familia");
      if (sel){
        let opt = Array.from(sel.options).find(o=>o.value===prodId);
        if(!opt){
          const meta = PRODUCT_INDEX.get(prodId);
          opt = new Option(meta?.name || prodId, prodId);
          sel.appendChild(opt);
        }
        sel.value = prodId;
      }
      state.tableView = "prodsub";
      setActiveChip("prodsub");
      const tabDet = document.querySelector('.tab[data-view="table"]');
      if (tabDet && !tabDet.classList.contains("is-active")) tabDet.click(); else switchView("table");
      applyFiltersAndRender();
      renderAppliedFilters();
    });
  });
}
/* ===== Abas extras ===== */
function ensureExtraTabs(){
  const tabs = document.querySelector(".tabs"); 
  if(!tabs) return;

  // Evita duplicar botões
  if(!tabs.querySelector('.tab[data-view="ranking"]')){
    const b = document.createElement("button");
    b.className="tab"; b.dataset.view="ranking"; b.textContent="Ranking";
    b.type = "button";
    tabs.insertBefore(b, tabs.querySelector(".tabs__aside"));
  }

  if(!tabs.querySelector('.tab[data-view="exec"]')){
    const b2 = document.createElement("button");
    b2.className="tab"; b2.dataset.view="exec"; b2.textContent="Visão executiva";
    b2.type = "button";
    tabs.insertBefore(b2, tabs.querySelector(".tabs__aside"));
  }
}

/* ===== Estilos adicionais da executiva (injetados por JS) ===== */
function ensureExecStyles(){
  if (document.getElementById("exec-enhanced-styles")) return;
  const s = document.createElement("style");
  s.id = "exec-enhanced-styles";
  s.textContent = `
    .exec-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px}
    .seg-mini.segmented{padding:2px;border-radius:8px}
    .seg-mini .seg-btn{padding:6px 8px;font-size:12px}
    .exec-chart{background:#fff;border:1px solid var(--stroke);border-radius:14px;box-shadow:var(--shadow);padding:12px}
    .chart{width:100%;overflow:hidden}
    .chart svg{display:block;width:100%;height:auto}
    .chart-legend{display:flex;gap:12px;flex-wrap:wrap;margin-top:8px}
    .legend-item{display:inline-flex;align-items:center;gap:6px;color:#475569;font-weight:700}
    .legend-swatch{width:14px;height:6px;border-radius:999px;background:#cbd5e1;border:1px solid #94a3b8}
    .legend-swatch--meta{background:#93c5fd;border-color:#60a5fa}
    .legend-swatch--real{background:#86efac;border-color:#4ade80}
    .legend-swatch--bars{background:#e5e7eb;border-color:#cbd5e1;height:10px}
    .exec-panel .exec-h{display:flex;align-items:center;justify-content:space-between;gap:10px}
  `;
  document.head.appendChild(s);
}

/* ===== Visão Executiva ===== */
function createExecutiveView(){
  ensureExecStyles();

  let host = document.getElementById("view-exec");
  if(!host){
    host = document.createElement("section");
    host.id = "view-exec";
    host.className = "hidden view-panel";
    document.querySelector(".container")?.appendChild(host);
  }

  // se já montei, não refaço o DOM (só re-renderizo os dados)
  if (host.querySelector("#exec-kpis")) return;

  host.innerHTML = `
    <section class="card card--exec">
      <header class="card__header exec-head">
        <div class="title-subtitle">
          <!-- sem título -->
          <div class="muted" id="exec-context"></div>
        </div>
      </header>

      <!-- KPIs topo -->
      <div id="exec-kpis" class="exec-kpis"></div>

      <!-- Gráfico de evolução -->
      <section class="exec-panel exec-span-2 exec-chart">
        <div class="exec-h"><span id="exec-chart-title">Evolução do mês</span></div>
        <div id="exec-chart" class="chart" role="img" aria-label="Evolução diária com linhas de meta e realizado"></div>
        <div class="chart-legend">
          <span class="legend-item"><span class="legend-swatch legend-swatch--bars"></span>Diário realizado (barras)</span>
          <span class="legend-item"><span class="legend-swatch legend-swatch--real"></span>Realizado acumulado (linha)</span>
          <span class="legend-item"><span class="legend-swatch legend-swatch--meta"></span>Meta acumulada (linha)</span>
        </div>
      </section>

      <div class="exec-grid">
        <!-- Painel de ranking com toggle Top/Bottom -->
        <section class="exec-panel" id="exec-rank-panel">
          <div class="exec-h">
            <span id="exec-rank-title">Desempenho por unidade</span>
            <div class="segmented seg-mini" role="tablist" aria-label="Ordenação">
              <button type="button" class="seg-btn is-active" data-rk="top">Top 5</button>
              <button type="button" class="seg-btn" data-rk="bottom">Bottom 5</button>
            </div>
          </div>
          <div id="exec-rank" class="rank-mini"></div>
        </section>

        <!-- Painel de status com 3 visões -->
        <section class="exec-panel" id="exec-status-panel">
          <div class="exec-h">
            <span id="exec-status-title">Status das unidades</span>
            <div class="segmented seg-mini" role="tablist" aria-label="Status">
              <button type="button" class="seg-btn" data-st="hit">Atingidas</button>
              <button type="button" class="seg-btn is-active" data-st="quase">Quase lá</button>
              <button type="button" class="seg-btn" data-st="longe">Longe</button>
            </div>
          </div>
          <div id="exec-status-list" class="list-mini"></div>
        </section>

        <section class="exec-panel exec-span-2">
          <h4 class="exec-h"><span id="exec-ritmo-title">Ritmo do mês</span></h4>
          <div id="exec-ritmo" class="ritmo"></div>
        </section>

        <section class="exec-panel exec-span-2">
          <h4 class="exec-h"><span id="exec-heatmap-title">Heatmap</span></h4>
          <div id="exec-heatmap" class="hm"></div>
        </section>
      </div>
    </section>`;

  // estado local da executiva
  if (!state.exec) state.exec = { rankMode: "top", statusMode: "quase" };

  // listeners dos segmented da executiva
  host.querySelectorAll('#exec-rank-panel .seg-btn').forEach(b=>{
    b.addEventListener('click', ()=>{
      host.querySelectorAll('#exec-rank-panel .seg-btn').forEach(x=>x.classList.remove('is-active'));
      b.classList.add('is-active');
      state.exec.rankMode = b.dataset.rk; // "top" | "bottom"
      if (state.activeView==='exec') renderExecutiveView();
    });
  });
  host.querySelectorAll('#exec-status-panel .seg-btn').forEach(b=>{
    b.addEventListener('click', ()=>{
      host.querySelectorAll('#exec-status-panel .seg-btn').forEach(x=>x.classList.remove('is-active'));
      b.classList.add('is-active');
      state.exec.statusMode = b.dataset.st; // "hit" | "quase" | "longe"
      if (state.activeView==='exec') renderExecutiveView();
    });
  });

  // filtros disparando re-render quando a aba executiva estiver aberta
  const execSel = ["#f-segmento","#f-diretoria","#f-gerencia","#f-agencia","#f-ggestao","#f-gerente","#f-familia","#f-subproduto","#f-status-kpi"];
  execSel.forEach(sel => $(sel)?.addEventListener("change", ()=>{ if (state.activeView==='exec') renderExecutiveView(); }));
  $("#btn-consultar")?.addEventListener("click", ()=>{ if (state.activeView==='exec') renderExecutiveView(); });
}

/* Helpers de agregação para a Visão Executiva */
function execAggBy(rows, key){
  const map = new Map();
  rows.forEach(r=>{
    const k = key === "__total__" ? "__total__" : (r[key] || "—");
    const o = map.get(k) || { key:k, real_mens:0, meta_mens:0, real_acum:0, meta_acum:0, qtd:0 };
    o.real_mens += (r.real_mens ?? r.realizado ?? 0);
    o.meta_mens += (r.meta_mens ?? r.meta ?? 0);
    o.real_acum += (r.real_acum ?? r.realizado ?? 0);
    o.meta_acum += (r.meta_acum ?? r.meta ?? 0);
    o.qtd       += (r.qtd ?? 0);
    map.set(k,o);
  });
  return [...map.values()].map(x=>{
    const ating_mens = x.meta_mens ? x.real_mens/x.meta_mens : 0;
    const ating_acum = x.meta_acum ? x.real_acum/x.meta_acum : 0;
    const def_mens   = x.real_mens - x.meta_mens;
    return { ...x, ating_mens, ating_acum, def_mens, p_mens: ating_mens*100, p_acum: ating_acum*100 };
  });
}
function pctBadgeCls(p){ return p<50?"att-low":(p<100?"att-warn":"att-ok"); }
function moneyBadgeCls(v){ return v>=0?"def-pos":"def-neg"; }

// nível inicial conforme filtros (pra baixo)
function execStartLevelFromFilters(){
  const f = getFilterValues();
  if (f.gerente && f.gerente !== "Todos")   return "prodsub";
  if (f.ggestao && f.ggestao !== "Todos")   return "gerente";
  if (f.agencia && f.agencia !== "Todas")   return "gGestao";
  if (f.gerencia && f.gerencia !== "Todas") return "agencia";
  if (f.diretoria && f.diretoria !== "Todas") return "gerencia";
  return "gerencia";
}
function levelKeyFor(start){
  return {
    gerencia: "gerenciaRegional",
    agencia:  "agencia",
    gGestao:  "gerenteGestao",
    gerente:  "gerente",
    prodsub:  "prodOrSub"
  }[start] || "gerenciaRegional";
}
function levelLabel(start){
  return {
    gerencia: {sing:"Regional", plural:"Regionais", short:"GR"},
    agencia:  {sing:"Agência", plural:"Agências", short:"Agências"},
    gGestao:  {sing:"Ger. de Gestão", plural:"Ger. de Gestão", short:"GG"},
    gerente:  {sing:"Gerente", plural:"Gerentes", short:"Gerentes"},
    prodsub:  {sing:"Produto/Subproduto", plural:"Produtos", short:"Produtos"}
  }[start];
}

/* ===== Série e gráfico (SVG responsivo) ===== */
function makeDailySeries(totalMeta, totalReal, startISO, endISO){
  const s = dateUTCFromISO(startISO), e = dateUTCFromISO(endISO);
  const days = [];
  for (let d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate()+1)) days.push(new Date(d));
  const isBiz = d => (d.getUTCDay() !== 0 && d.getUTCDay() !== 6);
  const bizIdx = days.map((d,i)=> isBiz(d) ? i : -1).filter(i=>i>=0);
  const nBiz = bizIdx.length || 1;

  // meta igualmente distribuída em dias úteis
  const perMeta = totalMeta / nBiz;
  const dailyMeta = days.map(d => isBiz(d) ? perMeta : 0);

  // realizado com variação e normalização ao total
  let rnd = bizIdx.map(()=> 0.6 + Math.random()*1.1);
  const rndSum = rnd.reduce((a,b)=>a+b,0) || 1;
  rnd = rnd.map(x=> x / rndSum);
  const dailyReal = days.map(()=>0);
  bizIdx.forEach((idx,i)=>{ dailyReal[idx] = totalReal * rnd[i]; });

  const cum = (arr)=> arr.reduce((acc,v,i)=> (acc[i] = (i?acc[i-1]:0)+v, acc), []);
  const cumMeta = cum(dailyMeta);
  const cumReal = cum(dailyReal);

  const labels = days.map(d=> String(d.getUTCDate()).padStart(2,"0"));
  return { labels, dailyReal, cumMeta, cumReal };
}
function buildExecChart(container, series){
  const W = container.clientWidth || 900;
  const H = 260;
  const m = { t:18, r:18, b:26, l:52 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;

  const n = series.labels.length;
  const maxY = Math.max(...series.cumMeta, ...series.cumReal) * 1.10 || 1;

  const x = i => m.l + (iw / Math.max(1,n-1)) * i;
  const y = v => m.t + ih - (v / maxY) * ih;

  const barW = Math.max(2, iw / (n*1.6));

  // grid Y
  const gy = [];
  for(let k=0;k<=4;k++){
    const val = (maxY/4)*k;
    gy.push({ y: y(val), label: fmtBRL.format(Math.round(val)) });
  }

  const path = (arr)=> arr.map((v,i)=> `${i?"L":"M"} ${x(i)} ${y(v)}`).join(" ");
  const bars = series.dailyReal.map((v,i)=> 
    `<rect x="${x(i)-barW/2}" y="${y(v)}" width="${barW}" height="${Math.max(0, y(0)-y(v))}" fill="#e5e7eb" stroke="#cbd5e1"/>`
  ).join("");

  const lineReal = `<path d="${path(series.cumReal)}" fill="none" stroke="#22c55e" stroke-width="2.5" />`;
  const lineMeta = `<path d="${path(series.cumMeta)}" fill="none" stroke="#60a5fa" stroke-width="2.5" stroke-dasharray="6 6" />`;

  const pickIdx = (i)=> Math.min(n-1, Math.max(0, i));
  const ticksX = [0, Math.floor(n*0.33), Math.floor(n*0.66), n-1].map(pickIdx);
  const xlabels = [...new Set(ticksX)].map(i => 
    `<text x="${x(i)}" y="${H-6}" font-size="10" text-anchor="middle" fill="#6b7280">${series.labels[i]}</text>`).join("");

  const gridY = gy.map(g => 
    `<line x1="${m.l}" y1="${g.y}" x2="${W-m.r}" y2="${g.y}" stroke="#eef2f7"/>
     <text x="${m.l-6}" y="${g.y+3}" font-size="10" text-anchor="end" fill="#6b7280">${g.label}</text>`
  ).join("");

  container.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="barras diárias e linhas de meta e realizado">
      <rect x="0" y="0" width="${W}" height="${H}" fill="white"/>
      ${gridY}
      ${bars}
      ${lineMeta}
      ${lineReal}
      <line x1="${m.l}" y1="${H-m.b}" x2="${W-m.r}" y2="${H-m.b}" stroke="#e5e7eb"/>
      ${xlabels}
    </svg>`;
}

/* ===== Render principal da Visão Executiva ===== */
function renderExecutiveView(){
  const host = document.getElementById("view-exec"); 
  if(!host) return;

  const ctx    = document.getElementById("exec-context");
  const kpis   = document.getElementById("exec-kpis");
  const chartC = document.getElementById("exec-chart");
  const hm     = document.getElementById("exec-heatmap");
  const rankEl = document.getElementById("exec-rank");
  const ritmo  = document.getElementById("exec-ritmo");
  const statusList = document.getElementById("exec-status-list");

  if (!Array.isArray(state._rankingRaw) || !state._rankingRaw.length){
    ctx && (ctx.textContent = "Carregando dados…");
    return;
  }

  // base com TODOS os filtros aplicados
  const rowsBase = filterRows(state._rankingRaw);

  // nível inicial
  const start = execStartLevelFromFilters();
  const startKey = levelKeyFor(start);
  const L = levelLabel(start);

  // títulos conforme nível
  document.getElementById("exec-rank-title").textContent   = `Desempenho por ${L.sing}`;
  document.getElementById("exec-heatmap-title").textContent= `Heatmap — ${L.short} × Família`;
  document.getElementById("exec-status-title").textContent = `Status das ${L.plural}`;

  // contexto
  if (ctx){
    const f = getFilterValues();
    const foco =
      f.gerente  && f.gerente  !== "Todos" ? `Gerente: ${f.gerente}` :
      f.ggestao  && f.ggestao  !== "Todos" ? `GG: ${f.ggestao}` :
      f.agencia  && f.agencia  !== "Todas" ? `Agência: ${f.agencia}` :
      f.gerencia && f.gerencia !== "Todas" ? `GR: ${f.gerencia}` :
      f.diretoria&& f.diretoria!== "Todas" ? `Diretoria: ${f.diretoria}` : `Todas as Diretorias`;
    ctx.innerHTML = `<strong>${foco}</strong> · Período: ${formatBRDate(state.period.start)} a ${formatBRDate(state.period.end)}`;
  }

  // KPIs gerais
  const total = execAggBy(rowsBase, "__total__").reduce((a,b)=>({
    real_mens:a.real_mens + b.real_mens, meta_mens:a.meta_mens + b.meta_mens,
    real_acum:a.real_acum + b.real_acum, meta_acum:a.meta_acum + b.meta_acum
  }), {real_mens:0,meta_mens:0,real_acum:0,meta_acum:0});

  const ating = total.meta_mens ? total.real_mens/total.meta_mens : 0;
  const defas = total.real_mens - total.meta_mens;

  const diasTotais     = businessDaysBetweenInclusive(state.period.start, state.period.end);
  const diasRestantes  = businessDaysRemainingFromToday(state.period.start, state.period.end);
  const diasDecorridos = Math.max(0, diasTotais - diasRestantes);
  const mediaDiaria    = diasDecorridos>0 ? (total.real_mens/diasDecorridos) : 0;
  const necessarioDia  = diasRestantes>0 ? Math.max(0, (total.meta_mens-total.real_mens)/diasRestantes) : 0;
  const forecast       = mediaDiaria * diasTotais;
  const forecastPct    = total.meta_mens ? (forecast/total.meta_mens)*100 : 0;

  if (kpis){
    kpis.innerHTML = `
      <div class="kpi-card">
        <div class="kpi-card__title">Atingimento mensal</div>
        <div class="kpi-card__value">${fmtBRL.format(total.real_mens)} <small>/ ${fmtBRL.format(total.meta_mens)}</small></div>
        <div class="kpi-card__bar">
          <div class="kpi-card__fill ${pctBadgeCls(ating*100)}" style="width:${Math.min(100, Math.max(0, ating*100))}%"></div>
        </div>
        <div class="kpi-card__pct"><span class="att-badge ${pctBadgeCls(ating*100)}">${(ating*100).toFixed(1)}%</span></div>
      </div>

      <div class="kpi-card">
        <div class="kpi-card__title">Defasagem do mês</div>
        <div class="kpi-card__value ${moneyBadgeCls(defas)}">${fmtBRL.format(defas)}</div>
        <div class="kpi-sub muted">Real – Meta (mês)</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-card__title">Forecast x Meta</div>
        <div class="kpi-card__value">${fmtBRL.format(Math.round(forecast))} <small>/ ${fmtBRL.format(total.meta_mens)}</small></div>
        <div class="kpi-card__bar">
          <div class="kpi-card__fill ${pctBadgeCls(forecastPct)}" style="width:${Math.min(100, Math.max(0, forecastPct))}%"></div>
        </div>
        <div class="kpi-card__pct"><span class="att-badge ${pctBadgeCls(forecastPct)}">${forecastPct.toFixed(1)}%</span></div>
      </div>`;
  }

  // Gráfico
  if (chartC){
    const series = makeDailySeries(total.meta_mens, total.real_mens, state.period.start, state.period.end);
    buildExecChart(chartC, series);

    // redimensiona enquanto essa aba estiver ativa
    if (!host.__execResize){
      let raf = null;
      host.__execResize = () => {
        if (state.activeView !== 'exec') return;
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(()=> buildExecChart(chartC, series));
      };
      window.addEventListener('resize', host.__execResize);
    }
  }

  // Ranking Top/Bottom para o nível atual
  const grouped = execAggBy(rowsBase, startKey).sort((a,b)=> b.p_mens - a.p_mens);
  const renderRankRows = (arr)=> arr.map(r=>`
    <div class="rank-mini__row" data-key="${r.key}">
      <div class="rank-mini__name">${r.key}</div>
      <div class="rank-mini__bar"><span style="width:${Math.min(100,Math.max(0,r.p_mens))}%"></span></div>
      <div class="rank-mini__pct"><span class="att-badge ${pctBadgeCls(r.p_mens)}">${r.p_mens.toFixed(1)}%</span></div>
      <div class="rank-mini__vals"><strong>${fmtBRL.format(r.real_mens)}</strong> <small>/ ${fmtBRL.format(r.meta_mens)}</small></div>
    </div>
  `).join("");

  if (rankEl){
    if (state.exec.rankMode === "bottom"){
      const worst = grouped.slice(-5).reverse();
      rankEl.innerHTML = renderRankRows(worst);
    }else{
      const best = grouped.slice(0,5);
      rankEl.innerHTML = renderRankRows(best);
    }
    // clique: aplica filtro correspondente e vai pro detalhamento
    rankEl.querySelectorAll(".rank-mini__row").forEach(row=>{
      row.addEventListener("click", ()=>{
        const key = row.getAttribute("data-key");
        const mapSel = {
          gerencia: "#f-gerencia",
          agencia:  "#f-agencia",
          gGestao:  "#f-ggestao",
          gerente:  "#f-gerente",
          prodsub:  "#f-subproduto"
        };
        const sel = document.querySelector(mapSel[start]);
        if (sel && key){
          // tenta setar; se não existir na lista, ignora
          const opt = [...sel.options].find(o=>o.value===key);
          if (opt){ sel.value = key; sel.dispatchEvent(new Event("change")); }
        }
        document.querySelector('.tab[data-view="table"]')?.click();
      });
    });
  }

  // Ritmo
  if (ritmo){
    const ritmoOk = mediaDiaria >= necessarioDia && total.real_mens < total.meta_mens ? "ok" : (mediaDiaria>=necessarioDia ? "ok" : "warn");
    ritmo.innerHTML = `
      <div class="ritmo-grid">
        <div class="ritmo-box">
          <div class="ritmo-label">Média/dia atual</div>
          <div class="ritmo-val">${fmtBRL.format(Math.round(mediaDiaria))}</div>
          <div class="ritmo-bar"><span style="width:100%"></span></div>
        </div>
        <div class="ritmo-box">
          <div class="ritmo-label">Necessário/dia</div>
          <div class="ritmo-val">${fmtBRL.format(Math.round(necessarioDia))}</div>
          <div class="ritmo-bar ritmo-need"><span style="width:100%"></span></div>
        </div>
        <div class="ritmo-note ${ritmoOk==='ok'?'pos':'neg'}">
          ${ritmoOk==='ok' ? 'No ritmo para bater a meta.' : 'Abaixo do ritmo — ajuste necessário.'}
        </div>
      </div>`;
  }

  // Heatmap — (start) × Família
  if (hm){
    const fams = [...new Set(rowsBase.map(r=> r.familia).filter(Boolean))];
    const units = [...new Set(rowsBase.map(r=> r[startKey]).filter(Boolean))];
    const byUF = new Map();
    rowsBase.forEach(r=>{
      const key = `${r[startKey]}|${r.familia}`;
      const o = byUF.get(key) || { real:0, meta:0 };
      o.real += (r.real_mens ?? r.realizado ?? 0);
      o.meta += (r.meta_mens ?? r.meta ?? 0);
      byUF.set(key, o);
    });

    let html = `<div class="hm-row hm-head"><div class="hm-cell hm-corner">${L.short} \\ Família</div>${
      fams.map(f=> `<div class="hm-cell hm-col">${f}</div>`).join("")
    }</div>`;
    units.forEach(u=>{
      html += `<div class="hm-row"><div class="hm-cell hm-rowh">${u}</div>`;
      fams.forEach(f=>{
        const k = `${u}|${f}`;
        const o = byUF.get(k) || {real:0, meta:0};
        const p = o.meta ? (o.real/o.meta)*100 : 0;
        const cls = p<50?"hm-bad":(p<100?"hm-warn":"hm-ok");
        html += `<div class="hm-cell hm-val ${cls}" data-u="${u}" data-f="${f}" title="${p.toFixed(1)}%">${p.toFixed(0)}%</div>`;
      });
      html += `</div>`;
    });
    hm.innerHTML = html;

    hm.querySelectorAll(".hm-val").forEach(c=>{
      c.addEventListener("click", ()=>{
        const u = c.getAttribute("data-u");
        const mapSel = {
          gerencia: "#f-gerencia",
          agencia:  "#f-agencia",
          gGestao:  "#f-ggestao",
          gerente:  "#f-gerente",
          prodsub:  "#f-subproduto"
        };
        const sel = document.querySelector(mapSel[start]);
        if (sel && u){
          const opt = [...sel.options].find(o=>o.value===u);
          if (opt){ sel.value = u; sel.dispatchEvent(new Event("change")); }
        }
        state.tableView = "prodsub";
        document.querySelector('.tab[data-view="table"]')?.click();
      });
    });
  }

  // Status das unidades (3 listas) no nível inicial
  if (statusList){
    const base = execAggBy(rowsBase, startKey);
    const hit   = base.filter(a => a.p_mens >= 100).sort((a,b)=> b.p_mens - a.p_mens).slice(0,8);
    const quase = base.filter(a => a.p_mens >= 90 && a.p_mens < 100).sort((a,b)=> b.p_mens - a.p_mens).slice(0,8);
    const longe = base.map(r => ({ ...r, gap: r.real_mens - r.meta_mens }))
                      .sort((a,b)=> a.gap - b.gap) // mais negativos primeiro
                      .slice(0,8);

    const row = (name, badgeHTML)=>`
      <div class="list-mini__row" data-key="${name}">
        <div class="list-mini__name">${name}</div>
        <div class="list-mini__val">${badgeHTML}</div>
      </div>`;

    let html = "";
    if (state.exec.statusMode === "hit"){
      html = hit.length ? hit.map(a=> row(a.key, `<span class="att-badge att-ok">${a.p_mens.toFixed(1)}%</span>`)).join("")
                        : `<div class="muted">Nenhuma unidade atingiu 100% no momento.</div>`;
    } else if (state.exec.statusMode === "longe"){
      html = longe.length ? longe.map(a=> row(a.key, `<span class="def-badge def-neg">${fmtBRL.format(a.gap)}</span>`)).join("")
                          : `<div class="muted">Sem defasagens relevantes agora.</div>`;
    } else {
      html = quase.length ? quase.map(a=> row(a.key, `<span class="att-badge att-warn">${a.p_mens.toFixed(1)}%</span>`)).join("")
                          : `<div class="muted">Nenhuma unidade entre 90–99% no momento.</div>`;
    }
    statusList.innerHTML = html;

    statusList.querySelectorAll(".list-mini__row").forEach(row=>{
      row.addEventListener("click", ()=>{
        const key = row.getAttribute("data-key");
        const mapSel = {
          gerencia: "#f-gerencia",
          agencia:  "#f-agencia",
          gGestao:  "#f-ggestao",
          gerente:  "#f-gerente",
          prodsub:  "#f-subproduto"
        };
        const sel = document.querySelector(mapSel[start]);
        if (sel && key){
          const opt = [...sel.options].find(o=>o.value===key);
          if (opt){ sel.value = key; sel.dispatchEvent(new Event("change")); }
        }
        document.querySelector('.tab[data-view="table"]')?.click();
      });
    });
  }
}

/* ===== Ranking ===== */
function createRankingView(){
  const main = document.querySelector(".container"); 
  if(!main) return;
  if (document.getElementById("view-ranking")) return;

  const section = document.createElement("section");
  section.id="view-ranking"; section.className="hidden view-panel";
  section.innerHTML = `
    <section class="card card--ranking">
      <header class="card__header">
        <h3>Ranking</h3>
        <div class="rk-controls">
          <div class="segmented" role="tablist" aria-label="Período">
            <button type="button" class="seg-btn is-active" data-mode="mensal">Mensal</button>
            <button type="button" class="seg-btn" data-mode="acumulado">Acumulado</button>
          </div>
        </div>
      </header>

      <div class="rk-summary" id="rk-summary"></div>
      <div id="rk-table"></div>
    </section>`;
  main.appendChild(section);

  document.querySelectorAll("#view-ranking .seg-btn").forEach(b=>{
    b.addEventListener("click", ()=>{
      document.querySelectorAll("#view-ranking .seg-btn").forEach(x=>x.classList.remove("is-active"));
      b.classList.add("is-active");
      state.rk.mode = b.dataset.mode;
      renderRanking();
    });
  });
}
function currentUnitForLevel(level){
  const f=getFilterValues();
  switch(level){
    case "gerente":  return f.gerente && f.gerente!=="Todos" ? f.gerente : "";
    case "agencia":  return f.agencia && f.agencia!=="Todas" ? f.agencia : "";
    case "gerencia": return f.gerencia && f.gerencia!=="Todas" ? f.gerencia : "";
    case "diretoria":return f.diretoria && f.diretoria!=="Todas" ? f.diretoria : "";
    default: return "";
  }
}
function rkGroupCount(level){
  if(level==="diretoria") return 4;
  if(level==="gerencia")  return 8;
  if(level==="agencia")   return 15;
  return 12;
}
function deriveRankingLevelFromFilters(){
  const f = getFilterValues();
  if(f.gerente && f.gerente!=="Todos")   return "gerente";
  if(f.agencia && f.agencia!=="Todas")   return "agencia";
  if(f.gerencia && f.gerencia!=="Todas") return "gerencia";
  if(f.diretoria && f.diretoria!=="Todas") return "diretoria";
  return "agencia";
}
function aggRanking(rows, level){
  const keyMap = { diretoria:"diretoria", gerencia:"gerenciaRegional", agencia:"agencia", gerente:"gerente" };
  const k = keyMap[level] || "agencia";
  const map = new Map();
  rows.forEach(r=>{
    const key=r[k] || "—";
    const obj = map.get(key) || { unidade:key, real_mens:0, meta_mens:0, real_acum:0, meta_acum:0, qtd:0 };
    obj.real_mens += (r.real_mens ?? r.realizado ?? 0);
    obj.meta_mens += (r.meta_mens ?? r.meta ?? 0);
    obj.real_acum += (r.real_acum ?? r.realizado ?? 0);
    obj.meta_acum += (r.meta_acum ?? r.meta ?? 0);
    obj.qtd       += (r.qtd ?? 0);
    map.set(key,obj);
  });
  return [...map.values()].map(x=>{
    const ating_mens = x.meta_mens ? x.real_mens/x.meta_mens : 0;
    const ating_acum = x.meta_acum ? x.real_acum/x.meta_acum : 0;
    return { ...x, ating_mens, ating_acum, p_mens: ating_mens*100, p_acum: ating_acum*100 };
  });
}
function renderRanking(){
  const hostSum = document.getElementById("rk-summary");
  const hostTbl = document.getElementById("rk-table");
  if(!hostSum || !hostTbl) return;

  const level = deriveRankingLevelFromFilters();
  state.rk.level = level;

  const except = { [level]: true };
  const rows = filterRowsExcept(state._rankingRaw, except, { searchTerm: "" });

  const data = aggRanking(rows, level);
  const modeKey = state.rk.mode === "acumulado" ? "p_acum" : "p_mens";
  data.sort((a,b)=> (b[modeKey] - a[modeKey]));

  const gruposLimite = rkGroupCount(level);
  const dataClamped = data.slice(0, gruposLimite);

  const myUnit = currentUnitForLevel(level);
  const myIndexFull = myUnit ? data.findIndex(d => d.unidade===myUnit) : -1;
  const myRankFull = myIndexFull>=0 ? (myIndexFull+1) : "—";

  hostSum.innerHTML = `
    <div class="rk-badges">
      <span class="rk-badge"><strong>Nível:</strong> ${level.charAt(0).toUpperCase()+level.slice(1)}</span>
      <span class="rk-badge"><strong>Limite do nível:</strong> ${fmtINT.format(gruposLimite)}</span>
      <span class="rk-badge"><strong>Exibindo:</strong> ${fmtINT.format(dataClamped.length)}</span>
      <span class="rk-badge"><strong>Sua posição:</strong> ${myRankFull}</span>
    </div>
  `;

  hostTbl.innerHTML = "";
  const tbl = document.createElement("table");
  tbl.className = "rk-table";
  tbl.innerHTML = `
    <thead>
      <tr>
        <th class="pos-col">#</th>
        <th class="unit-col">Unidade</th>
        <th>Pontos (mensal)</th>
        <th>Pontos (acumulado)</th>
        <th>Atingimento</th>
        <th>Realizado (R$)</th>
        <th>Meta (R$)</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tb = tbl.querySelector("tbody");

  dataClamped.forEach((r,idx)=>{
    const isMine = (myUnit && r.unidade === myUnit);
    const nome = isMine ? r.unidade : "••••••••••";
    const ating = state.rk.mode === "acumulado" ? r.ating_acum : r.ating_mens;
    const real  = state.rk.mode === "acumulado" ? r.real_acum : r.real_mens;
    const meta  = state.rk.mode === "acumulado" ? r.meta_acum : r.meta_mens;

    const tr = document.createElement("tr");
    tr.className = `rk-row ${isMine? "rk-row--mine":""}`;
    tr.innerHTML = `
      <td class="pos-col">${idx+1}</td>
      <td class="unit-col rk-name">${nome}</td>
      <td>${r.p_mens.toFixed(1)}</td>
      <td>${r.p_acum.toFixed(1)}</td>
      <td><span class="att-badge ${ating*100<50?"att-low":(ating*100<100?"att-warn":"att-ok")}">${(ating*100).toFixed(1)}%</span></td>
      <td>${fmtBRL.format(real)}</td>
      <td>${fmtBRL.format(meta)}</td>
    `;
    tb.appendChild(tr);
  });

  hostTbl.appendChild(tbl);
}

/* ===== Tabela em árvore (Detalhamento) ===== */
function renderTreeTable() {
  ensureChipBarAndToolbar();

  const def = TABLE_VIEWS.find(v=> v.id === state.tableView) || TABLE_VIEWS[0];
  const rowsFiltered = filterRows(state._rankingRaw);
  const nodes = buildTree(rowsFiltered, def.id);

  const host = document.getElementById("gridRanking"); 
  if (!host) return;
  host.innerHTML = "";

  const table = document.createElement("table");
  table.className = "tree-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th>${def.label}</th>
        <th>Quantidade</th>
        <th>Realizado (R$)</th>
        <th>Meta (R$)</th>
        <th>Defasagem (R$)</th>
        <th>Atingimento</th>
        <th>Data</th>
        <th class="col-actions">Ações</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector("tbody");
  host.appendChild(table);

  if (state.compact) document.getElementById("table-section")?.classList.add("is-compact");
  else document.getElementById("table-section")?.classList.remove("is-compact");

  let seq=0; const mkId=()=>`n${++seq}`;
  const att = (p)=>{ const pct=(p*100); const cls=pct<50?"att-low":(pct<100?"att-warn":"att-ok"); return `<span class="att-badge ${cls}">${pct.toFixed(1)}%</span>`; }
  const defas = (real,meta)=>{ const d=(real||0)-(meta||0); const cls=d>=0?"def-pos":"def-neg"; return `<span class="def-badge ${cls}">${fmtBRL.format(d)}</span>`; }

  function renderNode(node, parentId=null, parentTrail=[]){
    const id=mkId(), has=!!(node.children&&node.children.length);
    const tr=document.createElement("tr");
    tr.className=`tree-row ${node.type==="contrato"?"type-contrato":""} lvl-${node.level}`;
    tr.dataset.id=id; if(parentId) tr.dataset.parent=parentId;
    const trail=[...parentTrail, node.label];

    tr.innerHTML=`
      <td><div class="tree-cell">
        <button class="toggle" type="button" ${has?"":"disabled"} aria-label="${has?"Expandir/colapsar":""}"><i class="ti ${has?"ti-chevron-right":"ti-dot"}"></i></button>
        <span class="label-strong">${node.label}</span></div></td>
      <td>${fmtINT.format(node.qtd||0)}</td>
      <td>${fmtBRL.format(node.realizado||0)}</td>
      <td>${fmtBRL.format(node.meta||0)}</td>
      <td>${defas(node.realizado,node.meta)}</td>
      <td>${att(node.ating||0)}</td>
      <td>${formatBRDate(node.data||"")}</td>
      <td class="actions-cell">
        <span class="actions-group">
          <button type="button" class="icon-btn" title="Abrir chamado"><i class="ti ti-ticket"></i></button>
          <button type="button" class="icon-btn" title="Copiar referência"><i class="ti ti-copy"></i></button>
        </span>
      </td>`;

    const [btnTicket, btnCopy] = tr.querySelectorAll(".icon-btn");
    btnTicket?.addEventListener("click",(ev)=>{ ev.stopPropagation(); window.open(TICKET_URL,"_blank"); });
    btnCopy?.addEventListener("click",(ev)=>{
      ev.stopPropagation();
      const text = trail.join(" > ");
      navigator.clipboard?.writeText(text);
      btnCopy.innerHTML = '<i class="ti ti-check"></i>'; setTimeout(()=> btnCopy.innerHTML = '<i class="ti ti-copy"></i>', 900);
    });

    const btn=tr.querySelector(".toggle");
    if(btn && has){
      btn.addEventListener("click", ()=>{
        const isOpen=btn.dataset.open==="1";
        btn.dataset.open=isOpen?"0":"1";
        btn.querySelector("i").className=`ti ${isOpen?"ti-chevron-right":"ti-chevron-down"}`;
        toggleChildren(id, !isOpen);
      });
    }

    tbody.appendChild(tr);
    if(has){
      node.children.forEach(ch=>renderNode(ch, id, trail));
      toggleChildren(id, false);
    }
  }

  function toggleChildren(parentId, show){
    const kids=[...tbody.querySelectorAll(`tr[data-parent="${parentId}"]`)];
    kids.forEach(ch=>{
      ch.style.display=show?"table-row":"none";
      if(!show){
        const b=ch.querySelector(".toggle[data-open='1']");
        if(b){ b.dataset.open="0"; b.querySelector("i").className="ti ti-chevron-right"; }
        toggleChildren(ch.dataset.id,false);
      }
    });
  }

  nodes.forEach(n=>renderNode(n,null,[]));
}
function applyFiltersAndRender(){ if(state.tableRendered) renderTreeTable(); }
function expandAllRows(){
  const tb=document.querySelector("#gridRanking tbody"); if(!tb) return;
  tb.querySelectorAll("tr").forEach(tr=>{
    const b=tr.querySelector("i.ti-chevron-right")?.parentElement;
    if(b && !b.disabled){ b.dataset.open="1"; b.querySelector("i").className="ti ti-chevron-down"; }
    if(tr.dataset.parent) tr.style.display="table-row";
  });
}
function collapseAllRows(){
  const tb=document.querySelector("#gridRanking tbody"); if(!tb) return;
  tb.querySelectorAll("tr").forEach(tr=>{
    const b=tr.querySelector("i.ti-chevron-down")?.parentElement || tr.querySelector(".toggle");
    if(b && !b.disabled){ b.dataset.open="0"; b.querySelector("i").className="ti ti-chevron-right"; }
    if(tr.dataset.parent) tr.style.display="none";
  });
}

/* ===== Tooltip simples (para .has-ellipsis com title) ===== */
function enableSimpleTooltip(){
  let tip = document.getElementById("__tip");
  if(!tip){
    tip = document.createElement("div");
    tip.id = "__tip";
    tip.className = "tip";
    document.body.appendChild(tip);
  }

  const moveTitlesToDataTip = (root = document) => {
    root.querySelectorAll('[title]').forEach(el => {
      if (
        el.closest('.kpi-tip') ||
        el.tagName === 'SVG' || el.tagName === 'USE' ||
        el.hasAttribute('data-native-title')
      ) return;

      const t = el.getAttribute('title');
      if (!t) return;
      el.setAttribute('data-tip', t);
      if(!el.hasAttribute('aria-label')) el.setAttribute('aria-label', t);
      el.removeAttribute('title');
    });
  };

  moveTitlesToDataTip();

  const obs = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'attributes' && m.attributeName === 'title') {
        const el = m.target;
        if (el.getAttribute && el.hasAttribute('title')) {
          moveTitlesToDataTip(el.parentNode || document);
        }
      }
      if (m.type === 'childList' && m.addedNodes?.length) {
        m.addedNodes.forEach(node => {
          if (node.nodeType === 1) moveTitlesToDataTip(node);
        });
      }
    }
  });
  obs.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['title']
  });

  let raf = null;
  const show = (e) => {
    if(raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(()=>{
      const t = e.target.closest('[data-tip]');
      if(!t){ tip.classList.remove('is-on'); return; }
      tip.textContent = t.getAttribute('data-tip') || '';
      tip.classList.add('is-on');
      const pad = 12;
      const x = Math.min(window.innerWidth - tip.offsetWidth - pad, e.clientX + 14);
      const y = Math.min(window.innerHeight - tip.offsetHeight - pad, e.clientY + 16);
      tip.style.left = `${x}px`;
      tip.style.top  = `${y}px`;
    });
  };
  const hide = () => tip.classList.remove('is-on');

  document.addEventListener('mousemove', show, {passive:true});
  document.addEventListener('mouseleave', hide, true);
  window.addEventListener('scroll', hide, {passive:true});
}

/* ===== Refresh (carrega dados e repinta) ===== */
async function refresh(){
  try{
    const dataset = await getData();
    state._dataset = dataset;
    state._rankingRaw = dataset.ranking;

    const right = document.getElementById("lbl-atualizacao");
    if(right){
      right.innerHTML = `
        <div class="period-inline">
          <span class="txt">
            Valores acumulados desde
            <strong><span id="lbl-periodo-inicio">${formatBRDate(state.period.start)}</span></strong>
            até
            <strong><span id="lbl-periodo-fim">${formatBRDate(state.period.end)}</span></strong>
          </span>
          <button id="btn-alterar-data" type="button" class="link-action">
            <i class="ti ti-chevron-down"></i> Alterar data
          </button>
        </div>`;
      document.getElementById("btn-alterar-data")?.addEventListener("click", (e)=> openDatePopover(e.currentTarget));
    }

    renderFamilias(dataset.sections, dataset.summary);
    reorderFiltersUI();
    renderAppliedFilters();
    if(state.tableRendered) renderTreeTable();

    if (state.activeView==="ranking") renderRanking();
    if (state.activeView==="exec")    renderExecutiveView();

  }catch(e){
    console.error(e);
    alert("Falha ao carregar dados.");
  }
}

/* ===== Boot ===== */
(function(){
  ensureSidebar();
  ensureLoader();
  enableSimpleTooltip();
  injectStyles();
  initCombos();
  bindEvents();
  wireClearFiltersButton();
  ensureStatusFilterInAdvanced();
  reorderFiltersUI();
  refresh();
  ensureChatWidget();
})();
