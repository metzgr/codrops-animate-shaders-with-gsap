import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { debounce, preloadImages } from '../utils';
import Stage from './Stage';
import FallingCharEffect from './FallingCharEffect';
import Commons from '../textEffect/Commons';
import WebGLText from '../textEffect/WebGLText';
import PostProcessing from '../textEffect/PostProcessing';
import * as THREE from 'three';
import Lenis from 'lenis';

import { carouselData } from './carouselData';

gsap.registerPlugin(Draggable, InertiaPlugin, ScrollTrigger);

const carouselWrapper = document.querySelector('.content');
const carouselInnerRef = document.querySelector('.content__carousel-inner');

// Process Data: Assign IDs per project
const projectCounts = {};
const processedData = carouselData.map(item => {
  if (!projectCounts[item.project]) projectCounts[item.project] = 0;
  projectCounts[item.project]++;
  const seq = String(projectCounts[item.project]).padStart(3, '0');
  return { ...item, seq };
});

// Randomize Order
for (let i = processedData.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [processedData[i], processedData[j]] = [processedData[j], processedData[i]];
}

// Clear and Inject HTML
carouselInnerRef.innerHTML = '';
processedData.forEach(item => {
  const div = document.createElement('div');
  div.className = 'content__carousel-image';
  div.style.cursor = 'pointer';
  div.onclick = () => window.location.href = `/project.html?project=${encodeURIComponent(item.project)}`;
  div.innerHTML = `
    <img src="./images/${item.image}" alt="" role="presentation" />
    <span class="carousel-label">
      <span class="carousel-label__project">${item.project}</span>
      <span class="carousel-label__id">${item.seq}</span>
    </span>
  `;
  div.addEventListener('mouseenter', () => {
    stage.onHover(processedData.indexOf(item), true);
  });
  div.addEventListener('mouseleave', () => {
    stage.onHover(processedData.indexOf(item), false);
  });
  carouselInnerRef.appendChild(div);
});



const fallingCharEffect = new FallingCharEffect();
// Wait a bit for layout or just pass items now (images might load later altering layout but usually dimensions are fixed)
const carouselItems = Array.from(document.querySelectorAll('.content__carousel-image'));
fallingCharEffect.setCarouselItems(carouselItems);

const stage = new Stage(carouselWrapper);
let scrollPos = 0;

const draggable = new Draggable(carouselInnerRef, {
  type: 'x',
  inertia: true,
  dragResistance: 0.5,
  edgeResistance: 0.5,
  throwResistance: 0.5,
  throwProps: true,
  onDrag() {
    const progress = gsap.utils.normalize(draggable.maxX, draggable.minX, draggable.x);
    scrollPos = scrollTriggerInstance.start + (scrollTriggerInstance.end - scrollTriggerInstance.start) * progress;

    scrollTriggerInstance.scroll(scrollPos);

    if (stage.effect.callback) stage.effect.callback();
  },
  onThrowUpdate() {
    const progress = gsap.utils.normalize(draggable.maxX, draggable.minX, draggable.x);
    scrollPos = scrollTriggerInstance.start + (scrollTriggerInstance.end - scrollTriggerInstance.start) * progress;

    scrollTriggerInstance.scroll(scrollPos);

    if (stage.effect.callback) stage.effect.callback();
  },
});

let maxScroll = Math.abs(Math.min(0, window.innerWidth - carouselInnerRef.scrollWidth));

const scrollTriggerInstance = ScrollTrigger.create({
  trigger: carouselWrapper,
  start: 'top top',
  end: `+=${2.5 * maxScroll}`,
  pin: true,
  scrub: 0.05,
  anticipatePin: 1,
  invalidateOnRefresh: true,
  onUpdate(e) {
    const x = -maxScroll * e.progress;

    gsap.set(carouselInnerRef, { x });
    draggable.x = x;
    draggable.update();

    if (stage.effect.callback) stage.effect.callback();
  }
});


gsap.ticker.add(stage.render.bind(stage));
gsap.ticker.add(() => fallingCharEffect.update());

function resize() {
  const innerWidth = carouselInnerRef.scrollWidth;
  const viewportWidth = window.innerWidth;
  maxScroll = Math.abs(Math.min(0, viewportWidth - innerWidth));

  draggable.applyBounds({ minX: -maxScroll, maxX: 0 });

  scrollTriggerInstance.refresh();

  scrollTriggerInstance.refresh();

  stage.resize();
  fallingCharEffect.resize();
  // re-set items to get new rects
  fallingCharEffect.setCarouselItems(carouselItems);
}

preloadImages().then(() => document.body.classList.remove('loading'));

// --- Text Animation Globals ---
let commons;
let scene;
let texts = [];
let postProcessing;

// Initialize Lenis for Home
const lenis = new Lenis({
  lerp: 0.1, // Smooth
  smoothWheel: true,
  orientation: 'vertical', // Default
});

lenis.on('scroll', ScrollTrigger.update);

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});

gsap.ticker.lagSmoothing(0);

// Initialize Text Animation
initTextAnimation(lenis);

function initTextAnimation(lenisInstance) {
  document.fonts.ready.then(() => {
    commons = Commons.getInstance();

    commons.init(lenisInstance);

    scene = new THREE.Scene();

    const textElements = document.querySelectorAll('[data-animation="webgl-text"]');

    if (textElements) {
      texts = Array.from(textElements).map(el => {
        return new WebGLText({
          element: el,
          scene: scene
        });
      });
    }

    postProcessing = new PostProcessing({ scene, enableVelocity: false });

    window.addEventListener("resize", () => {
      commons.onResize();
      texts.forEach(el => el.onResize());
      postProcessing.onResize();
    });

    gsap.ticker.add(() => {
      commons.update();
      texts.forEach(el => el.update());
      postProcessing.update();
    });
  });
};

window.addEventListener('load', resize);
window.addEventListener('resize', debounce(resize));