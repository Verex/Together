import * as io from 'socket.io-client';
import { createStore, Store } from 'redux';
import {
	PluginState,
	VideoState,
	PluginActionTypes,
	ConnectionType,
	StreamingService,
	SessionState
} from '../store/plugin/types';
import { updateVideoState, updateConnectionType, updateSessionState, resetSessionState } from '../store/plugin/actions';
import rootReducer from '../store/index';
import { ClientSetupResponse, NetworkError, ErrorType, HostSetupResponse } from '../types/network';
import { StreamServices } from '../constants/services';

const socketAddress = 'ws://tetron.online:3000/';
var socket = null;

let activeTab: number = null;

let store = createStore(rootReducer);
store.subscribe(() => {
	console.log(store.getState());
	sendCurrentState();
});

function sendCurrentState() {
	let message = {
		action: 'updateState',
		state: store.getState()
	};

	chrome.runtime.sendMessage(message);

	if (activeTab != null) {
		chrome.tabs.sendMessage(activeTab, message);
	}
}

async function socketConnect() {
	return new Promise((resolve, reject) => {
		// Open the socket connection.
		socket = io(socketAddress);

		let onConnect = () => {
			console.log('[Together] Connected to server.');

			// Remove old event listener.
			socket.off('connect', onConnect);

			// Resolve the promise.
			resolve();
		};
		socket.on('connect', onConnect);

		let onError = () => {
			console.log('[Together] Error connecting to server.');

			// Remove old event listener.
			socket.off('connectError', onError);

			// Close the socket connection.
			socket.close();

			// Clear the socket.
			socket = null;

			// Reject the promise.
			reject();
		};
		socket.on('connect_error', onError);
	});
}

async function socketEmit(message: string, payload: object): Promise<any> {
	return new Promise((resolve, reject) => {
		socket.emit(message, payload, (data) => resolve(data));
	});
}

function handleSessionState(newSessionState: SessionState) {
	let sessionState = store.getState().plugin.sessionState;
	if (newSessionState.service != StreamingService.None) {
		let videoUrl = StreamServices.get(newSessionState.service).videoUrl + newSessionState.videoId;

		// New session, just got first update.
		if (activeTab == null || newSessionState.service != sessionState.service) {
			activeTab = null;

			// Create new tab for the video.
			chrome.tabs.create(
				{
					active: true,
					url: videoUrl
				},
				(tab) => {
					activeTab = tab.id;
				}
			);
		} else {
			chrome.tabs.sendMessage(activeTab, { action: 'updateUrl', url: videoUrl });
		}
	}
}

function handleCurrentUrl(url: string, contentReloaded: boolean = false) {
	let state = store.getState().plugin;
	let serviceInfo = StreamServices.get(state.sessionState.service);

	// Ensure we're on the correct video.
	let videoUrl = serviceInfo.videoUrl + state.sessionState.videoId;

	if (url != videoUrl) {
		if (!contentReloaded) {
			chrome.tabs.sendMessage(activeTab, { action: 'clearVideoElement' });
		}

		if (state.connectionType == ConnectionType.Host || state.connectionType == ConnectionType.None) {
			store.dispatch(updateVideoState(null));
			setSessionState({
				service: StreamingService.None,
				videoId: null
			});
			activeTab = null;
		} else {
			// GOTO LOGIN if not at login.
			if (!url.includes(serviceInfo.baseUrl)) {
				stopSession();
			} else if (!url.includes(serviceInfo.loginUrl)) {
				if (url.includes(serviceInfo.postLoginUrl)) {
					chrome.tabs.sendMessage(activeTab, { action: 'updateUrl', url: videoUrl });
				} else {
					chrome.tabs.sendMessage(activeTab, { action: 'updateUrl', url: serviceInfo.loginUrl });
				}
			} 
		}
	}
}

function setSessionState(stateProperties: object) {
	// Get the updated session state.
	let newSessionState = Object.assign({}, store.getState().plugin.sessionState, stateProperties);

	switch (store.getState().plugin.connectionType) {
		case ConnectionType.Host:
			// Update session state and send to server.
			store.dispatch(updateSessionState(newSessionState));
			socket.emit('updateSessionState', {
				videoService: newSessionState.service,
				videoId: newSessionState.videoId
			});
			break;
		case ConnectionType.Client:
			break;
		case ConnectionType.None:
			// Update our session state.
			store.dispatch(updateSessionState(newSessionState));
			break;
	}
}

function stopSession() {
	let state = store.getState().plugin;

	// Disconnect from the server.
	socket.disconnect();

	// Reset the session state for clients.
	if (state.connectionType == ConnectionType.Client) {
		// Reset the session state.
		store.dispatch(resetSessionState());

		// Remove the video state.
		store.dispatch(updateVideoState(null));

		if (activeTab != null) {
			// Close the video tab.
			chrome.tabs.remove(activeTab);
			activeTab = null;
		}
	} else {
		let newSessionState = Object.assign({}, state.sessionState, { sessionToken: null });
		store.dispatch(updateSessionState(newSessionState));
	}

	// Set the connection type.
	store.dispatch(updateConnectionType(ConnectionType.None));

	console.log('[Together] Disconnected from server.');
}

function setupHost(): Promise<HostSetupResponse> {
	return new Promise(async (resolve, reject) => {
		try {
			await socketConnect();
		} catch (error) {
			resolve(
				new HostSetupResponse(new NetworkError(ErrorType.SERVER_CONNECTION, 'Could not connect to server.'))
			);
			return;
		}

		console.log('[Together] Starting session...');

		let state = store.getState().plugin;
		// Attempt to start a session.
		let res = (await socketEmit('startSession', {
			videoService: state.sessionState.service,
			videoId: state.sessionState.videoId,
			videoState: state.videoState
		})) as HostSetupResponse;

		console.log(res);
		if (res.error != null) {
			console.log('[Together] Error starting session.');

			resolve(res);

			// Disconnect from the socket.
			socket.disconnect();

			return;
		}

		// Subscribe to session state updates.
		socket.on('updateSessionState', (data) => {
			store.dispatch(updateSessionState(data.sessionState));
		});

		console.log('[Together] Session started..');

		// Update with the initial video state.
		store.dispatch(updateSessionState(res.sessionState));

		// Update our connection type.
		store.dispatch(updateConnectionType(ConnectionType.Host));

		resolve(res);

		/*
		socket.on('getPlaybackState', (callback) => {
			console.log('Playback state... Socket!');
			chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
				chrome.tabs.sendMessage(tabs[0].id, { action: 'getVideoTime' }, (res) => {
					console.log(res);
					callback({
						videoTime: res.videoTime,
						isPaused: state.videoState.isPaused,
						time: Date.now()
					});
				});
			});
		});
		*/
	});
}

function setupClient(sessionToken: string): Promise<ClientSetupResponse> {
	return new Promise(async (resolve, reject) => {
		try {
			await socketConnect();
		} catch (error) {
			resolve(
				new ClientSetupResponse(new NetworkError(ErrorType.SERVER_CONNECTION, 'Could not connect to server.'))
			);
			return;
		}

		console.log('[Together] Joining session...');

		// Attempt to join the session.
		let res = (await socketEmit('joinSession', { sessionToken: sessionToken })) as ClientSetupResponse;

		if (res.error != null) {
			console.log('[Together] Error joining session.');

			resolve(res);

			// Disconnect from the socket.
			socket.disconnect();

			return;
		}

		console.log('[Together] Session joined.');

		// Handle the incoming session state.
		handleSessionState(res.sessionState);

		/*
			These three could be batched??
		*/

		// Update with the initial video state.
		store.dispatch(updateVideoState(res.videoState));

		// Update the session state.
		store.dispatch(updateSessionState(res.sessionState));

		// Update our connection type.
		store.dispatch(updateConnectionType(ConnectionType.Client));

		// Subscribe to video state updates.
		socket.on('updateVideoState', (data) => {
			// Update the video state.
			store.dispatch(updateVideoState(data.videoState));
		});

		// Subscribe to session state updates.
		socket.on('updateSessionState', (data) => {
			store.dispatch(updateSessionState(data.sessionState));
			handleSessionState(data.sessionState);
		});

		// Subscribe to closed session updates.
		socket.on('sessionClosed', () => {
			// End the session.
			stopSession();
		});

		resolve(res);
	});
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.action == undefined) return;

	let state = store.getState().plugin;

	switch (message.action) {
		case 'videoState':
			// Dont update state if client.
			if (state.connectionType == ConnectionType.Client) return;

			let newState: VideoState = {
				currentTime: message.state.currentTime,
				isPaused: message.state.isPaused,
				time: Date.now()
			};

			// Update the server with the new state.
			if (socket != null && state.videoState != newState) {
				socket.emit('updateVideoState', { videoState: newState });
			}

			// Update our video state.
			store.dispatch(updateVideoState(newState));
			break;
		case 'videoLocated':
			if (state.sessionState.service == StreamingService.None) {
				// Register the video tab.
				if (activeTab == null) {
					activeTab = sender.tab.id;
				}
				setSessionState({
					service: message.videoService,
					videoId: message.videoId
				});
			}
			return;
		case 'videoLost':
			// Ensure this is the original tab.
			if (activeTab == sender.tab.id) {
				// Clear the active tab if not client.
				if (state.connectionType != ConnectionType.Client) {
					store.dispatch(updateVideoState(null));
					setSessionState({
						service: StreamingService.None,
						videoId: null
					});
					activeTab = null;
				}

				// This shouldn't happen for the client....
				// reload?
			}
			return;
		case 'stopSession':
			stopSession();
			return false;
		case 'startSession':
			setupHost().then((data) => sendResponse(data));
			return true;
		case 'joinSession':
			setupClient(message.sessionToken).then((data) => sendResponse(data));
			return true;
		// Message from the content script that the page has closed.
		case 'contentClosed':
			console.log('[Together] Content page closed.');
			if (activeTab == sender.tab.id && state.sessionState.service != StreamingService.None) {
				//handleCurrentUrl(sender.tab.url, true);
			}
			return false;
		// Message from the content script that the url has been updated.
		case 'contentUrlUpdated':
			if (activeTab == sender.tab.id && state.sessionState.service != StreamingService.None) {
				handleCurrentUrl(message.url);
			}
			return false;
		case 'registerTab':
			// Register the video tab.
			activeTab = sender.tab.id;
			return;
		case 'getState':
			sendResponse({ state: store.getState() });
			return true;
		default:
			sendResponse({});
			break;
	}
});

// Listen for tab updates.
chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
	let state = store.getState().plugin;

	if (state.sessionState.service == StreamingService.None) return;

	if (activeTab == tabId && info.status === 'complete') {
		// Hacky way to check if our content is no longer available.
		chrome.tabs.sendMessage(activeTab, { action: 'healthCheck' }, (res) => {
			if (chrome.runtime.lastError) {
				handleCurrentUrl('', true);
			}
		});
	}
});

chrome.tabs.onRemoved.addListener((tabId, info) => {
	if (activeTab == tabId) {
		activeTab = null;

		if (store.getState().plugin.connectionType == ConnectionType.Client) {
			stopSession();
		} else {
			store.dispatch(updateVideoState(null));
			setSessionState({
				service: StreamingService.None,
				videoId: null
			});
			activeTab = null;
		}
	}
});
