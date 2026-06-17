const state = {
  firebaseApp: null,
  firebaseRef: null,
  googleSheetsTimer: null,
  googleSheetsFalhou: false,
  lastSignature: ''
};

const $ = selector => document.querySelector(selector);

function iniciarPainel() {
  aplicarAssets();
  renderizarDashboard(montarDashboardLocal());

  if (!iniciarGoogleSheetsTempoReal()) {
    iniciarFirebaseTempoReal();
  }
}

function aplicarAssets() {
  const logo = $('#logoUnifahe');
  if (logo && CONFIG.assets?.logo) {
    logo.src = CONFIG.assets.logo;
  }
}

function iniciarGoogleSheetsTempoReal() {
  const cfg = CONFIG.googleSheets || {};
  if (!cfg.habilitado || !String(cfg.url || '').trim()) return false;

  carregarDadosGoogleSheets();

  const intervalo = Math.max(3000, pegarInteiro(cfg.intervaloAtualizacao || 10000));
  state.googleSheetsTimer = setInterval(carregarDadosGoogleSheets, intervalo);

  return true;
}

async function carregarDadosGoogleSheets() {
  const cfg = CONFIG.googleSheets || {};
  const url = montarUrlGoogleSheets(cfg.url);

  try {
    let payload;

    try {
      const response = await fetch(url, { cache: 'no-store', redirect: 'follow' });

      if (!response.ok) {
        throw new Error(`Resposta HTTP ${response.status}`);
      }

      payload = await response.json();
    } catch (fetchError) {
      // Apps Script pode bloquear fetch por CORS/redirecionamento em sites estáticos.
      // O fallback JSONP resolve esse caso quando o script do Sheets aceita ?callback=.
      payload = await carregarDadosGoogleSheetsJsonp(cfg.url);
    }

    window.__DADOS_GOOGLE_SHEETS__ = payload;
    const dashboard = obterDashboardNormalizado(payload);

    if (!dashboard) {
      throw new Error('JSON recebido em formato inválido. Confira os cabeçalhos da aba DadosSite.');
    }

    state.googleSheetsFalhou = false;
    renderizarDashboard(dashboard);
  } catch (error) {
    if (!state.googleSheetsFalhou) {
      console.warn('Não foi possível carregar os dados do Google Sheets. Mantendo dados locais na tela.', error);
      state.googleSheetsFalhou = true;
    }
  }
}

function montarUrlGoogleSheets(urlBase, params = {}) {
  const url = String(urlBase || '').trim();
  const separador = url.includes('?') ? '&' : '?';
  const query = new URLSearchParams({ t: Date.now(), ...params }).toString();
  return `${url}${separador}${query}`;
}

function carregarDadosGoogleSheetsJsonp(urlBase) {
  return new Promise((resolve, reject) => {
    const callbackName = `roundSheetsCallback_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const script = document.createElement('script');
    let timer;

    window[callbackName] = data => {
      clearTimeout(timer);
      script.remove();
      delete window[callbackName];
      resolve(data);
    };

    script.onerror = () => {
      clearTimeout(timer);
      script.remove();
      delete window[callbackName];
      reject(new Error('Falha ao carregar JSONP do Google Sheets.'));
    };

    timer = setTimeout(() => {
      script.remove();
      delete window[callbackName];
      reject(new Error('Tempo esgotado ao buscar dados do Google Sheets.'));
    }, 12000);

    script.src = montarUrlGoogleSheets(urlBase, { callback: callbackName });
    document.head.appendChild(script);
  });
}

function iniciarFirebaseTempoReal() {
  const cfg = CONFIG.firebase || {};
  if (!firebaseConfigurado(cfg)) return false;
  if (!window.firebase || !window.firebase.initializeApp || !window.firebase.database) return false;

  try {
    const firebaseConfig = {
      apiKey: cfg.apiKey,
      authDomain: cfg.authDomain,
      databaseURL: cfg.databaseURL,
      projectId: cfg.projectId,
      storageBucket: cfg.storageBucket,
      messagingSenderId: cfg.messagingSenderId,
      appId: cfg.appId
    };

    state.firebaseApp = window.firebase.apps && window.firebase.apps.length
      ? window.firebase.app()
      : window.firebase.initializeApp(firebaseConfig);

    state.firebaseRef = window.firebase
      .database(state.firebaseApp)
      .ref(String(cfg.caminhoDashboard || 'round6/dashboard').replace(/^\/+|\/+$/g, ''));

    state.firebaseRef.on('value', snapshot => {
      const dashboard = obterDashboardNormalizado(snapshot.val()) || montarDashboardLocal();
      renderizarDashboard(dashboard);
    }, error => {
      console.warn('Não foi possível carregar os dados em tempo real.', error);
      renderizarDashboard(montarDashboardLocal());
    });

    return true;
  } catch (error) {
    console.warn('Não foi possível iniciar o painel em tempo real.', error);
    renderizarDashboard(montarDashboardLocal());
    return false;
  }
}

function firebaseConfigurado(cfg) {
  if (!cfg || cfg.habilitado !== true) return false;
  return Boolean(
    String(cfg.apiKey || '').trim() &&
    String(cfg.databaseURL || '').trim() &&
    String(cfg.appId || '').trim()
  );
}

function obterDashboardNormalizado(data) {
  if (!data || typeof data !== 'object') return null;
  const payload =
    data.dashboard && typeof data.dashboard === 'object' ? data.dashboard :
    data.data && typeof data.data === 'object' ? data.data :
    data.resultado && typeof data.resultado === 'object' ? data.resultado :
    data;

  if (Array.isArray(payload.baias)) {
    return normalizarDashboardBaias(payload.baias);
  }

  if (Array.isArray(payload.times)) {
    return normalizarDashboardBaias(payload.times);
  }

  if (Array.isArray(payload.equipes)) {
    return normalizarDashboardBaias(payload.equipes);
  }

  if (Array.isArray(payload.vendas)) {
    return calcularDashboardPorVendas(payload.vendas);
  }

  return null;
}

function normalizarDashboardBaias(baiasFonte) {
  const baias = CONFIG.baias.map(baiaConfig => {
    const origem = baiasFonte.find(item => compararBaia(
      item.id ?? item.id_baia ?? item.idBaia ?? item.baia_id ?? item.nome ?? item.baia ?? item.time ?? item.equipe,
      baiaConfig
    )) || {};
    const realizado = pegarNumero(
      origem.realizado ??
      origem.faturado ??
      origem.faturadas ??
      origem.quitadas ??
      origem.matriculasQuitadas ??
      origem.matrículasQuitadas ??
      origem.cartao ??
      origem.cartão ??
      origem.cartoes ??
      origem.cartões ??
      origem.totalFaturado ??
      origem.valorCartao ??
      origem.valorCartão ??
      origem.valorTotal ??
      origem.totalVendido ??
      origem.total ??
      origem.valor ??
      0
    );

    const boletos = pegarInteiro(origem.boletos ?? origem.boleto ?? origem.totalBoletos ?? origem.matriculasBoleto ?? origem.matrículasBoleto ?? 0);
    const vendasConfirmadas = pegarInteiro(origem.vendasConfirmadas ?? origem.quantidade ?? origem.qtd ?? origem.vendas ?? origem.totalVendas ?? origem.totalQuantidade ?? 0);
    const pontos = pegarInteiro(origem.pontos ?? origem.gols ?? origem.pontuacao ?? origem.pontuação ?? origem.score ?? 0);

    return montarBaiaVisual(baiaConfig, {
      realizado,
      boletos,
      vendasConfirmadas,
      pontos,
      membros: origem.membros || origem.vendedores || origem.consultores || []
    });
  });

  return montarResumoDashboard(baias);
}

function calcularDashboardPorVendas(vendas) {
  const acumulado = CONFIG.baias.reduce((acc, baia) => {
    acc[baia.id] = { realizado: 0, boletos: 0, vendasConfirmadas: 0, membros: {} };
    return acc;
  }, {});

  (vendas || []).forEach(registro => {
    if (!vendaConfirmada(registro)) return;

    const baiaNome = registro.baia ?? registro.time ?? registro.equipe ?? registro.baiaNome ?? registro.baia_id ?? registro.id;
    const baia = encontrarBaiaPorId(baiaNome) || encontrarBaiaPorNome(baiaNome);
    if (!baia) return;

    const atual = acumulado[baia.id];
    const valorVenda = Math.max(0, pegarNumero(registro.valorTotal ?? registro.valor ?? registro.realizado ?? registro.total ?? registro.venda ?? 0));
    const boletosVenda = contarBoletos(registro.boletos ?? registro.boleto ?? registro.temBoleto ?? registro.pagamento);
    const qtdVenda = pegarInteiro(registro.quantidade ?? registro.qtd ?? 1) || 1;

    atual.realizado += valorVenda;
    atual.boletos += boletosVenda;
    atual.vendasConfirmadas += qtdVenda;

    const nomeMembro = registro.vendedor ?? registro.consultor ?? registro.membro ?? registro.nomeVendedor ?? registro.nome ?? '';
    const membro = encontrarMembroNaBaia(nomeMembro, baia);
    if (membro) {
      const chave = normalizar(membro.nome);
      atual.membros[chave] = atual.membros[chave] || { nome: membro.nome, realizado: 0, boletos: 0, vendasConfirmadas: 0 };
      atual.membros[chave].realizado += valorVenda;
      atual.membros[chave].boletos += boletosVenda;
      atual.membros[chave].vendasConfirmadas += qtdVenda;
    }
  });

  const baias = CONFIG.baias.map(baia => montarBaiaVisual(baia, acumulado[baia.id] || {}));
  return montarResumoDashboard(baias);
}

function montarDashboardLocal() {
  const baias = CONFIG.baias.map(baia => montarBaiaVisual(baia, {
    realizado: baia.realizado || 0,
    boletos: baia.boletos || 0,
    vendasConfirmadas: baia.vendasConfirmadas || 0
  }));

  return montarResumoDashboard(baias);
}

function montarBaiaVisual(baiaConfig, dados = {}) {
  const dadosMembros = normalizarDadosMembros(dados.membros || {});
  const membros = (baiaConfig.membros || []).map(membro => {
    const origem = dadosMembros[normalizar(membro.nome)] || {};
    const membroVisual = {
      ...membro,
      baiaId: baiaConfig.id,
      foto: membro.foto || CONFIG.assets.placeholderFoto,
      realizado: pegarNumero(origem.realizado ?? origem.faturado ?? origem.total ?? membro.realizado ?? membro.faturado ?? 0),
      boletos: pegarInteiro(origem.boletos ?? origem.boleto ?? membro.boletos ?? membro.boleto ?? 0),
      vendasConfirmadas: pegarInteiro(origem.vendasConfirmadas ?? origem.quantidade ?? origem.qtd ?? origem.vendas ?? membro.vendasConfirmadas ?? membro.quantidade ?? membro.qtd ?? membro.vendas ?? 0),
      situacao: 'vivo'
    };

    membroVisual.gols = calcularPontos(membroVisual, origem.gols ?? origem.pontos ?? origem.pontuacao ?? origem.pontuação ?? membro.gols ?? membro.pontos);
    return membroVisual;
  });

  const realizado = pegarNumero(dados.realizado);
  const boletos = pegarInteiro(dados.boletos);
  const vendasConfirmadas = pegarInteiro(dados.vendasConfirmadas);

  return {
    ...baiaConfig,
    membros,
    realizado,
    boletos,
    vendasConfirmadas,
    pontos: calcularPontos({ realizado, boletos, vendasConfirmadas }, dados.pontos ?? dados.gols ?? dados.pontuacao ?? dados.pontuação ?? baiaConfig.pontos),
    vivos: membros.length,
    emRisco: 0,
    eliminados: 0
  };
}

function montarResumoDashboard(baias) {
  const ranking = [...baias].sort((a, b) => {
    if (b.pontos !== a.pontos) return b.pontos - a.pontos;
    if (b.vendasConfirmadas !== a.vendasConfirmadas) return b.vendasConfirmadas - a.vendasConfirmadas;
    return b.boletos - a.boletos;
  });

  return {
    baias,
    ranking,
    totalRealizado: baias.reduce((sum, b) => sum + b.realizado, 0),
    vendasConfirmadas: baias.reduce((sum, b) => sum + b.vendasConfirmadas, 0),
    boletos: baias.reduce((sum, b) => sum + b.boletos, 0)
  };
}

function renderizarDashboard(data) {
  const assinatura = JSON.stringify((data?.baias || []).map(baia => ({
    id: baia.id,
    realizado: baia.realizado,
    boletos: baia.boletos,
    vendasConfirmadas: baia.vendasConfirmadas,
    pontos: baia.pontos,
    membros: (baia.membros || []).map(membro => ({ nome: membro.nome, gols: membro.gols }))
  })));

  if (assinatura === state.lastSignature) return;
  state.lastSignature = assinatura;
  renderizarBaias(data?.baias || []);
  renderizarRankingBaias(data?.ranking || data?.baias || []);
}

function renderizarRankingBaias(ranking) {
  const container = $('#rankingBaiasContainer');
  if (!container) return;

  container.innerHTML = (ranking || [])
    .map((baia, index) => templateRankingBaia(baia, index + 1))
    .join('');
}

function templateRankingBaia(baia, posicao) {
  const classePosicao = posicao <= 3 ? 'rank-top' : '';

  return `
    <article class="rank-row" data-baia="${escapeHTML(baia.id)}" aria-label="${escapeHTML(posicao + 'º lugar - ' + baia.nome)}">
      <div class="rank-pos ${classePosicao}">${posicao}</div>
      <img class="rank-logo" src="${escapeHTML(baia.logo)}" alt="${escapeHTML(baia.nome)}">
      <div class="rank-info">
        <strong>${escapeHTML(baia.nome)}</strong>
        <span>${baia.boletos || 0} boletos · ${baia.vendasConfirmadas || 0} qtd. · <b>${dinheiro(baia.realizado)}</b></span>
      </div>
      <strong class="rank-value">${baia.pontos || 0}<small>pontos</small></strong>
    </article>
  `;
}

function renderizarBaias(baias) {
  const container = $('#baiasContainer');
  if (!container) return;

  container.innerHTML = baias.map(baia => templateBaiaCard(baia)).join('');
}

function templateBaiaCard(baia) {
  const membros = normalizarQuatroMembros(baia.membros || []);
  const confrontoA = membros.slice(0, 2);
  const confrontoB = membros.slice(2, 4);

  return `
    <article class="team-card" data-baia="${escapeHTML(baia.id)}" aria-label="${escapeHTML(baia.nome)}">
      <div class="team-left">
        <img class="team-logo" src="${escapeHTML(baia.logo)}" alt="${escapeHTML(baia.nome)}">
      </div>

      <div class="team-members">
        <div class="duplas-board confrontos-board" aria-label="Disputa interna da baia ${escapeHTML(baia.nome)}">
          ${templateConfronto(confrontoA[0], confrontoA[1], 'CONFRONTO 1')}
          ${templateConfronto(confrontoB[0], confrontoB[1], 'CONFRONTO 2')}
        </div>
      </div>
    </article>
  `;
}

function templateConfronto(memberA, memberB, label) {
  const golsA = pegarInteiro(memberA?.gols);
  const golsB = pegarInteiro(memberB?.gols);

  return `
    <div class="versus-row">
      ${templateMembro(memberA)}
      <div class="versus-score"><small>${label}</small><strong>${golsA} × ${golsB}</strong></div>
      ${templateMembro(memberB)}
    </div>
  `;
}

function templateMembro(member) {
  const foto = member.foto || CONFIG.assets.placeholderFoto;
  const gols = pegarInteiro(member.gols);

  return `
    <div class="member member-live" title="${escapeHTML(member.nome)}">
      <div class="member-photo-wrap">
        <img src="${escapeHTML(foto)}" alt="${escapeHTML(member.nome)}" onerror="this.src='${CONFIG.assets.placeholderFoto}'">
        <b class="member-goals">${gols}</b>
      </div>
      <span>${escapeHTML(primeiroNome(member.nome))}</span>
    </div>
  `;
}


function normalizarQuatroMembros(membros) {
  const lista = [...membros];
  while (lista.length < 4) {
    lista.push({ nome: 'A definir', foto: CONFIG.assets.placeholderFoto, gols: 0 });
  }
  return lista.slice(0, 4);
}

function somarGolsDupla(membros) {
  return membros.reduce((total, membro) => total + pegarInteiro(membro.gols), 0);
}

function normalizarDadosMembros(membros) {
  if (Array.isArray(membros)) {
    return membros.reduce((acc, membro) => {
      const nome = membro.nome ?? membro.vendedor ?? membro.consultor ?? membro.membro ?? '';
      if (nome) acc[normalizar(nome)] = membro;
      return acc;
    }, {});
  }

  if (membros && typeof membros === 'object') {
    return Object.entries(membros).reduce((acc, [nome, dados]) => {
      if (dados && typeof dados === 'object') {
        const nomeMembro = dados.nome ?? nome;
        acc[normalizar(nomeMembro)] = { ...dados, nome: nomeMembro };
      }
      return acc;
    }, {});
  }

  return {};
}

function encontrarMembroNaBaia(nome, baia) {
  const normalizado = normalizar(nome);
  if (!normalizado) return null;
  return (baia.membros || []).find(membro => normalizar(membro.nome) === normalizado);
}

function calcularPontos(item, pontosInformados) {
  const pontos = pegarInteiro(pontosInformados);
  if (pontos > 0) return pontos;

  const vendas = pegarInteiro(item?.vendasConfirmadas ?? item?.quantidade ?? item?.qtd ?? item?.vendas ?? 0);
  const boletos = pegarInteiro(item?.boletos ?? item?.boleto ?? 0);
  const quitadas = Math.max(0, vendas - boletos);
  return (quitadas * 2) + boletos;
}

function encontrarBaiaPorId(id) {
  const normalizado = normalizar(id);
  return CONFIG.baias.find(baia => normalizar(baia.id) === normalizado);
}

function encontrarBaiaPorNome(nome) {
  const normalizado = normalizar(nome);
  return CONFIG.baias.find(baia => normalizar(baia.nome) === normalizado || normalizar(baia.id) === normalizado);
}

function compararBaia(nomeBaiaVenda, baiaConfig) {
  const venda = normalizar(nomeBaiaVenda);
  return venda === normalizar(baiaConfig.nome) || venda === normalizar(baiaConfig.id);
}

function vendaConfirmada(registro) {
  const status = normalizar(registro?.status ?? registro?.situacao ?? registro?.pagamento ?? '');
  if (!status) return true;

  const validos = ['quitado', 'cartao', 'cartão', 'pago', 'paga', 'aprovado', 'aprovada', 'confirmado', 'confirmada', 'sim'];
  return validos.some(item => status.includes(normalizar(item)));
}

function contarBoletos(value) {
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number') return Math.max(0, Math.floor(value));

  const texto = normalizar(value);
  if (!texto || texto === 'nao' || texto === 'não' || texto === 'false' || texto === '0') return 0;
  if (texto.includes('boleto') || texto === 'sim' || texto === 'true' || texto === '1') return 1;

  const numero = pegarInteiro(value);
  return numero > 0 ? numero : 0;
}

function pegarInteiro(value) {
  return Math.max(0, Math.floor(pegarNumero(value)));
}

function pegarNumero(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (value === null || value === undefined) return 0;

  let texto = String(value).trim();
  if (!texto) return 0;

  texto = texto.replace(/R\$/gi, '').replace(/\s/g, '');

  if (texto.includes(',') && texto.includes('.')) {
    texto = texto.replace(/\./g, '').replace(',', '.');
  } else if (texto.includes(',')) {
    texto = texto.replace(',', '.');
  }

  const numero = Number(texto.replace(/[^\d.-]/g, ''));
  return Number.isFinite(numero) ? numero : 0;
}

function dinheiro(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function primeiroNome(nome) {
  return String(nome || '').trim().split(/\s+/)[0] || 'Membro';
}

function normalizar(value) {
  return String(value ?? '')
    .replace(/[​-‍﻿]/g, '')
    .replace(/ /g, ' ')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHTML(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', iniciarPainel);
