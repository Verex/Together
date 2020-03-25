import { StreamingService } from '../store/plugin/types';

export function injectFunction(fn: (...args: any) => any, args: Array<string> = []) {
	const handShake = Math.round(Math.random() * 999999);

	function returnToSender(handShake, u0) {
		window.postMessage({ handShake }, '*');
	}

	const script = `(${returnToSender.toString()})(${handShake},(${fn.toString()})(${args.map((val, index) => {
		return val + (index != args.length - 1 ? ',' : '');
	})}));`;

	console.log(script);

	const scriptTag = document.createElement('script');
	const scriptBody = document.createTextNode(script);

	scriptTag.id = Math.round(Math.random() * 999999).toString();
	scriptTag.appendChild(scriptBody);
	document.body.append(scriptTag);

	let listener = (event) => {
		// We only accept messages from ourselves
		if (event.source != window || (event.data.handShake && event.data.handShake != handShake)) return;

		// Cleanup.
		window.removeEventListener('message', listener);
		scriptTag.parentNode.removeChild(scriptTag);
	};

	// Listen for a message from
	window.addEventListener('message', listener, false);
}

export interface ServiceInfo {
	videoUrl: string;
	loginUrl: string;
	postLoginUrl: string;
	baseUrl: string;
	seekVideo: (video: HTMLVideoElement, time: number) => void;
	playVideo: (video: HTMLVideoElement) => void;
	pauseVideo: (video: HTMLVideoElement) => void;
	getVideoElement: (document: Document) => HTMLVideoElement;
}

/*
	Define streaming service information here.
	Each may have a different method for accessing.
*/
export const StreamServices = new Map<StreamingService, ServiceInfo>([
	[
		StreamingService.DisneyPlus,
		{
			videoUrl: 'https://www.disneyplus.com/video/',
			loginUrl: 'https://www.disneyplus.com/login/',
			postLoginUrl: 'https://www.disneyplus.com/select-profile',
			baseUrl: 'https://www.disneyplus.com/',
			seekVideo: (video, time) => {
				// Update the current time.
				video.currentTime = time;
			},
			playVideo: (video) => {
				video.play();
			},
			pauseVideo: (video) => {
				video.pause();
			},
			getVideoElement: (doc) => {
				return doc.getElementsByClassName('btm-media-client-element')[0] as HTMLVideoElement;
			}
		}
	],
	[
		StreamingService.Netflix,
		{
			videoUrl: 'https://www.netflix.com/watch/',
			loginUrl: 'https://www.netflix.com/login',
			postLoginUrl: 'https://www.netflix.com/browse',
			baseUrl: 'https://www.netflix.com/',
			seekVideo: (video, time) => {
				const handShake = Math.round(Math.random() * 999999);

				// Injected function to seek the netflix video.
				function seek(handShake, time, netflix) {
					let s = netflix.appContext.state.playerApp.getAPI().videoPlayer.getAllPlayerSessionIds();
					let p = netflix.appContext.state.playerApp.getAPI().videoPlayer.getVideoPlayerBySessionId(s[0]);
					p.seek(time * 1000);
					window.postMessage({ handShake }, '*');
				}

				const script = `(${seek.toString()})(${handShake.toString()},${time.toString()},netflix);`;
				const scriptTag = document.createElement('script');
				const scriptBody = document.createTextNode(script);

				scriptTag.id = 'tgr';
				scriptTag.appendChild(scriptBody);
				document.body.append(scriptTag);

				let listener = (event) => {
					// We only accept messages from ourselves
					if (event.source != window || (event.data.handShake && event.data.handShake != handShake)) return;

					// Cleanup.
					window.removeEventListener('message', listener);
					scriptTag.parentNode.removeChild(scriptTag);
				};

				// Listen for a message from
				window.addEventListener('message', listener, false);
			},
			playVideo: (video) => {
				video.play();
			},
			pauseVideo: (video) => {
				video.pause();
			},
			getVideoElement: (doc) => {
				return document.getElementsByTagName('video')[0] as HTMLVideoElement;
			}
		}
	]
]);
