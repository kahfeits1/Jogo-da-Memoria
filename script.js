// Estado do jogo
let cartas = [];
let cartasViradas = [];
let paresEncontrados = 0;
let tentativas = 0;
let bloqueado = false;

const niveis = {
    facil: { pares: 8, colunas: 4, linhas: 4 },
    medio: { pares: 10, colunas: 5, linhas: 4 },
    avancado: { pares: 15, colunas: 6, linhas: 5 }
};

const temasEmojis = {
    frutas: [
        '🍎','🍌','🍇','🍉','🍒','🍋','🍓','🥝',
        '🍍','🥥','🍑','🍊','🍈','🍏','🍐','🍅','🥭','🍆','🥑','🍈'
    ],
    animais: [
        '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼',
        '🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🐤','🦆'
    ],
    comidas: [
        '🍔','🍟','🍕','🌭','🍿','🍩','🍪','🍫',
        '🍦','🍰','🧁','🍭','🍬','🍮','🍯','🥨','🥐','🥞','🍗','🍖'
    ]
};
let temaAtual = 'frutas';
const selectTema = document.getElementById('tema');

let nivelAtual = 'facil';
const selectNivel = document.getElementById('nivel');

const tabuleiro = document.getElementById('tabuleiro');
const tentativasSpan = document.getElementById('tentativas');
const paresSpan = document.getElementById('pares');
const btnReiniciar = document.getElementById('reiniciar');
const audioAcerto = document.getElementById('audio-acerto');
const audioErro = document.getElementById('audio-erro');
const audioVirar = document.getElementById('audio-virar');
const btnToggleSom = document.getElementById('toggle-som');
const btnToggleTema = document.getElementById('toggle-tema');
let somAtivo = true;

const cronometroSpan = document.getElementById('cronometro');
let intervaloCronometro = null;
let tempoDecorrido = 0;
let jogoIniciado = false;

const recordeSpan = document.getElementById('recorde');

const modalVitoria = document.getElementById('modal-vitoria');
const modalTempo = document.getElementById('modal-tempo');
const modalTentativas = document.getElementById('modal-tentativas');
const modalRecorde = document.getElementById('modal-recorde');
const btnFecharModal = document.getElementById('fechar-modal');

function formatarTempo(segundos) {
    const min = String(Math.floor(segundos / 60)).padStart(2, '0');
    const seg = String(segundos % 60).padStart(2, '0');
    return `${min}:${seg}`;
}

function atualizarCronometro() {
    cronometroSpan.textContent = 'Tempo: ' + formatarTempo(tempoDecorrido);
}

function iniciarCronometro() {
    if (intervaloCronometro) return;
    intervaloCronometro = setInterval(() => {
        tempoDecorrido++;
        atualizarCronometro();
    }, 1000);
}

function pausarCronometro() {
    clearInterval(intervaloCronometro);
    intervaloCronometro = null;
}

function resetarCronometro() {
    pausarCronometro();
    tempoDecorrido = 0;
    atualizarCronometro();
}

function embaralhar(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function criarCartas() {
    const { pares } = niveis[nivelAtual];
    const emojis = temasEmojis[temaAtual].slice(0, pares);
    const paresEmbaralhados = [...emojis, ...emojis];
    embaralhar(paresEmbaralhados);
    cartas = paresEmbaralhados.map((emoji, i) => ({
        id: i,
        emoji,
        virada: false,
        pareada: false
    }));
}

function renderizarTabuleiro(destacarPares = []) {
    tabuleiro.innerHTML = '';
    tabuleiro.className = 'tabuleiro grid-' + niveis[nivelAtual].colunas;
    cartas.forEach((carta, idx) => {
        const cartaDiv = document.createElement('div');
        let classes = 'carta';
        if (carta.virada) classes += ' virada';
        if (carta.pareada) classes += ' pareada';
        if (destacarPares.includes(idx)) classes += ' flash';
        cartaDiv.className = classes;
        cartaDiv.dataset.index = idx;
        cartaDiv.setAttribute('role', 'button');
        cartaDiv.setAttribute('tabindex', carta.pareada ? '-1' : '0');
        cartaDiv.setAttribute('aria-label', carta.pareada ? `Par encontrado: ${carta.emoji}` : (carta.virada ? `Carta virada: ${carta.emoji}` : 'Carta fechada'));
        cartaDiv.setAttribute('aria-pressed', carta.virada);

        const frente = document.createElement('div');
        frente.className = 'frente';
        frente.textContent = carta.emoji;

        const verso = document.createElement('div');
        verso.className = 'verso';
        verso.textContent = '?';

        cartaDiv.appendChild(frente);
        cartaDiv.appendChild(verso);

        cartaDiv.addEventListener('click', virarCarta);
        cartaDiv.addEventListener('keydown', function(e) {
            if (carta.pareada) return;
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                virarCarta({ currentTarget: cartaDiv });
            } else if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key)) {
                e.preventDefault();
                moverFoco(idx, e.key);
            }
        });
        tabuleiro.appendChild(cartaDiv);
    });
}

function moverFoco(idx, key) {
    const colunas = niveis[nivelAtual].colunas;
    const total = cartas.length;
    let novoIdx = idx;
    if (key === 'ArrowLeft') novoIdx = (idx % colunas === 0) ? idx + colunas - 1 : idx - 1;
    if (key === 'ArrowRight') novoIdx = (idx % colunas === colunas - 1) ? idx - colunas + 1 : idx + 1;
    if (key === 'ArrowUp') novoIdx = (idx - colunas + total) % total;
    if (key === 'ArrowDown') novoIdx = (idx + colunas) % total;
    // Pular cartas pareadas
    let tentativas = 0;
    while (cartas[novoIdx].pareada && tentativas < total) {
        novoIdx = (novoIdx + 1) % total;
        tentativas++;
    }
    const cartasDiv = tabuleiro.querySelectorAll('.carta');
    if (cartasDiv[novoIdx]) cartasDiv[novoIdx].focus();
}

function tocarSom(audio) {
    if (somAtivo) {
        audio.currentTime = 0;
        audio.play();
    }
}

function virarCarta(e) {
    if (bloqueado) return;
    const idx = e.currentTarget.dataset.index;
    const carta = cartas[idx];
    if (carta.virada || carta.pareada) return;
    carta.virada = true;
    cartasViradas.push(idx);
    tocarSom(audioVirar);
    renderizarTabuleiro();
    if (!jogoIniciado) {
        jogoIniciado = true;
        iniciarCronometro();
    }
    if (cartasViradas.length === 2) {
        verificarPar();
    }
}

function getRecordeKey() {
    return 'recorde_' + nivelAtual;
}

function carregarRecorde() {
    const recorde = JSON.parse(localStorage.getItem(getRecordeKey()));
    if (recorde) {
        recordeSpan.textContent = `Recorde: ${formatarTempo(recorde.tempo)} / ${recorde.tentativas} tentativas`;
    } else {
        recordeSpan.textContent = 'Recorde: --:-- / -- tentativas';
    }
}

function salvarRecorde(tempo, tentativas) {
    const recorde = JSON.parse(localStorage.getItem(getRecordeKey()));
    if (!recorde || tempo < recorde.tempo || (tempo === recorde.tempo && tentativas < recorde.tentativas)) {
        localStorage.setItem(getRecordeKey(), JSON.stringify({ tempo, tentativas }));
        carregarRecorde();
    }
}

function mostrarModalVitoria() {
    modalTempo.textContent = 'Tempo: ' + formatarTempo(tempoDecorrido);
    modalTentativas.textContent = 'Tentativas: ' + tentativas;
    const recorde = JSON.parse(localStorage.getItem(getRecordeKey()));
    if (recorde) {
        modalRecorde.textContent = `Recorde: ${formatarTempo(recorde.tempo)} / ${recorde.tentativas} tentativas`;
    } else {
        modalRecorde.textContent = '';
    }
    modalVitoria.classList.remove('modal-vitoria-oculto');
    modalVitoria.style.display = 'flex';
}

btnFecharModal.addEventListener('click', () => {
    modalVitoria.classList.add('modal-vitoria-oculto');
    modalVitoria.style.display = 'none';
    reiniciarJogo();
});

function verificarPar() {
    bloqueado = true;
    tentativas++;
    tentativasSpan.textContent = 'Tentativas: ' + tentativas;
    const [idx1, idx2] = cartasViradas;
    if (cartas[idx1].emoji === cartas[idx2].emoji) {
        cartas[idx1].pareada = true;
        cartas[idx2].pareada = true;
        paresEncontrados++;
        paresSpan.textContent = 'Pares encontrados: ' + paresEncontrados;
        tocarSom(audioAcerto);
        renderizarTabuleiro([idx1, idx2]);
        setTimeout(() => {
            cartasViradas = [];
            bloqueado = false;
            renderizarTabuleiro();
            if (paresEncontrados === niveis[nivelAtual].pares) {
                pausarCronometro();
                salvarRecorde(tempoDecorrido, tentativas);
                setTimeout(mostrarModalVitoria, 300);
            }
        }, 700);
    } else {
        tocarSom(audioErro);
        setTimeout(() => {
            cartas[idx1].virada = false;
            cartas[idx2].virada = false;
            cartasViradas = [];
            renderizarTabuleiro();
            bloqueado = false;
        }, 1000);
    }
}

function reiniciarJogo() {
    paresEncontrados = 0;
    tentativas = 0;
    cartasViradas = [];
    tentativasSpan.textContent = 'Tentativas: 0';
    paresSpan.textContent = 'Pares encontrados: 0';
    criarCartas();
    renderizarTabuleiro();
    jogoIniciado = false;
    resetarCronometro();
    carregarRecorde();
}

btnReiniciar.addEventListener('click', reiniciarJogo);

selectNivel.addEventListener('change', function() {
    nivelAtual = this.value;
    reiniciarJogo();
});

selectTema.addEventListener('change', function() {
    temaAtual = this.value;
    reiniciarJogo();
});

btnToggleSom.addEventListener('click', function() {
    somAtivo = !somAtivo;
    btnToggleSom.classList.toggle('mudo', !somAtivo);
    btnToggleSom.textContent = somAtivo ? '🔊 Som' : '🔇 Som';
});

function aplicarTema() {
    const temaClaro = localStorage.getItem('tema') === 'claro';
    document.body.classList.toggle('claro', temaClaro);
    btnToggleTema.classList.toggle('ativo', temaClaro);
    btnToggleTema.textContent = temaClaro ? '☀️ Tema' : '🌙 Tema';
}

btnToggleTema.addEventListener('click', function() {
    const temaClaro = !document.body.classList.contains('claro');
    localStorage.setItem('tema', temaClaro ? 'claro' : 'escuro');
    aplicarTema();
});

// Aplicar tema salvo ao carregar
aplicarTema();

// Inicialização
carregarRecorde();
criarCartas();
renderizarTabuleiro(); 