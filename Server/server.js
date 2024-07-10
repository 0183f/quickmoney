const express = require('express');
const { Server } = require('socket.io');
const http = require('http');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
	cors: {
		origin: '*',
	},
});

let choices = { p1Choice: null, p2Choice: null };

io.on('connection', socket => {
	socket.on('join-room', room => {
		socket.join(room);
		io.to(room).emit('connected');

		let roomSockets = io.sockets.adapter.rooms.get(room);
		let users = roomSockets ? [...roomSockets.keys()] : [];

		if (users.length === 3) {
			io.to(socket.id).emit('full', 'Sorry! two players are already in this room. game is on');
			socket.leave(room);
		}

		roomSockets = io.sockets.adapter.rooms.get(room);
		users = roomSockets ? [...roomSockets.keys()] : [];
		io.to(room).emit('updated-users', users);

		socket.on('game-play', () => {
			socket.broadcast.to(room).emit('status', 'Opponent picked! Your turn.');
		});

		socket.on('restart', () => {
			socket.broadcast.to(room).emit('restart-message', 'Opponent wants to play again');
		});

		socket.on('disconnect', () => {
			socket.broadcast.to(room).emit('disconnected', 'Opponent left the game');
		});

		socket.on('p1Choice', data => {
			const { choice, room } = data;
			choices['p1Choice'] = choice;
			io.to(room).emit('p1Choice', { choice });
			choices.p2Choice !== null && declareWinner(room);
		});

		socket.on('p2Choice', data => {
			const { choice, room } = data;
			choices['p2Choice'] = choice;
			io.to(room).emit('p2Choice', { choice });
			choices.p1Choice !== null && declareWinner(room);
		});
	});
});

const declareWinner = room => {
	const player1 = choices['p1Choice'];
	const player2 = choices['p2Choice'];
	let winner = '';

	if (player1 === 'scissors') {
		if (player2 === 'scissors') winner = 'draw';
		else if (player2 === 'paper') winner = 'player1';
		else winner = 'player2';
	} else if (player1 === 'paper') {
		if (player2 === 'paper') winner = 'draw';
		else if (player2 === 'rock') winner = 'player1';
		else winner = 'player2';
	} else if (player1 === 'rock') {
		if (player2 === 'rock') winner = 'draw';
		else if (player2 === 'scissors') winner = 'player1';
		else winner = 'player2';
	} else {
		winner = 'draw';
	}

	io.to(room).emit('result', { winner: winner });
	choices = { p1Choice: null, p2Choice: null };
};

server.listen(4000, () => {
	console.log('Server running on Port 4000');
});
  
