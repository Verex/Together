import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Button, AppBar, Toolbar, IconButton, Typography, makeStyles, MenuItem, Menu } from '@material-ui/core';
import { BrowserRouter, Link } from 'react-router-dom';
import VideoCallRoundedIcon from '@material-ui/icons/VideoCallRounded';
import SettingsRoundedIcon from '@material-ui/icons/SettingsRounded';
import HomeRoundedIcon from '@material-ui/icons/HomeRounded';
import { PluginState } from '../store/plugin/types';
import 'typeface-roboto';
import '../styles/popup.css';
import Routes from './routes';
import * as routes from '../constants/routes';

enum StreamingService {
	None,
	DisneyPlus
}

//chrome.i18n.getMessage("l10nHello")
//https://www.disneyplus.com/video/f0b254e4-ef67-47fb-88e6-e907c52205ea
interface State {
	pluginState: PluginState;
	currentService: StreamingService;
	videoId: string;
	isPaused: boolean;
	menuAnchor: any;
}

class Popup extends React.Component<{}, State> {
	state = {
		pluginState: null,
		currentService: StreamingService.None,
		videoId: '',
		isPaused: false,
		menuAnchor: null
	};
	
	constructor(props) {
		super(props);
	}

	componentDidMount() {
		chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
			console.log(message);
			if (message.action != undefined) {
				switch (message.action) {
					case 'updateState':
						console.log(message.state.plugin);
						this.setState({ pluginState: message.state.plugin });
						break;
				}
			}
		});

		chrome.runtime.sendMessage({ action: 'getState' }, (res) => {
			this.setState({ pluginState: res.state.plugin });
		});

		chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			var activeTab = tabs[0];

			if (activeTab.url != undefined) {
				let service = StreamingService.None;
				let id = '';

				if (activeTab.url.includes('https://www.disneyplus.com/video/')) {
					service = StreamingService.DisneyPlus;
					id = activeTab.url.replace('https://www.disneyplus.com/video/', '');
				}

				this.setState({ currentService: service, videoId: id });
			}
		});
	}

	openService = (service: StreamingService) => {
		let url = '';

		switch (service) {
			case StreamingService.DisneyPlus:
				url = 'https://www.disneyplus.com/login';
				break;
		}

		chrome.tabs.create(
			{
				active: true,
				url: url
			},
			null
		);
	};

	videoAction = () => {
		chrome.runtime.sendMessage({ action: 'videoAction' }, (res) => {
			console.log(res);
			this.setState({ isPaused: res.isPaused });
		});
	};
	handleMenuOpen = (event) => {
		this.setState({ menuAnchor: event.currentTarget });
	};
	handleMenuClose = (event) => {
		this.setState({ menuAnchor: null });
	};

	componentDidUpdate() {}

	render() {
		if (this.state.pluginState != null) {
			return (
				<BrowserRouter>
					<AppBar position="fixed">
						<Toolbar>
							<Typography variant="h6">Together</Typography>
							<Link to={routes.HOME} style={{ color: 'inherit', textDecoration: 'none' }}>
								<IconButton aria-label="Home page" edge="end" color="inherit">
									<HomeRoundedIcon />
								</IconButton>
							</Link>
							<Link to={routes.HOST} style={{ color: 'inherit', textDecoration: 'none' }}>
								<IconButton aria-label="Host page" edge="end" color="inherit">
									<VideoCallRoundedIcon />
								</IconButton>
							</Link>
							<Link to={routes.SETTINGS} style={{ color: 'inherit', textDecoration: 'none' }}>
								<IconButton aria-label="Settings page" edge="end" color="inherit">
									<SettingsRoundedIcon />
								</IconButton>
							</Link>
						</Toolbar>
					</AppBar>
					<Toolbar />
					<Routes state={this.state.pluginState} />
				</BrowserRouter>
			);
		} else {
			return <div />;
		}
	}
}

// --------------

ReactDOM.render(<Popup />, document.getElementById('root'));
