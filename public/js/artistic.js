document.addEventListener('DOMContentLoaded', () => {
    
    // -----------------------------------------------------
    // CUSTOM SPOTLIGHT CURSOR (Resn Inspiration)
    // -----------------------------------------------------
    const cursor = document.createElement('div');
    cursor.id = 'sa-cursor';
    const cursorRing = document.createElement('div');
    cursorRing.id = 'sa-cursor-ring';
    
    document.body.appendChild(cursor);
    document.body.appendChild(cursorRing);

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;
    
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        cursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
    });

    const loop = () => {
        ringX += (mouseX - ringX) * 0.15;
        ringY += (mouseY - ringY) * 0.15;
        cursorRing.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
        requestAnimationFrame(loop);
    };
    loop();


    // -----------------------------------------------------
    // PARALLAX GHOST TEXT & NAVBAR SCROLL
    // -----------------------------------------------------
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;
        
        if (navbar) {
            if (scrollY > 50) navbar.classList.add('scrolled');
            else navbar.classList.remove('scrolled');
        }

        const ghostText = document.querySelector('.ghost-text');
        if (ghostText) {
            ghostText.style.transform = `translate(-50%, calc(-50% + ${scrollY * 0.4}px))`;
        }
    }, { passive: true });


    // -----------------------------------------------------
    // SCROLL REVEAL OBSERVER (Awwwards Entrance)
    // Handles dynamic elements loaded by AngularJS router
    // -----------------------------------------------------
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (entry.target.classList.contains('equipment-card-artistic')) {
                    entry.target.classList.add('reveal');
                }
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
            }
        });
    }, {
        root: null,
        rootMargin: '0px 0px -50px 0px',
        threshold: 0.1
    });

    // Helper to observe all current elements
    const observeAll = () => {
        document.querySelectorAll('.reveal:not(.revealed), .reveal-left:not(.revealed), .equipment-card-artistic:not(.revealed)').forEach(el => {
            revealObserver.observe(el);
            // Safety fallback: if they don't load or trigger, reveal them automatically after 1 second
            setTimeout(() => {
                if (!el.classList.contains('revealed')) {
                    el.classList.add('revealed');
                }
            }, 1000);
        });
    };

    // Since this is an AngularJS SPA, we monitor DOM changes
    const domObserver = new MutationObserver((mutations) => {
        let shouldReobserve = false;
        for (let mutation of mutations) {
            if (mutation.addedNodes.length > 0) {
                shouldReobserve = true;
                break;
            }
        }
        if (shouldReobserve) observeAll();
    });

    domObserver.observe(document.body, { childList: true, subtree: true });
    observeAll(); // initial run
});
