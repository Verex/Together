import {
	VideoState,
	PluginState,
	StreamingService,
	PluginActionTypes,
	UPDATE_VIDEO_STATE,
	ConnectionType,
	UPDATE_CONNECTION_TYPE,
	UPDATE_SESSION_STATE,
	RESET_SESSION_STATE
} from './types';

const initialState: PluginState = {
	videoState: null,
	sessionState: {
		service: StreamingService.None,
		sessionToken: null,
		videoId: null,
		guests: 0
	},
	connectionType: ConnectionType.None
};

export function pluginReducer(state = initialState, action: PluginActionTypes): PluginState {
	switch (action.type) {
		case UPDATE_VIDEO_STATE:
			return Object.assign({}, state, { videoState: action.payload });
		case UPDATE_SESSION_STATE:
			return Object.assign({}, state, { sessionState: action.payload });
		case RESET_SESSION_STATE:
			return Object.assign({}, state, { sessionState: initialState.sessionState });
		case UPDATE_CONNECTION_TYPE:
			return Object.assign({}, state, { connectionType: action.payload });
		default:
			return state;
	}
}
