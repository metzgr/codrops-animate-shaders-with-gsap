import Commons from "./Commons";
import * as THREE from "three";

import fragmentShader from "../../shaders/text/text.frag";
import vertexShader from "../../shaders/text/text.vert";

import { Text } from "troika-three-text";
import { inView, animate } from "motion";

export default class WebGLText {
    commons;

    scene;
    element;

    computedStyle;
    font;
    bounds;
    color;
    material;
    mesh;

    weightToFontMap = {
        "900": "/fonts/syne/Syne-ExtraBold.ttf",
        "800": "/fonts/syne/Syne-ExtraBold.ttf",
        "700": "/fonts/syne/Syne-Bold.ttf",
        "600": "/fonts/syne/Syne-SemiBold.ttf",
        "500": "/fonts/syne/Syne-Medium.ttf",
        "400": "/fonts/syne/Syne-Regular.ttf",
        "300": "/fonts/syne/Syne-Regular.ttf",
        "200": "/fonts/syne/Syne-Regular.ttf",
        "100": "/fonts/syne/Syne-Regular.ttf",
    };

    y = 0;

    isVisible = false;

    constructor({ scene, element }) {
        this.commons = Commons.getInstance();

        this.scene = scene;
        this.element = element;

        this.computedStyle = window.getComputedStyle(this.element);

        this.createFont();
        this.createColor();
        this.createBounds();
        this.createMaterial();
        this.createMesh();
        this.setStaticValues();

        this.scene.add(this.mesh);

        this.element.style.color = "transparent";

        this.addEventListeners();
    }

    createFont() {
        this.font =
            this.weightToFontMap[this.computedStyle.fontWeight] ||
            "/fonts/syne/Syne-Regular.ttf";
    }

    createBounds() {
        this.bounds = this.element.getBoundingClientRect();
        this.y = this.bounds.top + this.commons.lenis.actualScroll; // Lenis v2 uses actualScroll? Or just scroll?
        // Note: lenis v1 uses .scroll or .animatedScroll. v2 might differ.
        // Checking main.ts from source: this.y = this.bounds.top + this.commons.lenis.actualScroll;
        // But project.js uses lenis.on('scroll') and lenis.raf.
        // If we installed latest lenis, it might be different. I will use .scroll for now and check if it breaks.
        // Wait, the new project uses `this.commons.lenis.actualScroll` in WebGLText.ts.
        // Assuming the new project uses a compatible version. I should check if `actualScroll` exists on the lenis instance I create.
        // If standard Lenis, it's usually `scroll` or `animatedScroll`.
        // Check if element or any parent is fixed
        let el = this.element;
        let isFixed = false;
        while (el && el !== document.body) {
            const style = window.getComputedStyle(el);
            if (style.position === 'fixed') {
                isFixed = true;
                break;
            }
            el = el.parentElement;
        }

        // If fixed, we don't include scroll in the initial Y calculation relative to document
        // We just want its viewport position
        this.y = this.bounds.top + (isFixed ? 0 : (this.commons.lenis.scroll || window.scrollY));
        this.isFixed = isFixed;
    }

    createColor() {
        this.color = new THREE.Color(this.computedStyle.color);
    }

    createMaterial() {
        this.material = new THREE.ShaderMaterial({
            fragmentShader,
            vertexShader,
            side: THREE.DoubleSide, // Sometimes needed for text
            uniforms: {
                uProgress: { value: 0 },
                uHeight: { value: this.bounds.height },
                uColor: { value: this.color },
            },
        });
    }

    createMesh() {
        this.mesh = new Text();

        this.mesh.text = this.element.innerText;
        this.mesh.font = this.font;

        this.mesh.anchorX = "50%";
        this.mesh.anchorY = "50%";

        this.mesh.material = this.material;
    }

    setStaticValues() {
        const { fontSize, letterSpacing, lineHeight, whiteSpace, textAlign } =
            this.computedStyle;

        const fontSizeNum = window.parseFloat(fontSize);

        this.mesh.fontSize = fontSizeNum;

        this.mesh.textAlign = textAlign;

        this.mesh.letterSpacing = parseFloat(letterSpacing) / fontSizeNum || 0; // fallback to 0 if NaN

        this.mesh.lineHeight = parseFloat(lineHeight) / fontSizeNum || 1; // fallback

        this.mesh.maxWidth = this.bounds.width;

        this.mesh.whiteSpace = whiteSpace;
    }

    // Redoing show/hide based on source purely to minimize friction, assuming it works with installed 'motion' package.
    show() {
        this.isVisible = true;
        animate(
            this.material.uniforms.uProgress,
            { value: 1 },
            { duration: 1.8, ease: [0.25, 1, 0.5, 1] }
        );
    }

    hide() {
        animate(
            this.material.uniforms.uProgress,
            { value: 0 },
            { duration: 1.8, onComplete: () => (this.isVisible = false) }
        );
    }


    onResize() {
        this.computedStyle = window.getComputedStyle(this.element);
        this.createBounds();
        this.setStaticValues();
        this.material.uniforms.uHeight.value = this.bounds.height;
        this.mesh.sync(); // Troika text needs sync? Usually auto-updates but good to check.
    }

    update() {
        if (this.isVisible) {
            const scroll = this.commons.lenis.scroll || 0;

            // If fixed, we use the stored Y (viewport relative) directly.
            // If not fixed, we use Y (document relative) and subtract scroll to get viewport relative.

            // Current Logic for absolute: meshY = -docY + scroll + centerOffset
            // Logic for fixed: meshY = -viewportY + centerOffset

            const viewportY = this.isFixed ? this.y : (this.y - scroll);

            this.mesh.position.y =
                -viewportY +
                this.commons.sizes.screen.height / 2 -
                this.bounds.height / 2;

            // Calculate center X
            this.mesh.position.x =
                (this.bounds.left + this.bounds.width / 2) - this.commons.sizes.screen.width / 2;
        }
    }

    addEventListeners() {
        inView(this.element, () => {
            this.show();
            // User requested title to "stay put", so we don't hide it on scroll out
            // return () => this.hide(); 
        });
    }
}
