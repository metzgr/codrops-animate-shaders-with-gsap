
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
        const numChars = 300; // More intense downpour
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
        const size = 19.5;

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
        el.textContent = '◆';
        this.container.appendChild(el);
        this.domElements.push(el);
    }

    // Called when carousel layout is known or updated
    setCarouselItems(items) {
        // remove existing static bodies
        this.staticBodies.forEach(compositeBody => {
            // It's likely an array of bodies now
            if (Array.isArray(compositeBody)) {
                compositeBody.forEach(b => Matter.Composite.remove(this.engine.world, b));
            } else {
                Matter.Composite.remove(this.engine.world, compositeBody);
            }
        });
        this.staticBodies = [];
        this.itemRects = [];

        items.forEach(item => {
            this.itemRects.push({ el: item, bodies: null });
        });

        // Create bucket bodies for them
        const wallThickness = 20;

        this.itemRects.forEach(itemData => {
            // Find the image within the item to get the "shaded area" bounds
            const img = itemData.el.querySelector('img');
            const rect = img ? img.getBoundingClientRect() : itemData.el.getBoundingClientRect();

            // Floor
            // Positioned so top edge aligns with rect.bottom
            const floor = Matter.Bodies.rectangle(
                rect.left + rect.width / 2,
                rect.bottom + wallThickness / 2,
                rect.width,
                wallThickness,
                { isStatic: true }
            );

            // Left Wall
            // Positioned so right (inner) edge aligns with rect.left
            const leftWall = Matter.Bodies.rectangle(
                rect.left - wallThickness / 2,
                rect.top + rect.height / 2,
                wallThickness,
                rect.height,
                { isStatic: true }
            );

            // Right Wall
            // Positioned so left (inner) edge aligns with rect.right
            const rightWall = Matter.Bodies.rectangle(
                rect.right + wallThickness / 2,
                rect.top + rect.height / 2,
                wallThickness,
                rect.height,
                { isStatic: true }
            );

            const bodies = [floor, leftWall, rightWall];
            itemData.bodies = bodies;
            Matter.Composite.add(this.engine.world, bodies);
            this.staticBodies.push(bodies);
        });
    }

    update() {
        // 1. Step the physics engine
        Matter.Engine.update(this.engine, 1000 / 60);

        // 2. Sync Static Bodies (Carousel Items) to their visual position
        // This handles the carousel dragging/scrolling
        const wallThickness = 20;

        this.itemRects.forEach(itemData => {
            const img = itemData.el.querySelector('img');
            const rect = img ? img.getBoundingClientRect() : itemData.el.getBoundingClientRect();
            const [floor, leftWall, rightWall] = itemData.bodies;

            // Update Floor
            Matter.Body.setPosition(floor, {
                x: rect.left + rect.width / 2,
                y: rect.bottom + wallThickness / 2
            });

            // Update Left Wall
            Matter.Body.setPosition(leftWall, {
                x: rect.left - wallThickness / 2,
                y: rect.top + rect.height / 2
            });

            // Update Right Wall
            Matter.Body.setPosition(rightWall, {
                x: rect.right + wallThickness / 2,
                y: rect.top + rect.height / 2
            });
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
