/*

    Much hack...

*/
import { VideoState, PluginState, ConnectionType, StreamingService } from '../store/plugin/types';
import { CombinedState } from 'redux';
import { StreamServices, injectFunction } from '../constants/services';

var videoElement: HTMLVideoElement = null;
let playOnSeek: boolean = false;
let state: PluginState = null;
let updateVideoTime: boolean = false;

const maxTimeDifference = 0.001;

function UpdateVideoState(currentTime: number, seeked: boolean, isPaused: boolean) {
	// Update the state of video pause.
	chrome.runtime.sendMessage({
		action: 'videoState',
		state: {
			currentTime: currentTime,
			seeked: seeked,
			isPaused: isPaused
		}
	});
}

function EnforcePauseState() {
	if (state == null || state.sessionState == null || state.videoState == null) return;

	let serviceInfo = StreamServices.get(state.sessionState.service);
	if (!state.videoState.isPaused) {
		videoElement.paused && serviceInfo.playVideo(videoElement);
	} else {
		!videoElement.paused && serviceInfo.pauseVideo(videoElement);
	}

	console.log('Pause state enforced.');
}

function EnforceVideoState() {
	if (state == null || state.sessionState == null || state.videoState == null) return;

	let serviceInfo = StreamServices.get(state.sessionState.service);

	let targetTime = state.videoState.currentTime + (Date.now() - state.videoState.time) * 0.001;
	if (!state.videoState.isPaused) {
		let dt = targetTime - videoElement.currentTime;
		if (dt > maxTimeDifference || Math.abs(dt) >= 1) {
			/*
				Magic number 0.3 seconds typically till player starts??
				Need some way to get the amount of time it takes to press
				play befor the video truly starts...
			*/
			serviceInfo.seekVideo(videoElement, targetTime + 0.3);
		} else {
			EnforcePauseState();
		}
	} else {
		// Enforced paused video time.
		let dt = state.videoState.currentTime - videoElement.currentTime;
		console.log(dt);
		if (Math.abs(dt) > maxTimeDifference) {
			serviceInfo.seekVideo(videoElement, state.videoState.currentTime);
		} else {
			EnforcePauseState();
		}
	}

	console.log('Video state was enforced.');
}

function validateVideo(service: StreamingService, video: HTMLVideoElement) {
	// Wait until the video is fully loaded.
	if (video != null && !isNaN(video.duration) && isFinite(video.duration)) {
		// Update the video element.
		videoElement = video;

		// Let the background know we have found a video.
		chrome.runtime.sendMessage({
			action: 'videoLocated',
			videoService: service,
			videoId: document.URL.replace(StreamServices.get(service).videoUrl, '')
		});

		let serviceInfo = StreamServices.get(service);

		/*
			Video events added here.
		*/
		video.addEventListener('play', () => {
			console.log('[Together] Video play event.');
		});
		video.addEventListener('playing', () => {
			if (state.connectionType == ConnectionType.Client) {
				EnforcePauseState();
			} else {
				UpdateVideoState(videoElement.currentTime, false, false);
			}
			console.log('[Together] Video playing event.');
		});
		video.addEventListener('pause', () => {
			if (state.connectionType == ConnectionType.Client) {
				EnforcePauseState();
			} else {
				UpdateVideoState(videoElement.currentTime, false, true);
			}
			console.log('[Together] Video paused event.');
		});
		video.addEventListener('seeked', (event) => {
			console.log('[Together] Video seeked to ' + videoElement.currentTime);
			if (state.connectionType == ConnectionType.Client) {
				EnforceVideoState();
			} else {
				UpdateVideoState(videoElement.currentTime, true, videoElement.paused);
			}
		});
		video.addEventListener('canplaythrough', () => {
			console.log('[Together] Video can be played through.');
		});

		if (state.connectionType == ConnectionType.Client) {
			EnforceVideoState();
		} else {
			// Update with current state for good measure.
			UpdateVideoState(videoElement.currentTime, false, videoElement.paused);
		}
	}
}

let ignoreUnload = false;
window.addEventListener('beforeunload', (event) => {
	if (ignoreUnload) return;

	// Send message to the background script that the content was closed.
	chrome.runtime.sendMessage({ action: 'contentClosed' });
});

chrome.runtime.sendMessage({}, (response) => {
	console.log('[Together] Hooked into page.');

	// Update the state of video pause.
	//chrome.runtime.sendMessage({ action: 'registerTab' });

	chrome.runtime.sendMessage({ action: 'getState' }, (res) => {
		handleNewState(res.state.plugin as PluginState);
	});

	let currentUrl: string | null = null;

	var checkReady = setInterval(() => {
		if (state != null && document.readyState === 'complete' && document.body != null) {
			/*
				Watch for URL changes.
			*/
			if (currentUrl == null) {
				currentUrl = window.location.href;
			} else if (currentUrl != window.location.href) {
				console.log('[Together] Path has changed!');

				currentUrl = window.location.href;

				// Send message to the background script that the content URL has changed.
				chrome.runtime.sendMessage({ action: 'contentUrlUpdated', url: currentUrl });
			}

			if (videoElement == null) {
				// We dont want this to happen.
				if (state && (state.videoState != null || state.connectionType != ConnectionType.Client)) {
					StreamServices.forEach((info, service) => {
						if (!document.URL.includes(info.videoUrl)) return;

						let video = info.getVideoElement(document);
						validateVideo(service, video);
					});
				}
			} else {
				/*
				if (videoElement != null) {
					console.log('[Together] Video page is gone.');
					videoElement = null;

					// Update the state of video stopped.
					chrome.runtime.sendMessage({ action: 'videoLost' });
				}
				*/
			}
		}
	}, 150);
});

function handleNewState(newState: PluginState) {
	// Update the state.
	state = newState;

	// Modify video to match state.
	if (newState.connectionType == ConnectionType.Client && videoElement != null) {
		let serviceInfo = StreamServices.get(newState.sessionState.service);
		if (newState.videoState.isPaused) {
			serviceInfo.seekVideo(videoElement, newState.videoState.currentTime);
		} else {
			serviceInfo.seekVideo(
				videoElement,
				newState.videoState.currentTime + (Date.now() - newState.videoState.time) * 0.001
			);
		}
	}

	updateVideoTime = true;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	console.log(message);
	if (message.action != undefined) {
		switch (message.action) {
			// Navigate to a new URL.
			case 'updateUrl':
				ignoreUnload = true;
				window.location.href = message.url;
				return false;
			case 'healthCheck':
				sendResponse(true);
				return true;
			// Forcefully remove the current video element.
			case 'clearVideoElement':
				videoElement = null;
				return false;
			// Update the current state since we can't share store over here.
			case 'updateState':
				handleNewState(message.state.plugin as PluginState);
				console.log('[Together] State update received.');
				return false;
		}
	}

	sendResponse({});
});
