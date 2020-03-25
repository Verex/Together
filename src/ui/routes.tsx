import * as React from 'react';
import { Switch, Route } from 'react-router-dom';
import * as routes from '../constants/routes';
import { PluginState } from '../store/plugin/types';
import HomePage from './pages/HomePage';
import SettingsPage from './pages/SettingsPage';
import HostPage from './pages/HostPage';

interface Props {
	state: PluginState;
}

export default function Routes(props: Props) {
	return (
		<Switch>
			<Route path={routes.HOST} render={() => HostPage(props)} exact />
			<Route path={routes.SETTINGS} component={SettingsPage} exact />
			<Route path={routes.HOME} render={() => HomePage(props)} />
		</Switch>
	);
}
