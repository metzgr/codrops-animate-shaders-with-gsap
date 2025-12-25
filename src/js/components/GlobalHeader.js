export class GlobalHeader {
    constructor(options = {}) {
        this.el = document.querySelector(options.element || 'header.frame');
        this.title = options.title || 'Ivan Metzger';
        this.subtitle = options.subtitle || 'I design data-driven systems that help the Nation decide what to do next';
        this.isProjectPage = options.isProjectPage || false;

        this.init();
    }

    init() {
        if (!this.el) return;
        this.render();
    }

    render() {
        // Determine link URLs and active states
        const portfolioLink = this.isProjectPage ? './index.html' : 'https://tympanus.net/codrops/demos/?tag=gsap';
        const portfolioClass = !this.isProjectPage ? 'active' : '';
        const titleClass = 'frame__title';

        this.el.innerHTML = `
            <nav class="frame__tags">
                <a href="${portfolioLink}" class="${portfolioClass}">PORTFOLIO</a>
            </nav>
            <div class="frame__center">
                <h1 class="${titleClass}" data-animation="webgl-text">${this.title}</h1>
                ${this.subtitle ? `<p class="frame__description">${this.subtitle}</p>` : ''}
            </div>
            <nav class="frame__resume">
                <a href="#">BIO</a>
            </nav>
        `;
    }
}
