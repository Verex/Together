export enum StreamingService {
	None,
	DisneyPlus,
	Netflix
}

export enum ConnectionType {
	None,
	Host,
	Client
}

export interface VideoState {
	currentTime: number;
	isPaused: boolean;
	time: number;
}

export interface SessionState {
	sessionToken: string;
	service: StreamingService;
	videoId: string;
	guests: number;
}

export interface PluginState {
	videoState: VideoState;
	sessionState: SessionState;
	connectionType: ConnectionType;
}

/*
    Action definitions.
*/
export const UPDATE_VIDEO_STATE = 'UPDATE_VIDEO_STATE';
export const UPDATE_SESSION_STATE = 'UPDATE_SESSION_STATE';
export const RESET_SESSION_STATE = 'RESET_SESSION_STATE';
export const UPDATE_CONNECTION_TYPE = 'UPDATE_CONNECTION_TYPE';

interface UpdateVideoStateAction {
	type: typeof UPDATE_VIDEO_STATE;
	payload: VideoState;
}

interface UpdateSessionStateAction {
	type: typeof UPDATE_SESSION_STATE;
	payload: SessionState;
}

interface ResetSessionStateAction {
	type: typeof RESET_SESSION_STATE;
}

interface UpdateConnectionType {
	type: typeof UPDATE_CONNECTION_TYPE;
	payload: ConnectionType;
}

export type PluginActionTypes =
	| UpdateVideoStateAction
	| UpdateSessionStateAction
	| ResetSessionStateAction
	| UpdateConnectionType;
