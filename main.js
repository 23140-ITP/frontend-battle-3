/* ==========================================================================
   AetherFlow Interactive Engine (main.js)
   Features:
   - Dynamic Matrix Pricing Switcher (Performance-Isolated)
   - Bento-to-Accordion Context Lock Wrapper
   - Three.js Neural Plexus Hero Background (with Canvas2D Fallback)
   - Countdown Timer, Banner Close, Testimonial Carousel & Scroll-to-Top
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------------------------
    // 0. PRETEXT LAYOUT ENGINE — Height-Aware Text Layout
    // ----------------------------------------------------------------------
    // Pattern 1: Basic height computation (Simple layout + Card/grid tier)
    // Uses window.Pretext exposed by the inlined pretext.js in <head>
    function initPretext() {
        if (typeof window.Pretext === 'undefined') return;
        const { prepare, layout } = window.Pretext;

        const elements = document.querySelectorAll('[data-pretext]');
        const prepared = new Map();

        // PREPARE — one-time measurement after fonts are ready
        document.fonts.ready.then(() => {
            for (const el of elements) {
                const text = el.textContent.trim();
                if (!text) continue;
                const font = getComputedStyle(el).font;
                try {
                    prepared.set(el, prepare(text, font));
                } catch (e) {
                    // Silently ignore elements where Pretext cannot parse the font string
                }
            }
            relayout();
        });

        // LAYOUT — fast, called on every resize
        function relayout() {
            for (const [el, handle] of prepared) {
                try {
                    const style = getComputedStyle(el);
                    const lineHeight = parseFloat(style.lineHeight) ||
                        parseFloat(style.fontSize) * 1.5;
                    const { height } = layout(handle, el.clientWidth, lineHeight);
                    if (height > 0) {
                        el.style.minHeight = `${height}px`;
                    }
                } catch (e) {
                    // Skip elements where layout cannot compute
                }
            }
        }

        // RESIZE-AWARE — re-layout on every body resize (viewport changes)
        new ResizeObserver(() => relayout()).observe(document.body);

        // CONTENT-EDITABLE — re-prepare and re-layout when text is edited
        for (const el of elements) {
            if (el.contentEditable === 'true') {
                new MutationObserver(() => {
                    const text = el.textContent.trim();
                    if (!text) return;
                    const font = getComputedStyle(el).font;
                    try {
                        prepared.set(el, prepare(text, font));
                        relayout();
                    } catch (e) {
                        // Silently ignore font parse errors on mutation
                    }
                }).observe(el, { characterData: true, subtree: true, childList: true });
            }
        }
    }

    // Initialize Pretext layout engine
    initPretext();


    // ----------------------------------------------------------------------
    // 1. ANNOUNCEMENT BANNER & COUNTDOWN TIMER
    // ----------------------------------------------------------------------
    const banner = document.getElementById('banner');
    const closeBannerBtn = document.getElementById('close-banner');
    const countdownEl = document.getElementById('countdown');

    if (closeBannerBtn && banner) {
        closeBannerBtn.addEventListener('click', () => {
            banner.style.display = 'none';
        });
    }

    // Initialize a 3-hour countdown timer
    let duration = 3 * 60 * 60; // 3 hours in seconds
    const startCountdown = () => {
        const timer = setInterval(() => {
            if (duration <= 0) {
                clearInterval(timer);
                if (countdownEl) countdownEl.textContent = "00h 00m 00s";
                return;
            }

            duration--;
            const hours = Math.floor(duration / 3600);
            const minutes = Math.floor((duration % 3600) / 60);
            const seconds = duration % 60;

            const format = (num) => String(num).padStart(2, '0');
            if (countdownEl) {
                countdownEl.textContent = `${format(hours)}h ${format(minutes)}m ${format(seconds)}s`;
            }
        }, 1000);
    };
    startCountdown();


    // ----------------------------------------------------------------------
    // 2. STATE-ISOLATED PRICING ENGINE (Feature 1)
    // ----------------------------------------------------------------------
    // Multidimensional configuration matrix factoring in exchange rates and regional tariff variables
    const PRICING_MATRIX = {
        USD: { symbol: '$', rate: 1.00, tariff: 1.00 }, // Standard US Tariff
        EUR: { symbol: '€', rate: 0.92, tariff: 1.05 }, // EU Regional Tariff adjustment (5% import tariff surcharge)
        INR: { symbol: '₹', rate: 84.00, tariff: 0.95 } // India Regional Cost index adjustment (5% local cost reduction)
    };

    const TIER_BASE_RATES = {
        starter: 29,
        pro: 99,
        enterprise: 249
    };

    const currencySelect = document.getElementById('currency-select');
    const billingToggle = document.getElementById('billing-toggle');
    const billingLabels = {
        monthly: document.getElementById('label-monthly'),
        yearly: document.getElementById('label-yearly')
    };

    // Pre-select DOM target nodes to isolate updates and avoid page search reflows
    const priceElements = {
        starter: {
            amount: document.getElementById('price-starter'),
            currency: document.getElementById('currency-starter'),
            subtext: document.getElementById('subtext-starter')
        },
        pro: {
            amount: document.getElementById('price-pro'),
            currency: document.getElementById('currency-pro'),
            subtext: document.getElementById('subtext-pro')
        },
        enterprise: {
            amount: document.getElementById('price-enterprise'),
            currency: document.getElementById('currency-enterprise'),
            subtext: document.getElementById('subtext-enterprise')
        }
    };

    const animatePrice = (element, start, end, duration) => {
        if (start === end) {
            element.textContent = end;
            return;
        }
        const startTime = performance.now();
        const animate = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = progress * (2 - progress); // easeOutQuad
            const currentVal = Math.round(start + (end - start) * ease);
            element.textContent = currentVal;
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);
    };

    const updatePricing = () => {
        const selectedCurrency = currencySelect.value || 'USD';
        const isAnnual = billingToggle.getAttribute('aria-checked') === 'true';
        const currencyConfig = PRICING_MATRIX[selectedCurrency];

        // 1. Calculate values and mutate only the specific leaf DOM text nodes
        Object.keys(TIER_BASE_RATES).forEach(tier => {
            const baseRate = TIER_BASE_RATES[tier];
            const rateMultiplier = currencyConfig.rate;
            const tariffModifier = currencyConfig.tariff;
            const currencySymbol = currencyConfig.symbol;
            
            let finalPrice;
            let subtextString;

            if (isAnnual) {
                // Apply flat 20% annual discount multiplier on the monthly rate
                const monthlyRateWithDiscount = baseRate * 0.8;
                // Compute: base rate * regional rate multiplier * regional tariff * annual discount
                finalPrice = Math.round(monthlyRateWithDiscount * rateMultiplier * tariffModifier);
                
                const totalYearlyCost = Math.round(baseRate * 12 * 0.8 * rateMultiplier * tariffModifier);
                subtextString = `Billed annually (${currencySymbol}${totalYearlyCost}/yr)`;
            } else {
                // Compute: base rate * regional rate multiplier * regional tariff
                finalPrice = Math.round(baseRate * rateMultiplier * tariffModifier);
                subtextString = 'Billed monthly';
            }

            // 2. Perform isolated DOM leaf element mutations (guarantees zero component reflow)
            const elements = priceElements[tier];
            if (elements) {
                if (elements.currency.textContent !== currencySymbol) {
                    elements.currency.textContent = currencySymbol;
                }
                const currentVal = parseInt(elements.amount.textContent, 10) || 0;
                if (currentVal !== finalPrice) {
                    animatePrice(elements.amount, currentVal, finalPrice, 200);
                } else {
                    elements.amount.textContent = finalPrice;
                }
                if (elements.subtext.textContent !== subtextString) {
                    elements.subtext.textContent = subtextString;
                }
            }
        });

        // 3. Highlight active billing cycle label
        if (isAnnual) {
            billingLabels.yearly?.classList.add('active');
            billingLabels.monthly?.classList.remove('active');
        } else {
            billingLabels.monthly?.classList.add('active');
            billingLabels.yearly?.classList.remove('active');
        }
    };

    // Currency Switcher change listener
    if (currencySelect) {
        currencySelect.addEventListener('change', updatePricing);
    }

    // Billing Toggle click listener
    if (billingToggle) {
        billingToggle.addEventListener('click', () => {
            const isChecked = billingToggle.getAttribute('aria-checked') === 'true';
            billingToggle.setAttribute('aria-checked', !isChecked);
            updatePricing();
        });
    }

    // Initialize pricing values on load
    updatePricing();


    // ----------------------------------------------------------------------
    // 3. BENTO-TO-ACCORDION WRAPPER & CONTEXT LOCK (Feature 2)
    // ----------------------------------------------------------------------
    let activeBentoIndex = 0; // State variable tracking currently active bento/accordion card
    const bentoCards = document.querySelectorAll('.bento-card');
    const mobileBreakpoint = 768;
    let isMobileView = window.innerWidth <= mobileBreakpoint;

    // Desktop hover state listener
    const initDesktopBentoHover = () => {
        bentoCards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                if (window.innerWidth > mobileBreakpoint) {
                    const index = parseInt(card.dataset.index, 10);
                    setActiveIndex(index);
                }
            });
        });
    };

    // Helper function for custom WAAPI mobile accordion heights
    const animateAccordion = (cardBody, open, duration = 350) => {
        if (!cardBody) return;

        // Cancel any active animation
        if (cardBody.activeAnimation) {
            cardBody.activeAnimation.cancel();
        }

        const startHeight = open ? 0 : cardBody.scrollHeight;
        const endHeight = open ? cardBody.scrollHeight : 0;
        const startOpacity = open ? 0 : 1;
        const endOpacity = open ? 1 : 0;
        const startTransform = open ? 'translateY(-10px)' : 'translateY(0)';
        const endTransform = open ? 'translateY(0)' : 'translateY(-10px)';

        // Temporarily override the CSS transitions so they do not conflict
        cardBody.style.transition = 'none';

        // Pre-set margin/gap for correct scrollHeight layout computation
        if (open) {
            cardBody.style.marginTop = '1rem';
            cardBody.style.gap = '1rem';
        }

        // Trigger layout reflow
        cardBody.offsetHeight;

        const animation = cardBody.animate([
            { height: `${startHeight}px`, opacity: startOpacity, transform: startTransform },
            { height: `${endHeight}px`, opacity: endOpacity, transform: endTransform }
        ], {
            duration: duration,
            easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
            fill: 'forwards'
        });

        cardBody.activeAnimation = animation;

        animation.onfinish = () => {
            cardBody.activeAnimation = null;
            // Restore CSS transition
            cardBody.style.transition = '';
            
            // Lock static styling state
            cardBody.style.height = open ? 'auto' : '0px';
            cardBody.style.maxHeight = open ? 'none' : '0px';
            cardBody.style.opacity = open ? '1' : '0';
            cardBody.style.transform = open ? 'translateY(0)' : 'translateY(-10px)';
            
            if (!open) {
                cardBody.style.marginTop = '0';
                cardBody.style.gap = '0';
            }
        };
    };

    // Mobile Accordion click listener
    const initMobileAccordionClick = () => {
        bentoCards.forEach(card => {
            const header = card.querySelector('.card-header');
            if (header) {
                header.addEventListener('click', (e) => {
                    if (window.innerWidth <= mobileBreakpoint) {
                        const index = parseInt(card.dataset.index, 10);
                        const isCurrentlyActive = card.classList.contains('active');
                        
                        // Toggle Accordion expansion: if tap active, collapse it. Otherwise expand clicked.
                        if (isCurrentlyActive) {
                            card.classList.remove('active');
                            card.setAttribute('aria-expanded', 'false');
                            const cardBody = card.querySelector('.card-body');
                            if (cardBody) {
                                animateAccordion(cardBody, false);
                            }
                            activeBentoIndex = -1;
                        } else {
                            setActiveIndex(index);
                        }
                    }
                });
            }
        });
    };

    // Helper function to update active class on cards cleanly
    const setActiveIndex = (index) => {
        activeBentoIndex = index;
        bentoCards.forEach(card => {
            const cardIndex = parseInt(card.dataset.index, 10);
            const cardBody = card.querySelector('.card-body');
            const shouldBeOpen = (cardIndex === index);
            
            if (shouldBeOpen) {
                card.classList.add('active');
                card.setAttribute('aria-expanded', 'true');
            } else {
                card.classList.remove('active');
                card.setAttribute('aria-expanded', 'false');
            }

            if (cardBody) {
                if (window.innerWidth <= mobileBreakpoint) {
                    const isCurrentlyOpen = cardBody.offsetHeight > 0;
                    if (shouldBeOpen !== isCurrentlyOpen) {
                        animateAccordion(cardBody, shouldBeOpen);
                    } else {
                        // Ensure static alignment
                        cardBody.style.height = shouldBeOpen ? 'auto' : '0px';
                        cardBody.style.maxHeight = shouldBeOpen ? 'none' : '0px';
                        cardBody.style.opacity = shouldBeOpen ? '1' : '0';
                        cardBody.style.transform = shouldBeOpen ? 'translateY(0)' : 'translateY(-10px)';
                        cardBody.style.marginTop = shouldBeOpen ? '1rem' : '0';
                        cardBody.style.gap = shouldBeOpen ? '1rem' : '0';
                    }
                } else {
                    // Desktop view: clear inline styles to allow standard desktop CSS grid layout
                    cardBody.style.height = '';
                    cardBody.style.maxHeight = '';
                    cardBody.style.opacity = '';
                    cardBody.style.transform = '';
                    cardBody.style.marginTop = '';
                    cardBody.style.gap = '';
                }
            }
        });
    };

    // Responsive State Context Lock Handler
    const handleResize = () => {
        const currentIsMobile = window.innerWidth <= mobileBreakpoint;
        
        // Check if layout crossed the mobile breakpoint threshold
        if (currentIsMobile !== isMobileView) {
            isMobileView = currentIsMobile;

            if (isMobileView) {
                // Transitioning Desktop -> Mobile: Transfer bento index to expand accordion panel
                setActiveIndex(activeBentoIndex);
                
                // Smoothly scroll the activated accordion panel into view
                const activeCard = document.querySelector(`.bento-card[data-index="${activeBentoIndex}"]`);
                if (activeCard) {
                    setTimeout(() => {
                        activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }, 100);
                }
            } else {
                // Transitioning Mobile -> Desktop: Clear inline styles
                bentoCards.forEach(card => {
                    const cardBody = card.querySelector('.card-body');
                    if (cardBody) {
                        if (cardBody.activeAnimation) {
                            cardBody.activeAnimation.cancel();
                            cardBody.activeAnimation = null;
                        }
                        cardBody.style.transition = '';
                        cardBody.style.height = '';
                        cardBody.style.maxHeight = '';
                        cardBody.style.opacity = '';
                        cardBody.style.transform = '';
                        cardBody.style.marginTop = '';
                        cardBody.style.gap = '';
                    }
                });
                setActiveIndex(activeBentoIndex);
            }
        } else if (isMobileView) {
            // If already mobile, adjust scrollHeight on resize
            bentoCards.forEach(card => {
                const cardBody = card.querySelector('.card-body');
                if (cardBody && card.classList.contains('active')) {
                    cardBody.style.height = 'auto';
                    cardBody.style.maxHeight = 'none';
                }
            });
        }
    };

    window.addEventListener('resize', handleResize);

    // Initialize Features Event Listeners
    initDesktopBentoHover();
    initMobileAccordionClick();

    // Keyboard support for Bento grid / Accordion
    bentoCards.forEach(card => {
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const index = parseInt(card.dataset.index, 10);
                if (window.innerWidth <= mobileBreakpoint) {
                    const isCurrentlyActive = card.classList.contains('active');
                    if (isCurrentlyActive) {
                        card.classList.remove('active');
                        card.setAttribute('aria-expanded', 'false');
                        const cardBody = card.querySelector('.card-body');
                        if (cardBody) {
                            animateAccordion(cardBody, false);
                        }
                        activeBentoIndex = -1;
                    } else {
                        setActiveIndex(index);
                    }
                } else {
                    setActiveIndex(index);
                }
            }
        });
    });


    // ----------------------------------------------------------------------
    // 4. TESTIMONIALS CAROUSEL
    // ----------------------------------------------------------------------
    const testimonials = [
        {
            quote: "Deploying AetherFlow cut our data pipeline setup from days to literal minutes. The multi-currency dynamic calculations and state replication models just work out-of-the-box.",
            author: "Alex Cristache",
            title: "Principal Cloud Architect, DeepMind Systems"
        },
        {
            quote: "I've never seen transitions this fluid in native CSS before. The bento layout refactoring to accordion on responsive resizes is a masterclass in UX design.",
            author: "Nisha Rao",
            title: "VP of Product Engineering, Synthesis Labs"
        },
        {
            quote: "AetherFlow's isolated DOM text updates make performance debugging a thing of the past. Under performance profiling, it logs flatline layout times. Insane.",
            author: "Marcus Chen",
            title: "Technical Architect, Apex Data"
        }
    ];

    let currentTestimonialIndex = 0;
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');
    const quoteEl = document.querySelector('.testimonial-quote');
    const authorNameEl = document.querySelector('.author-name');
    const authorTitleEl = document.querySelector('.author-title');

    const updateTestimonial = (index) => {
        if (!quoteEl || !authorNameEl || !authorTitleEl) return;
        
        const data = testimonials[index];
        // Fade out transition using opacity animation
        const card = document.querySelector('.testimonial-card');
        if (card) {
            card.style.opacity = '0';
            card.style.transform = 'translateY(5px)';
            
            setTimeout(() => {
                quoteEl.textContent = `"${data.quote}"`;
                authorNameEl.textContent = data.author;
                authorTitleEl.textContent = data.title;
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 200);
        }
    };

    if (prevBtn && nextBtn) {
        prevBtn.addEventListener('click', () => {
            currentTestimonialIndex = (currentTestimonialIndex - 1 + testimonials.length) % testimonials.length;
            updateTestimonial(currentTestimonialIndex);
        });

        nextBtn.addEventListener('click', () => {
            currentTestimonialIndex = (currentTestimonialIndex + 1) % testimonials.length;
            updateTestimonial(currentTestimonialIndex);
        });
    }


    // ----------------------------------------------------------------------
    // 5. SCROLL TO TOP & SCROLL INTERACTION
    // ----------------------------------------------------------------------
    const scrollTopBtn = document.getElementById('scroll-top');
    const navbar = document.getElementById('navbar');

    window.addEventListener('scroll', () => {
        // Toggle Scroll to Top button visibility
        if (window.scrollY > 300) {
            scrollTopBtn?.classList.add('visible');
        } else {
            scrollTopBtn?.classList.remove('visible');
        }

        // Add scrolled background glassmorphism effect to navbar
        if (window.scrollY > 50) {
            navbar?.classList.add('scrolled');
        } else {
            navbar?.classList.remove('scrolled');
        }
    });

    if (scrollTopBtn) {
        scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }


    // ----------------------------------------------------------------------
    // 6. THREE.JS / CANVAS NEURAL NET BACKDROP
    // ----------------------------------------------------------------------
    const canvasContainer = document.getElementById('threejs-canvas-container');
    
    // Check if Three.js is loaded successfully, otherwise invoke custom Canvas2D Plexus fallback
    if (typeof THREE !== 'undefined' && canvasContainer) {
        initThreeJSPlexus(canvasContainer);
    } else if (canvasContainer) {
        initCanvas2DPlexus(canvasContainer);
    }

    function initThreeJSPlexus(container) {
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Scene & Camera
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        camera.position.z = 80;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        // Particle system definition
        const particleCount = 70;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = [];

        // Distribute nodes randomly in coordinates
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 120; // x
            positions[i * 3 + 1] = (Math.random() - 0.5) * 80; // y
            positions[i * 3 + 2] = (Math.random() - 0.5) * 40; // z

            velocities.push({
                x: (Math.random() - 0.5) * 0.08,
                y: (Math.random() - 0.5) * 0.08,
                z: (Math.random() - 0.5) * 0.04
            });
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        // Create Particle Material (Accent primary Forsythia Yellow)
        const particleMaterial = new THREE.PointsMaterial({
            color: 0xFFC801, // Forsythia Yellow
            size: 1.0,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });

        const particleSystem = new THREE.Points(geometry, particleMaterial);
        scene.add(particleSystem);

        // Line Connections structure (dynamic drawing between close nodes)
        const maxConnections = particleCount * 5;
        const lineGeometry = new THREE.BufferGeometry();
        const linePositions = new Float32Array(maxConnections * 2 * 3);
        const lineColors = new Float32Array(maxConnections * 2 * 3);

        lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
        lineGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));

        const lineMaterial = new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.1,
            blending: THREE.AdditiveBlending
        });

        const lineMesh = new THREE.LineSegments(lineGeometry, lineMaterial);
        scene.add(lineMesh);

        // Interaction state
        let mouseX = 0, mouseY = 0;
        window.addEventListener('mousemove', (e) => {
            mouseX = (e.clientX / window.innerWidth - 0.5) * 20;
            mouseY = -(e.clientY / window.innerHeight - 0.5) * 20;
        });

        // Animation Loop
        const animate = () => {
            requestAnimationFrame(animate);

            const posArr = geometry.attributes.position.array;
            let lineIdx = 0;
            const linePosArr = lineGeometry.attributes.position.array;
            const lineColArr = lineGeometry.attributes.color.array;

            // Move particles and respect box limits
            for (let i = 0; i < particleCount; i++) {
                posArr[i * 3] += velocities[i].x;
                posArr[i * 3 + 1] += velocities[i].y;
                posArr[i * 3 + 2] += velocities[i].z;

                // Bounce boundaries
                if (Math.abs(posArr[i * 3]) > 70) velocities[i].x *= -1;
                if (Math.abs(posArr[i * 3 + 1]) > 50) velocities[i].y *= -1;
                if (Math.abs(posArr[i * 3 + 2]) > 30) velocities[i].z *= -1;

                // Line connection logic
                for (let j = i + 1; j < particleCount; j++) {
                    const dx = posArr[i * 3] - posArr[j * 3];
                    const dy = posArr[i * 3 + 1] - posArr[j * 3 + 1];
                    const dz = posArr[i * 3 + 2] - posArr[j * 3 + 2];
                    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

                    if (dist < 22 && lineIdx < maxConnections) {
                        // Set start point
                        linePosArr[lineIdx * 6] = posArr[i * 3];
                        linePosArr[lineIdx * 6 + 1] = posArr[i * 3 + 1];
                        linePosArr[lineIdx * 6 + 2] = posArr[i * 3 + 2];
                        
                        // Set end point
                        linePosArr[lineIdx * 6 + 3] = posArr[j * 3];
                        linePosArr[lineIdx * 6 + 4] = posArr[j * 3 + 1];
                        linePosArr[lineIdx * 6 + 5] = posArr[j * 3 + 2];

                        // Gradient lines: transition from Forsythia to Saffron based on depth
                        const alpha = 1 - (dist / 22);
                        // Forsythia: rgb(255, 200, 1) => r=1.00, g=0.78, b=0.00
                        // Deep Saffron: rgb(255, 153, 50) => r=1.00, g=0.60, b=0.20
                        const r = 1.0;
                        const g = 0.60 + (0.184 * alpha);
                        const b = 0.196 - (0.192 * alpha);

                        lineColArr[lineIdx * 6] = r * alpha;
                        lineColArr[lineIdx * 6 + 1] = g * alpha;
                        lineColArr[lineIdx * 6 + 2] = b * alpha;
                        
                        lineColArr[lineIdx * 6 + 3] = r * alpha;
                        lineColArr[lineIdx * 6 + 4] = g * alpha;
                        lineColArr[lineIdx * 6 + 5] = b * alpha;

                        lineIdx++;
                    }
                }
            }

            // Clear remaining line vertices
            for (let k = lineIdx; k < maxConnections; k++) {
                linePosArr[k * 6] = 0;
                linePosArr[k * 6 + 1] = 0;
                linePosArr[k * 6 + 2] = 0;
                linePosArr[k * 6 + 3] = 0;
                linePosArr[k * 6 + 4] = 0;
                linePosArr[k * 6 + 5] = 0;
            }

            geometry.attributes.position.needsUpdate = true;
            lineGeometry.attributes.position.needsUpdate = true;
            lineGeometry.attributes.color.needsUpdate = true;

            // Camera hover effect
            camera.position.x += (mouseX - camera.position.x) * 0.05;
            camera.position.y += (mouseY - camera.position.y) * 0.05;
            camera.lookAt(scene.position);

            renderer.render(scene, camera);
        };

        animate();

        // Canvas element resizing listener
        window.addEventListener('resize', () => {
            const w = container.clientWidth;
            const h = container.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        });
    }

    // Fallback Canvas 2D Plexus rendering if ThreeJS fails to initialize
    function initCanvas2DPlexus(container) {
        const canvas = document.createElement('canvas');
        container.appendChild(canvas);
        const ctx = canvas.getContext('2d');

        let width = canvas.width = container.clientWidth;
        let height = canvas.height = container.clientHeight;

        const points = [];
        const maxPoints = 50;

        for (let i = 0; i < maxPoints; i++) {
            points.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.6,
                vy: (Math.random() - 0.5) * 0.6,
                radius: Math.random() * 1.5 + 1
            });
        }

        const animate2D = () => {
            requestAnimationFrame(animate2D);
            ctx.clearRect(0, 0, width, height);

            points.forEach((p, idx) => {
                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0 || p.x > width) p.vx *= -1;
                if (p.y < 0 || p.y > height) p.vy *= -1;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = '#FFC801';
                ctx.fill();

                // Draw connecting lines
                for (let j = idx + 1; j < points.length; j++) {
                    const p2 = points[j];
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);

                    if (dist < 100) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.strokeStyle = `rgba(255, 153, 50, ${0.15 * (1 - dist / 100)})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            });
        };

        animate2D();

        window.addEventListener('resize', () => {
            width = canvas.width = container.clientWidth;
            height = canvas.height = container.clientHeight;
        });
    }

    // ----------------------------------------------------------------------
    // 7. SCROLL-REVEAL OBSERVATION
    // ----------------------------------------------------------------------
    const revealEls = document.querySelectorAll('.reveal');
    if (revealEls.length > 0) {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });
        revealEls.forEach(el => revealObserver.observe(el));
    }

    // ----------------------------------------------------------------------
    // 8. MOBILE HAMBURGER MENU TOGGLE
    // ----------------------------------------------------------------------
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const navMenu = document.getElementById('nav-menu');
    if (hamburgerBtn && navMenu) {
        hamburgerBtn.addEventListener('click', () => {
            const isOpen = navMenu.classList.toggle('mobile-open');
            hamburgerBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });

        // Close mobile menu when a nav link is clicked
        navMenu.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                navMenu.classList.remove('mobile-open');
                hamburgerBtn.setAttribute('aria-expanded', 'false');
            });
        });
    }

    // ----------------------------------------------------------------------
    // 9. ACTIVE NAV ITEM ON SCROLL
    // ----------------------------------------------------------------------
    const sections = document.querySelectorAll('section[id]');
    const navItems = document.querySelectorAll('.nav-item');
    if (sections.length > 0 && navItems.length > 0) {
        const sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    navItems.forEach(item => item.classList.remove('nav-active'));
                    const activeLink = document.querySelector(`.nav-item[href="#${entry.target.id}"]`);
                    if (activeLink) activeLink.classList.add('nav-active');
                }
            });
        }, { threshold: 0.4, rootMargin: "-80px 0px -20% 0px" });
        sections.forEach(s => sectionObserver.observe(s));
    }

    // ----------------------------------------------------------------------
    // 10. MAGNETIC BUTTON HOVER PHYSICS
    // ----------------------------------------------------------------------
    const initMagneticButtons = () => {
        const buttons = document.querySelectorAll('.btn-primary, .btn-secondary, .btn-terminal-run');
        
        buttons.forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                btn.style.transition = 'transform 0.1s ease-out';
            });
            btn.addEventListener('mousemove', (e) => {
                const rect = btn.getBoundingClientRect();
                const mouseX = e.clientX - rect.left - rect.width / 2;
                const mouseY = e.clientY - rect.top - rect.height / 2;
                
                const pullForce = 4; // pull up to 4px
                const x = (mouseX / (rect.width / 2)) * pullForce;
                const y = (mouseY / (rect.height / 2)) * pullForce;
                btn.style.transform = `translate(${x}px, ${y}px)`;
            });
            btn.addEventListener('mouseleave', () => {
                // Spring back smoothly
                btn.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
                btn.style.transform = '';
                // Restore default CSS transitions after spring animation completes
                setTimeout(() => {
                    btn.style.transition = '';
                }, 300);
            });
        });
    };
    initMagneticButtons();

    // ----------------------------------------------------------------------
    // 11. BENTO CARD SPOTLIGHT GLOW
    // ----------------------------------------------------------------------
    const initBentoSpotlight = () => {
        const cards = document.querySelectorAll('.bento-card');
        cards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                card.style.setProperty('--mouse-x', `${x}px`);
                card.style.setProperty('--mouse-y', `${y}px`);
            });
        });
    };
    initBentoSpotlight();

    // ----------------------------------------------------------------------
    // 12. INTERACTIVE TERMINAL SIMULATOR
    // ----------------------------------------------------------------------
    const runSimulationBtn = document.getElementById('run-simulation');
    const logsContainer = document.getElementById('logs-container');
    const simulatorLogs = document.getElementById('simulator-logs');

    if (runSimulationBtn && logsContainer && simulatorLogs) {
        let activeTimeouts = [];

        runSimulationBtn.addEventListener('click', () => {
            // Cancel any running simulation timeouts/resets to allow clean re-triggers
            activeTimeouts.forEach(clearTimeout);
            activeTimeouts = [];

            // Disable button during execution
            runSimulationBtn.disabled = true;
            runSimulationBtn.textContent = 'Running...';

            // Show logs panel
            simulatorLogs.style.display = 'block';
            logsContainer.innerHTML = '';

            const logs = [
                { text: 'Initializing AetherFlow webhook engine...', type: 'info', delay: 100 },
                { text: 'EVENT: Incoming POST from API Gateway (source: client_83k)', type: 'event', delay: 500 },
                { text: 'Validating payload authenticity (HMAC-SHA256)...', type: 'info', delay: 1000 },
                { text: 'SUCCESS: Signature validated successfully.', type: 'success', delay: 1400 },
                { text: 'Dispatching payload to multi-region replication queue...', type: 'info', delay: 1900 },
                { text: 'REPLICATOR: US-EAST -> EU-WEST sync initiated.', type: 'event', delay: 2300 },
                { text: 'REPLICATOR: Syncing regional cache AP-SOUTH...', type: 'event', delay: 3000 },
                { text: 'SUCCESS: State synchronized across 3 regions in 42ms.', type: 'success', delay: 4200 },
                { text: 'Webhook executed successfully. Status 200 OK (total: 104ms).', type: 'success', delay: 4700 }
            ];

            // Replicators and lines
            const secondLine = document.querySelectorAll('.replicator-grid .rep-line')[1];
            const apSouthRegion = document.querySelectorAll('.replicator-grid .rep-region')[2];

            // Clean up any old active styling at start
            if (secondLine) {
                secondLine.classList.remove('active');
                const dot = secondLine.querySelector('.rep-progress-dot');
                if (dot) dot.remove();
            }
            if (apSouthRegion) {
                apSouthRegion.classList.remove('active');
            }

            logs.forEach(log => {
                const timeoutId = setTimeout(() => {
                    const line = document.createElement('div');
                    line.className = 'log-line';

                    const timeSpan = document.createElement('span');
                    timeSpan.className = 'log-time';
                    const now = new Date();
                    const pad = (n) => String(n).padStart(2, '0');
                    timeSpan.textContent = `[${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}]`;

                    const textSpan = document.createElement('span');
                    textSpan.className = `log-${log.type}`;
                    textSpan.textContent = log.text;

                    line.appendChild(timeSpan);
                    line.appendChild(textSpan);
                    logsContainer.appendChild(line);

                    // Auto-scroll terminal
                    simulatorLogs.scrollTop = simulatorLogs.scrollHeight;

                    // Trigger replicator visuals dynamically
                    if (log.text.includes('US-EAST -> EU-WEST')) {
                        // Reset line 1 dot animation for a fresh animation burst
                        const firstLineDot = document.querySelector('.replicator-grid .rep-line.active .rep-progress-dot');
                        if (firstLineDot) {
                            firstLineDot.style.animation = 'none';
                            firstLineDot.offsetHeight; // trigger reflow
                            firstLineDot.style.animation = 'flowDot 1.5s linear infinite';
                        }
                    }

                    if (log.text.includes('AP-SOUTH')) {
                        if (secondLine && apSouthRegion) {
                            secondLine.classList.add('active');
                            let dot = secondLine.querySelector('.rep-progress-dot');
                            if (!dot) {
                                dot = document.createElement('div');
                                dot.className = 'rep-progress-dot';
                                secondLine.appendChild(dot);
                            }
                            dot.style.animation = 'none';
                            dot.offsetHeight; // reflow
                            dot.style.animation = 'flowDot 1.5s linear infinite';

                            const activeTimeout = setTimeout(() => {
                                apSouthRegion.classList.add('active');
                            }, 1000);
                            activeTimeouts.push(activeTimeout);
                        }
                    }
                }, log.delay);

                activeTimeouts.push(timeoutId);
            });

            // Re-enable button and reset AP-SOUTH region visual state
            const completionTimeout = setTimeout(() => {
                runSimulationBtn.disabled = false;
                runSimulationBtn.textContent = 'Trigger Event';

                if (secondLine) {
                    secondLine.classList.remove('active');
                    const dot = secondLine.querySelector('.rep-progress-dot');
                    if (dot) dot.remove();
                }
                if (apSouthRegion) {
                    apSouthRegion.classList.remove('active');
                }
            }, 6500);

            activeTimeouts.push(completionTimeout);
        });
    }
});
