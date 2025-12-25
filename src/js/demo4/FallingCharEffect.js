
import Matter from 'matter-js';
import { gsap } from 'gsap';

export default class FallingCharEffect {
    constructor() {
        this.engine = null;
        this.runner = null;
        this.render = null;
        this.bodies = []; // dynamic falling bodies
        this.domElements = []; // corresponding DOM elements
        this.staticBodies = []; // bodies for carousel items
        this.container = null;
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.itemRects = []; // Store visual rects of carousel items to sync physics bodies

        this.init();
    }

    init() {
        // Create container for falling characters
        this.container = document.createElement('div');
        this.container.classList.add('falling-chars-container');
        document.body.appendChild(this.container);

        // Setup Matter.js
        this.engine = Matter.Engine.create();
        this.engine.gravity.y = 0.5; // Adjust gravity

        // Create random falling characters
        const numChars = 150; // Use a reasonable number
        for (let i = 0; i < numChars; i++) {
            this.createFallingChar();
        }

        // We will call this.update() manually via GSAP ticker in main.js
        // So we don't need Matter.Runner.run here if we want strict sync
        // But for simplicity, we can use Matter.Runner for physics steps 
        // and just sync positions in update.
        // Let's stick to manual update for enabling smoother sync if needed.
    }

    createFallingChar() {
        const x = Math.random() * this.width;
        const y = Math.random() * -this.height * 2; // Start well above
        const size = 14;

        // Physics body
        const body = Matter.Bodies.rectangle(x, y, size, size, {
            friction: 0.1,
            restitution: 0.6, // Bounciness
            angle: Math.random() * Math.PI * 2
        });

        Matter.Composite.add(this.engine.world, body);
        this.bodies.push(body);

        // DOM Element
        const el = document.createElement('div');
        el.classList.add('falling-char');
        el.textContent = '+';
        this.container.appendChild(el);
        this.domElements.push(el);
    }

    // Called when carousel layout is known or updated
    setCarouselItems(items) {
        // remove existing static bodies
        this.staticBodies.forEach(body => Matter.Composite.remove(this.engine.world, body));
        this.staticBodies = [];
        this.itemRects = [];

        items.forEach(item => {
            const rect = item.getBoundingClientRect();
            // Store initial relative offset or just use the element reference if we want to query rect every frame (expensive)
            // Better: pass the element and draggable offset info.
            // For now, let's just create bodies based on current Rect and update them in render() by tracking element position

            // Actually, since we have the draggable, we know the scroll offset.
            // But simple way: just use the element's client rect for positioning, 
            // assuming we update it every frame.

            // We need to store reference to element to query its position
            this.itemRects.push({ el: item, body: null });
        });

        // Create bodies for them
        this.itemRects.forEach(itemData => {
            const rect = itemData.el.getBoundingClientRect();
            // Matter.js bodies are positioned at their center
            const body = Matter.Bodies.rectangle(
                rect.left + rect.width / 2,
                rect.top + rect.height / 2,
                rect.width,
                rect.height,
                { isStatic: true }
            );
            itemData.body = body;
            Matter.Composite.add(this.engine.world, body);
            this.staticBodies.push(body);
        });
    }

    update() {
        // 1. Step the physics engine
        Matter.Engine.update(this.engine, 1000 / 60);

        // 2. Sync Static Bodies (Carousel Items) to their visual position
        // This handles the carousel dragging/scrolling
        this.itemRects.forEach(itemData => {
            const rect = itemData.el.getBoundingClientRect();
            Matter.Body.setPosition(itemData.body, {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            });

            // Also update rotation/scale if needed, but for now just pos
        });

        // 3. Sync DOM elements to Falling Bodies
        for (let i = 0; i < this.bodies.length; i++) {
            const body = this.bodies[i];
            const el = this.domElements[i];

            // Reset if out of bounds (below screen)
            if (body.position.y > this.height + 50) {
                Matter.Body.setPosition(body, {
                    x: Math.random() * this.width,
                    y: -50 - Math.random() * 200
                });
                Matter.Body.setVelocity(body, { x: 0, y: 0 });
            }

            // Apply transform
            el.style.transform = `translate3d(${body.position.x - 7}px, ${body.position.y - 7}px, 0) rotate(${body.angle}rad)`;
        }
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        // Ideally recreate borders if we had screen edges, etc.
    }
}
