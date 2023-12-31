import * as THREE from 'three';

const audioLoader = new THREE.AudioLoader();

function newSound(path,loop,v,listener){
	let s = new THREE.Audio( listener );
	audioLoader.load( path, function( buffer ) {
		s.setBuffer( buffer );
		s.setLoop( loop );
		s.setVolume( v );
	});
	return s;
}

function loadSounds(listener){
	let Sounds = [];
	
	Sounds['sfx'] = newSound('/sounds/button.ogg',false,1,listener);
	Sounds['cd'] = [newSound('/sounds/fritofrut.ogg',false,1,listener),newSound('/sounds/crackdown.ogg',false,1,listener)];
	Sounds['ju1'] = [newSound('/sounds/yah1.ogg',false,1,listener),newSound('/sounds/yah2.ogg',false,1,listener)];
	Sounds['ju2'] = [newSound('/sounds/ha1.ogg',false,1,listener),newSound('/sounds/ha2.ogg',false,1,listener)];
	Sounds['ju3'] = [newSound('/sounds/hoo1.ogg',false,1,listener),newSound('/sounds/hoo2.ogg',false,1,listener)];
	
	return Sounds;
}

export {loadSounds}