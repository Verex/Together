import {
	VideoState,
	UPDATE_VIDEO_STATE,
	UPDATE_CONNECTION_TYPE,
	UPDATE_SESSION_STATE,
	PluginActionTypes,
	ConnectionType,
	SessionState,
	RESET_SESSION_STATE
} from './types';

export function updateVideoState(newState: VideoState): PluginActionTypes {
	return {
		type: UPDATE_VIDEO_STATE,
		payload: newState
	};
}

export function updateSessionState(newState: SessionState): PluginActionTypes {
	return {
		type: UPDATE_SESSION_STATE,
		payload: newState
	};
}

export function resetSessionState(): PluginActionTypes {
	return {
		type: RESET_SESSION_STATE
	};
}

export function updateConnectionType(newType: ConnectionType): PluginActionTypes {
	return {
		type: UPDATE_CONNECTION_TYPE,
		payload: newType
	};
}
