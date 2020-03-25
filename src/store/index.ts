import { combineReducers } from 'redux';
import { pluginReducer } from './plugin/reducers';

export default combineReducers({
  plugin: pluginReducer
});