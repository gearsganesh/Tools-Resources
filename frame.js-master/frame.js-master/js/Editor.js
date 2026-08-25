/**
 * @author mrdoob / http://mrdoob.com/
 */

import { REVISION, Frame, Code, Animation } from '../Frame.js';
import { Config } from './Config.js';

function Editor() {

	// TODO Update to newer signals?
	const Signal = signals.Signal;

	this.signals = {

		editorCleared: new Signal(),
		projectLoaded: new Signal(),

		// settings

		nameChanged: new Signal(),
		durationChanged: new Signal(),

		// scripts

		scriptAdded: new Signal(),
		scriptRemoved: new Signal(),
		scriptRenamed: new Signal(),
		scriptChanged: new Signal(),
		scriptSelected: new Signal(),
		scriptsCleared: new Signal(),

		// effects

		effectAdded: new Signal(),
		effectRemoved: new Signal(),
		effectRenamed: new Signal(),
		effectSelected: new Signal(),
		effectCompiled: new Signal(),

		// actions

		fullscreen: new Signal(),
		exportState: new Signal(),

		// animations

		animationRenamed: new Signal(),
		animationAdded: new Signal(),
		animationModified: new Signal(),
		animationRemoved: new Signal(),
		animationSelected: new Signal(),

		// curves

		curveAdded: new Signal(),

		// events

		playingChanged: new Signal(),
		playbackRateChanged: new Signal(),

		timeForward: new Signal(),
		timeBackward: new Signal(),
		timeChanged: new Signal(),

		timelineZoomIn: new Signal(),
		timelineZoomOut: new Signal(),
		timelineZoomed: new Signal(),

		windowResized: new Signal(),

		// timeline views
		showAnimations: new Signal(),
		showCurves: new Signal()

	};

	this.config = new Config();
	this.frame = new Frame();
	this.selected = null;

	// signals

	const scope = this;
	const player = this.frame.player;
	const timeline = this.frame.timeline;

	function updateTimeline() {

		try {

			timeline.update( player.currentTime );

		} catch ( e ) {

			console.error( e );

		}

	}

	this.signals.animationModified.add( function () {

		timeline.reset();
		timeline.sort();

		updateTimeline();

	} );

	this.signals.effectCompiled.add( updateTimeline );
	this.signals.timeChanged.add( updateTimeline );
	this.signals.windowResized.add( updateTimeline ); // TODO: Doesn't render?

	// Animate

	var prevTime = 0;

	function animate( time ) {

		player.tick( time - prevTime );

		if ( player.isPlaying ) {

			scope.signals.timeChanged.dispatch( player.currentTime );

		}

		prevTime = time;

		requestAnimationFrame( animate );

	}

	requestAnimationFrame( animate );

};

Editor.prototype = {

	play: function () {

		this.frame.player.play();
		this.signals.playingChanged.dispatch( true );

	},

	stop: function () {

		this.frame.player.pause();
		this.signals.playingChanged.dispatch( false );

	},

	setName: function ( name ) {

		this.frame.name = name;
		this.signals.nameChanged.dispatch();

	},

	setDuration: function ( duration ) {

		this.frame.duration = duration;
		this.signals.durationChanged.dispatch();

	},

	setTime: function ( time ) {

		location.hash = time.toFixed( 4 );

		this.frame.player.currentTime = Math.max( 0, Math.min( this.frame.duration, time ) );
		this.signals.timeChanged.dispatch( this.frame.player.currentTime );

	},

	// scripts

	addScript: async function ( script ) {

		try {

			await script.compile( this.frame.resources, this.frame.player );

		} catch ( e ) {

			console.error( e );

		}

		this.frame.scripts.push( script );
		this.signals.scriptAdded.dispatch();

	},

	removeScript: function ( script ) {

		const index = this.frame.scripts.indexOf( script );

		this.frame.scripts.splice( index, 1 );
		this.signals.scriptRemoved.dispatch();

	},

	renameScript: function ( script, name ) {

		script.name = name;
		this.signals.scriptRenamed.dispatch( script );

	},

	selectScript: function ( script ) {

		this.signals.scriptSelected.dispatch( script );

	},

	createScript: function () {

		this.frame.scripts.push( new Code( { name: 'Unnamed', source: '' } ) );
		this.signals.scriptAdded.dispatch();

	},

	reloadScripts: async function () {

		this.signals.scriptsCleared.dispatch();

		const scripts = this.frame.scripts;

		for ( let i = 0; i < scripts.length; i ++ ) {

			const script = scripts[ i ];

			try {

				await script.compile( this.frame.resources, this.frame.player );

			} catch ( e ) {

				console.error( e );

			}

		}

		const effects = this.frame.effects;

		for ( let i = 0; i < effects.length; i ++ ) {

			const effect = effects[ i ];

			try {

				await effect.compile( this.frame.resources, this.frame.player );

			} catch ( e ) {

				console.error( e );

			}

		}

	},

	// effects

	createEffect: function () {

		const effect = new Code( { name: 'Effect' } );
		this.addEffect( effect );

	},

	addEffect: function ( effect ) {

		makeNameUnique( this.frame.effects, effect );

		this.frame.effects.push( effect );
		this.signals.effectAdded.dispatch( effect );

	},

	removeEffect: function ( effect ) {

		var index = this.frame.effects.indexOf( effect );

		if ( index >= 0 ) {

			this.frame.effects.splice( index, 1 );
			this.signals.effectRemoved.dispatch( effect );

		}

	},

	renameEffect: function ( effect, name ) {

		effect.name = name;
		this.signals.effectRenamed.dispatch( effect );

	},

	selectEffect: function ( effect ) {

		this.signals.effectSelected.dispatch( effect );

	},

	compileEffect: async function ( effect ) {

		try {

			await effect.compile( this.frame.resources, this.frame.player );

		} catch ( e ) {

			console.error( e );

		}

		this.signals.effectCompiled.dispatch( effect );

	},

	// Remove unused effects

	cleanEffects: function () {

		var scope = this;
		var effects = this.frame.effects.slice( 0 );
		var animations = this.frame.timeline.animations;

		effects.forEach( function ( effect, i ) {

			var bound = false;

			for ( var j = 0; j < animations.length; j++ ) {

				var animation = animations[ j ];

				if ( animation.effect === effect ) {

					bound = true;
					break;

				}

			}

			if ( bound === false ) {

				scope.removeEffect( effect );

			}

		} );

	},

	// animations

	addAnimation: async function ( animation ) {

		const effect = animation.effect;

		if ( effect.program === null ) {

			await this.compileEffect( effect );

		}

		this.frame.timeline.add( animation );
		this.signals.animationAdded.dispatch( animation );

	},

	selectAnimation: function ( animation ) {

		if ( this.selected === animation ) return;

		this.selected = animation;
		this.signals.animationSelected.dispatch( animation );

	},

	removeAnimation: function ( animation ) {

		this.frame.timeline.remove( animation );
		this.signals.animationRemoved.dispatch( animation );

	},

	createAnimation: function ( start, end, layer ) {

		var effect = new Code( { name: 'Effect' } );
		this.addEffect( effect );

		var animation = new Animation( { name: '', start: start, end: end, layer: layer, effect: effect } );
		this.addAnimation( animation );

	},

	duplicateAnimation: function ( animation ) {

		var offset = animation.end - animation.start;

		var duplicate = new Animation( {
			name: animation.name,
			start: animation.start + offset,
			end: animation.end + offset,
			layer: animation.layer,
			effect: animation.effect,
			enabled: animation.enabled,
			parameters: JSON.parse( JSON.stringify( animation.parameters ) )
		} );

		this.addAnimation( duplicate );
		this.selectAnimation( duplicate );

	},

	/*

	addCurve: function ( curve ) {

		this.timeline.curves.push( curve );
		this.signals.curveAdded.dispatch( curve );

	},

	*/

	clear: function () {

		const frame = this.frame;
		const signals = this.signals;

		frame.player.setAudio( null );

		frame.name = '';
		frame.duration = 120;

		frame.scripts = [];
		frame.effects = [];

		frame.player.playbackRate = 1;

		while ( frame.timeline.animations.length > 0 ) {

			this.removeAnimation( frame.timeline.animations[ 0 ] );

		}

		frame.resources.clear();
		frame.timeline.reset();

		signals.editorCleared.dispatch();

	},

	fromJSON: async function ( json ) {

		// Backwards compatibility

		json = fixLegacyJSON( json );

		const frame = new Frame();
		frame.fromJSON( json );

		this.frame.name = frame.name;
		this.frame.duration = frame.duration;

		for ( const script of frame.scripts ) {
			await this.addScript( script );
		}
		for ( const effect of frame.effects ) {
			this.addEffect( effect );
		}
		for ( const animation of frame.timeline.animations ) {
			await this.addAnimation( animation );
		}

		this.signals.projectLoaded.dispatch();

	},

	fromMarkdown: async function ( markdown ) {

		const frame = new Frame();
		frame.fromMarkdown( markdown );

		this.frame.name = frame.name;
		this.frame.duration = frame.duration;

		for ( const script of frame.scripts ) {
			await this.addScript( script );
		}
		for ( const effect of frame.effects ) {
			this.addEffect( effect );
		}
		for ( const animation of frame.timeline.animations ) {
			await this.addAnimation( animation );
		}

		this.signals.projectLoaded.dispatch();

	},

	toMarkdown: function () {

		const frame = this.frame;

		let markdown = `<!-- Frame.js Script r${ REVISION } -->\n\n`;
		
		markdown += `# ${ frame.name }\n\n`;
		
		markdown += '## Config\n\n';
		markdown += `* Duration: ${ frame.duration }\n\n`;
		
		if ( frame.scripts.length > 0 ) {
			markdown += '## Setup\n\n';
			for ( const script of frame.scripts ) {
				markdown += `### ${ script.name }\n\n`;
				markdown += '```js\n';
				markdown += script.source;
				markdown += '\n```\n\n';
			}
		}
		
		if ( frame.effects.length > 0 ) {
			markdown += '## Effects\n\n';
			for ( const effect of frame.effects ) {
				markdown += `### ${ effect.name }\n\n`;
				markdown += '```js\n';
				markdown += effect.source;
				markdown += '\n```\n\n';
			}
		}
		
		if ( frame.timeline.animations.length > 0 ) {
			markdown += '## Animations\n\n';
			for ( const animation of frame.timeline.animations ) {
				markdown += `### ${ animation.name }\n\n`;
				markdown += `* start: ${ animation.start }\n`;
				markdown += `* end: ${ animation.end }\n`;
				markdown += `* layer: ${ animation.layer }\n`;
				markdown += `* effect: ${ animation.effect.name }\n`;
				markdown += `* enabled: ${ animation.enabled }\n`;
				const array = Object.entries( animation.parameters );
				if ( array.length > 0 ) {
					markdown += '* parameters:\n';
					for ( const [ key, value ] of array ) {
						markdown += `    * ${ key }: ${ value }\n`;
					}
				}
				markdown += '\n';
			}
		}
		
		return markdown;

	}

}

function makeNameUnique( array, item ) {

	if ( array.some( e => e.name === item.name ) ) {

		let counter = 1;
		let newName = item.name + ' ' + counter;
		
		while ( array.some( e => e.name === newName ) ) {
			counter++;
			newName = item.name + ' ' + counter;
		}
		
		item.name = newName;

	}

}

function fixLegacyJSON( json ) {

	const scripts = json.scripts;

	for ( let i = 0, l = scripts.length; i < l; i ++ ) {

		let data = scripts[ i ];

		if ( Array.isArray( data ) ) {

			// console.warn( 'Editor: Converting legacy Code format:', data );
			data = { name: data[ 0 ], source: data[ 1 ] };

		}

		if ( Array.isArray( data.source ) ) {
		
			// console.warn( 'Editor: Converting legacy Code format:', data );
			data.source = data.source.join( '\n' );

		}

		scripts[ i ] = data;

	}

	const effects = json.effects;

	for ( let i = 0, l = effects.length; i < l; i ++ ) {

		let data = effects[ i ];

		if ( Array.isArray( data ) ) {

			// console.warn( 'Editor: Converting legacy Code format:', data );
			data = { name: data[ 0 ], source: data[ 1 ] };

		}

		if ( Array.isArray( data.source ) ) {

			//console.warn( 'Editor: Converting legacy Code format:', data );
			data.source = data.source.join( '\n' );

		}

		effects[ i ] = data;

	}

	const animations = json.animations;

	for ( let i = 0, l = animations.length; i < l; i ++ ) {

		let data = animations[ i ];

		if ( Array.isArray( data ) ) {

			// console.warn( 'Editor: Converting legacy Animation format:', data );

			data = {
				name: data[ 0 ],
				start: data[ 1 ],
				end: data[ 2 ],
				layer: data[ 3 ],
				effectId: data[ 4 ],
				enabled: data[ 5 ],
			};

		}

		animations[ i ] = data;

	}

	return json;

}

export { Editor };
