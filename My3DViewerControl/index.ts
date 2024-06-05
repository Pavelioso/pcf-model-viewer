import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';

export class My3DViewerControl implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private _container: HTMLDivElement;
    private _renderer: THREE.WebGLRenderer;
    private _scene: THREE.Scene;
    private _camera: THREE.PerspectiveCamera;
    private _cube: THREE.Mesh;
    private _raycaster: THREE.Raycaster;
    private _mouse: THREE.Vector2;
    private _orbitControls: OrbitControls;
    private _vehicle: THREE.Object3D | null = null;
    private _debugText: Text;
    private static loadedObject: THREE.Object3D | null = null;



    constructor() {
        // nothing here
    }

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {
        this._container = container;

        // Track window size - important for code inside updateView.
        context.mode.trackContainerResize(true);

        // DEBUG TEXT ON TOP
        this._debugText = container.appendChild(document.createTextNode("debug"));

        
        // Initialize Three.js renderer
        this._renderer = new THREE.WebGLRenderer({ antialias: true });
        this._renderer.setClearColor(0xffffff); // Set background color to white - can set to different color to see the edges of the render window.
        this._renderer.shadowMap.enabled = true; // Enable shadow maps
        
        container.appendChild(this._renderer.domElement);
        

        // Create a scene
        this._scene = new THREE.Scene();

        // Add a camera
        this._camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        this._camera.position.z = 2;

        // Initialize OrbitControls
        this._orbitControls = new OrbitControls(this._camera, this._renderer.domElement);
        this._orbitControls.enableDamping = true;
        this._orbitControls.dampingFactor = 0.25;
        this._orbitControls.enableZoom = true;


        //const url = 'https://raw.githubusercontent.com/Pavelioso/pcf-model-viewer/main/My3DViewerControl/assets/renegade/renegade.obj';
        //My3DViewerControl.loadObjModel(url, this._scene);
        
        
        // Create a cube
        const geometry = new THREE.BoxGeometry();
        const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 }); // Use MeshStandardMaterial for better lighting
        this._cube = new THREE.Mesh(geometry, material);
        this._cube.castShadow = true; // Enable casting shadows
        this._scene.add(this._cube);

        // Create a plane to receive the shadow
        const planeGeometry = new THREE.PlaneGeometry(500, 500);
        const planeMaterial = new THREE.ShadowMaterial({ opacity: 0.5 });
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.rotation.x = -Math.PI / 2;
        plane.position.y = -1;
        plane.receiveShadow = true; // Enable receiving shadows
        this._scene.add(plane);

        // Add a directional light
        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(5, 5, 5);
        light.castShadow = true; // Enable shadow casting by the light
        light.shadow.mapSize.width = 1024;
        light.shadow.mapSize.height = 1024;
        this._scene.add(light);

        // Initialize raycaster and mouse vector
        this._raycaster = new THREE.Raycaster();
        this._mouse = new THREE.Vector2();

        // Add event listener for mouse click
        container.addEventListener('click', this.onMouseClick.bind(this), false);
        container.addEventListener('mousemove', this.onMouseMove.bind(this), false);

        // Render the scene
        const animate = () => {
            requestAnimationFrame(animate);
            this._orbitControls.update(); // Update orbit controls
            this._renderer.render(this._scene, this._camera);
        };
        animate();
    }

    // Update mouse coordinates
    private onMouseMove(event: MouseEvent): void {
        this._mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this._mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }

    // Change color on mouse click to check the 3D scene is interactable.
    private onMouseClick(event: MouseEvent): void {
        // Update the raycaster with the mouse position and the camera
        this._raycaster.setFromCamera(this._mouse, this._camera);

        // Calculate objects intersected by the raycaster
        const intersects = this._raycaster.intersectObjects(this._scene.children);

        if (intersects.length > 0) {
            // Check if the intersected object is the cube
            if (intersects[0].object === this._cube) {
                const material = this._cube.material;
                if (Array.isArray(material)) {
                    material.forEach((mat) => {
                        if (mat instanceof THREE.MeshStandardMaterial) {
                            mat.color.setHex(Math.random() * 0xffffff); // Change color on click
                        }
                    });
                } else if (material instanceof THREE.MeshStandardMaterial) {
                    material.color.setHex(Math.random() * 0xffffff); // Change color on click
                }
            }
        }
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        // Change the render size depending on the parent container (the container that is inside the Canvas App)
        const width = context.mode.allocatedWidth;
        const height = context.mode.allocatedHeight;

        this._renderer.setSize(width, height);
        this._camera.aspect = width / height;
        this._camera.updateProjectionMatrix();

        this._debugText.textContent = context.parameters.sampleProperty.raw || '';

        

        // REFRESH MODEL
        const url = context.parameters.sampleProperty.raw || '';
        My3DViewerControl.loadObjModel(url, this._scene)


    }

    public getOutputs(): IOutputs {
        return {};
    }

    public destroy(): void {
        // Cleanup
        this._renderer.dispose();
    }

    private static loadObjModel(url: string, scene: THREE.Scene): void {
        // Remove the previously loaded object from the scene if it exists
        if (My3DViewerControl.loadedObject !== null) {
            scene.remove(My3DViewerControl.loadedObject);
            My3DViewerControl.loadedObject = null;
        }
    
        const loader = new OBJLoader();
        loader.load(url, (object) => {
            object.position.y = -1;
            object.castShadow = true;
    
            // Traverse the object and assign materials
            object.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    const mesh = child as THREE.Mesh;
                    mesh.material = new THREE.MeshStandardMaterial({
                        color: 0xffffff,  // You can choose any color you prefer
                        roughness: 0.1,
                        metalness: 0.2
                    });
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                }
            });
    
            // Add the loaded object to the scene
            scene.add(object);
            My3DViewerControl.loadedObject = object; // Track the loaded object
        }, undefined, (error) => {
            console.error('An error happened', error);
        });
    }
    
}
