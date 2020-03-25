import * as React from 'react';
import { PluginState } from '../../store/plugin/types';
import { Button } from '@material-ui/core';

interface Props {}

class Settings extends React.Component<Props, {}> {
	render() {
		return (
			<div>
				Settings
			</div>
		);
	}
}

export default (props: Props) => <Settings {...props} />;
