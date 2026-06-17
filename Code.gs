function doGet(e) {
  const callback = e && e.parameter && e.parameter.callback;
  const data = montarResposta();
  const json = JSON.stringify(data);

  if (callback) {
    const nomeCallback = String(callback).replace(/[^a-zA-Z0-9_$\.]/g, "");
    return ContentService
      .createTextOutput(nomeCallback + "(" + json + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function montarResposta() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("DadosSite");

  if (!sheet) {
    return {
      erro: true,
      mensagem: "Aba DadosSite não encontrada.",
      baias: []
    };
  }

  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    return {
      updatedAt: new Date().toISOString(),
      baias: []
    };
  }

  const headers = values[0].map(limparChave);
  const rows = values.slice(1);
  const baiasMap = {};

  rows.forEach(row => {
    const item = {};

    headers.forEach((header, index) => {
      item[header] = row[index];
    });

    const idBaia = limparIdBaia(campo(item, [
      "id_baia", "idbaia", "baia", "time", "equipe", "id"
    ]));

    if (!idBaia) return;

    if (!baiasMap[idBaia]) {
      baiasMap[idBaia] = {
        id: idBaia,
        realizado: 0,
        boletos: 0,
        vendasConfirmadas: 0,
        pontos: 0,
        membros: []
      };
    }

    // Soma todas as linhas da mesma baia.
    // Exemplo: VIP com 4 linhas vira 1 total consolidado no site.
    baiasMap[idBaia].realizado += numero(campo(item, [
      "faturado", "faturadas", "quitado", "quitadas", "cartao", "cartoes", "cartão", "cartões", "realizado"
    ]));

    baiasMap[idBaia].boletos += numero(campo(item, [
      "boletos", "boleto"
    ]));

    baiasMap[idBaia].vendasConfirmadas += numero(campo(item, [
      "vendas", "quantidade", "qtd", "totalvendas", "totalquantidade"
    ]));

    baiasMap[idBaia].pontos += numero(campo(item, [
      "pontos", "pontuacao", "pontuação"
    ]));

    const membro = texto(campo(item, [
      "membro", "vendedor", "consultor", "nome"
    ]));

    if (membro) {
      baiasMap[idBaia].membros.push({
        nome: membro,
        gols: numero(campo(item, ["gols", "gol"])),
        faturado: numero(campo(item, ["faturado", "faturadas", "quitado", "quitadas", "cartao", "cartoes", "cartão", "cartões", "realizado"])),
        boletos: numero(campo(item, ["boletos", "boleto"])),
        vendasConfirmadas: numero(campo(item, ["vendas", "quantidade", "qtd"])),
        pontos: numero(campo(item, ["pontos", "pontuacao", "pontuação"]))
      });
    }
  });

  return {
    updatedAt: new Date().toISOString(),
    baias: Object.values(baiasMap)
  };
}

function campo(item, nomes) {
  for (const nome of nomes) {
    const chave = limparChave(nome);
    if (item[chave] !== undefined && item[chave] !== "") return item[chave];
  }
  return "";
}

function limparChave(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u00A0/g, " ")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "")
    .trim();
}

function limparIdBaia(valor) {
  const id = texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();

  const mapa = {
    "baia vip": "vip",
    "baiavip": "vip",
    "vip": "vip",
    "evolution": "evolution",
    "invictus": "invictus",
    "predadores": "predadores",
    "winx": "winx",
    "alfas": "alfas",
    "goat": "goat"
  };

  return mapa[id] || id;
}

function texto(valor) {
  return String(valor || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function numero(valor) {
  if (valor === null || valor === undefined || valor === "") return 0;
  if (typeof valor === "number") return valor;

  return Number(
    String(valor)
      .replace("R$", "")
      .replace(/\./g, "")
      .replace(",", ".")
      .replace(/[^0-9.-]/g, "")
      .trim()
  ) || 0;
}