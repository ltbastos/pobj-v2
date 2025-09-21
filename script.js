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
const fmtONE = new Intl.NumberFormat("pt-BR", { minimumFractionDigits:1, maximumFractionDigits:1 });
const setActiveTab = (viewId = "cards") => {
  const tabs = Array.from($$(".tab"));
  const target = tabs.some(tab => (tab.dataset.view || "") === viewId) ? viewId : "cards";
  tabs.forEach(tab => {
    const expected = tab.dataset.view || "";
    tab.classList.toggle("is-active", expected === target);
  });
  const sidebarLinks = Array.from(document.querySelectorAll(".sidebar__link"));
  if (sidebarLinks.length) {
    sidebarLinks.forEach(link => {
      const route = link.dataset.route || "";
      if (target === "campanhas") {
        link.classList.toggle("is-active", route === "campanhas");
      } else if (["cards", "table", "ranking", "exec"].includes(target)) {
        link.classList.toggle("is-active", route === "pobj");
      }
    });
  }
};
const fmtBRLParts = fmtBRL.formatToParts(1);
const CURRENCY_SYMBOL = fmtBRLParts.find(p => p.type === "currency")?.value || "R$";
const CURRENCY_LITERAL = fmtBRLParts.find(p => p.type === "literal")?.value || " ";
const SUFFIX_RULES = [
  { value: 1_000_000_000_000, singular: "trilhão", plural: "trilhões" },
  { value: 1_000_000_000,     singular: "bilhão",  plural: "bilhões" },
  { value: 1_000_000,         singular: "milhão",  plural: "milhões" },
  { value: 1_000,             singular: "mil",     plural: "mil" }
];
const MOTIVOS_CANCELAMENTO = [
  "Solicitação do cliente",
  "Inadimplência",
  "Renovação antecipada",
  "Ajuste comercial",
  "Migração de produto"
];

const RANKING_DIRECTORIAS = [
  { id: "DR 01", nome: "Norte & Nordeste" },
  { id: "DR 02", nome: "Sudeste" },
  { id: "DR 03", nome: "Sul & Centro-Oeste" }
];

const RANKING_GERENCIAS = [
  { id: "GR 01", nome: "Regional Fortaleza", diretoria: "DR 01" },
  { id: "GR 02", nome: "Regional Recife", diretoria: "DR 01" },
  { id: "GR 03", nome: "Regional São Paulo", diretoria: "DR 02" },
  { id: "GR 04", nome: "Regional Curitiba", diretoria: "DR 03" }
];

const RANKING_AGENCIAS = [
  { id: "Ag 1001", nome: "Agência 1001 • Fortaleza Centro", gerencia: "GR 01" },
  { id: "Ag 1002", nome: "Agência 1002 • Recife Boa Vista", gerencia: "GR 02" },
  { id: "Ag 1003", nome: "Agência 1003 • Curitiba Batel", gerencia: "GR 04" },
  { id: "Ag 1004", nome: "Agência 1004 • Avenida Paulista", gerencia: "GR 03" }
];

const RANKING_GERENTES = [
  { id: "Gerente 1", nome: "Ana Lima" },
  { id: "Gerente 2", nome: "Paulo Nunes" },
  { id: "Gerente 3", nome: "Juliana Prado" },
  { id: "Gerente 4", nome: "Bruno Garcia" },
  { id: "Gerente 5", nome: "Carla Menezes" }
];

const CURRENT_USER_CONTEXT = {
  diretoria: "DR 01",
  gerencia: "GR 01",
  agencia: "Ag 1001",
  gerenteGestao: "GG 01",
  gerente: "Gerente 1"
};

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
  { id:"contrato",  label:"Contratos",          key:"contrato" },
];

/* === Seções e cards === */
const CARD_SECTIONS_DEF = [
  { id:"captacao", label:"CAPTAÇÃO", items:[
    { id:"captacao_bruta",   nome:"Captação Bruta",                           icon:"ti ti-pig-money",       peso:4, metric:"valor" },
    { id:"captacao_liquida", nome:"Captação Líquida",                         icon:"ti ti-arrows-exchange", peso:4, metric:"valor" },
    { id:"portab_prev",      nome:"Portabilidade de Previdência Privada",     icon:"ti ti-shield-check",    peso:3, metric:"valor" },
    { id:"centralizacao",    nome:"Centralização de Caixa",                   icon:"ti ti-briefcase",       peso:3, metric:"valor" },
  ]},
  { id:"financeiro", label:"FINANCEIRO", items:[
    { id:"rec_vencidos_59",     nome:"Recuperação de Vencidos até 59 dias",      icon:"ti ti-rotate-rectangle", peso:6, metric:"valor" },
    { id:"rec_vencidos_50mais", nome:"Recuperação de Vencidos acima de 50 dias", icon:"ti ti-rotate-rectangle", peso:5, metric:"valor" },
    { id:"rec_credito",         nome:"Recuperação de Crédito",                    icon:"ti ti-cash",             peso:5, metric:"valor" },
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

const CAMPAIGN_UNIT_DATA = [
  { id: "nn-atlas", diretoria: "DR 01", diretoriaNome: "Norte & Nordeste", gerenciaRegional: "GR 01", regional: "Regional Fortaleza", gerenteGestao: "GG 01", agenciaCodigo: "Ag 1001", agencia: "Agência 1001 • Fortaleza Centro", segmento: "Negócios", produtoId: "captacao_bruta", subproduto: "Aplicação", gerente: "Gerente 1", gerenteNome: "Ana Lima", carteira: "Carteira Atlas", linhas: 132.4, cash: 118.2, conquista: 112.6, atividade: true, data: "2025-09-15" },
  { id: "nn-delta", diretoria: "DR 01", diretoriaNome: "Norte & Nordeste", gerenciaRegional: "GR 01", regional: "Regional Fortaleza", gerenteGestao: "GG 01", agenciaCodigo: "Ag 1001", agencia: "Agência 1001 • Fortaleza Centro", segmento: "Negócios", produtoId: "captacao_liquida", subproduto: "Resgate", gerente: "Gerente 1", gerenteNome: "Ana Lima", carteira: "Carteira Delta", linhas: 118.3, cash: 109.5, conquista: 104.1, atividade: true, data: "2025-09-16" },
  { id: "nn-iguatu", diretoria: "DR 01", diretoriaNome: "Norte & Nordeste", gerenciaRegional: "GR 02", regional: "Regional Recife", gerenteGestao: "GG 02", agenciaCodigo: "Ag 1002", agencia: "Agência 1002 • Recife Boa Vista", segmento: "Empresas", produtoId: "prod_credito_pj", subproduto: "À vista", gerente: "Gerente 2", gerenteNome: "Paulo Nunes", carteira: "Carteira Iguatu", linhas: 124.2, cash: 110.3, conquista: 102.1, atividade: true, data: "2025-09-12" },
  { id: "nn-sertao", diretoria: "DR 01", diretoriaNome: "Norte & Nordeste", gerenciaRegional: "GR 02", regional: "Regional Recife", gerenteGestao: "GG 02", agenciaCodigo: "Ag 1002", agencia: "Agência 1002 • Recife Boa Vista", segmento: "Empresas", produtoId: "centralizacao", subproduto: "Parcelado", gerente: "Gerente 2", gerenteNome: "Paulo Nunes", carteira: "Carteira Sertão", linhas: 98.4, cash: 94.6, conquista: 96.8, atividade: false, data: "2025-09-09" },
  { id: "sd-horizonte", diretoria: "DR 02", diretoriaNome: "Sudeste", gerenciaRegional: "GR 03", regional: "Regional São Paulo", gerenteGestao: "GG 03", agenciaCodigo: "Ag 1004", agencia: "Agência 1004 • Avenida Paulista", segmento: "Empresas", produtoId: "rotativo_pj_vol", subproduto: "Aplicação", gerente: "Gerente 3", gerenteNome: "Juliana Prado", carteira: "Carteira Horizonte", linhas: 115.2, cash: 120.5, conquista: 108.4, atividade: true, data: "2025-09-14" },
  { id: "sd-paulista", diretoria: "DR 02", diretoriaNome: "Sudeste", gerenciaRegional: "GR 03", regional: "Regional São Paulo", gerenteGestao: "GG 03", agenciaCodigo: "Ag 1004", agencia: "Agência 1004 • Avenida Paulista", segmento: "Empresas", produtoId: "rotativo_pj_qtd", subproduto: "Resgate", gerente: "Gerente 3", gerenteNome: "Juliana Prado", carteira: "Carteira Paulista", linhas: 104.8, cash: 99.1, conquista: 101.3, atividade: true, data: "2025-09-06" },
  { id: "sd-bandeirantes", diretoria: "DR 02", diretoriaNome: "Sudeste", gerenciaRegional: "GR 03", regional: "Regional São Paulo", gerenteGestao: "GG 03", agenciaCodigo: "Ag 1004", agencia: "Agência 1004 • Avenida Paulista", segmento: "Negócios", produtoId: "consorcios", subproduto: "Parcelado", gerente: "Gerente 4", gerenteNome: "Bruno Garcia", carteira: "Carteira Bandeirantes", linhas: 92.7, cash: 88.6, conquista: 94.2, atividade: true, data: "2025-09-10" },
  { id: "sd-capital", diretoria: "DR 02", diretoriaNome: "Sudeste", gerenciaRegional: "GR 03", regional: "Regional São Paulo", gerenteGestao: "GG 03", agenciaCodigo: "Ag 1004", agencia: "Agência 1004 • Avenida Paulista", segmento: "Negócios", produtoId: "cartoes", subproduto: "À vista", gerente: "Gerente 4", gerenteNome: "Bruno Garcia", carteira: "Carteira Capital", linhas: 105.6, cash: 102.4, conquista: 100.2, atividade: true, data: "2025-09-18" },
  { id: "sc-curitiba", diretoria: "DR 03", diretoriaNome: "Sul & Centro-Oeste", gerenciaRegional: "GR 04", regional: "Regional Curitiba", gerenteGestao: "GG 02", agenciaCodigo: "Ag 1003", agencia: "Agência 1003 • Curitiba Batel", segmento: "MEI", produtoId: "seguros", subproduto: "Aplicação", gerente: "Gerente 5", gerenteNome: "Carla Menezes", carteira: "Carteira Curitiba", linhas: 109.6, cash: 101.2, conquista: 98.5, atividade: true, data: "2025-09-11" },
  { id: "sc-litoral", diretoria: "DR 03", diretoriaNome: "Sul & Centro-Oeste", gerenciaRegional: "GR 04", regional: "Regional Curitiba", gerenteGestao: "GG 02", agenciaCodigo: "Ag 1003", agencia: "Agência 1003 • Curitiba Batel", segmento: "MEI", produtoId: "bradesco_expresso", subproduto: "Resgate", gerente: "Gerente 5", gerenteNome: "Carla Menezes", carteira: "Carteira Litoral", linhas: 95.4, cash: 90.1, conquista: 92.8, atividade: true, data: "2025-09-07" },
  { id: "sc-vale", diretoria: "DR 03", diretoriaNome: "Sul & Centro-Oeste", gerenciaRegional: "GR 04", regional: "Regional Curitiba", gerenteGestao: "GG 02", agenciaCodigo: "Ag 1003", agencia: "Agência 1003 • Curitiba Batel", segmento: "MEI", produtoId: "rec_credito", subproduto: "À vista", gerente: "Gerente 5", gerenteNome: "Carla Menezes", carteira: "Carteira Vale", linhas: 120.2, cash: 115.6, conquista: 110.4, atividade: true, data: "2025-09-17" }
];

CAMPAIGN_UNIT_DATA.forEach(unit => {
  const meta = PRODUCT_INDEX.get(unit.produtoId);
  if (!unit.produtoNome) unit.produtoNome = meta?.name || unit.produto || unit.produtoId || "Produto";
  if (!unit.gerenteGestaoNome) {
    const numeric = (unit.gerenteGestao || "").replace(/[^0-9]/g, "");
    unit.gerenteGestaoNome = numeric ? `Gerente geral ${numeric}` : "Gerente geral";
  }
});
const CAMPAIGN_SPRINTS = [
  {
    id: "sprint-pj-2025",
    label: "Sprint PJ 2025",
    cycle: "Sprint PJ • Setembro 2025",
    period: { start: "2025-09-01", end: "2025-09-20" },
    note: "Projete cenários e acompanhe apenas as unidades visíveis nos filtros atuais.",
    headStats: [
      { label: "Meta mínima", value: "100 pts" },
      { label: "Indicador mínimo", value: "90%" },
      { label: "Teto considerado", value: "150%" }
    ],
    summary: [
      { id: "equipes", label: "Equipes elegíveis", value: CAMPAIGN_UNIT_DATA.length, total: CAMPAIGN_UNIT_DATA.length },
      { id: "media", label: "Pontuação média", value: 0, unit: "pts" },
      { id: "recorde", label: "Maior pontuação", value: 0, unit: "pts", complement: "" },
      { id: "atualizacao", label: "Atualização", text: "20/09/2025 08:30" }
    ],
    team: {
      minThreshold: 90,
      superThreshold: 120,
      cap: 150,
      eligibilityMinimum: 100,
      defaultPreset: "meta",
      indicators: [
        { id: "linhas", label: "Linhas governamentais", short: "Linhas", weight: 40, hint: "Operações direcionadas, BB Giro e BNDES.", default: 100 },
        { id: "cash", label: "Cash (TPV)", short: "Cash", weight: 30, hint: "Centralização de caixa e TPV eletrônico.", default: 100 },
        { id: "conquista", label: "Conquista cliente PJ", short: "Conquista", weight: 30, hint: "Abertura de contas e ativação digital.", default: 100 }
      ],
      presets: [
        { id: "minimo", label: "Mínimo obrigatório (90%)", values: { linhas: 90, cash: 90, conquista: 90 } },
        { id: "meta", label: "Meta do sprint (100%)", values: { linhas: 100, cash: 100, conquista: 100 } },
        { id: "stretch", label: "Meta esticada (120%)", values: { linhas: 120, cash: 120, conquista: 120 } }
      ]
    },
    individual: {
      profiles: [
        {
          id: "negocios",
          label: "Negócios",
          description: "Carteiras MPE com foco em relacionamento consultivo.",
          minThreshold: 90,
          superThreshold: 120,
          cap: 150,
          eligibilityMinimum: 100,
          defaultPreset: "meta",
          indicators: [
            { id: "linhas", label: "Linhas governamentais", short: "Linhas", weight: 40, default: 100 },
            { id: "cash", label: "Cash (TPV)", short: "Cash", weight: 30, default: 100 },
            { id: "conquista", label: "Conquista cliente PJ", short: "Conquista", weight: 30, default: 100 }
          ],
          presets: [
            { id: "minimo", label: "90% em todos", values: { linhas: 90, cash: 90, conquista: 90 } },
            { id: "meta", label: "Meta (100%)", values: { linhas: 100, cash: 100, conquista: 100 } },
            { id: "destaque", label: "Stretch (120%)", values: { linhas: 120, cash: 120, conquista: 120 } }
          ],
          scenarios: [
            { id: "full", label: "100% em todas as linhas", values: { linhas: 100, cash: 100, conquista: 100 }, note: "Parabéns" },
            { id: "linhas120", label: "Linhas 120%, Cash 100%, Conquista 90%", values: { linhas: 120, cash: 100, conquista: 90 }, note: "Elegível" },
            { id: "cash115", label: "Linhas 95%, Cash 115%, Conquista 130%", values: { linhas: 95, cash: 115, conquista: 130 }, note: "Elegível" },
            { id: "ajuste", label: "Linhas 85%, Cash 80%, Conquista 110%", values: { linhas: 85, cash: 80, conquista: 110 }, note: "Ajustar" }
          ]
        },
        {
          id: "empresas",
          label: "Empresas",
          description: "Grandes empresas e governo com foco em volume.",
          minThreshold: 90,
          superThreshold: 120,
          cap: 150,
          eligibilityMinimum: 100,
          defaultPreset: "meta",
          indicators: [
            { id: "linhas", label: "Linhas governamentais", short: "Linhas", weight: 45, default: 100 },
            { id: "cash", label: "Cash (TPV)", short: "Cash", weight: 35, default: 100 },
            { id: "conquista", label: "Conquista cliente PJ", short: "Conquista", weight: 20, default: 100 }
          ],
          presets: [
            { id: "minimo", label: "90% em todos", values: { linhas: 90, cash: 90, conquista: 90 } },
            { id: "meta", label: "Meta (100%)", values: { linhas: 100, cash: 100, conquista: 100 } },
            { id: "stretch", label: "Stretch (120%)", values: { linhas: 120, cash: 120, conquista: 120 } }
          ],
          scenarios: [
            { id: "volume", label: "Linhas 130%, Cash 115%, Conquista 95%", values: { linhas: 130, cash: 115, conquista: 95 }, note: "Parabéns" },
            { id: "equilibrio", label: "Linhas 110%, Cash 105%, Conquista 100%", values: { linhas: 110, cash: 105, conquista: 100 }, note: "Elegível" },
            { id: "alerta", label: "Linhas 92%, Cash 88%, Conquista 96%", values: { linhas: 92, cash: 88, conquista: 96 }, note: "Ajustar" },
            { id: "critico", label: "Linhas 80%, Cash 78%, Conquista 85%", values: { linhas: 80, cash: 78, conquista: 85 }, note: "Não elegível" }
          ]
        }
      ]
    },
    units: CAMPAIGN_UNIT_DATA
  }
];

const CAMPAIGN_LEVEL_META = {
  diretoria:     { groupField: "diretoria", displayField: "diretoriaNome", singular: "Diretoria", plural: "diretorias" },
  regional:      { groupField: "gerenciaRegional", displayField: "regional", singular: "Regional", plural: "regionais" },
  agencia:       { groupField: "agenciaCodigo", displayField: "agencia", singular: "Agência", plural: "agências" },
  gerenteGestao: { groupField: "gerenteGestao", displayField: "gerenteGestaoNome", singular: "Gerente geral", plural: "gerentes gerais" },
  gerente:       { groupField: "gerente", displayField: "gerenteNome", singular: "Gerente", plural: "gerentes" },
  produto:       { groupField: "produtoId", displayField: "produtoNome", singular: "Produto", plural: "produtos" },
  carteira:      { groupField: "carteira", displayField: "carteira", singular: "Carteira", plural: "carteiras" }
};

function determineCampaignDisplayLevel(filters = getFilterValues()) {
  if (filters.gerente && filters.gerente !== "Todos") {
    return { level: "produto", meta: CAMPAIGN_LEVEL_META.produto };
  }
  if (filters.ggestao && filters.ggestao !== "Todos") {
    return { level: "gerente", meta: CAMPAIGN_LEVEL_META.gerente };
  }
  if (filters.agencia && filters.agencia !== "Todas") {
    return { level: "gerenteGestao", meta: CAMPAIGN_LEVEL_META.gerenteGestao };
  }
  if (filters.gerencia && filters.gerencia !== "Todas") {
    return { level: "agencia", meta: CAMPAIGN_LEVEL_META.agencia };
  }
  if (filters.diretoria && filters.diretoria !== "Todas") {
    return { level: "regional", meta: CAMPAIGN_LEVEL_META.regional };
  }
  return { level: "diretoria", meta: CAMPAIGN_LEVEL_META.diretoria };
}

function filterCampaignUnits(sprint, filters = getFilterValues()) {
  const units = sprint?.units || [];
  const startISO = state.period.start;
  const endISO = state.period.end;
  return units.filter(unit => {
    const okSegmento = (!filters.segmento || filters.segmento === "Todos" || unit.segmento === filters.segmento);
    const okDiretoria = (!filters.diretoria || filters.diretoria === "Todas" || unit.diretoria === filters.diretoria);
    const okGerencia = (!filters.gerencia || filters.gerencia === "Todas" || unit.gerenciaRegional === filters.gerencia);
    const okAgencia = (!filters.agencia || filters.agencia === "Todas" || unit.agenciaCodigo === filters.agencia);
    const okGG = (!filters.ggestao || filters.ggestao === "Todos" || unit.gerenteGestao === filters.ggestao);
    const okGerente = (!filters.gerente || filters.gerente === "Todos" || unit.gerente === filters.gerente);
    const okProduto = (!filters.produtoId || filters.produtoId === "Todas" || unit.produtoId === filters.produtoId);
    const okSub = (!filters.subproduto || unit.subproduto === filters.subproduto);
    const okDate = (!startISO || unit.data >= startISO) && (!endISO || unit.data <= endISO);
    return okSegmento && okDiretoria && okGerencia && okAgencia && okGG && okGerente && okProduto && okSub && okDate;
  });
}

function campaignStatusMatches(score, statusFilter = "todos") {
  if (statusFilter === "todos") return true;
  const elegivel = score.finalStatus === "Parabéns" || score.finalStatus === "Elegível";
  return statusFilter === "atingidos" ? elegivel : !elegivel;
}

function aggregateCampaignUnitResults(unitResults, level, teamConfig) {
  const meta = CAMPAIGN_LEVEL_META[level] || CAMPAIGN_LEVEL_META.diretoria;
  const field = meta.groupField;
  const nameField = meta.displayField || field;
  const buckets = new Map();

  unitResults.forEach(({ unit }) => {
    const key = unit[field] || unit[nameField] || "—";
    const bucket = buckets.get(key) || {
      key,
      name: unit[nameField] || key,
      linhas: 0,
      cash: 0,
      conquista: 0,
      count: 0,
      atividadeHits: 0
    };
    bucket.name = unit[nameField] || key;
    bucket.linhas += toNumber(unit.linhas);
    bucket.cash += toNumber(unit.cash);
    bucket.conquista += toNumber(unit.conquista);
    bucket.count += 1;
    bucket.atividadeHits += unit.atividade ? 1 : 0;
    buckets.set(key, bucket);
  });

  return [...buckets.values()].map(bucket => {
    const linhas = bucket.count ? bucket.linhas / bucket.count : 0;
    const cash = bucket.count ? bucket.cash / bucket.count : 0;
    const conquista = bucket.count ? bucket.conquista / bucket.count : 0;
    const result = computeCampaignScore(teamConfig, { linhas, cash, conquista });
    const atividade = bucket.atividadeHits >= Math.ceil(bucket.count / 2);
    return {
      key: bucket.key,
      name: bucket.name,
      linhas,
      cash,
      conquista,
      atividade,
      finalStatus: result.finalStatus,
      finalClass: result.finalClass,
      totalPoints: result.totalPoints,
      result
    };
  });
}

function summarizeCampaignUnitResults(unitResults) {
  const total = unitResults.length;
  if (!total) {
    return { total: 0, elegiveis: 0, media: 0, recorde: 0, destaque: "" };
  }

  let soma = 0;
  let elegiveis = 0;
  let recorde = -Infinity;
  let destaque = "";

  unitResults.forEach(({ unit, score }) => {
    soma += score.totalPoints;
    if (score.finalStatus === "Parabéns" || score.finalStatus === "Elegível") elegiveis += 1;
    if (score.totalPoints > recorde) {
      recorde = score.totalPoints;
      destaque = unit.regional || unit.agencia || unit.gerenteNome || unit.carteira || unit.diretoriaNome || "";
    }
  });

  return {
    total,
    elegiveis,
    media: soma / total,
    recorde: recorde > 0 ? recorde : 0,
    destaque
  };
}

function buildCampaignRankingContext(sprint) {
  if (!sprint) {
    const levelInfo = determineCampaignDisplayLevel();
    return { unitResults: [], aggregated: [], levelInfo };
  }

  const filters = getFilterValues();
  const filteredUnits = filterCampaignUnits(sprint, filters);
  const unitResults = filteredUnits.map(unit => ({
    unit,
    score: computeCampaignScore(sprint.team, {
      linhas: unit.linhas,
      cash: unit.cash,
      conquista: unit.conquista
    })
  })).filter(({ score }) => campaignStatusMatches(score, filters.status || "todos"));

  const levelInfo = determineCampaignDisplayLevel(filters);
  const aggregated = aggregateCampaignUnitResults(unitResults, levelInfo.level, sprint.team);

  return { unitResults, aggregated, levelInfo };
}

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
const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, (ch) => ({
  "&":"&amp;",
  "<":"&lt;",
  ">":"&gt;",
  '"':"&quot;",
  "'":"&#39;"
}[ch]));

function formatNumberWithSuffix(value, { currency = false } = {}) {
  const n = toNumber(value);
  if (!Number.isFinite(n)) return currency ? fmtBRL.format(0) : fmtINT.format(0);
  const abs = Math.abs(n);
  if (abs < 1000) {
    return currency ? fmtBRL.format(n) : fmtINT.format(Math.round(n));
  }
  const rule = SUFFIX_RULES.find(r => abs >= r.value);
  if (!rule) {
    return currency ? fmtBRL.format(n) : fmtINT.format(Math.round(n));
  }
  const absScaled = abs / rule.value;
  const nearInteger = Math.abs(absScaled - Math.round(absScaled)) < 0.05;
  let digits;
  if (absScaled >= 100) digits = 0;
  else if (absScaled >= 10) digits = nearInteger ? 0 : 1;
  else digits = nearInteger ? 0 : 1;
  const numberFmt = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const formatted = numberFmt.format(absScaled);
  const isSingular = Math.abs(absScaled - 1) < 0.05;
  const label = isSingular ? rule.singular : rule.plural;
  if (currency) {
    const sign = n < 0 ? "-" : "";
    return `${sign}${CURRENCY_SYMBOL}${CURRENCY_LITERAL}${formatted} ${label}`;
  }
  const sign = n < 0 ? "-" : "";
  return `${sign}${formatted} ${label}`;
}

function formatIntReadable(value){
  return formatNumberWithSuffix(value, { currency: false });
}
function formatBRLReadable(value){
  return formatNumberWithSuffix(value, { currency: true });
}

function formatMetricFull(metric, value){
  const n = Math.round(toNumber(value));
  if(metric === "perc") return `${toNumber(value).toFixed(1)}%`;
  if(metric === "qtd")  return fmtINT.format(n);
  return fmtBRL.format(n);
}
function formatByMetric(metric, value){
  if(metric === "perc") return `${toNumber(value).toFixed(1)}%`;
  if(metric === "qtd")  return formatIntReadable(value);
  return formatBRLReadable(value);
}
function formatCompactBRL(value){
  return formatNumberWithSuffix(value, { currency: true });
}
function makeRandomForMetric(metric){
  if(metric === "perc"){
    const meta = 100;
    const realizado = Math.round(45 + Math.random()*75);
    const variavelMeta = Math.round(160_000 + Math.random()*180_000);
    return { meta, realizado, variavelMeta };
  }
  if(metric === "qtd"){
    const meta = Math.round(1_000 + Math.random()*19_000);
    const realizado = Math.round(meta * (0.75 + Math.random()*0.6));
    const variavelMeta = Math.round(150_000 + Math.random()*220_000);
    return { meta, realizado, variavelMeta };
  }
  const meta = Math.round(4_000_000 + Math.random()*16_000_000);
  const realizado = Math.round(meta * (0.75 + Math.random()*0.6));
  const variavelMeta = Math.round(320_000 + Math.random()*420_000);
  return { meta, realizado, variavelMeta };
}

/* ===== API / MOCK ===== */
async function apiGet(path, params){
  const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
  const r = await fetch(`${API_URL}${path}${qs}`); if(!r.ok) throw new Error("Falha ao carregar dados");
  return r.json();
}
async function getData(){
  const period = state.period || { start:firstDayOfMonthISO(), end: todayISO() };

  const startDt = dateUTCFromISO(period.start);
  const endDt = dateUTCFromISO(period.end);
  let startRef = startDt;
  let endRef = endDt;
  if (startRef && endRef && startRef > endRef) [startRef, endRef] = [endRef, startRef];
  const defaultISO = period.end || period.start || todayISO();
  const randomPeriodISO = () => {
    if (!startRef || !endRef) return defaultISO;
    const spanDays = Math.max(0, Math.round((endRef - startRef) / (24 * 60 * 60 * 1000)));
    const offset = spanDays > 0 ? Math.floor(Math.random() * (spanDays + 1)) : 0;
    const dt = new Date(startRef.getTime());
    dt.setUTCDate(dt.getUTCDate() + offset);
    return isoFromUTCDate(dt);
  };

  // MOCK
  const sections = CARD_SECTIONS_DEF.map(sec=>{
    const items = sec.items.map(it=>{
      const { meta, realizado, variavelMeta } = makeRandomForMetric(it.metric);
      const ating = it.metric==="perc" ? (realizado/100) : (meta ? realizado/meta : 0);
      const variavelReal = Math.max(0, Math.round((variavelMeta || 0) * ating));
      const atingVariavel = variavelMeta ? (variavelReal / variavelMeta) : ating;
      return {
        ...it,
        meta,
        realizado,
        variavelMeta,
        variavelReal,
        ating,
        atingVariavel,
        atingido: ating>=1,
        ultimaAtualizacao: formatBRDate(defaultISO)
      };
    });
    return { id:sec.id, label:sec.label, items };
  });

  const totalsVar = sections.reduce((acc, sec)=>{
    sec.items.forEach(item => {
      acc.possivel += item.variavelMeta || 0;
      acc.atingido += item.variavelReal || 0;
    });
    return acc;
  }, { possivel:0, atingido:0 });

  const allItems = sections.flatMap(s => s.items);
  const indicadoresTotal = allItems.length;
  const indicadoresAtingidos = allItems.filter(i => i.atingido).length;
  const pontosPossiveis = allItems.reduce((acc,i)=> acc + (i.peso||0), 0);
  const pontosAtingidos = allItems.filter(i=>i.atingido).reduce((acc,i)=> acc + (i.peso||0), 0);

  const segs  = ["Empresas","Negócios","MEI"];
  const prodIds = [...PRODUCT_INDEX.keys()];
  const famsMacro = ["Crédito","Investimentos","Seguros","Consórcios","Previdência","Cartão de crédito"];
  const canaisVenda = ["Agência física","Digital","Correspondente","APP Empresas"];
  const tiposVenda = ["Venda consultiva","Venda direta","Cross-sell","Pós-venda"];
  const modalidadesVenda = ["À vista","Parcelado"];
  const agenciasPorGerencia = RANKING_GERENCIAS.reduce((map, ger) => {
    map.set(ger.id, RANKING_AGENCIAS.filter(ag => ag.gerencia === ger.id));
    return map;
  }, new Map());

  const ranking = Array.from({length:140}, (_,i)=>{
    const produtoId = prodIds[i % prodIds.length];
    const metaProd  = PRODUCT_INDEX.get(produtoId);
    const subps = ["Aplicação","Resgate","A vista","Parcelado", ""];
    const subproduto = subps[Math.floor(Math.random()*subps.length)];
    const produtoNome = metaProd?.name || produtoId;

    const gerMeta = RANKING_GERENCIAS[i % RANKING_GERENCIAS.length];
    const dirMeta = RANKING_DIRECTORIAS.find(d => d.id === gerMeta.diretoria) || RANKING_DIRECTORIAS[0];
    const agPool = agenciasPorGerencia.get(gerMeta.id) || RANKING_AGENCIAS;
    const agenciaMeta = agPool[i % agPool.length] || RANKING_AGENCIAS[i % RANKING_AGENCIAS.length];
    const gerenteMeta = RANKING_GERENTES[i % RANKING_GERENTES.length];
    const gerenteGestao = `GG ${String(1 + (i%3)).padStart(2,"0")}`;
    const gerenteGestaoNome = `Gestão ${String(1 + (i%6)).padStart(2,"0")}`;

    const meta_mens = Math.round(2_000_000 + Math.random()*18_000_000);
    const real_mens = Math.round(meta_mens*(0.75+Math.random()*0.6));
    const fator = 1.2 + Math.random()*1.2;
    const meta_acum = Math.round(meta_mens * fator);
    const real_acum = Math.round(real_mens * fator);

    const canalVenda = canaisVenda[Math.floor(Math.random()*canaisVenda.length)];
    const tipoVenda = tiposVenda[Math.floor(Math.random()*tiposVenda.length)];
    const modalidadePagamento = modalidadesVenda[Math.floor(Math.random()*modalidadesVenda.length)];

    return {
      diretoria: dirMeta.id,
      diretoriaNome: dirMeta.nome,
      gerenciaRegional: gerMeta.id,
      gerenciaNome: gerMeta.nome,
      regional: gerMeta.nome,
      gerenteGestao,
      gerenteGestaoNome,
      familia: famsMacro[i % famsMacro.length],
      produtoId,
      produto: produtoNome,
      prodOrSub: subproduto || produtoNome,
      subproduto,
      gerente: gerenteMeta.id,
      gerenteNome: gerenteMeta.nome,
      agencia: agenciaMeta.id,
      agenciaNome: agenciaMeta.nome,
      segmento: segs[i % segs.length],
      canalVenda,
      tipoVenda,
      modalidadePagamento,
      realizado: real_mens,
      meta:      meta_mens,
      qtd:       Math.round(50 + Math.random()*1950),
      data:      randomPeriodISO(),
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
      pontosPct: pontosPossiveis ? pontosAtingidos/pontosPossiveis : 0,
      varPossivel: totalsVar.possivel,
      varAtingido: totalsVar.atingido,
      varPct: totalsVar.possivel ? (totalsVar.atingido / totalsVar.possivel) : 0
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
  btnTop.setAttribute("aria-expanded", "false");

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
    if (!isMobile()) return;
    openMobileFilters();
  }
  function closeMobile(){
    if (!isMobile()) return;
    closeMobileFilters();
  }
  function toggleMobile(){
    if (!isMobile()) return;
    const isOpen = document.body.classList.contains("filters-open");
    if (isOpen) {
      closeMobileFilters();
    } else {
      openMobileFilters();
    }
    btnTop?.setAttribute("aria-expanded", String(!isOpen));
    btnSB?.setAttribute("aria-expanded", String(!isOpen));
  }

  // listeners
  btnSB?.addEventListener("click", ()=> isMobile() ? toggleMobile() : toggleDesktop());
  btnTop?.addEventListener("click", ()=> isMobile() ? toggleMobile() : toggleDesktop());
  backdrop.addEventListener("click", ()=> { if (isMobile()) closeMobileFilters(); });
  window.addEventListener("resize", ()=> { if(!isMobile()) closeMobileFilters(); });

  // navegação “fake”
  document.querySelectorAll(".sidebar__link").forEach(a=>{
    a.addEventListener("click", (e)=>{
      e.preventDefault();
      document.querySelectorAll(".sidebar__link").forEach(x=>x.classList.remove("is-active"));
      a.classList.add("is-active");
      if(isMobile()) closeMobile();
      const route = a.dataset.route;
      if (route === "campanhas") {
        if (state.activeView !== "campanhas") switchView("campanhas");
      } else if (route === "pobj") {
        if (state.activeView !== "cards") switchView("cards");
      }
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
  period: { start:"2025-09-01", end:"2025-09-20" },
  datePopover:null,
  compact:false,
  contractIndex:[],
  lastNonContractView:"diretoria",

  // ranking
  rk:{ mode:"mensal", level:"agencia" },

  // busca por contrato (usa o input #busca)
  tableSearchTerm:"",

  campanhas:{
    sprintId: CAMPAIGN_SPRINTS[0]?.id || null,
    teamValues:{},
    teamPreset:{},
    individualProfile: CAMPAIGN_SPRINTS[0]?.individual?.profiles?.[0]?.id || null,
    individualValues:{},
    individualPreset:{}
  }
};

const contractSuggestState = { items: [], highlight: -1, open: false, term: "", pending: null };
let contractSuggestDocBound = false;
let contractSuggestPanelBound = false;

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

  /* ===== KPI topo: versão ajustada ===== */
  #kpi-summary.kpi-summary{
    display:flex !important;
    flex-wrap:wrap;
    gap:18px;
    margin:8px 0 14px;
    align-items:flex-start;
  }
  #kpi-summary .kpi-pill{
    flex:1 1 320px;
    min-width:280px;
    padding:24px 26px;
    gap:14px;
  }
  #kpi-summary .kpi-strip__main{ gap:14px; }
  #kpi-summary .kpi-icon{ width:42px; height:42px; font-size:18px; }
  #kpi-summary .kpi-strip__label{ font-size:13.5px; max-width:220px; }
  #kpi-summary .kpi-stat{ font-size:12.5px; }

  #kpi-summary .hitbar{
    width:100%;
    gap:12px;
  }
  #kpi-summary .hitbar__track{
    min-width:0;
    height:9px;
    border-width:1.5px;
  }
  #kpi-summary .hitbar strong{
    font-size:12.5px;
  }

  @media (max-width: 720px){
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
  btn.addEventListener("click", async (ev) => {
    ev.preventDefault();
    btn.disabled = true;
    try { await clearFilters(); } finally { setTimeout(() => (btn.disabled = false), 250); }
  });
}
async function clearFilters() {
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
  refreshContractSuggestions("");
  if (state.tableView === "contrato") {
    state.tableView = "diretoria";
    state.lastNonContractView = "diretoria";
    setActiveChip("diretoria");
  }

  await withSpinner(async () => {
    applyFiltersAndRender();
    if (state._dataset) renderFamilias(state._dataset.sections, state._dataset.summary);
    renderAppliedFilters();
    renderCampanhasView();
    if (state.activeView === "ranking") renderRanking();
  }, "Limpando filtros…");
  closeMobileFilters();
}

function setMobileFiltersState(open) {
  const card = document.querySelector(".card--filters");
  if (!card) return;
  card.classList.toggle("is-mobile-open", open);
  card.setAttribute("aria-expanded", open ? "true" : "false");
  document.body.classList.toggle("filters-open", open);

  const hamburger = document.querySelector(".topbar-hamburger");
  if (hamburger) hamburger.setAttribute("aria-expanded", open ? "true" : "false");
  const sidebarToggle = document.getElementById("sb-btn");
  if (sidebarToggle) sidebarToggle.setAttribute("aria-expanded", open ? "true" : "false");

  const backdrop = document.getElementById("filters-backdrop");
  if (backdrop) {
    if (open) {
      backdrop.hidden = false;
      backdrop.classList.add("is-show");
    } else {
      backdrop.classList.remove("is-show");
      backdrop.hidden = true;
    }
  }

  const toggle = document.getElementById("btn-mobile-filtros");
  if (toggle) toggle.setAttribute("aria-expanded", open ? "true" : "false");
}

function openMobileFilters(){ setMobileFiltersState(true); }
function closeMobileFilters(){ setMobileFiltersState(false); }

function setupMobileFilters(){
  const openBtn = document.getElementById("btn-mobile-filtros");
  const closeBtn = document.getElementById("btn-fechar-filtros");
  const backdrop = document.getElementById("filters-backdrop");

  if (openBtn && !openBtn.dataset.bound) {
    openBtn.dataset.bound = "1";
    openBtn.addEventListener("click", () => openMobileFilters());
  }
  if (closeBtn && !closeBtn.dataset.bound) {
    closeBtn.dataset.bound = "1";
    closeBtn.addEventListener("click", () => closeMobileFilters());
  }
  if (backdrop && !backdrop.dataset.bound) {
    backdrop.dataset.bound = "1";
    backdrop.addEventListener("click", () => closeMobileFilters());
  }

  if (!setupMobileFilters._escBound) {
    window.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") closeMobileFilters();
    });
    setupMobileFilters._escBound = true;
  }
}

function initMobileCarousel(){
  const host = document.getElementById("mobile-carousel");
  if (!host) return;
  const slides = Array.from(host.querySelectorAll(".mobile-carousel__slide"));
  const dots = Array.from(host.querySelectorAll(".mobile-carousel__dot"));
  const prevBtn = host.querySelector("[data-carousel-prev]");
  const nextBtn = host.querySelector("[data-carousel-next]");
  if (slides.length <= 1) {
    slides.forEach(slide => slide.classList.add("is-active"));
    dots.forEach(dot => dot.setAttribute("aria-current", "true"));
    if (prevBtn) prevBtn.hidden = true;
    if (nextBtn) nextBtn.hidden = true;
    return;
  }
  if (prevBtn) prevBtn.hidden = false;
  if (nextBtn) nextBtn.hidden = false;

  let current = 0;
  let timer = null;
  let pointerStart = null;

  const activate = (idx) => {
    if (!slides.length) return;
    const next = (idx + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      slide.classList.toggle("is-active", i === next);
      slide.setAttribute("aria-hidden", i === next ? "false" : "true");
    });
    dots.forEach((dot, i) => {
      dot.setAttribute("aria-current", i === next ? "true" : "false");
    });
    current = next;
  };

  const goTo = (idx) => {
    stop();
    activate(idx);
    start();
  };

  const start = () => {
    if (timer) return;
    timer = setInterval(() => activate(current + 1), 6000);
  };

  const stop = () => {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
  };

  dots.forEach((dot, idx) => {
    if (dot.dataset.bound) return;
    dot.dataset.bound = "1";
    dot.addEventListener("click", () => {
      goTo(idx);
    });
  });

  if (prevBtn && !prevBtn.dataset.bound) {
    prevBtn.dataset.bound = "1";
    prevBtn.addEventListener("click", () => goTo(current - 1));
  }
  if (nextBtn && !nextBtn.dataset.bound) {
    nextBtn.dataset.bound = "1";
    nextBtn.addEventListener("click", () => goTo(current + 1));
  }

  const handlePointerDown = (ev) => {
    if (ev.pointerType === "mouse" && ev.button !== 0) return;
    pointerStart = ev.clientX;
    stop();
  };

  const handlePointerUp = (ev) => {
    if (pointerStart === null) return;
    const delta = ev.clientX - pointerStart;
    pointerStart = null;
    if (Math.abs(delta) > 30) {
      goTo(delta < 0 ? current + 1 : current - 1);
    } else {
      start();
    }
  };

  const handlePointerCancel = () => {
    pointerStart = null;
    start();
  };

  host.addEventListener("pointerdown", handlePointerDown);
  host.addEventListener("pointerup", handlePointerUp);
  host.addEventListener("pointercancel", handlePointerCancel);
  host.addEventListener("pointerleave", () => {
    pointerStart = null;
  });

  host.addEventListener("pointerenter", stop, { passive: true });
  host.addEventListener("pointerleave", start, { passive: true });
  host.addEventListener("focusin", stop);
  host.addEventListener("focusout", start);

  activate(0);
  start();
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
    $("#f-status-kpi").addEventListener("change", async () => {
      await withSpinner(async () => {
        if (state._dataset) renderFamilias(state._dataset.sections, state._dataset.summary);
        applyFiltersAndRender();
        renderAppliedFilters();
        renderCampanhasView();
        if (state.activeView === "ranking") renderRanking();
      }, "Atualizando filtros…");
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
      if (v.id === "contrato" && state.tableView !== "contrato") {
        state.lastNonContractView = state.tableView;
      }
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
  if (viewId && viewId !== "contrato") {
    state.lastNonContractView = viewId;
  }
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
    chip.querySelector("button").addEventListener("click", async () => {
      await withSpinner(async () => {
        resetFn?.();
        applyFiltersAndRender();
        renderAppliedFilters();
        if (state._dataset) renderFamilias(state._dataset.sections, state._dataset.summary);
        renderCampanhasView();
        if (state.activeView === "ranking") renderRanking();
      }, "Atualizando filtros…");
    });
    items.push(chip);
  };

  bar.innerHTML = "";

  if (vals.segmento && vals.segmento !== "Todos") push("Segmento", vals.segmento, () => $("#f-segmento").selectedIndex = 0);
  if (vals.diretoria && vals.diretoria !== "Todas") {
    const label = $("#f-diretoria")?.selectedOptions?.[0]?.text || vals.diretoria;
    push("Diretoria", label, () => $("#f-diretoria").selectedIndex = 0);
  }
  if (vals.gerencia && vals.gerencia !== "Todas") {
    const label = $("#f-gerencia")?.selectedOptions?.[0]?.text || vals.gerencia;
    push("Gerência", label, () => $("#f-gerencia").selectedIndex = 0);
  }
  if (vals.agencia && vals.agencia !== "Todas") {
    const label = $("#f-agencia")?.selectedOptions?.[0]?.text || vals.agencia;
    push("Agência", label, () => $("#f-agencia").selectedIndex = 0);
  }
  if (vals.ggestao && vals.ggestao !== "Todos") push("Gerente de gestão", vals.ggestao, () => $("#f-ggestao").selectedIndex = 0);
  if (vals.gerente && vals.gerente !== "Todos") {
    const label = $("#f-gerente")?.selectedOptions?.[0]?.text || vals.gerente;
    push("Gerente", label, () => $("#f-gerente").selectedIndex = 0);
  }
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
  if (state.tableSearchTerm) return;
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
  const periodYear = Number((state.period?.start || todayISO()).slice(0,4)) || new Date().getFullYear();
  for (let i = 0; i < n; i++) {
    const id = `CT-${periodYear}-${String(Math.floor(1e6 + Math.random() * 9e6)).padStart(7, "0")}`;
    const valor = Math.round((r.realizado / n) * (0.6 + Math.random() * 0.9)),
          meta  = Math.round((r.meta       / n) * (0.6 + Math.random() * 0.9));
    const sp = r.subproduto || r.produto;
    const canalVenda = r.canalVenda || (Math.random() > .5 ? "Agência física" : "Digital");
    const tipoVenda = r.tipoVenda || (Math.random() > .5 ? "Venda consultiva" : "Venda direta");
    const modalidadePagamento = r.modalidadePagamento || (Math.random() > .5 ? "À vista" : "Parcelado");
    const baseISO = r.data || todayISO();
    const baseDateUTC = dateUTCFromISO(baseISO);
    const dueDateUTC = new Date(baseDateUTC);
    dueDateUTC.setUTCDate(dueDateUTC.getUTCDate() + 10 + Math.floor(Math.random() * 25));
    const dataVencimento = isoFromUTCDate(dueDateUTC);
    let dataCancelamento = "";
    let motivoCancelamento = "";
    if (Math.random() < 0.25) {
      const cancelDateUTC = new Date(dueDateUTC);
      cancelDateUTC.setUTCDate(cancelDateUTC.getUTCDate() - Math.floor(Math.random() * 6));
      dataCancelamento = isoFromUTCDate(cancelDateUTC);
      motivoCancelamento = MOTIVOS_CANCELAMENTO[Math.floor(Math.random() * MOTIVOS_CANCELAMENTO.length)];
    }
    arr.push({
      id,
      produto: r.produto,
      subproduto: r.subproduto || "",
      prodOrSub: sp,
      qtd: 1,
      realizado: valor,
      meta,
      ating: meta ? (valor / meta) : 0,
      data: r.data,
      canalVenda,
      tipoVenda,
      modalidadePagamento,
      gerente: r.gerenteNome || r.gerente,
      dataVencimento,
      dataCancelamento,
      motivoCancelamento
    });
  }
  r._contracts = arr; return arr;
}

const TREE_LEVEL_LABEL_RESOLVERS = {
  diretoria: (row) => row.diretoriaNome || row.diretoria || "—",
  gerencia:  (row) => row.regional || row.gerenciaNome || row.gerenciaRegional || "—",
  agencia:   (row) => row.agenciaNome || row.agencia || "—",
  gGestao:   (row) => row.gerenteGestaoNome || row.gerenteGestao || "—",
  gerente:   (row) => row.gerenteNome || row.gerente || "—",
  familia:   (row) => row.familia || "—",
  prodsub:   (row) => row.prodOrSub || row.produto || row.subproduto || "—"
};

function resolveTreeLabel(levelKey, subset, fallback) {
  if (!Array.isArray(subset) || !subset.length) return fallback;
  const resolver = TREE_LEVEL_LABEL_RESOLVERS[levelKey];
  if (!resolver) return fallback;
  const label = resolver(subset[0]);
  return label != null && label !== "" ? label : fallback;
}
function buildTree(list, startKey) {
  const keyMap = { diretoria:"diretoria", gerencia:"gerenciaRegional", agencia:"agencia", gGestao:"gerenteGestao", gerente:"gerente", familia:"familia", prodsub:"prodOrSub", produto:"prodOrSub", contrato:"contrato" };
  const NEXT   = { diretoria:"gerencia",  gerencia:"agencia",         agencia:"gGestao", gGestao:"gerente",       gerente:"prodsub", familia:"contrato",   prodsub:"contrato", contrato:null };

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

  function buildDetailGroups(arr){
    const map = new Map();
    arr.forEach(r => {
      const canal = r.canalVenda || "Canal não informado";
      const tipo = r.tipoVenda || "Tipo não informado";
      const gerente = r.gerente || "—";
      const modalidade = r.modalidadePagamento || (r.subproduto || "Modalidade não informada");
      const key = `${canal}|${tipo}|${gerente}|${modalidade}`;
      const bucket = map.get(key) || [];
      bucket.push(r);
      map.set(key, bucket);
    });
    return [...map.entries()].map(([comboKey, subset]) => {
      const [canal, tipo, gerente, modalidade] = comboKey.split("|");
      const a = agg(subset);
      const dataVencimento = subset.reduce((curr, item) => {
        if (!item.dataVencimento) return curr;
        return !curr || item.dataVencimento > curr ? item.dataVencimento : curr;
      }, "");
      const dataCancelamento = subset.reduce((curr, item) => {
        if (!item.dataCancelamento) return curr;
        return !curr || item.dataCancelamento > curr ? item.dataCancelamento : curr;
      }, "");
      const motivoCancelamento = subset.reduce((curr, item) => curr || item.motivoCancelamento || "", "");
      return {
        canal,
        tipo,
        gerente,
        modalidade,
        realizado: a.realizado,
        meta: a.meta,
        qtd: a.qtd,
        ating: a.ating,
        data: a.data,
        dataVencimento,
        dataCancelamento,
        motivoCancelamento
      };
    }).sort((a,b)=> (b.realizado||0) - (a.realizado||0));
  }

  function buildLevel(arr, levelKey, level){
    if (levelKey === "contrato") {
      return arr.flatMap(r => ensureContracts(r).map(c => {
        const detailGroups = buildDetailGroups([c]);
        const detailBase = detailGroups[0] || null;
        const detail = detailBase ? {
          canal: detailBase.canal,
          tipo: detailBase.tipo,
          gerente: detailBase.gerente,
          modalidade: detailBase.modalidade
        } : null;
        return {
          type:"contrato",
          level,
          label:c.id,
          realizado:c.realizado,
          meta:c.meta,
          qtd:c.qtd,
          ating:c.ating,
          data:c.data,
          detail,
          detailGroups,
          breadcrumb:[
            c.prodOrSub,
            r.gerenteNome || r.gerente,
            r.gerenteGestaoNome || r.gerenteGestao,
            r.agenciaNome || r.agencia,
            r.regional || r.gerenciaNome || r.gerenciaRegional,
            r.diretoriaNome || r.diretoria
          ].filter(Boolean),
          children:[]
        };
      }));
    }
    const mapKey = keyMap[levelKey] || levelKey;
    return group(arr, mapKey).map(([k, subset]) => {
      const a = agg(subset), next = NEXT[levelKey];
      const labelText = resolveTreeLabel(levelKey, subset, k);
      return {
        type:"grupo", level, label:labelText, realizado:a.realizado, meta:a.meta, qtd:a.qtd, ating:a.ating, data:a.data,
        breadcrumb:[labelText], detailGroups: [],
        children: next ? buildLevel(subset, next, level+1) : []
      };
    });
  }
  return buildLevel(list, startKey, 0);
}

function getContractSearchInput(){
  return document.getElementById("busca");
}

function getContractSuggestPanel(){
  return document.getElementById("contract-suggest");
}

function bindContractSuggestOutsideClick(){
  if (contractSuggestDocBound) return;
  const closeIfOutside = (event) => {
    const wrap = document.querySelector(".card__search-autocomplete");
    if (!wrap) return;
    if (!wrap.contains(event.target)) closeContractSuggestions();
  };
  document.addEventListener("click", closeIfOutside);
  window.addEventListener("resize", closeContractSuggestions);
  document.addEventListener("scroll", closeContractSuggestions, true);
  contractSuggestDocBound = true;
}

function wireContractSuggestionPanel(){
  if (contractSuggestPanelBound) return;
  const panel = getContractSuggestPanel();
  if (!panel) return;
  panel.addEventListener("pointerdown", (event) => {
    const item = event.target.closest?.(".contract-suggest__item");
    if (!item) return;
    event.preventDefault();
    const value = item.dataset.value || item.getAttribute("data-value") || item.textContent || "";
    chooseContractSuggestion(value);
  });
  contractSuggestPanelBound = true;
}

function highlightContractTerm(text, term){
  const value = String(text || "");
  const lower = value.toLowerCase();
  const needle = term.toLowerCase();
  const idx = lower.indexOf(needle);
  if (idx < 0) return escapeHTML(value);
  const before = escapeHTML(value.slice(0, idx));
  const match = escapeHTML(value.slice(idx, idx + term.length));
  const after = escapeHTML(value.slice(idx + term.length));
  return `${before}<mark>${match}</mark>${after}`;
}

function closeContractSuggestions(){
  const panel = getContractSuggestPanel();
  const input = getContractSearchInput();
  if (panel) {
    panel.hidden = true;
    panel.innerHTML = "";
  }
  if (input) {
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  }
  contractSuggestState.open = false;
  contractSuggestState.items = [];
  contractSuggestState.highlight = -1;
}

function setContractSuggestionHighlight(index){
  const panel = getContractSuggestPanel();
  const input = getContractSearchInput();
  if (!panel || !contractSuggestState.open) return;
  const items = panel.querySelectorAll(".contract-suggest__item");
  if (!items.length) {
    contractSuggestState.highlight = -1;
    input?.removeAttribute("aria-activedescendant");
    return;
  }
  let next = index;
  if (next < 0) next = items.length - 1;
  if (next >= items.length) next = 0;
  contractSuggestState.highlight = next;
  items.forEach((btn, i) => {
    const highlighted = i === next;
    btn.classList.toggle("is-highlight", highlighted);
    btn.setAttribute("aria-selected", highlighted ? "true" : "false");
    const id = `contract-opt-${i}`;
    btn.id = id;
    if (highlighted && input) {
      input.setAttribute("aria-activedescendant", id);
      const top = btn.offsetTop;
      const bottom = top + btn.offsetHeight;
      if (top < panel.scrollTop) panel.scrollTop = top;
      else if (bottom > panel.scrollTop + panel.clientHeight) panel.scrollTop = bottom - panel.clientHeight;
    }
  });
}

function moveContractSuggestionHighlight(delta){
  if (!contractSuggestState.open) return;
  const panel = getContractSuggestPanel();
  if (!panel || panel.hidden) return;
  const items = panel.querySelectorAll(".contract-suggest__item");
  if (!items.length) return;
  const next = contractSuggestState.highlight + delta;
  setContractSuggestionHighlight(next);
}

function getHighlightedContractSuggestion(){
  if (!contractSuggestState.open) return null;
  const idx = contractSuggestState.highlight;
  if (idx < 0) return null;
  return contractSuggestState.items[idx] || null;
}

function chooseContractSuggestion(value){
  const input = getContractSearchInput();
  const term = (value || "").trim();
  if (input) {
    input.value = term;
    input.focus();
  }
  closeContractSuggestions();
  requestAnimationFrame(() => {
    if (term) commitContractSearch(term);
    else commitContractSearch("", { showSpinner: true });
  });
}

function refreshContractSuggestions(query = ""){
  const input = getContractSearchInput();
  const panel = getContractSuggestPanel();
  if (!input || !panel) return;
  bindContractSuggestOutsideClick();
  wireContractSuggestionPanel();

  const term = (query || "").trim();
  contractSuggestState.term = term;
  if (!term){
    closeContractSuggestions();
    return;
  }

  const list = Array.isArray(state.contractIndex) ? state.contractIndex : [];
  const lowered = term.toLowerCase();
  const matches = list.filter(id => id.toLowerCase().includes(lowered)).slice(0, 12);

  if (!matches.length){
    contractSuggestState.items = [];
    contractSuggestState.highlight = -1;
    contractSuggestState.open = true;
    panel.innerHTML = `<div class="contract-suggest__empty">Nenhum contrato encontrado</div>`;
    panel.hidden = false;
    input.setAttribute("aria-expanded", "true");
    input.removeAttribute("aria-activedescendant");
    return;
  }

  contractSuggestState.items = matches;
  contractSuggestState.highlight = -1;
  contractSuggestState.open = true;
  panel.innerHTML = matches.map((id, index) => `
    <button type="button" class="contract-suggest__item" role="option" aria-selected="false" data-index="${index}" data-value="${escapeHTML(id)}">
      <span>${highlightContractTerm(id, term)}</span>
      <span class="contract-suggest__meta">Filtrar</span>
    </button>
  `).join("");
  panel.hidden = false;
  panel.scrollTop = 0;
  input.setAttribute("aria-expanded", "true");
  input.removeAttribute("aria-activedescendant");
}

function updateContractAutocomplete(){
  const input = getContractSearchInput();
  if (!input) return;
  bindContractSuggestOutsideClick();
  wireContractSuggestionPanel();

  const ids = new Set();
  (state._rankingRaw || []).forEach(row => {
    ensureContracts(row).forEach(contract => {
      if (contract?.id) ids.add(contract.id);
    });
  });

  state.contractIndex = [...ids].sort();
  if (input.value) refreshContractSuggestions(input.value);
  else closeContractSuggestions();
}

function setContractSearchLoading(isLoading){
  const wrap = document.querySelector(".card__search-autocomplete");
  if (!wrap) return;
  wrap.classList.toggle("is-loading", Boolean(isLoading));
}

async function commitContractSearch(rawTerm, opts = {}) {
  const { showSpinner = true } = opts || {};
  const term = (rawTerm || "").trim();

  contractSuggestState.pending = term;
  const run = async () => {
    if (term) {
      if (state.tableView !== "contrato") {
        state.lastNonContractView = state.tableView;
      }
      state.tableView = "contrato";
      setActiveChip("contrato");
    } else if (state.tableView === "contrato") {
      const fallback = state.lastNonContractView && state.lastNonContractView !== "contrato"
        ? state.lastNonContractView
        : "diretoria";
      state.tableView = fallback;
      setActiveChip(state.tableView);
    }

    state.tableSearchTerm = term;
    closeContractSuggestions();
    await Promise.resolve(applyFiltersAndRender());
    if (!term) refreshContractSuggestions("");
  };

  const label = term ? "Filtrando contratos…" : "Atualizando tabela…";

  if (showSpinner) {
    await withSpinner(async () => {
      setContractSearchLoading(true);
      try {
        await run();
      } finally {
        setContractSearchLoading(false);
        contractSuggestState.pending = null;
      }
    }, label);
  } else {
    setContractSearchLoading(true);
    try {
      await run();
    } finally {
      setContractSearchLoading(false);
      contractSuggestState.pending = null;
    }
  }
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
  const dirOptions = [{ value: "Todas", label: "Todas" }].concat(
    RANKING_DIRECTORIAS.map(dir => ({ value: dir.id, label: `${dir.id} • ${dir.nome}` }))
  );
  const gerOptions = [{ value: "Todas", label: "Todas" }].concat(
    RANKING_GERENCIAS.map(gr => ({ value: gr.id, label: `${gr.id} • ${gr.nome}` }))
  );
  fill("#f-diretoria", dirOptions);
  fill("#f-gerencia", gerOptions);

  // avançado
  const agOptions = [{ value: "Todas", label: "Todas" }].concat(
    RANKING_AGENCIAS.map(ag => ({ value: ag.id, label: ag.nome }))
  );
  fill("#f-agencia", agOptions);
  fill("#f-ggestao",   [{value:"Todos",label:"Todos"},{value:"GG 01",label:"GG 01"},{value:"GG 02",label:"GG 02"},{value:"GG 03",label:"GG 03"}]);
  const gerenteOptions = [{ value: "Todos", label: "Todos" }].concat(
    RANKING_GERENTES.map(ger => ({ value: ger.id, label: `${ger.id} • ${ger.nome}` }))
  );
  fill("#f-gerente", gerenteOptions);

  // #f-familia = todos os cards
  const products = [{value:"Todas",label:"Todas"}].concat(
    [...PRODUCT_INDEX.entries()].map(([id,meta]) => ({ value:id, label: meta.name }))
  );
  fill("#f-familia", products);

  const produtosExemplo = [{value:"Todos",label:"Todos"},{value:"CDC",label:"CDC"},{value:"Cheque Especial",label:"Cheque Especial"},{value:"CDB",label:"CDB"},{value:"Seguro Vida",label:"Seguro Vida"}];
  fill("#f-produto", produtosExemplo);
}
function bindEvents() {
  $("#btn-consultar")?.addEventListener("click", async () => {
    await withSpinner(async () => {
      autoSnapViewToFilters();
      applyFiltersAndRender();
      if (state._dataset) renderFamilias(state._dataset.sections, state._dataset.summary);
      renderAppliedFilters();
      renderCampanhasView();
      if (state.activeView === "ranking") renderRanking();
    }, "Aplicando filtros…");
    closeMobileFilters();
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
      const view = t.dataset.view;
      setActiveTab(view);
      if (view === "table") switchView("table");
      else if (view === "ranking") switchView("ranking");
      else if (view === "exec") switchView("exec");
      else if (view === "campanhas") switchView("campanhas");
      else switchView("cards");
    });
  });

  ["#f-segmento","#f-diretoria","#f-gerencia","#f-agencia","#f-ggestao","#f-gerente","#f-familia","#f-subproduto","#f-status-kpi"].forEach(sel => {
    $(sel)?.addEventListener("change", async () => {
      await withSpinner(async () => {
        autoSnapViewToFilters();
        applyFiltersAndRender();
        if (state._dataset) renderFamilias(state._dataset.sections, state._dataset.summary);
        renderAppliedFilters();
        renderCampanhasView();
        if (state.activeView === "ranking") renderRanking();
      }, "Atualizando filtros…");
    });
  });

  const searchInput = $("#busca");
  if (searchInput) {
    searchInput.addEventListener("input", async (e) => {
      const value = e.target.value || "";
      refreshContractSuggestions(value);
      if (!value.trim() && state.tableSearchTerm) {
        await commitContractSearch("", { showSpinner: true });
      }
    });
    searchInput.addEventListener("keydown", async (e) => {
      if (e.key === "ArrowDown") {
        const value = e.currentTarget.value || "";
        if (!contractSuggestState.open) refreshContractSuggestions(value);
        if (contractSuggestState.open) moveContractSuggestionHighlight(1);
        e.preventDefault();
        return;
      }
      if (e.key === "ArrowUp") {
        const value = e.currentTarget.value || "";
        if (!contractSuggestState.open) refreshContractSuggestions(value);
        if (contractSuggestState.open) moveContractSuggestionHighlight(-1);
        e.preventDefault();
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const highlighted = getHighlightedContractSuggestion();
        const value = highlighted ?? e.currentTarget.value;
        await commitContractSearch(value);
        return;
      }
      if (e.key === "Escape") {
        closeContractSuggestions();
      }
    });
    searchInput.addEventListener("change", async (e) => {
      const value = e.target.value || "";
      const term = (value || "").trim();
      if (term === state.tableSearchTerm || term === contractSuggestState.pending) {
        closeContractSuggestions();
        return;
      }
      if (!term) {
        await commitContractSearch("", { showSpinner: true });
      } else {
        await commitContractSearch(term);
      }
    });
    searchInput.addEventListener("focus", (e) => {
      const value = e.target.value || "";
      if (value.trim()) refreshContractSuggestions(value);
    });
    searchInput.addEventListener("blur", () => {
      setTimeout(() => closeContractSuggestions(), 120);
    });
  }

  $("#btn-export")?.remove();
  setupMobileFilters();
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
    <section id="chat-panel" class="chatw__panel" aria-hidden="true" role="dialog" aria-label="Chat POBJ e campanhas">
      <header class="chatw__header">
        <div class="chatw__title">Assistente POBJ &amp; Campanhas</div>
        <button id="chat-close" class="chatw__close" aria-label="Fechar chat"><i class="ti ti-x"></i></button>
      </header>

      <p class="chatw__disclaimer">Assistente virtual com IA — respostas podem conter erros.</p>

      <div id="chat-body">
        <!-- Se modo iframe, eu coloco aqui; senão, uso a UI nativa abaixo -->
      </div>

      <div id="chat-ui-native" style="display:none;">
        <div id="chat-messages" class="chatw__msgs" aria-live="polite"></div>
        <form id="chat-form" class="chatw__form" autocomplete="off">
          <input id="chat-input" type="text" placeholder="Pergunte sobre o POBJ ou campanhas…" required />
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
    addMsg("bot","Olá! Posso ajudar com dúvidas sobre o POBJ e campanhas. O que você quer saber?");

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
    next === "table"     ? "Montando detalhamento…" :
    next === "ranking"   ? "Calculando ranking…"    :
    next === "exec"      ? "Abrindo visão executiva…" :
    next === "campanhas" ? "Abrindo campanhas…" :
                           "Carregando…";

  setActiveTab(next);

  await withSpinner(async () => {
    const views = { cards:"#view-cards", table:"#view-table", ranking:"#view-ranking", exec:"#view-exec", campanhas:"#view-campanhas" };

    if (next === "ranking" && !$("#view-ranking")) createRankingView();
    if (next === "exec") createExecutiveView();
    if (next === "campanhas") ensureCampanhasView();


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
    if (next === "campanhas") renderCampanhasView();

    const el = $(views[next]) || $("#view-cards");
    el.classList.remove("hidden");
    state.activeView = next;
  }, label);
}



/* ===== Resumo (Indicadores / Pontos) ===== */
function hitbarClass(p){ return p<50 ? "hitbar--low" : (p<100 ? "hitbar--warn" : "hitbar--ok"); }
function renderResumoKPI(summary, context = {}) {
  const {
    visibleItemsHitCount = null,
    visiblePointsHit = null,
    visibleVarAtingido = null,
    visibleVarMeta = null
  } = context || {};

  let kpi = $("#kpi-summary");
  if (!kpi) {
    kpi = document.createElement("div");
    kpi.id = "kpi-summary";
    kpi.className = "kpi-summary";
    $("#grid-familias").prepend(kpi);
  }

  const indicadoresAtingidos = toNumber(summary.indicadoresAtingidos ?? visibleItemsHitCount ?? 0);
  const indicadoresTotal = toNumber(summary.indicadoresTotal ?? 0);
  const pontosAtingidos = toNumber(summary.pontosAtingidos ?? visiblePointsHit ?? 0);
  const pontosTotal = toNumber(summary.pontosPossiveis ?? 0);

  const varTotalBase = summary.varPossivel != null
    ? toNumber(summary.varPossivel)
    : (visibleVarMeta != null ? toNumber(visibleVarMeta) : Math.round((summary.pontosPossiveis || 0) * 1000));
  const varAtingidoBase = summary.varAtingido != null
    ? toNumber(summary.varAtingido)
    : (visibleVarAtingido != null ? toNumber(visibleVarAtingido) : Math.round(varTotalBase * (summary.varPct || 0)));

  const formatDisplay = (type, value) => type === "brl" ? formatBRLReadable(value) : formatIntReadable(value);
  const formatFull = (type, value) => {
    const n = Math.round(toNumber(value));
    return type === "brl" ? fmtBRL.format(n) : fmtINT.format(n);
  };
  const buildTitle = (label, type, globalValue, visibleValue) => {
    let title = `${label}: ${formatFull(type, globalValue)}`;
    if (visibleValue != null && Math.round(toNumber(visibleValue)) !== Math.round(toNumber(globalValue))) {
      title += ` · Filtro atual: ${formatFull(type, visibleValue)}`;
    }
    return title;
  };

  const buildCard = (titulo, iconClass, atingidos, total, fmtType, visibleAting = null, visibleTotal = null) => {
    const pctRaw = total ? (atingidos / total) * 100 : 0;
    const pct100 = Math.max(0, Math.min(100, pctRaw));
    const hbClass = hitbarClass(pctRaw);
    const pctLabel = `${pctRaw.toFixed(1)}%`;
    const atgTitle = buildTitle("Atingidos", fmtType, atingidos, visibleAting);
    const totTitle = buildTitle("Total", fmtType, total, visibleTotal);
    return `
      <div class="kpi-pill">
        <div class="kpi-strip__main">
          <span class="kpi-icon"><i class="${iconClass}"></i></span>
          <div class="kpi-strip__text">
            <span class="kpi-strip__label" title="${titulo}">${titulo}</span>
            <div class="kpi-strip__stats">
              <span class="kpi-stat" title="${atgTitle}">Atg: <strong>${formatDisplay(fmtType, atingidos)}</strong></span>
              <span class="kpi-stat" title="${totTitle}">Total: <strong>${formatDisplay(fmtType, total)}</strong></span>
            </div>
          </div>
        </div>
        <div class="hitbar ${hbClass}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct100.toFixed(1)}" aria-valuetext="${titulo}: ${pctLabel}">
          <span class="hitbar__track"><span class="hitbar__fill" style="width:${pct100}%"></span></span>
          <strong title="${pctLabel}">${pctLabel}</strong>
        </div>
      </div>`;
  };

  kpi.innerHTML = [
    buildCard("Indicadores", "ti ti-list-check", indicadoresAtingidos, indicadoresTotal, "int", visibleItemsHitCount),
    buildCard("Pontos", "ti ti-medal", pontosAtingidos, pontosTotal, "int", visiblePointsHit),
    buildCard("Variável", "ti ti-cash", varAtingidoBase, varTotalBase, "brl", visibleVarAtingido, visibleVarMeta)
  ].join("");
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
  let varRealVisiveis = 0;
  let varMetaVisiveis = 0;
  let hasVisibleVar = false;

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
    const sectionVarMeta     = sec.items.reduce((acc,i)=> acc + (i.variavelMeta || 0), 0);
    const sectionVarReal     = sec.items.reduce((acc,i)=> acc + (i.variavelReal || 0), 0);

    const sectionPointsHitDisp = formatIntReadable(sectionPointsHit);
    const sectionPointsTotalDisp = formatIntReadable(sectionTotalPoints);
    const sectionPointsHitFull = fmtINT.format(Math.round(sectionPointsHit));
    const sectionPointsTotalFull = fmtINT.format(Math.round(sectionTotalPoints));
    const sectionVarRealDisp = formatBRLReadable(sectionVarReal);
    const sectionVarMetaDisp = formatBRLReadable(sectionVarMeta);
    const sectionVarRealFull = fmtBRL.format(Math.round(sectionVarReal));
    const sectionVarMetaFull = fmtBRL.format(Math.round(sectionVarMeta));

    const sectionEl = document.createElement("section");
    sectionEl.className = "fam-section";
    sectionEl.id = `sec-${sec.id}`;
    sectionEl.innerHTML = `
      <header class="fam-section__header">
        <div class="fam-section__title">
          <span>${sec.label}</span>
          <small class="fam-section__meta">
            <span class="fam-section__meta-item" title="Pontos: ${sectionPointsHitFull} / ${sectionPointsTotalFull}">Pontos: ${sectionPointsHitDisp} / ${sectionPointsTotalDisp}</span>
            <span class="fam-section__meta-item" title="Variável: ${sectionVarRealFull} / ${sectionVarMetaFull}">Variável: ${sectionVarRealDisp} / ${sectionVarMetaDisp}</span>
          </small>
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

      const variavelMeta = f.variavelMeta || 0;
      const variavelReal = f.variavelReal || 0;
      hasVisibleVar = true;
      varMetaVisiveis += variavelMeta;
      varRealVisiveis += variavelReal;
      const varRatio = variavelMeta ? (variavelReal / variavelMeta) : (f.atingVariavel ?? f.ating ?? 0);
      const varPct = Math.max(0, varRatio * 100);
      const varPctLabel = `${varPct.toFixed(1)}%`;
      const varFillPct = Math.max(0, Math.min(100, varPct));
      const varTrackClass = varPct < 50 ? "var--low" : (varPct < 100 ? "var--warn" : "var--ok");
      const varRealCompact = formatCompactBRL(variavelReal);
      const varMetaCompact = formatCompactBRL(variavelMeta);
      const varAccessible = `${varPctLabel} (${fmtBRL.format(Math.round(variavelReal))} de ${fmtBRL.format(Math.round(variavelMeta))})`;

      const realizadoTxt = formatByMetric(f.metric, f.realizado);
      const metaTxt      = formatByMetric(f.metric, f.meta);
      const realizadoFull = formatMetricFull(f.metric, f.realizado);
      const metaFull      = formatMetricFull(f.metric, f.meta);

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
            <div class="kv"><small>Realizado</small><strong class="has-ellipsis" title="${realizadoFull}">${realizadoTxt}</strong></div>
            <div class="kv"><small>Meta</small><strong class="has-ellipsis" title="${metaFull}">${metaTxt}</strong></div>
          </div>

          <div class="prod-card__var">
            <div class="prod-card__var-head">
              <small>Remuneração variável</small>
              <strong title="${varPctLabel}">${varPctLabel}</strong>
            </div>
            <div class="prod-card__var-track ${varTrackClass}" role="progressbar" aria-valuemin="0" aria-valuemax="150" aria-valuenow="${Math.round(Math.min(varPct,150))}" aria-valuetext="${varAccessible}" aria-label="Atingimento da remuneração variável">
              <span class="prod-card__var-fill" style="width:${varFillPct}%"></span>
              <span class="prod-card__var-label prod-card__var-label--current" title="${fmtBRL.format(Math.round(variavelReal))}">${varRealCompact}</span>
              <span class="prod-card__var-label prod-card__var-label--target" title="${fmtBRL.format(Math.round(variavelMeta))}">${varMetaCompact}</span>
            </div>
          </div>

          <div class="prod-card__foot">Atualizado em ${f.ultimaAtualizacao}</div>
          ${buildCardTooltipHTML(f)}
        </article>
      `);
    });

    host.appendChild(sectionEl);
  });

  renderResumoKPI(summary, {
    visibleItemsHitCount: atingidosVisiveis,
    visiblePointsHit: pontosAtingidosVisiveis,
    visibleVarAtingido: hasVisibleVar ? varRealVisiveis : null,
    visibleVarMeta: hasVisibleVar ? varMetaVisiveis : null
  });

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
    .exec-chart{background:#fff;border:1px solid var(--stroke);border-radius:14px;box-shadow:var(--shadow);padding:20px;margin-bottom:20px}
    .chart{width:100%;overflow:hidden;padding:20px;border-radius:12px;background:#fff}
    .chart svg{display:block;width:100%;height:auto}
    .chart-legend{display:flex;gap:12px;flex-wrap:wrap;margin-top:8px}
    .legend-item{display:inline-flex;align-items:center;gap:6px;color:#475569;font-weight:700}
    .legend-swatch{width:14px;height:6px;border-radius:999px;background:#cbd5e1;border:1px solid #94a3b8}
    .legend-swatch--meta{background:#93c5fd;border-color:#60a5fa}
    .legend-swatch--real{background:#86efac;border-color:#4ade80}
    .legend-swatch--monthly-meta{background:transparent;border:1.5px dashed #2563eb;height:8px}
    .legend-swatch--monthly-real{background:#2563eb;border-color:#1d4ed8;height:8px}
    .legend-swatch--bars{background:#e5e7eb;border-color:#cbd5e1;height:10px}
    .exec-panel .exec-h{display:flex;align-items:center;justify-content:space-between;gap:10px}
  `;
  document.head.appendChild(s);
}

/* ===== Visão Executiva ===== */
function createExecutiveView(){
  ensureExecStyles();

  const host = document.getElementById("view-exec");
  if (!host) return;

  if (!state.exec) {
    state.exec = { rankMode: "top", statusMode: "quase", chartMode: "diario" };
  }
  state.exec.rankMode  = state.exec.rankMode  || "top";
  state.exec.statusMode= state.exec.statusMode|| "quase";
  state.exec.chartMode = state.exec.chartMode || "diario";

  const syncSegmented = (containerSelector, dataAttr, stateKey, fallback) => {
    const container = host.querySelector(containerSelector);
    if (!container) return;
    const buttons = container.querySelectorAll('.seg-btn');
    if (!buttons.length) return;
    const active = state.exec[stateKey] || fallback;
    buttons.forEach(btn => {
      const value = btn.dataset[dataAttr] || fallback;
      btn.classList.toggle('is-active', value === active);
      if (!btn.dataset.execBound) {
        btn.dataset.execBound = 'true';
        btn.addEventListener('click', () => {
          state.exec[stateKey] = value;
          buttons.forEach(b => b.classList.toggle('is-active', b === btn));
          if (state.activeView === 'exec') renderExecutiveView();
        });
      }
    });
  };

  syncSegmented('#exec-rank-panel', 'rk', 'rankMode', 'top');
  syncSegmented('#exec-status-panel', 'st', 'statusMode', 'quase');
  syncSegmented('#exec-chart-toggle', 'chart', 'chartMode', 'diario');

  if (!host.dataset.execFiltersBound) {
    const execSel = ["#f-segmento","#f-diretoria","#f-gerencia","#f-agencia","#f-ggestao","#f-gerente","#f-familia","#f-subproduto","#f-status-kpi"];
    execSel.forEach(sel => $(sel)?.addEventListener("change", () => {
      if (state.activeView === 'exec') renderExecutiveView();
    }));
    $("#btn-consultar")?.addEventListener("click", () => {
      if (state.activeView === 'exec') renderExecutiveView();
    });
    host.dataset.execFiltersBound = "true";
  }
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

function chartDimensions(container, fallbackW=900, fallbackH=260){
  if (!container) return { width: fallbackW, height: fallbackH };
  const styles = window.getComputedStyle(container);
  const padL = parseFloat(styles.paddingLeft) || 0;
  const padR = parseFloat(styles.paddingRight) || 0;
  const width = Math.max(320, (container.clientWidth || fallbackW) - padL - padR);
  return { width, height: fallbackH };
}
function buildExecChart(container, series){
  const { width: W, height: H } = chartDimensions(container);
  const m = { t:20, r:20, b:40, l:64 };
  const iw = Math.max(0, W - m.l - m.r);
  const ih = Math.max(0, H - m.t - m.b);

  const n = series.labels.length;
  const maxY = Math.max(...series.cumMeta, ...series.cumReal) * 1.10 || 1;

  const x = i => m.l + (iw / Math.max(1,n-1)) * i;
  const y = v => m.t + ih - (v / maxY) * ih;

  const barW = Math.max(2, iw / (n*1.6));

  const axisY = H - m.b;

  // grid Y
  const gy = [];
  for(let k=0;k<=4;k++){
    const val = (maxY/4)*k;
    gy.push({ y: y(val), label: formatBRLReadable(val) });
  }

  const path = (arr)=> arr.map((v,i)=> `${i?"L":"M"} ${x(i)} ${y(v)}`).join(" ");
  const bars = series.dailyReal.map((v,i)=> 
    `<rect x="${x(i)-barW/2}" y="${y(v)}" width="${barW}" height="${Math.max(0, y(0)-y(v))}" fill="#e5e7eb" stroke="#cbd5e1"/>`
  ).join("");

  const lineReal = `<path d="${path(series.cumReal)}" fill="none" stroke="#22c55e" stroke-width="2.5" />`;
  const lineMeta = `<path d="${path(series.cumMeta)}" fill="none" stroke="#60a5fa" stroke-width="2.5" stroke-dasharray="6 6" />`;

  const xlabels = series.labels.map((lab,i) =>
    `<text x="${x(i)}" y="${axisY + 16}" font-size="9" text-anchor="middle" fill="#6b7280">${lab}</text>`
  ).join("");

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
      <line x1="${m.l}" y1="${axisY}" x2="${W-m.r}" y2="${axisY}" stroke="#e5e7eb"/>
      ${xlabels}
    </svg>`;
}

function monthKeyLabel(key){
  if (!key) return "—";
  const [y,m] = key.split('-');
  const year = Number(y);
  const month = Number(m);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return key;
  const dt = new Date(Date.UTC(year, month - 1, 1));
  return dt.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).replace(".", "");
}

function monthKeyFromDate(dt){
  if (!(dt instanceof Date) || Number.isNaN(dt)) return "";
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`;
}

function normalizeMonthKey(value){
  if (!value) return "";
  if (value instanceof Date) return monthKeyFromDate(value);
  if (typeof value === "string") {
    const cleaned = value.trim().replace(/[\\/]/g, "-");
    const match = cleaned.match(/^(\d{4})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}`;
  }
  return "";
}

function makeMonthlySeries(rows, period){
  const startISO = period?.start || todayISO();
  const endISO = period?.end || startISO;

  let startDate = dateUTCFromISO(startISO);
  let endDate = dateUTCFromISO(endISO);
  if (!startDate) startDate = dateUTCFromISO(todayISO());
  if (!endDate) endDate = startDate;
  if (startDate > endDate) [startDate, endDate] = [endDate, startDate];

  const monthStart = new Date(startDate);
  monthStart.setUTCDate(1);
  const monthEnd = new Date(endDate);
  monthEnd.setUTCDate(1);

  const monthKeys = [];
  const cursor = new Date(monthStart);
  while (cursor <= monthEnd) {
    monthKeys.push(monthKeyFromDate(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  const fallbackKey = monthKeys[0] || normalizeMonthKey(startISO) || normalizeMonthKey(todayISO()) || "";
  if (!monthKeys.length && fallbackKey) monthKeys.push(fallbackKey);

  const firstKey = monthKeys[0];
  const lastKey = monthKeys[monthKeys.length - 1] || firstKey;
  const buckets = new Map(monthKeys.map(key => [key, { meta:0, real:0 }]));

  rows.forEach(r => {
    const rawDate = r?.competencia || r?.mes || r?.data || r?.dataReferencia || r?.dt;
    let key = normalizeMonthKey(rawDate);

    if (!key && rawDate instanceof Date) {
      key = monthKeyFromDate(rawDate);
    }

    if (!key && typeof rawDate === "string") {
      const isoCandidate = rawDate.length >= 10 ? rawDate.slice(0, 10) : rawDate.length >= 7 ? `${rawDate.slice(0,7)}-01` : "";
      key = normalizeMonthKey(isoCandidate);
    }

    if (!key) key = fallbackKey;
    if (!key) return;

    if (firstKey && key < firstKey) return;
    if (lastKey && key > lastKey) return;

    if (!buckets.has(key)) buckets.set(key, { meta:0, real:0 });
    const agg = buckets.get(key);
    agg.meta += (r.meta_mens ?? r.meta ?? 0);
    agg.real += (r.real_mens ?? r.realizado ?? 0);
  });

  const ordered = [...buckets.entries()].sort((a,b)=> a[0].localeCompare(b[0]));
  return {
    labels: ordered.map(([key])=> monthKeyLabel(key)),
    meta:   ordered.map(([,v])=> v.meta),
    real:   ordered.map(([,v])=> v.real)
  };
}

function buildExecMonthlyChart(container, series){
  const { width: W, height: H } = chartDimensions(container);
  const m = { t:20, r:20, b:42, l:64 };
  const iw = Math.max(0, W - m.l - m.r);
  const ih = Math.max(0, H - m.t - m.b);
  const maxY = Math.max(...series.meta, ...series.real) * 1.1 || 1;
  const n = series.labels.length;
  const band = iw / Math.max(1, n);
  const gap = Math.min(18, band * 0.25);
  const barW = Math.max(18, band - gap);
  const realW = Math.max(10, barW * 0.6);
  const offset = (barW - realW) / 2;

  const xBase = i => m.l + band * i + gap/2;
  const y = v => m.t + ih - (v / maxY) * ih;

  const baseColor = "#2563eb";
  const barsMeta = series.meta.map((v,i)=> {
    const height = Math.max(0, y(0) - y(v));
    return `<rect x="${xBase(i)}" y="${y(v)}" width="${barW}" height="${height}" fill="none" stroke="${baseColor}" stroke-width="1.6" stroke-dasharray="4 3" stroke-opacity="0.7" rx="2"/>`;
  }).join("");
  const barsReal = series.real.map((v,i)=> {
    const height = Math.max(0, y(0) - y(v));
    return `<rect x="${xBase(i)+offset}" y="${y(v)}" width="${realW}" height="${height}" fill="${baseColor}" fill-opacity="0.7" stroke="${baseColor}" stroke-width="1.4" rx="2"/>`;
  }).join("");

  const gy = [];
  for(let k=0;k<=4;k++){
    const val = (maxY/4)*k;
    gy.push({ y: y(val), label: formatBRLReadable(val) });
  }

  const gridY = gy.map(g =>
    `<line x1="${m.l}" y1="${g.y}" x2="${W-m.r}" y2="${g.y}" stroke="#eef2f7"/>
     <text x="${m.l-6}" y="${g.y+3}" font-size="10" text-anchor="end" fill="#6b7280">${g.label}</text>`
  ).join("");

  const xlabels = series.labels.map((lab,i)=> {
    const cx = m.l + band * i + band/2;
    return `<text x="${cx}" y="${H-6}" font-size="10" text-anchor="middle" fill="#6b7280">${lab}</text>`;
  }).join("");

  container.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="barras mensais de meta e realizado">
      <rect x="0" y="0" width="${W}" height="${H}" fill="white"/>
      ${gridY}
      ${barsMeta}
      ${barsReal}
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
  const chartTitleEl = document.getElementById("exec-chart-title");
  const chartLegend = document.getElementById("exec-chart-legend");
  const chartToggle = document.getElementById("exec-chart-toggle");
  const hm     = document.getElementById("exec-heatmap");
  const rankEl = document.getElementById("exec-rank");
  const statusList = document.getElementById("exec-status-list");

  if (!Array.isArray(state._rankingRaw) || !state._rankingRaw.length){
    ctx && (ctx.textContent = "Carregando dados…");
    return;
  }

  // base com TODOS os filtros aplicados
  const rowsBase = filterRows(state._rankingRaw);

  const chartMode = state.exec?.chartMode || "diario";
  if (chartToggle){
    chartToggle.querySelectorAll('.seg-btn').forEach(btn=>{
      const mode = btn.dataset.chart || "diario";
      btn.classList.toggle('is-active', mode === chartMode);
    });
  }

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
    const realMensFull = fmtBRL.format(Math.round(total.real_mens));
    const realMensDisplay = formatBRLReadable(total.real_mens);
    const metaMensFull = fmtBRL.format(Math.round(total.meta_mens));
    const metaMensDisplay = formatBRLReadable(total.meta_mens);
    const defasFull = fmtBRL.format(Math.round(defas));
    const defasDisplay = formatBRLReadable(defas);
    const forecastFull = fmtBRL.format(Math.round(forecast));
    const forecastDisplay = formatBRLReadable(forecast);

    kpis.innerHTML = `
      <div class="kpi-card">
        <div class="kpi-card__title">Atingimento mensal</div>
        <div class="kpi-card__value"><span title="${realMensFull}">${realMensDisplay}</span> <small>/ <span title="${metaMensFull}">${metaMensDisplay}</span></small></div>
        <div class="kpi-card__bar">
          <div class="kpi-card__fill ${pctBadgeCls(ating*100)}" style="width:${Math.min(100, Math.max(0, ating*100))}%"></div>
        </div>
        <div class="kpi-card__pct"><span class="att-badge ${pctBadgeCls(ating*100)}">${(ating*100).toFixed(1)}%</span></div>
      </div>

      <div class="kpi-card">
        <div class="kpi-card__title">Defasagem do mês</div>
        <div class="kpi-card__value ${moneyBadgeCls(defas)}" title="${defasFull}">${defasDisplay}</div>
        <div class="kpi-sub muted">Real – Meta (mês)</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-card__title">Forecast x Meta</div>
        <div class="kpi-card__value"><span title="${forecastFull}">${forecastDisplay}</span> <small>/ <span title="${metaMensFull}">${metaMensDisplay}</span></small></div>
        <div class="kpi-card__bar">
          <div class="kpi-card__fill ${pctBadgeCls(forecastPct)}" style="width:${Math.min(100, Math.max(0, forecastPct))}%"></div>
        </div>
        <div class="kpi-card__pct"><span class="att-badge ${pctBadgeCls(forecastPct)}">${forecastPct.toFixed(1)}%</span></div>
      </div>`;
  }

  // Gráfico
  if (chartC){
    const renderChart = () => {
      const mode = state.exec?.chartMode || "diario";
      if (mode === "mensal"){
        const monthlySeries = makeMonthlySeries(rowsBase, state.period);
        buildExecMonthlyChart(chartC, monthlySeries);
        chartC.setAttribute("aria-label", "Comparativo mensal de meta e realizado em barras azuis");
        if (chartTitleEl) chartTitleEl.textContent = "Evolução mensal";
        if (chartLegend){
          chartLegend.innerHTML = `
            <span class="legend-item"><span class="legend-swatch legend-swatch--monthly-meta"></span>Meta mensal (contorno)</span>
            <span class="legend-item"><span class="legend-swatch legend-swatch--monthly-real"></span>Realizado mensal (barra)</span>
          `;
        }
      } else {
        const dailySeries = makeDailySeries(total.meta_mens, total.real_mens, state.period.start, state.period.end);
        buildExecChart(chartC, dailySeries);
        chartC.setAttribute("aria-label", "Evolução diária com linhas de meta e realizado");
        if (chartTitleEl) chartTitleEl.textContent = "Evolução do mês";
        if (chartLegend){
          chartLegend.innerHTML = `
            <span class="legend-item"><span class="legend-swatch legend-swatch--bars"></span>Diário realizado (barras)</span>
            <span class="legend-item"><span class="legend-swatch legend-swatch--real"></span>Realizado acumulado (linha)</span>
            <span class="legend-item"><span class="legend-swatch legend-swatch--meta"></span>Meta acumulada (linha)</span>
          `;
        }
      }
    };

    renderChart();
    host.__execChartRender = renderChart;

    // redimensiona enquanto essa aba estiver ativa
    if (!host.__execResize){
      let raf = null;
      host.__execResize = () => {
        if (state.activeView !== 'exec') return;
        if (raf) cancelAnimationFrame(raf);
        const fn = host.__execChartRender;
        raf = requestAnimationFrame(()=> fn && fn());
      };
      window.addEventListener('resize', host.__execResize);
    }
  }

  // Ranking Top/Bottom para o nível atual
  const grouped = execAggBy(rowsBase, startKey).sort((a,b)=> b.p_mens - a.p_mens);
  const renderRankRows = (arr)=> arr.map(r=>{
    const realFull = fmtBRL.format(Math.round(r.real_mens));
    const realDisplay = formatBRLReadable(r.real_mens);
    const metaFull = fmtBRL.format(Math.round(r.meta_mens));
    const metaDisplay = formatBRLReadable(r.meta_mens);
    return `
    <div class="rank-mini__row" data-key="${r.key}">
      <div class="rank-mini__name">${r.key}</div>
      <div class="rank-mini__bar"><span style="width:${Math.min(100,Math.max(0,r.p_mens))}%"></span></div>
      <div class="rank-mini__pct"><span class="att-badge ${pctBadgeCls(r.p_mens)}">${r.p_mens.toFixed(1)}%</span></div>
      <div class="rank-mini__vals"><strong title="${realFull}">${realDisplay}</strong> <small title="${metaFull}">/ ${metaDisplay}</small></div>
    </div>`;
  }).join("");

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
/* ===== Campanhas ===== */
function currentSprintConfig(){
  if (!Array.isArray(CAMPAIGN_SPRINTS) || !CAMPAIGN_SPRINTS.length) return null;
  const id = state.campanhas?.sprintId;
  return CAMPAIGN_SPRINTS.find(s => s.id === id) || CAMPAIGN_SPRINTS[0];
}

function ensureCampanhasView(){
  const host = document.getElementById("view-campanhas");
  if (!host) return;
  if (!CAMPAIGN_SPRINTS.length) {
    host.innerHTML = `<section class="card card--campanhas"><p class="muted">Nenhuma campanha disponível.</p></section>`;
    return;
  }

  const select = document.getElementById("campanha-sprint");
  if (select && !select.dataset.bound) {
    select.dataset.bound = "1";
    select.addEventListener("change", (ev) => {
      state.campanhas.sprintId = ev.target.value;
      renderCampanhasView();
    });
  }
}

function ensureTeamValuesForSprint(sprint){
  if (!sprint || !state.campanhas) return {};
  const store = state.campanhas.teamValues;
  if (!store[sprint.id]) {
    const base = {};
    (sprint.team?.indicators || []).forEach(ind => {
      base[ind.id] = toNumber(ind.default ?? 100);
    });
    store[sprint.id] = base;
    const defaultPreset = sprint.team?.defaultPreset || (sprint.team?.presets?.[0]?.id || "custom");
    state.campanhas.teamPreset[sprint.id] = defaultPreset;
  }
  return store[sprint.id];
}

function ensureIndividualValuesForProfile(sprint, profile){
  if (!sprint || !profile || !state.campanhas) return {};
  const bySprint = state.campanhas.individualValues[sprint.id] || (state.campanhas.individualValues[sprint.id] = {});
  if (!bySprint[profile.id]) {
    const base = {};
    (profile.indicators || []).forEach(ind => {
      base[ind.id] = toNumber(ind.default ?? 100);
    });
    bySprint[profile.id] = base;
    const key = `${sprint.id}:${profile.id}`;
    const defaultPreset = profile.defaultPreset || (profile.presets?.[0]?.id || "custom");
    state.campanhas.individualPreset[key] = defaultPreset;
  }
  return bySprint[profile.id];
}

function detectPresetMatch(values, presets){
  if (!values || !Array.isArray(presets)) return null;
  return presets.find(preset => {
    const pairs = Object.entries(preset.values || {});
    return pairs.every(([key, val]) => Math.round(toNumber(val)) === Math.round(toNumber(values[key])));
  })?.id || null;
}

function formatCampPoints(value){
  return `${fmtONE.format(toNumber(value))} pts`;
}

function formatCampPercent(value){
  return `${fmtONE.format(toNumber(value))}%`;
}

function computeCampaignScore(config, values){
  const indicators = config?.indicators || [];
  const min = toNumber(config?.minThreshold ?? 90);
  const stretch = toNumber(config?.superThreshold ?? (min + 20));
  const cap = toNumber(config?.cap ?? 150);
  const minTotal = toNumber(config?.eligibilityMinimum ?? 100) || 100;

  const rows = indicators.map(ind => {
    const raw = Math.max(0, toNumber(values?.[ind.id] ?? ind.default ?? 0));
    const capped = Math.min(cap, raw);
    const points = (toNumber(ind.weight) * capped) / 100;
    let statusText = "Crítico";
    let statusClass = "status-pill--alert";
    if (raw >= stretch) {
      statusText = "Parabéns";
      statusClass = "status-pill--great";
    } else if (raw >= min) {
      statusText = "Elegível";
      statusClass = "status-pill--ok";
    } else if (raw >= Math.max(0, min - 10)) {
      statusText = "Ajustar";
      statusClass = "status-pill--warn";
    }
    return { ...ind, pct: raw, capped, points, statusText, statusClass };
  });

  const totalPoints = rows.reduce((acc, row) => acc + row.points, 0);
  const hasAllMin = rows.every(row => row.pct >= min);
  const hasAllStretch = rows.every(row => row.pct >= stretch);
  const eligible = hasAllMin && totalPoints >= minTotal;

  let finalStatus = "Não elegível";
  let finalClass = "status-tag--alert";
  if (hasAllStretch && totalPoints >= minTotal) {
    finalStatus = "Parabéns";
    finalClass = "status-tag--great";
  } else if (eligible) {
    finalStatus = "Elegível";
    finalClass = "status-tag--ok";
  } else if (hasAllMin) {
    finalStatus = "Ajustar foco";
    finalClass = "status-tag--warn";
  }

  const shortfall = Math.max(0, minTotal - totalPoints);
  const progressPct = minTotal ? Math.max(0, Math.min(1, totalPoints / minTotal)) : 0;
  const progressLabel = shortfall > 0
    ? `${fmtONE.format(shortfall)} pts para elegibilidade`
    : (hasAllStretch ? "Acima do stretch" : "Meta mínima atingida");

  return { rows, totalPoints, finalStatus, finalClass, progressPct, progressLabel, shortfall, hasAllMin, hasAllStretch, minThreshold: min, superThreshold: stretch, cap, eligibilityMinimum: minTotal };
}

function teamPresetForSprint(sprint){
  return state.campanhas.teamPreset[sprint.id] || "custom";
}

function setTeamPresetForSprint(sprint, presetId){
  state.campanhas.teamPreset[sprint.id] = presetId || "custom";
}

function individualPresetKey(sprint, profile){
  return `${sprint.id}:${profile.id}`;
}

function individualPresetForProfile(sprint, profile){
  return state.campanhas.individualPreset[individualPresetKey(sprint, profile)] || "custom";
}

function setIndividualPresetForProfile(sprint, profile, presetId){
  state.campanhas.individualPreset[individualPresetKey(sprint, profile)] = presetId || "custom";
}

function buildTeamSimulator(container, sprint){
  if (!container || !sprint?.team) return;
  if (container.dataset.sprintId === sprint.id) return;
  container.dataset.sprintId = sprint.id;

  const indicators = sprint.team.indicators || [];
  const presets = sprint.team.presets || [];

  container.innerHTML = `
    <div class="sim-card__head">
      <div class="sim-card__title">
        <h5>Simulador de equipe</h5>
        <button type="button" class="sim-help" aria-label="Como funciona o simulador de equipe" data-tip="Ajuste os percentuais de cada indicador entre 0% e 150%. A equipe se torna elegível com todos os indicadores a partir de 90% e somando pelo menos 100 pontos.">
          <i class="ti ti-info-circle"></i>
        </button>
      </div>
      <p>Defina o atingimento de cada indicador para estimar a pontuação e a elegibilidade da equipe.</p>
      <p class="sim-hint">Elegível com todos os indicadores ≥ 90% e pelo menos 100 pontos.</p>
    </div>
    <div class="sim-presets" id="team-presets">
      ${presets.map(p => `<button type="button" class="sim-chip" data-team-preset="${p.id}">${p.label}</button>`).join("")}
    </div>
    <table class="sim-table">
      <thead>
        <tr>
          <th>Indicador</th>
          <th>Peso</th>
          <th>Atingimento</th>
          <th>Pontos</th>
          <th>Resultado</th>
        </tr>
      </thead>
      <tbody>
        ${indicators.map(ind => `
          <tr data-row="${ind.id}">
            <td class="sim-indicator" data-label="Indicador">
              <strong>${ind.label}</strong>
              ${ind.hint ? `<div class="muted" style="font-size:12px;">${ind.hint}</div>` : ""}
            </td>
            <td class="sim-weight" data-label="Peso">${fmtONE.format(toNumber(ind.weight))}%</td>
            <td data-label="Atingimento">
              <div class="sim-slider">
                <input type="range" min="0" max="160" step="1" data-indicator="${ind.id}" aria-label="${ind.label}" />
                <span class="sim-slider-value" data-output="${ind.id}"></span>
              </div>
            </td>
            <td class="sim-points" data-label="Pontos" data-points="${ind.id}"></td>
            <td data-label="Resultado"><span class="status-pill" data-status="${ind.id}"></span></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
    <div class="sim-summary">
      <div class="sim-total">
        <span>Pontuação total</span>
        <strong id="team-total-points"></strong>
      </div>
      <div class="sim-progress">
        <div class="sim-progress__track"><span id="team-progress-bar"></span></div>
        <small id="team-progress-label"></small>
      </div>
      <div class="sim-outcome">
        <span id="team-status" class="status-tag"></span>
      </div>
    </div>
  `;

  container.querySelectorAll("input[type=range]").forEach(input => {
    input.addEventListener("input", (ev) => {
      const id = ev.currentTarget.dataset.indicator;
      const values = ensureTeamValuesForSprint(sprint);
      values[id] = toNumber(ev.currentTarget.value);
      updateTeamSimulator(container, sprint);
    });
  });

  container.querySelectorAll("[data-team-preset]").forEach(btn => {
    btn.addEventListener("click", () => {
      const presetId = btn.dataset.teamPreset;
      const preset = presets.find(p => p.id === presetId);
      if (!preset) return;
      const values = ensureTeamValuesForSprint(sprint);
      Object.entries(preset.values || {}).forEach(([key, val]) => {
        values[key] = toNumber(val);
      });
      setTeamPresetForSprint(sprint, presetId);
      updateTeamSimulator(container, sprint);
    });
  });
}

function updateTeamSimulator(container, sprint){
  if (!container || !sprint?.team) return;
  const values = ensureTeamValuesForSprint(sprint);
  const result = computeCampaignScore(sprint.team, values);

  (sprint.team.indicators || []).forEach(ind => {
    const row = container.querySelector(`tr[data-row="${ind.id}"]`);
    if (!row) return;
    const slider = row.querySelector("input[type=range]");
    if (slider && slider.value !== String(values[ind.id])) slider.value = String(values[ind.id]);
    const output = row.querySelector(`[data-output="${ind.id}"]`);
    if (output) output.textContent = formatCampPercent(values[ind.id] ?? 0);
    const pointsCell = row.querySelector(`[data-points="${ind.id}"]`);
    const rowData = result.rows.find(r => r.id === ind.id);
    if (pointsCell && rowData) pointsCell.textContent = formatCampPoints(rowData.points);
    const statusEl = row.querySelector(`[data-status="${ind.id}"]`);
    if (statusEl && rowData) {
      statusEl.textContent = rowData.statusText;
      statusEl.className = `status-pill ${rowData.statusClass}`;
    }
  });

  const presetMatch = detectPresetMatch(values, sprint.team.presets);
  setTeamPresetForSprint(sprint, presetMatch || "custom");
  const activePreset = teamPresetForSprint(sprint);
  container.querySelectorAll("[data-team-preset]").forEach(btn => {
    btn.classList.toggle("is-active", btn.dataset.teamPreset === activePreset);
  });

  const totalEl = container.querySelector("#team-total-points");
  if (totalEl) totalEl.textContent = formatCampPoints(result.totalPoints);
  const statusEl = container.querySelector("#team-status");
  if (statusEl) {
    statusEl.textContent = result.finalStatus;
    statusEl.className = `status-tag ${result.finalClass}`;
  }
  const progressBar = container.querySelector("#team-progress-bar");
  if (progressBar) progressBar.style.width = `${Math.round(result.progressPct * 100)}%`;
  const progressLabel = container.querySelector("#team-progress-label");
  if (progressLabel) progressLabel.textContent = result.progressLabel;
}

function buildIndividualSimulator(container, sprint, profile){
  if (!container || !sprint || !profile) return;
  const key = `${sprint.id}:${profile.id}`;
  if (container.dataset.profileKey === key) return;
  container.dataset.profileKey = key;

  const profiles = sprint.individual?.profiles || [];
  const presets = profile.presets || [];

  container.innerHTML = `
    <div class="sim-card__head">
      <div class="sim-card__title">
        <h5>Simulador individual</h5>
        <button type="button" class="sim-help" aria-label="Como funciona o simulador individual" data-tip="Escolha um perfil, use os presets ou ajuste manualmente. Para elegibilidade é necessário atingir 90% em cada indicador e acumular 100 pontos ou mais.">
          <i class="ti ti-info-circle"></i>
        </button>
      </div>
      <p>Simule o desempenho de um gerente considerando os mesmos pesos da campanha.</p>
      <p id="individual-description" class="sim-hint">${profile.description || ""}</p>
    </div>
    <div class="segmented seg-mini" role="tablist" id="individual-profiles">
      ${profiles.map(p => `<button type="button" class="seg-btn" data-profile="${p.id}">${p.label}</button>`).join("")}
    </div>
    <div class="sim-presets" id="individual-presets">
      ${presets.map(p => `<button type="button" class="sim-chip" data-individual-preset="${p.id}">${p.label}</button>`).join("")}
    </div>
    <table class="sim-table">
      <thead>
        <tr>
          <th>Indicador</th>
          <th>Peso</th>
          <th>Atingimento</th>
          <th>Pontos</th>
          <th>Resultado</th>
        </tr>
      </thead>
      <tbody>
        ${(profile.indicators || []).map(ind => `
          <tr data-row="${ind.id}">
            <td class="sim-indicator" data-label="Indicador">
              <strong>${ind.label}</strong>
            </td>
            <td class="sim-weight" data-label="Peso">${fmtONE.format(toNumber(ind.weight))}%</td>
            <td data-label="Atingimento">
              <div class="sim-slider">
                <input type="range" min="0" max="160" step="1" data-indicator="${ind.id}" aria-label="${ind.label}" />
                <span class="sim-slider-value" data-output="${ind.id}"></span>
              </div>
            </td>
            <td class="sim-points" data-label="Pontos" data-points="${ind.id}"></td>
            <td data-label="Resultado"><span class="status-pill" data-status="${ind.id}"></span></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
    <div class="sim-summary">
      <div class="sim-total">
        <span>Pontuação total</span>
        <strong id="individual-total-points"></strong>
      </div>
      <div class="sim-progress">
        <div class="sim-progress__track"><span id="individual-progress-bar"></span></div>
        <small id="individual-progress-label"></small>
      </div>
      <div class="sim-outcome">
        <span id="individual-status" class="status-tag"></span>
      </div>
    </div>
  `;

  container.querySelectorAll("#individual-profiles .seg-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const profileId = btn.dataset.profile;
      if (!profileId) return;
      state.campanhas.individualProfile = profileId;
      renderCampanhasView();
    });
  });

  container.querySelectorAll("input[type=range]").forEach(input => {
    input.addEventListener("input", (ev) => {
      const id = ev.currentTarget.dataset.indicator;
      const values = ensureIndividualValuesForProfile(sprint, profile);
      values[id] = toNumber(ev.currentTarget.value);
      updateIndividualSimulator(container, sprint, profile);
    });
  });

  container.querySelectorAll("[data-individual-preset]").forEach(btn => {
    btn.addEventListener("click", () => {
      const presetId = btn.dataset.individualPreset;
      const preset = presets.find(p => p.id === presetId);
      if (!preset) return;
      const values = ensureIndividualValuesForProfile(sprint, profile);
      Object.entries(preset.values || {}).forEach(([key, val]) => {
        values[key] = toNumber(val);
      });
      setIndividualPresetForProfile(sprint, profile, presetId);
      updateIndividualSimulator(container, sprint, profile);
    });
  });

}

function updateIndividualSimulator(container, sprint, profile){
  if (!container || !sprint || !profile) return;
  const values = ensureIndividualValuesForProfile(sprint, profile);
  const result = computeCampaignScore(profile, values);

  container.querySelectorAll("#individual-profiles .seg-btn").forEach(btn => {
    btn.classList.toggle("is-active", btn.dataset.profile === profile.id);
  });

  const desc = container.querySelector("#individual-description");
  if (desc) desc.textContent = profile.description || "";

  (profile.indicators || []).forEach(ind => {
    const row = container.querySelector(`tr[data-row="${ind.id}"]`);
    if (!row) return;
    const slider = row.querySelector("input[type=range]");
    if (slider && slider.value !== String(values[ind.id])) slider.value = String(values[ind.id]);
    const output = row.querySelector(`[data-output="${ind.id}"]`);
    if (output) output.textContent = formatCampPercent(values[ind.id] ?? 0);
    const rowData = result.rows.find(r => r.id === ind.id);
    const pointsCell = row.querySelector(`[data-points="${ind.id}"]`);
    if (pointsCell && rowData) pointsCell.textContent = formatCampPoints(rowData.points);
    const statusEl = row.querySelector(`[data-status="${ind.id}"]`);
    if (statusEl && rowData) {
      statusEl.textContent = rowData.statusText;
      statusEl.className = `status-pill ${rowData.statusClass}`;
    }
  });

  const presetMatch = detectPresetMatch(values, profile.presets);
  setIndividualPresetForProfile(sprint, profile, presetMatch || "custom");
  const activePreset = individualPresetForProfile(sprint, profile);
  container.querySelectorAll("[data-individual-preset]").forEach(btn => {
    btn.classList.toggle("is-active", btn.dataset.individualPreset === activePreset);
  });

  const totalEl = container.querySelector("#individual-total-points");
  if (totalEl) totalEl.textContent = formatCampPoints(result.totalPoints);
  const statusEl = container.querySelector("#individual-status");
  if (statusEl) {
    statusEl.textContent = result.finalStatus;
    statusEl.className = `status-tag ${result.finalClass}`;
  }
  const progressBar = container.querySelector("#individual-progress-bar");
  if (progressBar) progressBar.style.width = `${Math.round(result.progressPct * 100)}%`;
  const progressLabel = container.querySelector("#individual-progress-label");
  if (progressLabel) progressLabel.textContent = result.progressLabel;

}

function badgeClassFromStatus(status){
  const norm = (status || "").toLowerCase();
  if (norm.includes("parab")) return "elegibility-badge elegibility-badge--great";
  if (norm.includes("não") || norm.includes("nao")) return "elegibility-badge elegibility-badge--warn";
  if (norm.includes("ajust")) return "elegibility-badge elegibility-badge--warn";
  return "elegibility-badge elegibility-badge--ok";
}

function renderCampaignRanking(container, sprint, options = {}){
  if (!container) return;
  const rows = options.rows || [];
  if (!rows.length) {
    container.innerHTML = `<p class="muted">Nenhum resultado disponível.</p>`;
    return;
  }

  const columnLabel = options.columnLabel || "Unidade";
  const config = sprint.team;
  const body = rows.map((row, idx) => {
    const result = row.result || computeCampaignScore(config, { linhas: row.linhas, cash: row.cash, conquista: row.conquista });
    const linhas = result.rows.find(r => r.id === "linhas");
    const cash = result.rows.find(r => r.id === "cash");
    const conquista = result.rows.find(r => r.id === "conquista");
    const badgeClass = badgeClassFromStatus(row.finalStatus || result.finalStatus);
    const rank = row.rank != null ? row.rank : (idx + 1);
    return `
      <tr>
        <td class="pos-col">${rank}</td>
        <td class="regional-col">${row.name || "—"}</td>
        <td>
          <div class="indicator-bar">
            <div class="indicator-bar__track"><span style="width:${Math.min(100, (linhas?.capped || 0) / (config?.cap || 150) * 100)}%"></span></div>
            <div class="indicator-bar__value">${formatCampPercent(row.linhas)}</div>
          </div>
          <div class="indicator-bar__points">${formatCampPoints(linhas?.points || 0)}</div>
        </td>
        <td>
          <div class="indicator-bar">
            <div class="indicator-bar__track"><span style="width:${Math.min(100, (cash?.capped || 0) / (config?.cap || 150) * 100)}%"></span></div>
            <div class="indicator-bar__value">${formatCampPercent(row.cash)}</div>
          </div>
          <div class="indicator-bar__points">${formatCampPoints(cash?.points || 0)}</div>
        </td>
        <td>
          <div class="indicator-bar">
            <div class="indicator-bar__track"><span style="width:${Math.min(100, (conquista?.capped || 0) / (config?.cap || 150) * 100)}%"></span></div>
            <div class="indicator-bar__value">${formatCampPercent(row.conquista)}</div>
          </div>
          <div class="indicator-bar__points">${formatCampPoints(conquista?.points || 0)}</div>
        </td>
        <td>${formatCampPoints(result.totalPoints)}</td>
        <td>${row.atividade ? "Sim" : "Não"}</td>
        <td><span class="${badgeClass}">${row.finalStatus || result.finalStatus}</span></td>
      </tr>`;
  }).join("");

  container.innerHTML = `
    <table class="camp-ranking-table">
      <thead>
        <tr>
          <th class="pos-col">#</th>
          <th class="regional-col">${columnLabel}</th>
          <th>Linhas governamentais</th>
          <th>Cash (TPV)</th>
          <th>Abertura de contas</th>
          <th>Pontuação final</th>
          <th>Atividade comercial</th>
          <th>Elegibilidade</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>`;
}

function renderCampanhasView(){
  const host = document.getElementById("view-campanhas");
  if (!host) return;
  if (!Array.isArray(CAMPAIGN_SPRINTS) || !CAMPAIGN_SPRINTS.length) return;

  const sprint = currentSprintConfig();
  if (!sprint) return;

  const rankingContext = buildCampaignRankingContext(sprint);
  const summaryInfo = summarizeCampaignUnitResults(rankingContext.unitResults);
  const aggregatedRows = rankingContext.aggregated.slice().sort((a, b) => b.totalPoints - a.totalPoints);
  aggregatedRows.forEach((row, idx) => { row.rank = idx + 1; });

  const select = document.getElementById("campanha-sprint");
  if (select) {
    select.innerHTML = CAMPAIGN_SPRINTS.map(sp => `<option value="${sp.id}">${sp.label}</option>`).join("");
    select.value = sprint.id;
  }

  const cycleEl = document.getElementById("camp-cycle");
  if (cycleEl) cycleEl.textContent = sprint.cycle || "";

  const noteEl = document.getElementById("camp-note");
  if (noteEl) {
    const metaInfo = rankingContext.levelInfo?.meta;
    const pluralLabel = metaInfo?.plural || "unidades";
    const visibleUnits = aggregatedRows.length;
    const base = sprint.note || "";
    const suffix = visibleUnits
      ? ` Exibindo ${fmtINT.format(visibleUnits)} ${pluralLabel} filtradas.`
      : " Nenhuma unidade encontrada para o filtro atual.";
    noteEl.textContent = `${base}${suffix}`.trim();
  }

  const periodEl = document.getElementById("camp-period");
  if (periodEl) {
    const start = sprint.period?.start ? formatBRDate(sprint.period.start) : "";
    const end = sprint.period?.end ? formatBRDate(sprint.period.end) : "";
    periodEl.textContent = start && end ? `De ${start} até ${end}` : "Período não informado";
  }

  const headline = document.getElementById("camp-headline");
  if (headline) {
    headline.innerHTML = (sprint.headStats || []).map(stat => `
      <div class="camp-hero__stat">
        <span>${stat.label}</span>
        <strong>${stat.value}</strong>
        ${stat.sub ? `<small>${stat.sub}</small>` : ""}
      </div>`).join("");
  }

  const kpiGrid = document.getElementById("camp-kpis");
  if (kpiGrid) {
    const summaryData = (sprint.summary || []).map(item => {
      if (item.id === "equipes") {
        return { ...item, value: summaryInfo.elegiveis, total: summaryInfo.total };
      }
      if (item.id === "media") {
        return { ...item, value: summaryInfo.media };
      }
      if (item.id === "recorde") {
        return { ...item, value: summaryInfo.recorde, complement: summaryInfo.destaque || item.complement || "" };
      }
      return item;
    });

    kpiGrid.innerHTML = summaryData.map(item => {
      if (item.total != null) {
        return `<div class="camp-kpi"><span>${item.label}</span><strong>${fmtINT.format(item.value)} / ${fmtINT.format(item.total)}</strong><small>de ${fmtINT.format(item.total)} monitoradas</small></div>`;
      }
      if (item.unit === "pts") {
        return `<div class="camp-kpi"><span>${item.label}</span><strong>${formatCampPoints(item.value)}</strong>${item.complement ? `<small>${item.complement}</small>` : ""}</div>`;
      }
      if (item.text) {
        return `<div class="camp-kpi"><span>${item.label}</span><strong>${item.text}</strong></div>`;
      }
      return `<div class="camp-kpi"><span>${item.label}</span><strong>${fmtONE.format(item.value)}</strong>${item.complement ? `<small>${item.complement}</small>` : ""}</div>`;
    }).join("");
  }

  const teamContainer = document.getElementById("sim-equipe");
  buildTeamSimulator(teamContainer, sprint);
  updateTeamSimulator(teamContainer, sprint);

  const profiles = sprint.individual?.profiles || [];
  if (!profiles.length) state.campanhas.individualProfile = null;
  if (profiles.length && !profiles.find(p => p.id === state.campanhas.individualProfile)) {
    state.campanhas.individualProfile = profiles[0].id;
  }
  const profile = profiles.find(p => p.id === state.campanhas.individualProfile) || profiles[0] || null;
  const individualContainer = document.getElementById("sim-individual");
  buildIndividualSimulator(individualContainer, sprint, profile);
  updateIndividualSimulator(individualContainer, sprint, profile);

  const rankingContainer = document.getElementById("camp-ranking");
  const rankingDesc = document.getElementById("camp-ranking-desc");
  if (rankingDesc) {
    const meta = rankingContext.levelInfo?.meta;
    const plural = meta?.plural || "unidades";
    const pluralLabel = plural.charAt(0).toUpperCase() + plural.slice(1);
    rankingDesc.textContent = `Acompanhe a performance das ${pluralLabel} e a elegibilidade frente aos critérios mínimos.`;
  }
  renderCampaignRanking(rankingContainer, sprint, {
    rows: aggregatedRows,
    columnLabel: rankingContext.levelInfo?.meta?.singular || "Unidade"
  });
}


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
    case "gerente":
      if (f.gerente && f.gerente!=="Todos") return f.gerente;
      return CURRENT_USER_CONTEXT.gerente || "";
    case "agencia":
      if (f.agencia && f.agencia!=="Todas") return f.agencia;
      return CURRENT_USER_CONTEXT.agencia || "";
    case "gerencia":
      if (f.gerencia && f.gerencia!=="Todas") return f.gerencia;
      return CURRENT_USER_CONTEXT.gerencia || "";
    case "diretoria":
      if (f.diretoria && f.diretoria!=="Todas") return f.diretoria;
      return CURRENT_USER_CONTEXT.diretoria || "";
    default:
      return "";
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
  const labelFieldMap = { diretoria:"diretoriaNome", gerencia:"gerenciaNome", agencia:"agenciaNome", gerente:"gerenteNome" };
  const labelField = labelFieldMap[level] || k;
  const map = new Map();
  rows.forEach(r=>{
    const key=r[k] || "—";
    const label = r[labelField] || key;
    const obj = map.get(key) || { unidade:key, label, real_mens:0, meta_mens:0, real_acum:0, meta_acum:0, qtd:0 };
    obj.label = label;
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

  if (myUnit && myIndexFull >= 0 && !dataClamped.some(r => r.unidade === myUnit)) {
    dataClamped.push(data[myIndexFull]);
  }

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
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tb = tbl.querySelector("tbody");

  dataClamped.forEach((r,idx)=>{
    const fullIndex = data.findIndex(d => d.unidade === r.unidade);
    const rankNumber = fullIndex >= 0 ? (fullIndex + 1) : (idx + 1);
    const isMine = (myUnit && r.unidade === myUnit);
    const rawName = r.label || r.unidade || "—";
    const visibleName = isMine ? rawName : "*****";
    const nomeSafe = escapeHTML(visibleName);
    const titleSafe = escapeHTML(isMine ? rawName : "Participante oculto");
    const ating = state.rk.mode === "acumulado" ? r.ating_acum : r.ating_mens;

    const tr = document.createElement("tr");
    tr.className = `rk-row ${isMine? "rk-row--mine":""}`;
    tr.innerHTML = `
      <td class="pos-col">${rankNumber}</td>
      <td class="unit-col rk-name" title="${titleSafe}">${nomeSafe}</td>
      <td>${r.p_mens.toFixed(1)}</td>
      <td>${r.p_acum.toFixed(1)}</td>
      <td><span class="att-badge ${ating*100<50?"att-low":(ating*100<100?"att-warn":"att-ok")}">${(ating*100).toFixed(1)}%</span></td>
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
  const defas = (real,meta)=>{ const d=(real||0)-(meta||0); const cls=d>=0?"def-pos":"def-neg"; const full=fmtBRL.format(Math.round(d)); const display=formatBRLReadable(d); return `<span class="def-badge ${cls}" title="${full}">${display}</span>`; }

  const buildDetailTableHTML = (groups=[]) => {
    if (!groups || !groups.length) return "";
    const fmtDate = iso => (iso ? formatBRDate(iso) : "—");
    const rows = groups.map(g => `
      <tr>
        <td>${g.canal || "—"}</td>
        <td>${g.tipo || "—"}</td>
        <td>${g.gerente || "—"}</td>
        <td>${g.modalidade || "—"}</td>
        <td>${fmtDate(g.dataVencimento)}</td>
        <td>${fmtDate(g.dataCancelamento)}</td>
        <td>${g.motivoCancelamento || "—"}</td>
      </tr>`).join("");
    return `
      <div class="tree-detail-wrapper">
        <table class="detail-table">
          <thead>
            <tr>
              <th>Canal da venda</th>
              <th>Tipo da venda</th>
              <th>Gerente</th>
              <th>Condição de pagamento</th>
              <th>Data de vencimento</th>
              <th>Data de cancelamento</th>
              <th>Motivo do cancelamento</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  };

  function renderNode(node, parentId=null, parentTrail=[]){
    const id=mkId(), has=!!(node.children&&node.children.length);
    const tr=document.createElement("tr");
    tr.className=`tree-row ${node.type==="contrato"?"type-contrato":""} lvl-${node.level}`;
    tr.dataset.id=id; if(parentId) tr.dataset.parent=parentId;
    const trail=[...parentTrail, node.label];
    const hasDetails = node.type === "contrato" && Array.isArray(node.detailGroups) && node.detailGroups.length > 0;
    let detailTr=null;

    if (hasDetails) tr.classList.add("has-detail");

    const labelBase = (node.type === "contrato" || !node.detail?.gerente)
      ? node.label
      : `Gerente: ${node.detail.gerente}`;
    const labelHtml = node.detail
      ? `<div class="tree-label"><span class="label-strong">${labelBase}</span></div>`
      : `<span class="label-strong">${node.label}</span>`;

    const qtyFull = fmtINT.format(Math.round(node.qtd || 0));
    const qtyDisplay = formatIntReadable(node.qtd || 0);
    const realizadoFull = fmtBRL.format(Math.round(node.realizado || 0));
    const realizadoDisplay = formatBRLReadable(node.realizado || 0);
    const metaFull = fmtBRL.format(Math.round(node.meta || 0));
    const metaDisplay = formatBRLReadable(node.meta || 0);

    tr.innerHTML=`
      <td><div class="tree-cell">
        <button class="toggle" type="button" ${has?"":"disabled"} aria-label="${has?"Expandir/colapsar":""}"><i class="ti ${has?"ti-chevron-right":"ti-dot"}"></i></button>
        ${labelHtml}</div></td>
      <td><span title="${qtyFull}">${qtyDisplay}</span></td>
      <td><span title="${realizadoFull}">${realizadoDisplay}</span></td>
      <td><span title="${metaFull}">${metaDisplay}</span></td>
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

    if (hasDetails){
      detailTr=document.createElement("tr");
      detailTr.className="tree-row tree-detail-row";
      detailTr.dataset.detailParent=id;
      detailTr.style.display="none";
      detailTr.innerHTML=`<td colspan="8">${buildDetailTableHTML(node.detailGroups)}</td>`;
      tbody.appendChild(detailTr);

      tr.addEventListener("click", (ev)=>{
        if (ev.target.closest('.toggle') || ev.target.closest('.icon-btn')) return;
        const open = detailTr.style.display === "table-row";
        if (open){
          detailTr.style.display="none";
          tr.classList.remove("is-detail-open");
        } else {
          detailTr.style.display="table-row";
          tr.classList.add("is-detail-open");
        }
      });
    }

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
    if(!show){
      const detail=tbody.querySelector(`tr.tree-detail-row[data-detail-parent="${parentId}"]`);
      if(detail){
        detail.style.display="none";
        const parentRow=tbody.querySelector(`tr[data-id="${parentId}"]`);
        parentRow?.classList.remove("is-detail-open");
      }
    }
  }

  nodes.forEach(n=>renderNode(n,null,[]));
}
function applyFiltersAndRender(){
  if(state.tableRendered) renderTreeTable();
  if (state.activeView === "campanhas") renderCampanhasView();
}
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
    updateContractAutocomplete();

    const right = document.getElementById("lbl-atualizacao");
    if(right){
      right.innerHTML = `
        <div class="period-inline">
          <span class="txt">
            De
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
    if (state.activeView==="campanhas") renderCampanhasView();

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
  initMobileCarousel();
  wireClearFiltersButton();
  ensureStatusFilterInAdvanced();
  reorderFiltersUI();
  refresh();
  ensureChatWidget();
})();
