/**
 * @author mrdoob / http://mrdoob.com/
 */

import { UIPanel } from './libs/ui.js';

function Viewport( editor ) {

	var signals = editor.signals;

	var container = this.container = new UIPanel();
	container.setId( 'viewport' );

	container.dom.appendChild( editor.frame.domElement );

	editor.signals.fullscreen.add( function () {

		var element = container.dom;

		if ( element.requestFullscreen ) element.requestFullscreen();
		if ( element.msRequestFullscreen ) element.msRequestFullscreen();
		if ( element.mozRequestFullScreen ) element.mozRequestFullScreen();
		if ( element.webkitRequestFullscreen ) element.webkitRequestFullscreen();

		signals.windowResized.dispatch();

	} );

	function clear() {

		const dom = editor.frame.domElement;

		// Remove elements

		while ( dom.children.length ) {

			dom.removeChild( dom.lastChild );

		}

		// Reset styles

		for ( var i = 1; i < dom.style.length; i ++ ) {

			const name = dom.style[ i ];
			dom.style[ name ] = '';

		}

	}

	signals.editorCleared.add( clear );
	signals.scriptsCleared.add( clear );

	return container;

}

export { Viewport };
