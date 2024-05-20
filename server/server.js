const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let regions = {
  1: 'default',
  2: 'default',
  3: 'default',
  4: 'default',
  5: 'default',
  6: 'default',
  7: 'default',
  8: 'default',
};
let players = {};
let colors = ['red', 'blue'];
let currentPlayerIndex = 0;

const questions = [
  { question: "Başkentimiz neresidir?", answer: "Ankara" },
  { question: "Türkiye'nin en büyük şehri hangisidir?", answer: "İstanbul" },
  // Diğer sorular
];

io.on('connection', (socket) => {
    console.log('a user connected', socket.id);

    // Yeni oyuncuya renk ata
    const playerColor = colors.shift();
    players[socket.id] = { color: playerColor, id: socket.id };
    socket.emit('playerColor', playerColor);

    // Mevcut harita durumunu yeni kullanıcıya gönder
    socket.emit('mapState', regions);

    // Oyuncu ayrıldığında rengini geri al
    socket.on('disconnect', () => {
        console.log('user disconnected', socket.id);
        colors.push(players[socket.id].color);
        delete players[socket.id];
    });

    // Bölge tıklama işlemi
    socket.on('regionClicked', ({ regionId }) => {
        const player = players[socket.id];
        const currentPlayer = Object.values(players)[currentPlayerIndex];
        if (player && currentPlayer && player.id === currentPlayer.id) {
            const question = questions[Math.floor(Math.random() * questions.length)];
            socket.emit('question', question);

            socket.once('answer', (answer) => {
                if (answer === question.answer) {
                    regions[regionId] = player.color;
                    io.emit('regionUpdated', { regionId, color: player.color });

                    if (checkGameEnd()) {
                        io.emit('gameEnd', { winner: player.color });
                    } else {
                        // Sırayı değiştir
                        currentPlayerIndex = (currentPlayerIndex + 1) % Object.keys(players).length;

                        // Güncel harita durumunu tüm oyunculara gönder
                        io.emit('mapState', regions);
                    }
                }
            });
        }
    });
});

// Tüm bölgeler aynı renge sahip mi kontrolü
const checkGameEnd = () => {
  const colors = Object.values(regions);
  const firstColor = colors[0];
  return colors.every(color => color === firstColor);
};

app.use(express.static('public'));

server.listen(3000, () => {
    console.log('listening on *:3000');
});
