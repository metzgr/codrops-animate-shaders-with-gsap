import {
    EffectComposer,
    RenderPass,
    ShaderPass,
} from "three/examples/jsm/Addons.js";

import Commons from "./Commons";
import * as THREE from "three";

import fragmentShader from "../../shaders/postprocessing/postprocessing.frag";
import vertexShader from "../../shaders/postprocessing/postprocessing.vert";

export default class PostProcessing {
    commons;
    scene;

    composer;
    renderPass;
    shiftPass;

    lerpedVelocity = 0;
    lerpFactor = 0.15;

    constructor({ scene }) {
        this.commons = Commons.getInstance();
        this.scene = scene;

        this.createComposer();
        this.createPasses();
    }

    createComposer() {
        this.composer = new EffectComposer(this.commons.renderer);
        this.composer.setPixelRatio(this.commons.sizes.pixelRatio);
        this.composer.setSize(
            this.commons.sizes.screen.width,
            this.commons.sizes.screen.height
        );
    }

    createPasses() {
        this.renderPass = new RenderPass(this.scene, this.commons.camera);
        this.composer.addPass(this.renderPass);

        const shiftShader = {
            uniforms: {
                tDiffuse: { value: null },
                uVelocity: { value: 0 },
                uTime: { value: 0 },
            },
            vertexShader,
            fragmentShader,
        };

        this.shiftPass = new ShaderPass(shiftShader);
        this.composer.addPass(this.shiftPass);
    }

    onResize() {
        this.composer.setPixelRatio(this.commons.sizes.pixelRatio);
        this.composer.setSize(
            this.commons.sizes.screen.width,
            this.commons.sizes.screen.height
        );
    }

    update() {
        this.shiftPass.uniforms.uTime.value = this.commons.elapsedTime;

        // Lenis velocity
        const targetVelocity = this.commons.lenis.velocity || 0;

        this.lerpedVelocity +=
            (targetVelocity - this.lerpedVelocity) * this.lerpFactor;

        this.shiftPass.uniforms.uVelocity.value = this.lerpedVelocity;

        this.composer.render();
    }
}
