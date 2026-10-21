// Meu Clima - Partes 1 e 2: consultas meteorológicas e histórico de logs.

// SUBSTITUA pela sua matrícula acadêmica antes de publicar.
const MATRICULA = '468866';
const API_LOGS = 'https://www.piway.com.br/unoesc/api';

async function registrarLog(api, metodo, resultado) {
  if (MATRICULA === '468866') return;
  const partes = [MATRICULA, api, metodo, String(resultado)].map(encodeURIComponent);
  try {
    const resposta = await fetch(`${API_LOGS}/inserir/log/${partes.join('/')}`);
    if (!resposta.ok) throw new Error('Erro ao registrar log');
  } catch (erro) {
    console.error('Não foi possível registrar o log:', erro);
  }
}

function obterIdLog(log) {
  return log.id ?? log.idlog ?? log.id_log ?? log.IDLOG ?? log.ID ?? null;
}

async function exibirLogs() {
  const lista = document.getElementById('listaLogs');
  lista.textContent = 'Carregando histórico...';
  if (MATRICULA === 'COLOQUE_SUA_MATRICULA_AQUI) {
    lista.textContent = 'Configure sua matrícula no script.js.';
    return;
  }
  try {
    const resposta = await fetch(`${API_LOGS}/logs/${encodeURIComponent(MATRICULA)}`);
    if (!resposta.ok) throw new Error('Não foi possível consultar os logs.');
    const dados = await resposta.json();
    const logs = Array.isArray(dados) ? dados : (dados.logs || dados.data || dados.resultado || []);
    if (!Array.isArray(logs)) throw new Error('Formato de resposta inesperado.');
    lista.replaceChildren();
    if (!logs.length) { lista.textContent = 'Nenhum log registrado.'; return; }
    for (const log of logs) {
      const linha = document.createElement('div');
      linha.className = 'border rounded p-3 mb-2';
      const texto = document.createElement('div');
      texto.className = 'small mb-2';
      texto.textContent = typeof log === 'object' ? Object.entries(log).map(([chave, valor]) => `${chave}: ${valor}`).join(' | ') : String(log);
      linha.appendChild(texto);
      const id = typeof log === 'object' ? obterIdLog(log) : null;
      if (id != null) {
        const botao = document.createElement('button');
        botao.type = 'button';
        botao.className = 'btn btn-outline-danger btn-sm';
        botao.textContent = 'Excluir';
        botao.addEventListener('click', () => excluirLog(id));
        linha.appendChild(botao);
      }
      lista.appendChild(linha);
    }
  } catch (erro) { lista.textContent = erro.message; }
}

async function excluirLog(id) {
  try {
    const url = `${API_LOGS}/excluir/log/${encodeURIComponent(id)}/aluno/${encodeURIComponent(MATRICULA)}`;
    const resposta = await fetch(url);
    if (!resposta.ok) throw new Error('Não foi possível excluir o log.');
    await exibirLogs();
  } catch (erro) { alert(erro.message); }
}

let cidadeAtual = null;
const listaCidades = document.getElementById('listaCidades');
const mensagem = document.getElementById('mensagem');
const resultado = document.getElementById('resultado');
const conteudo = document.getElementById('conteudoResultado');
const botoes = ['btnAtual', 'btnPrevisao', 'btnAr', 'btnComparar'];

function avisar(texto, tipo = 'info') {
  mensagem.className = `alert alert-${tipo}`;
  mensagem.textContent = texto;
  mensagem.classList.remove('d-none');
}

async function consultarAPI(url) {
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error(`Falha na consulta (HTTP ${resposta.status}).`);
  const dados = await resposta.json();
  if (dados.error) throw new Error(dados.reason || 'Erro na API.');
  // O registro ocorre após a resposta bem-sucedida da API principal.
  const caminho = new URL(url);
  let metodo = 'Consulta';
  let resultadoLog = 'Resposta recebida';
  if (caminho.hostname.startsWith('geocoding')) {
    metodo = 'Geocoding';
    resultadoLog = `${(dados.results || []).length} cidades encontradas`;
  } else if (caminho.hostname.startsWith('air-quality')) {
    metodo = 'Qualidade do ar';
    resultadoLog = `AQI ${dados.current?.european_aqi ?? 'indisponivel'}`;
  } else if (caminho.searchParams.has('daily')) {
    metodo = 'Previsao 5 dias';
    resultadoLog = `${dados.daily?.time?.length || 0} dias`;
  } else {
    metodo = 'Clima atual';
    resultadoLog = `Temperatura ${dados.current?.temperature_2m ?? 'indisponivel'} C`;
  }
  await registrarLog('Open-Meteo', metodo, resultadoLog);
  return dados;
}

// Integração 1: Geocoding - consulta por nome, com filtro e lista usando for.
async function pesquisarCidades(nome) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(nome)}&count=6&language=pt&format=json`;
  const dados = await consultarAPI(url);
  return dados.results || [];
}

function nomeCidade(cidade) {
  return `${cidade.name}, ${cidade.admin1 || cidade.country || ''}`;
}

function selecionarCidade(cidade) {
  cidadeAtual = cidade;
  document.getElementById('cidadeSelecionada').textContent = `Cidade selecionada: ${nomeCidade(cidade)}`;
  listaCidades.replaceChildren();
  document.getElementById('secaoComparar').classList.add('d-none');
  resultado.classList.add('d-none');
  for (const id of botoes) document.getElementById(id).disabled = false;
  avisar('Escolha uma das quatro opções de consulta.', 'success');
}

function mostrarOpcoes(cidades, destino, acao) {
  destino.replaceChildren();
  for (const cidade of cidades) {
    const coluna = document.createElement('div');
    coluna.className = 'col-md-6';
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'btn btn-outline-primary w-100 text-start';
    botao.textContent = nomeCidade(cidade);
    botao.addEventListener('click', () => acao(cidade));
    coluna.appendChild(botao);
    destino.appendChild(coluna);
  }
}

// Integração 2: Forecast - condições atuais ou previsão diária.
async function buscarClima(cidade, modo) {
  const base = `https://api.open-meteo.com/v1/forecast?latitude=${cidade.latitude}&longitude=${cidade.longitude}&timezone=auto`;
  if (modo === 'dias') {
    return consultarAPI(`${base}&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&forecast_days=5`);
  }
  return consultarAPI(`${base}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m`);
}

// Integração 3: Air Quality - qualidade do ar da cidade selecionada.
async function buscarAr(cidade) {
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${cidade.latitude}&longitude=${cidade.longitude}&current=european_aqi,pm2_5&timezone=auto`;
  return consultarAPI(url);
}

function descricaoTempo(codigo) {
  if (codigo === 0) return 'Céu limpo';
  if ([1, 2, 3].includes(codigo)) return 'Nublado ou parcialmente nublado';
  if ([45, 48].includes(codigo)) return 'Neblina';
  if ([51, 53, 55, 56, 57].includes(codigo)) return 'Garoa';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(codigo)) return 'Chuva';
  if ([71, 73, 75, 77, 85, 86].includes(codigo)) return 'Neve';
  if ([95, 96, 99].includes(codigo)) return 'Trovoadas';
  return 'Condição não informada';
}

function classificacaoAr(aqi) {
  if (aqi == null) return 'Dado indisponível';
  if (aqi <= 20) return 'Boa';
  if (aqi <= 40) return 'Razoável';
  if (aqi <= 60) return 'Moderada';
  if (aqi <= 80) return 'Ruim';
  if (aqi <= 100) return 'Muito ruim';
  return 'Extremamente ruim';
}

// Uma orientação simples com if/else, usando os valores da API.
function orientarDia(clima) {
  if ([61, 63, 65, 80, 81, 82, 95, 96, 99].includes(clima.weather_code)) {
    return 'Há indicação de chuva ou tempestade. Considere levar um guarda-chuva.';
  }
  if (clima.temperature_2m >= 30) return 'Dia quente. Beba água e evite exposição prolongada ao sol.';
  if (clima.temperature_2m <= 12) return 'Temperatura baixa. Considere levar um agasalho.';
  return 'Confira as condições do tempo antes de sair.';
}

function criarDado(rotulo, valor) {
  const coluna = document.createElement('div');
  coluna.className = 'col-sm-6 col-lg-3';
  const caixa = document.createElement('div');
  caixa.className = 'dado';
  const nome = document.createElement('span');
  nome.textContent = rotulo;
  const numero = document.createElement('strong');
  numero.textContent = valor;
  caixa.append(nome, numero);
  coluna.appendChild(caixa);
  return coluna;
}

function abrirResultado(titulo) {
  document.getElementById('tituloResultado').textContent = titulo;
  conteudo.replaceChildren();
  resultado.classList.remove('d-none');
  mensagem.classList.add('d-none');
}

async function mostrarAtual() {
  if (!cidadeAtual) return;
  avisar('Consultando clima atual...');
  try {
    const dados = await buscarClima(cidadeAtual, 'atual');
    abrirResultado(`Clima atual - ${nomeCidade(cidadeAtual)}`);
    const atual = dados.current;
    const linha = document.createElement('div');
    linha.className = 'row g-3';
    linha.append(
      criarDado('Temperatura', `${atual.temperature_2m} °C`),
      criarDado('Sensação térmica', `${atual.apparent_temperature} °C`),
      criarDado('Umidade', `${atual.relative_humidity_2m} %`),
      criarDado('Vento', `${atual.wind_speed_10m} km/h`)
    );
    const descricao = document.createElement('p');
    descricao.className = 'mt-3';
    descricao.textContent = `Condição: ${descricaoTempo(atual.weather_code)}`;
    const orientacao = document.createElement('p');
    orientacao.className = 'alert alert-secondary mb-0';
    orientacao.textContent = orientarDia(atual);
    conteudo.append(linha, descricao, orientacao);
  } catch (erro) { avisar(erro.message, 'danger'); }
}

async function mostrarPrevisao() {
  if (!cidadeAtual) return;
  avisar('Consultando os próximos cinco dias...');
  try {
    const dados = await buscarClima(cidadeAtual, 'dias');
    abrirResultado(`Próximos 5 dias - ${nomeCidade(cidadeAtual)}`);
    const linha = document.createElement('div');
    linha.className = 'row g-3';
    // Exibição COM repetição: percorre os arrays da API.
    for (let i = 0; i < dados.daily.time.length; i++) {
      const data = dados.daily.time[i].split('-');
      const chuva = dados.daily.precipitation_probability_max[i];
      const texto = `${dados.daily.temperature_2m_max[i]} °C / ${dados.daily.temperature_2m_min[i]} °C | ${descricaoTempo(dados.daily.weather_code[i])} | Chuva: ${chuva == null ? 'indisponível' : chuva + ' %'}`;
      const coluna = document.createElement('div');
      coluna.className = 'col-md-6 col-lg-4';
      const caixa = document.createElement('div');
      caixa.className = 'dado';
      const titulo = document.createElement('strong');
      titulo.textContent = `${data[2]}/${data[1]}`;
      const paragrafo = document.createElement('p');
      paragrafo.className = 'mb-0';
      paragrafo.textContent = texto;
      caixa.append(titulo, paragrafo);
      coluna.appendChild(caixa);
      linha.appendChild(coluna);
    }
    conteudo.appendChild(linha);
  } catch (erro) { avisar(erro.message, 'danger'); }
}

async function mostrarAr() {
  if (!cidadeAtual) return;
  avisar('Consultando qualidade do ar...');
  try {
    const dados = await buscarAr(cidadeAtual);
    abrirResultado(`Qualidade do ar - ${nomeCidade(cidadeAtual)}`);
    const atual = dados.current;
    const linha = document.createElement('div');
    linha.className = 'row g-3';
    linha.append(
      criarDado('Índice europeu AQI', atual.european_aqi ?? 'Indisponível'),
      criarDado('Classificação', classificacaoAr(atual.european_aqi)),
      criarDado('Partículas PM2,5', atual.pm2_5 == null ? 'Indisponível' : `${atual.pm2_5} µg/m³`)
    );
    conteudo.appendChild(linha);
  } catch (erro) { avisar(erro.message, 'danger'); }
}

async function compararCom(outraCidade) {
  if (!cidadeAtual) return;
  avisar('Comparando cidades...');
  try {
    const primeiro = await buscarClima(cidadeAtual, 'atual');
    const segundo = await buscarClima(outraCidade, 'atual');
    abrirResultado('Comparação entre cidades');
    const linha = document.createElement('div');
    linha.className = 'row g-3';
    for (const item of [{ cidade: cidadeAtual, dados: primeiro }, { cidade: outraCidade, dados: segundo }]) {
      const coluna = document.createElement('div');
      coluna.className = 'col-md-6';
      const caixa = document.createElement('div');
      caixa.className = 'dado';
      const titulo = document.createElement('h3');
      titulo.className = 'h5';
      titulo.textContent = nomeCidade(item.cidade);
      const texto = document.createElement('p');
      texto.className = 'mb-0';
      const atual = item.dados.current;
      texto.textContent = `Temperatura: ${atual.temperature_2m} °C | Umidade: ${atual.relative_humidity_2m} % | Vento: ${atual.wind_speed_10m} km/h`;
      caixa.append(titulo, texto);
      coluna.appendChild(caixa);
      linha.appendChild(coluna);
    }
    conteudo.appendChild(linha);
    document.getElementById('secaoComparar').classList.add('d-none');
  } catch (erro) { avisar(erro.message, 'danger'); }
}

document.getElementById('formCidade').addEventListener('submit', async function (evento) {
  evento.preventDefault();
  const nome = document.getElementById('cidade').value.trim();
  if (nome.length < 2) return avisar('Digite pelo menos duas letras.', 'warning');
  avisar('Pesquisando cidades...');
  listaCidades.replaceChildren();
  try {
    const cidades = await pesquisarCidades(nome);
    if (cidades.length === 0) return avisar('Nenhuma cidade encontrada.', 'warning');
    mostrarOpcoes(cidades, listaCidades, selecionarCidade);
    avisar('Selecione uma cidade na lista.', 'success');
  } catch (erro) { avisar(erro.message, 'danger'); }
});

document.getElementById('btnChapeco').addEventListener('click', function () {
  // Consulta sem pesquisa digitada: coordenadas de Chapecó definidas no projeto.
  selecionarCidade({ name: 'Chapecó', admin1: 'Santa Catarina', latitude: -27.1004, longitude: -52.6152 });
});

document.getElementById('btnAtual').addEventListener('click', mostrarAtual);
document.getElementById('btnPrevisao').addEventListener('click', mostrarPrevisao);
document.getElementById('btnAr').addEventListener('click', mostrarAr);
document.getElementById('btnComparar').addEventListener('click', function () {
  document.getElementById('secaoComparar').classList.remove('d-none');
  resultado.classList.add('d-none');
  avisar('Digite a segunda cidade para comparar.');
});

document.getElementById('formComparar').addEventListener('submit', async function (evento) {
  evento.preventDefault();
  const nome = document.getElementById('segundaCidade').value.trim();
  if (nome.length < 2) return avisar('Digite pelo menos duas letras.', 'warning');
  avisar('Pesquisando a segunda cidade...');
  const destino = document.getElementById('opcoesComparar');
  destino.replaceChildren();
  try {
    const cidades = await pesquisarCidades(nome);
    if (cidades.length === 0) return avisar('Nenhuma cidade encontrada.', 'warning');
    mostrarOpcoes(cidades, destino, compararCom);
    avisar('Selecione a cidade para comparar.', 'success');
  } catch (erro) { avisar(erro.message, 'danger'); }
});

// Histórico da Parte 2.
document.getElementById('btnLogs').addEventListener('click', exibirLogs);
