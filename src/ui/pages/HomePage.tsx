import * as React from 'react';
import { PluginState, ConnectionType } from '../../store/plugin/types';
import {
	Button,
	Typography,
	Card,
	CardContent,
	TextField,
	Paper,
	IconButton,
	InputBase,
	Divider
} from '@material-ui/core';
import KeyboardArrowRightIcon from '@material-ui/icons/KeyboardArrowRight';
import VideoCallRoundedIcon from '@material-ui/icons/VideoCallRounded';
import * as routes from '../../constants/routes';
import { Link } from 'react-router-dom';
import { json } from 'express';
import { ClientSetupResponse } from '../../types/network';

const styles = {
	root: {
		padding: '2px 4px',
		display: 'flex',
		alignItems: 'center',
		background: '#f0f0f0'
	},
	input: {
		marginLeft: 3,
		flex: 1
	},
	iconButton: {
		padding: 10
	},
	divider: {
		height: 28,
		margin: 4
	},
	errorText: {
		verticalAlign: 'text-bottom',
		marginTop: '30px',
		color: '#ff524d',
		minHeight: '0.75rem',
		lineHeight: 0
	}
};

interface Props {
	state: PluginState;
}

interface State {
	sessionToken: string;
	errorMessage: string;
}

class Home extends React.Component<Props, State> {
	constructor(props) {
		super(props);

		this.state = {
			sessionToken: '',
			errorMessage: ''
		};
	}
	submitSessionToken = () => {
		// Check the token here to verify it's valid before sending off.
		chrome.runtime.sendMessage(
			{ action: 'joinSession', sessionToken: this.state.sessionToken },
			(res: ClientSetupResponse) => {
				if (res.error != null) {
					this.setState({ sessionToken: '', errorMessage: res.error.message });
				}
			}
		);
	};
	onTokenInputChanged = (event) => {
		this.setState({ sessionToken: event.target.value });
	};
	onStopSessionPressed = () => {
		chrome.runtime.sendMessage({ action: 'stopSession' });
	};
	render() {
		console.log(this.props);
		let connectionType = this.props.state.connectionType || ConnectionType.None;
		switch (connectionType) {
			case ConnectionType.None:
				return (
					<React.Fragment>
						<Typography variant="body1" gutterBottom>
							Welcome, please enter your session token below to join. You may also start a new session by
							going to the video host page.
						</Typography>
						<Typography variant="caption" display="block" style={styles.errorText} gutterBottom>
							{this.state.errorMessage}
						</Typography>
						<Paper component="form" style={styles.root}>
							<InputBase
								style={styles.input}
								placeholder="Session token"
								inputProps={{ 'aria-label': 'session token' }}
								value={this.state.sessionToken}
								onChange={this.onTokenInputChanged}
							/>
							<Divider style={styles.divider} orientation="vertical" />
							<IconButton
								onClick={this.submitSessionToken}
								style={styles.iconButton}
								color="primary"
								aria-label="submit"
							>
								<KeyboardArrowRightIcon />
							</IconButton>
						</Paper>
					</React.Fragment>
				);
			case ConnectionType.Client:
				return (
					<React.Fragment>
						<Typography variant="body1" gutterBottom>
							You're currently in a session, enjoy!
						</Typography>
						<Button variant="contained" color="primary" onClick={this.onStopSessionPressed}>
							Quit Session
						</Button>
					</React.Fragment>
				);
			case ConnectionType.Host:
				return (
					<React.Fragment>
						<Typography variant="body1" gutterBottom>
							You're currently hosting a session. Please go to the video host page for more info.
						</Typography>
					</React.Fragment>
				);
				break;
		}
	}
}

export default function(props: Props) {
	return <Home {...props} />;
}
