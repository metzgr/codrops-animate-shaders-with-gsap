import { gsap } from 'gsap';
import { Draggable } from 'gsap/draggable';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { debounce, preloadImages } from '../utils';
import Stage from './Stage';

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
  div.innerHTML = `
    <img src="./images/${item.image}" alt="" role="presentation" />
    <span class="carousel-label">
      <span class="carousel-label__project">${item.project}</span>
      <span class="carousel-label__id">${item.seq}</span>
    </span>
  `;
  carouselInnerRef.appendChild(div);
});

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

function resize() {
  const innerWidth = carouselInnerRef.scrollWidth;
  const viewportWidth = window.innerWidth;
  maxScroll = Math.abs(Math.min(0, viewportWidth - innerWidth));

  draggable.applyBounds({ minX: -maxScroll, maxX: 0 });

  scrollTriggerInstance.refresh();

  stage.resize();
}

preloadImages().then(() => document.body.classList.remove('loading'));

window.addEventListener('load', resize);
window.addEventListener('resize', debounce(resize));