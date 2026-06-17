/*
  ROUND 1 UNIFAHE — CONFIGURAÇÃO DO PAINEL
  ----------------------------------------
  Painel conectado ao Google Sheets via Apps Script.
  As baias são renderizadas a partir desta configuração e atualizadas pela URL /exec.
*/

const CONFIG = {
  campanha: 'ROUND 1 UNIFAHE',
  subtitulo: 'COMPETIÇÃO DIÁRIA',
  dataFinal: '2026-06-14T23:59:59-03:00',
  horaFechamento: '23:59',
  metaCofre: 0,

  googleSheets: {
    habilitado: true,
    url: 'https://script.google.com/macros/s/AKfycbxCUgczI5u-Xhu4XlxIavdZCto9dNSrM0L0LFcIB9xrOgS4n0YppE6nLx1jrdBLXKU/exec',
    intervaloAtualizacao: 10000
  },

  firebase: {
    habilitado: false
  },

  assets: {
    logo: 'assets/logo/logo-unifahe-topo.png',
    placeholderFoto: 'assets/membros/leticia-vieira.jpg'
  },

  baias: [
    {
      id: 'predadores',
      nome: 'PREDADORES',
      logo: 'assets/baias/predadores.jpeg',
      status: 'EM JOGO',
      membros: [
        { nome: 'A definir 1', foto: '' },
        { nome: 'A definir 2', foto: '' },
        { nome: 'A definir 3', foto: '' },
        { nome: 'A definir 4', foto: '' }
      ]
    },
    {
      id: 'invictus',
      nome: 'INVICTUS',
      logo: 'assets/baias/invictus.jpeg',
      status: 'EM JOGO',
      membros: [
        { nome: 'Letícia Goretti', foto: 'assets/membros/leticia-goretti.jpg' },
        { nome: 'Ana Kelly', foto: 'assets/membros/ana-kelly.jpg' },
        { nome: 'Ana Luiza', foto: 'assets/membros/ana-luiza.jpg' },
        { nome: 'Letícia Pereira', foto: 'assets/membros/leticia-pereira.jpg' }
      ]
    },
    {
      id: 'evolution',
      nome: 'EVOLUTION',
      logo: 'assets/baias/evolution.jpeg',
      status: 'EM JOGO',
      membros: [
        { nome: 'Cauê Galates', foto: 'assets/membros/caue-galates.jpg' },
        { nome: 'Lara Batista', foto: 'assets/membros/lara-batista.jpg' },
        { nome: 'Daniele Moura', foto: 'assets/membros/daniele-moura.jpg' },
        { nome: 'Letícia Vieira', foto: 'assets/membros/leticia-vieira.jpg' }
      ]
    },
    {
      id: 'vip',
      nome: 'VIP',
      logo: 'assets/baias/vip.jpeg',
      status: 'EM JOGO',
      membros: [
        { nome: 'Maria Laura', foto: 'assets/membros/maria-laura.jpg' },
        { nome: 'Gabriel Gorgonio', foto: 'assets/membros/gabriel-gorgonio.jpg' },
        { nome: 'Raissa Fontoura', foto: 'assets/membros/raissa-fontoura.jpg' },
        { nome: 'Rodolfo Henrique', foto: 'assets/membros/rodolfo-henrique.jpg' }
      ]
    },
    {
      id: 'winx',
      nome: 'WINX',
      logo: 'assets/baias/winx.jpeg',
      status: 'EM JOGO',
      membros: [
        { nome: 'Vinícius Ribeiro', foto: '' },
        { nome: 'Gabrielle Carvalho', foto: '' },
        { nome: 'Melissa Ferreira', foto: '' },
        { nome: 'Kevin Cristovão', foto: '' }
      ]
    },
    {
      id: 'alfas',
      nome: 'ALFAS',
      logo: 'assets/baias/alfas.jpeg',
      status: 'EM JOGO',
      membros: [
        { nome: 'Fabiana Godoy', foto: 'assets/membros/fabiana-godoy.jpg' },
        { nome: 'Bruna Moraes', foto: 'assets/membros/bruna-moraes.jpg' },
        { nome: 'Nathália', foto: 'assets/membros/nathalia.jpg' },
        { nome: 'Gabrielle Andrade', foto: 'assets/membros/gabrielle-andrade.jpg' }
      ]
    },
    {
      id: 'goat',
      nome: 'GOAT',
      logo: 'assets/baias/goat.jpeg',
      status: 'EM JOGO',
      membros: [
        { nome: 'Beatriz Cunha', foto: 'assets/membros/beatriz-cunha.jpg' },
        { nome: 'Lucas Eduardo', foto: 'assets/membros/lucas-eduardo.jpg' },
        { nome: 'Alana Santos', foto: '' },
        { nome: 'Eduardo Rogério', foto: 'assets/membros/eduardo-rogerio.jpg' }
      ]
    }
  ]
};
