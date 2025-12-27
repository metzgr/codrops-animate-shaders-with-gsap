// Text Animation Imports
import Commons from './textEffect/Commons';
import WebGLText from './textEffect/WebGLText';
import PostProcessing from './textEffect/PostProcessing';
import * as THREE from 'three';
import { GlobalHeader } from './components/GlobalHeader';

// Data & Utils
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { preloadImages } from './utils';
import { carouselData } from './demo4/carouselData';

gsap.registerPlugin(ScrollTrigger);

// --- Layout & Content Generation code (unchanged) ---
const layouts = [
    { r: 1, c: 1, s: 4 },
    { r: 2, c: 5, s: 3 },
    { r: 3, c: 3, s: 2 },
    { r: 4, c: 1, s: 2 },
    { r: 5, c: 3, s: 5 },
    { r: 6, c: 2, s: 1 },
    { r: 7, c: 3, s: 3 },
    { r: 8, c: 6, s: 2 },
    { r: 9, c: 1, s: 5 },
    { r: 10, c: 6, s: 3 },
];

const params = new URLSearchParams(window.location.search);
const projectName = params.get('project') || "President’s Management Agenda";

// Init Header
new GlobalHeader({
    title: projectName,
    subtitle: '', // No subtitle on project page? Or maybe we want one? Old HTML didn't have one in center div.
    isProjectPage: true
});

document.title = `${projectName} - Ivan Metzger`;

document.title = `${projectName} - Ivan Metzger`;

const grid = document.querySelector('.grid');
const projectItems = carouselData.filter(item => item.project === projectName);

if (projectItems.length === 0) {
    grid.innerHTML = '<p style="text-align:center;">No images found for this project.</p>';
} else {
    projectItems.forEach((item, index) => {
        const layout = layouts[index % layouts.length];
        const span = layout.s || 1;

        const figure = document.createElement('figure');
        figure.className = 'grid__item';
        figure.style.setProperty('--r', layout.r);
        figure.style.setProperty('--c', layout.c);
        figure.style.setProperty('--s', span);

        const seq = String(index + 1).padStart(2, '0');

        figure.innerHTML = `
            <div class="grid__item-img">
                <div class="grid__item-img-inner" style="background-image:url(./images/${item.image});"></div>
            </div>
            <figcaption class="grid__item-caption">
                <h3>${item.project}</h3> <span>${seq}</span>
            </figcaption>
        `;

        grid.appendChild(figure);
    });
}

// --- Text Animation Globals ---
let commons;
let scene;
let texts = [];
let postProcessing;

const initTextAnimation = (lenisInstance) => {
    // Wait for fonts?
    document.fonts.ready.then(() => {
        commons = Commons.getInstance();
        commons.init(lenisInstance); // Pass existing Lenis

        scene = new THREE.Scene();

        const textElements = document.querySelectorAll('[data-animation="webgl-text"]');
        if (textElements) {
            texts = Array.from(textElements).map(el => new WebGLText({
                element: el,
                scene: scene
            }));
        }

        postProcessing = new PostProcessing({ scene });

        // Add resize listener
        window.addEventListener("resize", () => {
            commons.onResize();
            texts.forEach(el => el.onResize());
            postProcessing.onResize();
        });

        // Start animation loop incorporated with GSAP ticker or separate raf?
        // Since we hook into GSAP ticker for Lenis, we can hook this in too.
        gsap.ticker.add(() => {
            commons.update();
            texts.forEach(el => el.update());
            postProcessing.update();
        });
    });
};


// --- Animation & Smooth Scroll ---
let lenis;

const initSmoothScrolling = () => {
    lenis = new Lenis({
        lerp: 0.15,
        smoothWheel: true
    });

    lenis.on('scroll', () => ScrollTrigger.update());

    gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);

    // Initialize Text Animation now that Lenis is ready
    initTextAnimation(lenis);
};

const scroll = () => {
    const gridItems = document.querySelectorAll('.grid__item');
    gridItems.forEach((item) => {
        const previousElementSibling = item.previousElementSibling;
        const isLeftSide = previousElementSibling && (item.offsetLeft + item.offsetWidth <= previousElementSibling.offsetLeft + 1);
        const originX = isLeftSide ? 100 : 0;

        gsap.timeline({
            defaults: { ease: 'power4' },
            scrollTrigger: {
                trigger: item,
                start: 'top bottom-=15%',
                end: '+=100%',
                scrub: true
            }
        })
            .fromTo(item.querySelector('.grid__item-img'), {
                scale: 0,
                transformOrigin: `${originX}% 0%`
            }, {
                scale: 1
            })
            .fromTo(item.querySelector('.grid__item-img-inner'), {
                scale: 5,
                transformOrigin: `${originX}% 0%`
            }, {
                scale: 1
            }, 0)
            .fromTo(item.querySelector('.grid__item-caption'), {
                xPercent: () => isLeftSide ? 100 : -100,
                opacity: 0
            }, {
                ease: 'power1',
                xPercent: 0,
                opacity: 1
            }, 0);
    });
};

preloadImages('.grid__item-img-inner').then(() => {
    initSmoothScrolling();
    scroll();
    document.body.classList.remove('loading');
});
