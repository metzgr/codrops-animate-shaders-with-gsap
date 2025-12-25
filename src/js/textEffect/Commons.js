import { PerspectiveCamera, WebGLRenderer, Clock } from "three";

export default class Commons {
    constructor() { }

    static instance;

    lenis;
    camera;
    renderer;

    time = new Clock();
    elapsedTime;

    sizes = {
        screen: {
            width: window.innerWidth,
            height: window.innerHeight,
            aspect: window.innerWidth / window.innerHeight,
        },
        pixelRatio: this.getPixelRatio(),
    };

    distanceFromCamera = 1000;

    static getInstance() {
        if (this.instance) return this.instance;
        this.instance = new Commons();
        return this.instance;
    }

    init(lenis) {
        this.lenis = lenis;
        this.createCamera();
        this.createRenderer();
    }

    // Lenis creation removed, we use the injected instance

    createCamera() {
        this.camera = new PerspectiveCamera(
            70,
            this.sizes.screen.aspect,
            200,
            2000
        );
        this.camera.position.z = this.distanceFromCamera;
        this.syncDimensions();
        this.camera.updateProjectionMatrix();
    }

    createRenderer() {
        this.renderer = new WebGLRenderer({
            alpha: true,
            antialias: true,
        });

        this.renderer.setSize(this.sizes.screen.width, this.sizes.screen.height);
        this.renderer.setPixelRatio(this.sizes.pixelRatio);

        // Append to body and style it to overlay
        this.renderer.domElement.classList.add('webgl-text-canvas');
        this.renderer.domElement.style.position = 'fixed';
        this.renderer.domElement.style.top = '0';
        this.renderer.domElement.style.left = '0';
        this.renderer.domElement.style.pointerEvents = 'none';
        this.renderer.domElement.style.zIndex = '1000';

        document.body.appendChild(this.renderer.domElement);
    }

    getPixelRatio() {
        return Math.min(window.devicePixelRatio, 2);
    }

    onResize() {
        this.sizes.screen = {
            width: window.innerWidth,
            height: window.innerHeight,
            aspect: window.innerWidth / window.innerHeight,
        };
        this.sizes.pixelRatio = this.getPixelRatio();

        this.renderer.setSize(this.sizes.screen.width, this.sizes.screen.height);
        this.renderer.setPixelRatio(this.sizes.pixelRatio);

        this.onResizeCamera();
    }

    onResizeCamera() {
        this.syncDimensions();
        this.camera.aspect = this.sizes.screen.aspect;
        this.camera.updateProjectionMatrix();
    }

    syncDimensions() {
        this.camera.fov =
            2 *
            Math.atan(this.sizes.screen.height / 2 / this.distanceFromCamera) *
            (180 / Math.PI);
    }

    update() {
        this.elapsedTime = this.time.getElapsedTime();
    }
}
