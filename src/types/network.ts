import { VideoState, SessionState } from '../store/plugin/types';

export enum ErrorType {
	SERVER_CONNECTION,
	SESSION
}

export class NetworkError {
	type: ErrorType;
	message?: string;
	constructor(type: ErrorType, message?: string) {
		this.type = type;
		this.message = message;
	}
}

export class NetworkResponse {
	error?: NetworkError;
	constructor(error?: NetworkError) {
		this.error = error;
	}
}

export class ClientSetupResponse extends NetworkResponse {
	videoState?: VideoState;
	sessionState?: SessionState;
	constructor(error?: NetworkError, videoState?: VideoState, sessionState?: SessionState) {
		super(error);
		this.videoState = videoState;
		this.sessionState = sessionState;
	}
}

export class HostSetupResponse extends NetworkResponse {
	sessionState: SessionState;
	constructor(error?: NetworkError, sessionState?: SessionState) {
		super(error);
		this.sessionState = sessionState;
	}
}
