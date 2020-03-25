import * as React from 'react';
import { PluginState, StreamingService, ConnectionType } from '../../store/plugin/types';
import { Typography, Stepper, Step, StepLabel, Button, TextField } from '@material-ui/core';
import { HostSetupResponse } from '../../types/network';

const styles = {
	root: {
		margin: 'auto'
	},
	stepper: {
		paddingRight: 0,
		paddingLeft: 0
	},
	sessionTokenContainer: {
		marginBottom: '10px',
		display: 'block'
	},
	startSessionButton: {
		background: '#05c880'
	},
	actionButtonsContainer: {
		display: 'block',
		marginRight: '15px',
		marginLeft: '15px'
	},
	errorText: {
		height: '45px',
		marginBottom: '10px',
		color: '#ff524d'
	}
};

const steps = [ 'Start a video session.', 'Navigate to a supported video.', 'Watch together!' ];

interface Props {
	state: PluginState;
}

interface State {
	activeStep: number;
	errorMessage: string;
}

class Host extends React.Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = {
			activeStep: this.getCurrentStep(),
			errorMessage: ''
		};
	}
	getCurrentStep = () => {
		return this.props.state.sessionState.sessionToken != null
			? this.props.state.sessionState.service != StreamingService.None ? 2 : 1
			: 0;
	};
	componentDidUpdate() {
		let currentStep = this.getCurrentStep();
		if (currentStep != this.state.activeStep) {
			this.setState({ activeStep: currentStep });
		}
	}
	onStartSessionPressed = () => {
		// Check the token here to verify it's valid before sending off.
		chrome.runtime.sendMessage({ action: 'startSession', sessionToken: 'test' }, (res: HostSetupResponse) => {
			if (res.error != null) {
				this.setState({ errorMessage: res.error.message });
				return;
			}

			this.setState({ errorMessage: '' });
		});
	};
	onStopSessionPressed = () => {
		chrome.runtime.sendMessage({ action: 'stopSession' });
	};
	render() {
		let state = this.props.state;
		if (state.connectionType != ConnectionType.Client) {
			return (
				<div style={styles.root}>
					<Stepper style={styles.stepper} activeStep={this.state.activeStep} alternativeLabel>
						{steps.map((label, index) => {
							const stepProps: { completed?: boolean } = {};
							const labelProps: { optional?: React.ReactNode } = {};
							return (
								<Step key={label} {...stepProps}>
									<StepLabel {...labelProps}>{label}</StepLabel>
								</Step>
							);
						})}
					</Stepper>
					<div style={styles.actionButtonsContainer}>
						<TextField
							id="session-token"
							label="Session Token"
							value={this.props.state.sessionState.sessionToken || ''}
							InputProps={{
								readOnly: true
							}}
							style={styles.sessionTokenContainer}
							variant="outlined"
							size="small"
							fullWidth
							disabled={this.props.state.sessionState.sessionToken == null}
						/>
						<Typography variant="caption" display="block" style={styles.errorText}>
							{this.state.errorMessage}
						</Typography>
						{(this.props.state.sessionState.sessionToken == null && (
							<Button
								variant="contained"
								color="primary"
								onClick={this.onStartSessionPressed}
								style={styles.startSessionButton}
							>
								Start Session
							</Button>
						)) || (
							<Button variant="contained" color="primary" onClick={this.onStopSessionPressed}>
								Stop Session
							</Button>
						)}
					</div>
				</div>
			);
		} else {
			return (
				<React.Fragment>
					<Typography variant="body1" gutterBottom>
						You're currently connected to a session as a client. Please leave the session if you'd like to
						start a new one.
					</Typography>
				</React.Fragment>
			);
		}
	}
}

export default (props: Props) => <Host {...props} />;
