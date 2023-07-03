import * as THREE from 'three';

// Basic Material
const BMat = new THREE.MeshPhongMaterial( { color: 0xD016FF } );

// Sky material
const ky = new THREE.TextureLoader().load( 'textures/skyday.png' );
ky.magFilter = THREE.NearestFilter;
const sky = new THREE.MeshBasicMaterial( { map: ky, side: THREE.BackSide} );

let Materials = [BMat,sky];

function addMat(texture,mafil,mifil,wr){
	let t = new THREE.TextureLoader().load(texture);
	t.magFilter = mafil;
	t.minFilter = mifil;
	if (wr!=undefined){
		console.log("im setting wrap, "+wr[0]+ " and also "+ wr[1]);
		t.wrapS = THREE.RepeatWrapping;
		t.wrapT = THREE.RepeatWrapping;
		t.repeat.set(wr[0],wr[1]);
	}
	let mat = new THREE.MeshBasicMaterial({map:t});
	Materials.push(mat);
}

function addSColor(c){
	let mat = new THREE.MeshBasicMaterial( { color: c } );
	Materials.push(mat);
}

function addSprite(texture,mafil,mifil){
	// Sprite material
	let st = new THREE.TextureLoader().load( texture );
	st.magFilter = mafil;
	st.minFilter = mifil;
	let sm = new THREE.SpriteMaterial( { map: st } );
	Materials.push(sm);
}

addMat('textures/concrete.png',THREE.NearestFilter,THREE.NearestMipmapNearestFilter,[0.2,0.2]);
addSprite('textures/gunc.png',THREE.NearestFilter,THREE.NearestFilter);
addMat('textures/ground.png',THREE.NearestFilter,THREE.NearestFilter); // id 4
addMat('textures/sqb3d.png',THREE.NearestFilter,THREE.NearestMipmapNearestFilter); 
addMat('textures/wooden plankes.png',THREE.NearestFilter,THREE.NearestMipmapNearestFilter,[0.2,0.4]);
addMat('textures/concrete2.png',THREE.NearestFilter,THREE.NearestMipmapNearestFilter,[0.3,0.3]);
addSColor(0xc612fe); // 8
addSColor(0x000000); // 9
addSColor(0x9d0000); // 10
addSprite('textures/bell.png',THREE.NearestFilter,THREE.NearestFilter);

export {Materials}