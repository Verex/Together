import express = require('express');
import httpServer = require('http');
import socketio = require('socket.io');
import { VideoState, StreamingService, SessionState } from '../store/plugin/types';
import { NetworkError, ErrorType, ClientSetupResponse, HostSetupResponse } from '../types/network';

const app = express();
const http = httpServer.createServer(app);
const io = socketio(http);

class Session {
	sessionToken: string;
	videoService: StreamingService;
	videoId: string;
	videoState: VideoState;
	owner: any;
	clients: Array<any>;
	removeClient(client: object) {
		this.clients = this.clients.filter((obj) => obj !== client);
	}
	setVideo(service: StreamingService, id: string) {
		this.videoService = service;
		this.videoId = id;
	}
	getSessionState(): SessionState {
		return {
			service: this.videoService,
			sessionToken: this.sessionToken,
			videoId: this.videoId,
			guests: this.clients.length
		};
	}
	updateSessionState() {
		// Get the updated session state.
		let newSessionState = this.getSessionState();

		// Owner must be updated of new session state.
		this.owner.emit('updateSessionState', { sessionState: newSessionState });

		// Update each client with the new video state.
		this.clients.forEach((client) => {
			client.emit('updateSessionState', { sessionState: newSessionState });
		});
	}
	constructor(sessionToken: string, owner: object) {
		this.sessionToken = sessionToken;
		this.videoService = StreamingService.None;
		this.videoState = null;
		this.videoId = null;
		this.owner = owner;
		this.clients = new Array<any>();
	}
}

var sessions: Map<string, Session> = new Map();

/*
app.get('/', function (req, res) {
    res.send('...');
});
*/

io.on('connection', function(socket) {
	console.log('User has connected.');

	socket.session = null;

	socket.on('startSession', (data, callback) => {
		if (socket.session == null) {
			let sessionToken = Math.random().toString(36).substring(2, 15);

			console.log('User is starting session.');

			// Create new session.
			let session = new Session(sessionToken, socket);

			// Update the video state (may be null).
			session.videoState = data.videoState;

			// Update some session state.
			session.videoService = data.videoService;
			session.videoId = data.videoId;

			// Add the session to session list.
			sessions.set(sessionToken, session);

			// Assign a session token to this socket.
			socket.session = sessionToken;

			// Return the session token to the host.
			callback(new HostSetupResponse(null, session.getSessionState()));
		}
	});

	socket.on('joinSession', (data, callback) => {
		if (socket.session == null && data.sessionToken != undefined && sessions.has(data.sessionToken)) {
			console.log('User has joined a session');

			// Store the session token.
			socket.session = data.sessionToken;

			// Get the session.
			let session = sessions.get(data.sessionToken);

			// Add socket to session clients.
			session.clients.push(socket);

			// Update the new session info.
			session.updateSessionState();

			// Send the current video state.
			callback(new ClientSetupResponse(null, session.videoState, session.getSessionState()));
		} else {
			// Let the client know there was an error.
			callback(new ClientSetupResponse(new NetworkError(ErrorType.SESSION, 'Invalid session.')));
		}
	});

	socket.on('updateVideoState', (data) => {
		if (socket.session != null && sessions.has(socket.session)) {
			let session = sessions.get(socket.session);

			// Update the session's video state.
			if (socket == session.owner) {
				console.log('Host has updated the video state.');

				session.videoState = data.videoState;

				console.log(data.videoState);

				// Update each client with the new video state.
				session.clients.forEach((client) => {
					client.emit('updateVideoState', { videoState: session.videoState });
				});
			} else {
				console.log('Client tried to update video state.');
			}
		}
	});

	socket.on('updateSessionState', (data) => {
		if (socket.session != null && sessions.has(socket.session)) {
			let session = sessions.get(socket.session);

			// Update the session's video state.
			if (socket == session.owner) {
				console.log('Host has updated the session state.');

				// Update session details.
				session.videoService = data.videoService;
				session.videoId = data.videoId;

				// Update the new session info.
				session.updateSessionState();
			} else {
				console.log('Client tried to update session state.');
			}
		}
	});

	socket.on('disconnect', function() {
		if (socket.session != null && sessions.has(socket.session)) {
			let session = sessions.get(socket.session);

			if (socket == session.owner) {
				// Inform each client the session has closed.
				session.clients.forEach((client) => {
					client.emit('sessionClosed');
				});

				// Delete the session.
				sessions.delete(socket.session);

				console.log(`User session "${socket.session}" has been closed.`);

				// TODO: Disconnect all users from session!
			} else {
				session.removeClient(socket);

				// Update the new session info.
				session.updateSessionState();

				console.log(`User has left session "${socket.session}".`);
			}
		}

		console.log('User has disconnected.');
	});
});

http.listen(3000, function() {
	console.log('listening on *:3000');
});
