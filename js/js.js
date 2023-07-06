import * as CANNON from './cannon-es.js'
import * as THREE from 'three';
import { Materials } from './materialsImporter.js'
import { loadSounds } from './soundsImporter.js'

// damn you importer files

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

const posD = document.getElementById("posit");
const speD = document.getElementById("speedis");

const raycaster = new THREE.Raycaster();

const scene = new THREE.Scene();
scene.fog = new THREE.Fog( 0xffffff, 70, 360 );
scene.alpha = false;
const scene2 = new THREE.Scene();
scene2.fog = new THREE.Fog( 0xffffff, 70, 380 );
const hudScene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, 600 / 400, 0.1, 1000 );

const listener = new THREE.AudioListener();
camera.add( listener );
const renderer = new THREE.WebGLRenderer( { antialias: false } );
renderer.autoClear = false;
const max = Math.max(window.innerWidth, window.innerHeight)

let world = new CANNON.World();
world.gravity.set(0,-9.82,0);
world.broadphase = new CANNON.NaiveBroadphase();

let w=0;
let h=0;
if (max==window.innerWidth){
	h = window.innerHeight;
	w = (h/3)*4;
}else{
	w = window.innerWidth;
	h = (w/4)*3;
}
renderer.setSize( w,h );
renderer.domElement.className = "cen"
document.getElementById("gaming").appendChild( renderer.domElement );

const light = new THREE.AmbientLight( 0x202020 ); // soft white light
scene.add( light );
const lightt = new THREE.HemisphereLight( 0xf7f7ef, 0x080820, 1 );
scene.add( lightt );

function rad(deg) {
  return deg * (Math.PI / 180);
}

function addCube(sizes,Pos,Mat,np,Rot=[0,0,0]){
	const geometry = new THREE.BoxGeometry(sizes[0],sizes[1],sizes[2])
	let ncube;
	if (Mat.map && Mat.map.wrapS == THREE.RepeatWrapping){
		
		ncube = new THREE.Mesh( geometry,Mat.clone() );
		ncube.material.map = ncube.material.map.clone();
		let OGrepeat = [ncube.material.map.clone().repeat.x,ncube.material.map.clone().repeat.y];
		let smallestsize = Math.min(...sizes);
		switch (smallestsize){
		case sizes[0]: // s0
				ncube.material.map.repeat.set(sizes[2]*OGrepeat[0],sizes[1]*OGrepeat[1]);
				break;
		case sizes[2]: // s2
				ncube.material.map.repeat.set(sizes[0]*OGrepeat[0],sizes[1]*OGrepeat[1]);
				break;
		case sizes[1]: // s1
				ncube.material.map.repeat.set(sizes[0]*OGrepeat[0],sizes[2]*OGrepeat[1]);
				break;
		}
		
	} else {
		ncube = new THREE.Mesh( geometry,Mat);
	}
	scene.add( ncube );
	ncube.position.copy(Pos);
	ncube.rotation.copy(new THREE.Euler(rad(Rot[0]),rad(Rot[1]),rad(Rot[2]),'XYZ'));
	
	if (!np){
		let bShape = new CANNON.Box(new CANNON.Vec3(sizes[0]*.5,sizes[1]*.5,sizes[2]*.5));
		let bBody = new CANNON.Body({ mass: 0 }); // 0 mass means "anchored"
		bBody.addShape(bShape);
		bBody.position.set(Pos.x,Pos.y,Pos.z);
		bBody.quaternion = new CANNON.Quaternion(ncube.quaternion.x,ncube.quaternion.y,ncube.quaternion.z,ncube.quaternion.w);
		ncube.body=bBody;
		world.addBody(bBody);
	}
	return ncube;
}

function mulArr(array1, array2) {
  return array1.map((num, index) => num * array2[index]);
}
function addArr(array1, array2) {
  return array1.map((num, index) => num + array2[index]);
}

let Sounds = loadSounds(listener);

let physTBA = [];
let pLevel = [];
let indexedElements = {sfx:Sounds, lerpers:[]};
let ztrig = [];

function loadLevelData(response,mode,scale=new THREE.Vector3(1,1,1),offset=new THREE.Vector3(0,0,0)) {
		response.boxes.forEach((box)=>{
			let nophys = (box.NoPhys!=undefined) ? box.NoPhys : false 

			let cube = addCube(mulArr(box.BoxGeo,[scale.x,scale.y,scale.z]),(new THREE.Vector3(box.Position[0],box.Position[1],box.Position[2])).multiply(scale).add(offset),Materials[box.Mat],nophys,box.Rotation)
			if (box.Name!=undefined){
				indexedElements[box.Name] = cube;
			}
			if (box.Interaction){
				cube.Interaction = new Function(box.Interaction.args,box.Interaction.body);
			}
		});
		if (response.spheres) response.spheres.forEach((sphere)=>{
			let g = new THREE.SphereGeometry( sphere.Geo[0]*scale.x, sphere.Geo[1]*scale.y, sphere.Geo[2]*scale.z );
			let m = new THREE.Mesh(g,Materials[sphere.Mat]);
			if (sphere.Scene) scene2.add(m);
			else scene.add(m);
			m.position.copy(new THREE.Vector3(sphere.Position[0],sphere.Position[1],sphere.Position[2])).multiply(scale).add(offset);
			m.rotation.copy(new THREE.Euler(sphere.Rotation[0],sphere.Rotation[1],sphere.Rotation[2],'XYZ'));
			if (sphere.Name!=undefined){
				indexedElements[sphere.Name] = m;
			}
			if (sphere.Interaction){
				m.Interaction = new Function(sphere.Interaction.args,sphere.Interaction.body);
			}
		});
		if (response.sprites!=undefined) response.sprites.forEach((sprite)=>{
			let spri = new THREE.Sprite( Materials[sprite.Mat] );
			scene.add(spri);
			spri.position.copy(new THREE.Vector3(sprite.Position[0],sprite.Position[1],sprite.Position[2])).multiply(scale).add(offset);
			if (sprite.Name!=undefined){
				indexedElements[sprite.Name] = spri;
			}
			if (sprite.Scale!=undefined){
				spri.scale.set(sprite.Scale[0],sprite.Scale[1],1)
			}
			if (sprite.Interaction){
				spri.Interaction = new Function(sprite.Interaction.args,sprite.Interaction.body);
			}
		});
		if (response.sl && mode!=1) response.sl.forEach((ref)=>{
			let refm = fetch(ref.Ref).then((sresponse)=>sresponse.json()).then((sresponse)=>{
				let sc = ref.Scale;
				let p = ref.Position;
				/*console.log(ref.Ref+" size is "+sresponse.boxes[0].BoxGeo+" scale: "+sc);
				const nphys = ref.NoPh || false;
				if (nphys) console.log("this has no physics");
				sresponse.boxes.forEach((box)=>{
					addCube([box.BoxGeo[0]*sc[0],box.BoxGeo[1]*sc[1],box.BoxGeo[2]*sc[2]],new THREE.Vector3(box.Position[0]*sc[0]+p[0],box.Position[1]*sc[1]+p[1],box.Position[2]*sc[2]+p[2]),Materials[box.Mat],nphys,box.Rotation)
				});*/
				loadLevelData(sresponse,1,new THREE.Vector3(sc[0],sc[1],sc[2]),new THREE.Vector3(p[0],p[1],p[2]));
			});
		});
		if (response.lights!=undefined) response.lights.forEach((light)=>{
			let tata = new THREE.PointLight( light.Color, light.Strength, light.Distance );
			tata.position.set( light.Position[0],light.Position[1],light.Position[2] ).multiply(scale).add(offset);
			scene.add( tata );
			if (light.Name!=undefined){
				indexedElements[light.Name]=tata;
			}
		});
		if (response.plevel) response.plevel.forEach((box)=>{
			if (pLevel[box.Floor]==undefined) pLevel[box.Floor] = [];
			box.Position = addArr(mulArr(box.Position,[scale.x,scale.z]),[offset.x,offset.z]);
			let nl = pLevel[box.Floor].push(box);
			if (box.Name!=undefined){
				indexedElements[box.Name]=pLevel[box.Floor][nl-1];
			}
		});
		if (response.meshes!=undefined){
			// probably better store each unique mesh and then reuse loaded mesh for each copy, rather than load it everytime
			
			response.meshes.forEach((mesh)=>{ // yet to implement meshes in level editor
				loader.load(mesh.Path, (gltf)=>{
					gltf.scene.scale.set(mesh.Scale[0],mesh.Scale[1],mesh.Scale[2]).multiply(scale);
					gltf.scene.position.set(mesh.Position[0],mesh.Position[1],mesh.Position[2]).multiply(scale).add(offset);;
					if (mesh.Rotation!=undefined){
						gltf.scene.rotation.copy(new THREE.Euler(rad(mesh.Rotation[0]),rad(mesh.Rotation[1]),rad(mesh.Rotation[2]),'XYZ'));
					}
					console.log(mesh,gltf);
					// put undefined or material 0 will not work (0 == false == "")
 					if (mesh.Mat!=undefined) {
						gltf.scene.children[0].material = Materials[mesh.Mat]; 
					} else {
						gltf.scene.children[0].material.map.minFilter = THREE.NearestFilter;
						gltf.scene.children[0].material.map.magFilter = THREE.NearestFilter;
					}
					scene.add(gltf.scene);
					if (mesh.Name!=undefined){
						indexedElements[mesh.Name]=gltf;
					}
					if (mesh.Interaction){
						gltf.scene.children[0].Interaction = new Function(mesh.Interaction.arguments,mesh.Interaction.body);
					}
				},undefined,function(error){
					console.log("FAIL! "+error);
				});
			});
		}
		if (response.zonetriggers!=undefined){ // lol interactive elements
			response.zonetriggers.forEach((zone)=>{ // yet to implement zones in level editor
				if (ztrig[zone.Floor]==undefined) ztrig[zone.Floor] = [];
				zone.Position = addArr(mulArr(zone.Position,[scale.x,scale.z]),[offset.x,offset.z]);
				ztrig[zone.Floor].push(zone);
			});
		}
		if (response.physobj!=undefined){ // lol physic objects
			response.physobj.forEach((po)=>{ // yet to implement phys in level editor
				po.Size = mulArr(po.Size,[scale.x,scale.y,scale.z])
				let bShape = new CANNON.Box(new CANNON.Vec3(po.Size[0]*.5,po.Size[1]*.5,po.Size[2]*.5));
				let bBody = new CANNON.Body({ mass: po.Mass }); // 0 mass means "anchored"
				bBody.addShape(bShape);
				bBody.attachedIE=po.Attachment;
				bBody.grabby = po.Grabby;
				po.Position = mulArr(po.Position,[scale.x,scale.y,scale.z]);
				bBody.position.set(po.Position[0],po.Position[1],po.Position[2]);
				bBody.position.vadd(new CANNON.Vec3(offset.x,offset.y,offset.z),bBody.position)
				world.addBody(bBody);
				physTBA.push(bBody);
			});
		}
  }
  
// fetch level data from external server BEFORE JUNE 11TH!

const data = fetch('level.json').then((response) => response.json()).then((jeremy)=>{loadLevelData(jeremy)})

var CY = 0;
var CX = 0;

var Presses = [false,false,false,false]; // W, S, D, A, Q, E

/* CAMERA VARIABLES */
const VL = 0.75; // Camera entropy
var CMYV = 0; // Camera velocity
var turnSpeed = .005; // Camera key turning speed

/* MOVEMENT VARIABLES */
const speed = .012;
const cMaxSpeed = .08;
const maxSpeed = .22;
const velEntropy=.05;
let crouching = false;
let grabbing = false;
let grabt = undefined;
let wallGlitch = false;

const surfacepoints = {
	0   : -6000,
	216 : -6000,
	220 : -39,
	233 : -15,
	250 : -5.6,
	271 : -4.3,
	517 : -4.3,
	533 : -8,
	550 : -17.5,
	560 : -33.7,
	563 : -71,
	565 : -6000,
	1000: -6000
};

function calculateInter(points,x){
	if (points[x]) return points[x]
	else {
		let mini = Math.min(...Object.keys(points)); 
		let maxi = Math.max(...Object.keys(points)); 
		for (var k in points){
			if (k<x) mini = Math.max(mini,k);
			if (k>x) maxi = Math.min(maxi,k);
		}
		//console.log(mini,x,maxi);
		let a = (maxi-x)/(maxi-mini);
		return (1-a)*points[maxi]+a*points[mini];
		
	}
}

renderer.domElement.onclick = () => {
	renderer.domElement.requestPointerLock();
}

function intersects(cRadius, cX, cY, rX, rY, rH, rW)
{
    let cDx = Math.abs(cX - rX);
    let cDy = Math.abs(cY - rY);

    if (cDx > (rW/2 + cRadius)) { return false; }
    if (cDy > (rH/2 + cRadius)) { return false; }

    if (cX <= (rW/2)) { return true; } 
    if (cY <= (rH/2)) { return true; }

    cornerDistance_sq = (cDx - rW/2)^2 +
                         (cDy - rH/2)^2;

    return (cornerDistance_sq <= (cRadius^2));
}

function checkForCollision(box,mp,r){
		let res = false;
		let x = box.Position[0];
		let y = box.Position[1];
		
		if (mp.x<x) x=Math.max(x-box.Size[0]/2,mp.x);
		else x=Math.min(x+box.Size[0]/2,mp.x);
		
		if (mp.y<y) y=Math.max(y-box.Size[1]/2,mp.y);
		else y=Math.min(y+box.Size[1]/2,mp.y);
		
		let closest = new THREE.Vector2(x,y);
		if (closest.distanceTo(mp)<r) res=true;
		return res ? closest : false;
}

class controller { /* THIS IS THE CONTROLLER CLASS DEFINITION!!!! Basically the player object, that will contain position in 2d space, camera height and body radius. */
	constructor(pos,cheight,radius){
		this.cheight=cheight;
		this.basecheight=cheight;
		this.radius = radius;
		this.pos = pos;
		this.nextpos = pos;
		this.vy = 0;
		this.posy = 0;
		this.floor = 0;
		this.vel = 0;
		this.angle = 0;
		this.myMaxSpeed=maxSpeed;
		// physic section
		this.body = new CANNON.Body({mass: 0});
		this.body.position.set(pos.x,this.posy-1,pos.y);
		let cyls = new CANNON.Cylinder(radius,radius,6/*height*/,16);
		this.body.addShape(cyls);
		world.addBody(this.body);
		this.sprinting = false;
		this.tp = false;
		this.jumps = 0;
	}
	init(){
		
	}
	
	getground(){
		return calculateInter(surfacepoints,this.pos.length())+4.5;
	}
	
	teleport(x,z,y,f){
		this.floor = f;
		this.posy = y;
		this.tp=true;
		this.nextpos.set(x, z);
	}
	
	update(){
		
		this.body.position.set(this.pos.x,this.posy-1,this.pos.y);
		
		let ogpos = this.pos.clone();
		
		if (pLevel[this.floor]==undefined) pLevel[this.floor]=[];
		if (ztrig[this.floor]==undefined) ztrig[this.floor]=[];
		
		if (!(Presses[0]==true||Presses[1]==true||Presses[2]==true||Presses[3]==true)) this.vel = Math.max(this.vel-velEntropy,0); // Multiplication-free speed loss !?
		else this.vel = Math.min(this.vel,this.myMaxSpeed);
		
		if (plr.posy<=plr.getground()+0.2) 
		{
			if (this.vy>0.12){
				this.vy-=0.07;
			}else if (this.vy<-0.12){
				this.vy+=0.07;
			}else {
				this.jumps = 0;
				this.vy=0;
			}
		} else {
			if (this.vy>0.01){
				this.vy-=0.0015;
			}else if (this.vy<-0.01){
				this.vy+=0.0015;
			}else {
				this.vy=0;
			}
		}
		
		if (crouching) {this.cheight = -1.3;this.myMaxSpeed=cMaxSpeed;} else {
			if (this.sprinting) 
				this.myMaxSpeed=.6;
			else
				this.myMaxSpeed=maxSpeed;
			this.cheight = this.basecheight;
		}
		
		this.nextpos = this.pos.clone().add(new THREE.Vector2(-Math.sin(this.angle)*this.vel,-Math.cos(this.angle)*this.vel));
		
		// collision checking with boxes on same floor
		let collision = false;
		let collider = false;
		if (this.floor!=undefined && pLevel[this.floor]!=undefined){
			pLevel[this.floor].forEach((box)=>{
				if (checkForCollision(box,this.nextpos,this.radius)) {collision = true; collider=box;}
			});
		}
		// collision checking with triggers on same floor
		if (this.floor!=undefined && ztrig[this.floor]!=undefined){
			ztrig[this.floor].forEach((box)=>{
				if (checkForCollision(box,this.nextpos,this.radius)) {
					if (box.Enabled){
						let f = new Function(box.function.arguments,box.function.body);
						f(this,box,indexedElements);
						if (box.Cooldown){
							box.Enabled = false;
							setTimeout(()=>{box.Enabled=true;},box.Cooldown);
						}
					}
					//console.log("what? hit a trig!");
				}
			});
		}
		
		// custom big gunchus surface
		if (this.floor==0){
			
			let floor = this.getground();
			if (this.posy>floor){
				this.vy-=0.03
			}
			this.posy = Math.max(floor,this.posy+this.vy);
		}
		
		if (collision && !this.tp) {
			t="Colliding";
			// figure out how far you can go
			if (wallGlitch){ // quirky but cheap wallsliding :3
				this.nextpos = this.pos.clone().add(new THREE.Vector2(0,-Math.cos(this.angle)*this.vel)); // Y ONLY
				if (!checkForCollision(collider,this.nextpos,this.radius)) this.pos=this.nextpos; // this checks if the first wall encountered is still being collided with if moving only on Y
				else{
					this.nextpos = this.pos.clone().add(new THREE.Vector2(-Math.sin(this.angle)*this.vel,0)); // X ONLY
					if (!checkForCollision(collider,this.nextpos,this.radius)) this.pos=this.nextpos; // this checks if the first blah blah blah only on X
				}
			}else{
				this.nextpos = this.pos.clone().add(new THREE.Vector2(0,-Math.cos(this.angle)*this.vel)); // Y ONLY
				collision = false;
				// this is a collision check
				pLevel[this.floor].forEach((box)=>{
					if (checkForCollision(box,this.nextpos,this.radius)) {collision = true; collider=box;}
				});
				// i need to turn this into a function
				if (!collision) this.pos=this.nextpos;
				else{
					this.nextpos = this.pos.clone().add(new THREE.Vector2(-Math.sin(this.angle)*this.vel,0)); // X ONLY
					collision = false;
					// this is a collision check
					pLevel[this.floor].forEach((box)=>{
						if (checkForCollision(box,this.nextpos,this.radius)) {collision = true; collider=box;}
					});
					// i need to turn this into a function
					if (!collision) this.pos=this.nextpos;
				}
			}
		}
		else {
			if (this.getground()-(calculateInter(surfacepoints,this.nextpos.length())+4.5)>=-0.8){
				t="Not Colliding";
				this.pos = this.nextpos;
				this.tp=false;
			}
		}
	}
}
// pos, cheight, radius
let plr = new controller(new THREE.Vector2(-108,354),.2,1.2);

function mousemov(event){
	//CMYV-=event.movementX/400;
	CY-= event.movementX/300
	CX-= event.movementY/320
	CX = Math.max(Math.min(CX,1.4),-1.4)
}

function lockChangeAlert() {
  if (document.pointerLockElement === renderer.domElement ||
      document.mozPointerLockElement === renderer.domElement) {
    document.addEventListener('mousemove', mousemov, false);
  } else {
    document.removeEventListener('mousemove', mousemov, false);
  }
}

document.addEventListener('pointerlockchange', lockChangeAlert, false);
document.addEventListener('mozpointerlockchange', lockChangeAlert, false);

window.addEventListener("keydown", (event) => {
	switch (event.code){
		case "KeyW":
			Presses[0]=true;
			break;
		case "KeyS":
			Presses[1]=true;
			break;
		case "KeyD":
			Presses[2]=true;
			break;
		case "KeyA":
			Presses[3]=true;
			break;
		case "KeyC":
			crouching = true;
			break;
		case "KeyE":
			raycaster.setFromCamera({x:0,y:0},camera);
		
			const intersects = raycaster.intersectObjects( scene.children );
			if (intersects.length>0) {
				if (intersects[0].object.Interaction!=undefined){
					// implement interactions
					intersects[0].object.Interaction(plr,intersects[0].object,indexedElements);
				}
				else if (intersects[0].object.body!=undefined && intersects[0].object.grabby==true){
					grabbing = true;
					grabt = intersects[0].object.body;
					console.log("grab the damn");
				}
			}
			break;
		case "ShiftLeft":
			plr.sprinting = true;
			break;
		case "Space":
			if (plr.posy<=plr.getground()+0.2) {
				plr.jumps=1;
				plr.vy=0.7;
			}
			else if (plr.jumps>=1 && plr.jumps<=2) {
				plr.jumps+=1;
				plr.vy=0.5;
			}
			if (plr.vy==0.5||plr.vy==0.7){
				let jsf;
				switch (plr.jumps){
					case 1:
						jsf = indexedElements.sfx.ju1[Math.floor(Math.random()*2)]; 
						jsf.detune=Math.floor(Math.random()*600)-300; 
						jsf.play();
						break;
					case 2:
						jsf = indexedElements.sfx.ju2[Math.floor(Math.random()*2)];
						jsf.detune=Math.floor(Math.random()*600)-300; 
						jsf.play();
						break;					
					case 3:
						jsf = indexedElements.sfx.ju3[Math.floor(Math.random()*2)]; 
						jsf.detune=Math.floor(Math.random()*600)-300; 
						jsf.play();
						break;
				}
			}
			break;
	}
}, true);

window.addEventListener("keyup", (event) => {
	switch (event.code){
		case "KeyW":
			Presses[0]=false;
			break;
		case "KeyS":
			Presses[1]=false;
			break;
		case "KeyD":
			Presses[2]=false;
			break;
		case "KeyA":
			Presses[3]=false;
			break;
		case "KeyC":
			crouching = false;
			break;
		case "KeyE":
			grabbing = false;
			break;
		case "ShiftLeft":
			plr.sprinting = false;
			break;
	}
}, true);

const ra = (Math.PI/180)*90;

let debug = false;

const clock = new THREE.Clock()
let delta;

/* DUMB ANGLE MATH */

const fposmod = (p_x,p_y) => (p_x>=0) ? (p_x%p_y) : p_y-(-p_x%p_y);

const lerp = (x, y, a) => x * (1 - a) + y * a;

function normalize_angle(x)
{
    return fposmod(x + Math.PI, 2.0*Math.PI) - Math.PI;
}

function lerp_angle(a, b, t)
{
    if (Math.abs(a-b) >= Math.PI){
        if (a > b){
            a = normalize_angle(a) - 2.0 * Math.PI;
		}
        else{
			b = normalize_angle(b) - 2.0 * Math.PI;
		}
	}
    return lerp(a, b, t);
}

let dbt = document.getElementById("debug")
if (dbt){
	dbt.onclick = function(){
		console.log(indexedElements);
		debug = !debug;
		if (debug){
			dbt.innerHTML = "Debug: on";
		}else{
			dbt.innerHTML = "Debug: off";
		}
	};
}

document.onclick = function(){
	if (debug){
		raycaster.setFromCamera({x:0,y:0},camera);
		
		const intersects = raycaster.intersectObjects( scene.children );
		if (intersects.length>0) {console.log(intersects[0].object);}
	}
}

let t = "Not Colliding";

function controls(){
	// we only move in 2D, all 3D player physics have been eradicated
	
	plr.update();
	
	let contr = (+Presses[0])+(+Presses[1])*2+(+Presses[2])*4+(+Presses[3])*8
	//console.log(contr);
	
	if (Presses[0]==true || Presses[1]==true || Presses[2]==true || Presses[3]==true) /* move */ { plr.vel+=speed; }
	switch (contr) {
		case 1:
			plr.angle=CY;
			break;
		case 2:
			plr.angle=CY-2*ra;
			break;
		case 4:
			plr.angle=CY-ra;
			break;
		case 8:
			plr.angle=CY+ra;
			break;
		case 5:
			plr.angle=CY-(ra/2);
			break;
		case 9:
			plr.angle=CY+(ra/2);
			break;
		case 6:
			plr.angle=CY-1.5*ra;
			break;
		case 10:
			plr.angle=CY-2.5*ra;
			break;
		default:
			plr.vel*=0.9;
	}
	
	CY+=CMYV;
	
	camera.quaternion.setFromEuler(new THREE.Euler(CX,CY,0,'YZX'));
	
	posD.innerHTML = '<br>X: '+Math.round(camera.position.x*100)/100+' Y: '+Math.round(camera.position.y*100)/100+' Z: '+Math.round(camera.position.z*100)/100;
	speD.innerHTML = 'Velocity: '+plr.vel+"<br>Angle: "+plr.angle+"<br>Floor: "+plr.floor+"<br>"+t+"<br>JumpsCounter:"+plr.jumps;
	
	camera.position.set(plr.pos.x,plr.cheight+plr.posy,plr.pos.y); //set cam position
	//camera.position.set(plr.pos.x,plr.posy-1,plr.pos.y); //cam to physbody
	CMYV*=VL;
}
let WD = new THREE.Vector3(0,0,0);
const clamp = (num, a, b) => Math.max(Math.min(num,b),a)//Math.max(Math.min(num, Math.max(a, b)), Math.min(a, b));
		
function update(){
	controls();
	delta = Math.min(clock.getDelta(), 0.1)
	
    world.step(delta)
	
	physTBA.forEach((po)=>{ // po is a CANNON.Body object
		if (indexedElements[po.attachedIE]) {
			indexedElements[po.attachedIE].position.set(po.position.x,po.position.y,po.position.z);
			indexedElements[po.attachedIE].quaternion.set(
				po.quaternion.x,
				po.quaternion.y,
				po.quaternion.z,
				po.quaternion.w
			)
			if (indexedElements[po.attachedIE].body==undefined){ // the threejs object and cannon body contain eachother for finding purposes
				indexedElements[po.attachedIE].grabby = po.grabby;
				indexedElements[po.attachedIE].body=po;
			}
		}
	});
	
	indexedElements.lerpers.forEach((lerpProcess)=>{
		let NOW = Date.now();
		if (lerpProcess.Beginning==undefined) lerpProcess.Beginning = NOW; //auto set lerp time
		if (clamp((NOW-lerpProcess.Beginning)/lerpProcess.Length,0,1)==1) indexedElements.lerpers.shift(); // remove lerp when finished
		lerpProcess.Obj[lerpProcess.Property].copy(lerpProcess.Origin.clone().lerp(lerpProcess.Target,clamp((NOW-lerpProcess.Beginning)/lerpProcess.Length,0,1)));
	});
	
	if (grabbing && grabt!=undefined){
		camera.getWorldDirection(WD);
		let FAFA = camera.position.clone().add(WD.clone().multiplyScalar(3));
		let F = (new CANNON.Vec3(FAFA.x,FAFA.y,FAFA.z)).vsub(grabt.position);
		if (grabt.velocity.length()<25.6) grabt.applyForce(F.scale(128),new CANNON.Vec3(0,0,0));
		grabt.velocity=grabt.velocity.scale(0.75);
		// 2
	}
	
	if (indexedElements["Sky"]) {
		indexedElements["Sky"].position.copy(new THREE.Vector3(camera.position.x,camera.position.y,camera.position.z))
	}
}

function animate() {
	requestAnimationFrame( animate );
	
	renderer.clear();
	renderer.render( hudScene, camera );
	renderer.clearDepth();
	renderer.render( scene2, camera );
	renderer.clearDepth();
	renderer.render( scene, camera );
	
	update();
}

console.log(world);
console.log(plr);

animate();