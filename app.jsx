/* global React, ReactDOM, gsap, ScrollTrigger, Lenis, SplitType */
const { useState, useEffect, useRef, useCallback } = React;

const hasGSAP = () => typeof gsap !== "undefined";
const hasLenis = () => typeof Lenis !== "undefined";
const hasSplitType = () => typeof SplitType !== "undefined";

// ============================================================
// HOOKS
// ============================================================

function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.15 });
    ref.current.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return ref;
}

// ============================================================
// CURSOR
// ============================================================

function Cursor() {
  const dot = useRef(null);
  useEffect(() => {
    if (window.matchMedia("(hover: none)").matches) return;
    document.body.classList.add("has-custom-cursor");
    const el = dot.current;
    let x = 0, y = 0, tx = 0, ty = 0;
    const onMove = (e) => { tx = e.clientX; ty = e.clientY; };
    const tick = () => {
      x += (tx - x) * 0.32;
      y += (ty - y) * 0.32;
      if (el) el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      raf = requestAnimationFrame(tick);
    };
    let raf = requestAnimationFrame(tick);
    window.addEventListener("mousemove", onMove);

    const onOver = (e) => {
      if (e.target.closest('a, button, [data-cursor], input, textarea')) {
        el.classList.add("hover");
      }
    };
    const onOut = (e) => {
      if (e.target.closest('a, button, [data-cursor], input, textarea')) {
        el.classList.remove("hover");
      }
    };
    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseout", onOut);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
      document.body.classList.remove("has-custom-cursor");
    };
  }, []);
  return <div className="cursor" ref={dot}></div>;
}

// ============================================================
// NAVBAR
// ============================================================

function Navbar({ lang, setLang, theme, setTheme, t }) {
  return (
    <nav className="nav">
      <a href="#top" className="nav-logo">vallarta<span className="dot">.</span>web</a>
      <div className="nav-links">
        <a href="#servicios" className="nav-link">{t.nav.services}</a>
        <a href="#proceso" className="nav-link">{t.nav.process}</a>
        <a href="#portafolio" className="nav-link">{t.nav.work}</a>
        <a href="#cta" className="nav-link">{t.nav.contact}</a>
        <div className="nav-toggles">
          <button
            className="toggle"
            onClick={() => setLang(lang === "es" ? "en" : "es")}
            aria-label="Toggle language"
          >
            {lang.toUpperCase()} / {lang === "es" ? "EN" : "ES"}
          </button>
          <button
            className="toggle"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            <span className="pip" style={{ background: theme === "dark" ? "#fccc6c" : "#0a2540" }}></span>
            {theme === "dark" ? "DARK" : "LIGHT"}
          </button>
          <a href="#cta" className="btn-nav-cta">{t.nav.cta}</a>
        </div>
      </div>
    </nav>
  );
}

// ============================================================
// HERO
// ============================================================

function Hero({ t, audioOn, toggleAudio }) {
  const ref = useReveal();
  const h1Ref = useRef(null);

  useEffect(() => {
    if (!hasGSAP() || !hasSplitType() || !h1Ref.current) return;
    const split = new SplitType(h1Ref.current, { types: "chars" });
    gsap.set(split.chars, { opacity: 0, y: 40 });
    const tween = gsap.to(split.chars, {
      opacity: 1,
      y: 0,
      duration: 1.2,
      ease: "expo.out",
      stagger: 0.025,
      delay: 0.25,
    });
    return () => {
      tween.kill();
      split.revert();
    };
  }, [t.hero.h1a, t.hero.h1b]);

  return (
    <section className="hero grain" id="top" ref={ref}>
      <video className="video-bg" src="assets/hero.mp4" autoPlay muted loop playsInline preload="auto"></video>
      <div className="hero-overlay"></div>
      <div className="hero-content">
        <div className="section-label mono reveal">{t.hero.label}</div>
        <h1 className="display hero-h1" ref={h1Ref}>
          {t.hero.h1a}<br />
          {t.hero.h1b}<span className="dot">.</span>
        </h1>
        <p className="hero-sub reveal delay-2">{t.hero.sub}</p>
        <div className="hero-ctas reveal delay-3">
          <a href="#cta" className="btn-primary">{t.hero.cta}</a>
          <a href="#portafolio" className="btn-secondary-link">{t.hero.ctaSec}</a>
        </div>
      </div>
      <div className="scroll-indicator">
        <div className="scroll-line"></div>
        <div className="scroll-label">{t.hero.scroll}</div>
      </div>
      <div className={`audio-control ${audioOn ? "on" : ""}`}>
        <span className="mono audio-label">{audioOn ? `${t.hero.ambient} · ON` : t.hero.ambientOff}</span>
        <button className={`audio-btn ${audioOn ? "on" : ""}`} onClick={toggleAudio} aria-label="Toggle ambient audio">
          <div className="audio-bars">
            <span></span><span></span><span></span><span></span>
          </div>
        </button>
      </div>
    </section>
  );
}

// ============================================================
// MANIFIESTO
// ============================================================

function Manifiesto({ t }) {
  const sectionRef = useRef(null);
  const videoRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (!hasGSAP() || !sectionRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        videoRef.current,
        { scale: 1.1 },
        {
          scale: 1.0,
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 1,
          },
        }
      );
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 75%",
            end: "top 30%",
            scrub: 1,
          },
        }
      );
      gsap.to(contentRef.current, {
        opacity: 0,
        y: -50,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "bottom 65%",
          end: "bottom 15%",
          scrub: 1,
        },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section className="manifiesto grain" id="manifiesto" ref={sectionRef}>
      <video ref={videoRef} className="video-bg" src="assets/manifiesto.mp4" autoPlay muted loop playsInline preload="metadata"></video>
      <div className="manifiesto-overlay"></div>
      <div className="manifiesto-content" ref={contentRef}>
        <div className="section-label mono">{t.mani.label}</div>
        <h2 className="display">
          {t.mani.h2a}<br />
          {t.mani.h2b}<em>{t.mani.h2bi}</em>{t.mani.h2c}
        </h2>
        <p>{t.mani.body}</p>
      </div>
    </section>
  );
}

// ============================================================
// SERVICIOS
// ============================================================

function Servicios({ t }) {
  const ref = useReveal();

  useEffect(() => {
    if (!hasGSAP() || !ref.current) return;
    if (window.matchMedia("(hover: none), (max-width: 900px)").matches) return;
    const cards = ref.current.querySelectorAll(".svc-card");
    const handlers = [];
    cards.forEach((card) => {
      const quickX = gsap.quickTo(card, "rotationY", { duration: 0.5, ease: "power2.out" });
      const quickY = gsap.quickTo(card, "rotationX", { duration: 0.5, ease: "power2.out" });
      gsap.set(card, { transformPerspective: 900, transformOrigin: "center" });
      const onMove = (e) => {
        const r = card.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5;
        const ny = (e.clientY - r.top) / r.height - 0.5;
        quickX(nx * 8);
        quickY(-ny * 8);
      };
      const onLeave = () => {
        gsap.to(card, { rotationX: 0, rotationY: 0, duration: 0.8, ease: "power3.out" });
      };
      card.addEventListener("mousemove", onMove);
      card.addEventListener("mouseleave", onLeave);
      handlers.push(() => {
        card.removeEventListener("mousemove", onMove);
        card.removeEventListener("mouseleave", onLeave);
      });
    });
    return () => handlers.forEach((fn) => fn());
  }, []);

  return (
    <section className="servicios grain" id="servicios" ref={ref}>
      <div className="servicios-head">
        <div className="section-label mono reveal">{t.svc.label}</div>
        <h2 className="display section-title reveal delay-1">{t.svc.title}</h2>
        <p className="section-sub reveal delay-2">{t.svc.sub}</p>
      </div>
      <div className="svc-grid">
        {t.svc.cards.map((c, i) => (
          <article className={`svc-card reveal delay-${i + 1}`} key={i}>
            <video className="svc-video" src="assets/servicios.mp4" autoPlay muted loop playsInline preload="metadata"></video>
            <div className="svc-num">{c.num}</div>
            <h3 className="svc-title">{c.title}<span className="dot">.</span></h3>
            <p className="svc-desc">{c.desc}</p>
            <ul className="svc-bullets">
              {c.bullets.map((b, j) => <li key={j}>{b}</li>)}
            </ul>
            <a href="#cta" className="svc-link">{t.svc.examples}</a>
          </article>
        ))}
      </div>
    </section>
  );
}

// ============================================================
// PROCESO
// ============================================================

function Proceso({ t }) {
  const ref = useRef(null);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    if (!ref.current) return;
    if (hasGSAP()) {
      const ctx = gsap.context(() => {
        const steps = ref.current.querySelectorAll(".tl-step");
        steps.forEach((el, i) => {
          ScrollTrigger.create({
            trigger: el,
            start: "top 50%",
            onEnter: () => setActive((a) => Math.max(a, i)),
          });
        });
      }, ref);
      return () => ctx.revert();
    }
    const steps = ref.current.querySelectorAll(".tl-step");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const idx = parseInt(e.target.dataset.idx, 10);
          setActive((a) => Math.max(a, idx));
        }
      });
    }, { threshold: 0.4 });
    steps.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section className="proceso grain" id="proceso" ref={ref}>
      <div className="proceso-head">
        <div className="section-label mono">{t.proc.label}</div>
        <h2 className="display section-title">{t.proc.title}</h2>
      </div>
      <div className="timeline">
        {t.proc.steps.map((s, i) => (
          <div
            key={i}
            data-idx={i}
            className={`tl-step ${i <= active ? "active" : ""}`}
          >
            <span className="tl-dot"></span>
            <div className="tl-num">{s.num} · {s.title.toUpperCase()}</div>
            <h3>{s.title}<span className="dot">.</span></h3>
            <p>{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================================
// PORTAFOLIO — with hand-built scaffolded mockup placeholders
// ============================================================

function VendiSalonMockup() {
  return (
    <div className="frame phone">
      <div className="frame-screen scaffold-bot">
        <div className="b-head"><span className="b-avatar"></span><span>Vendi · Telegram</span></div>
        <div className="b-msg bot">Listo. ¿Qué vendiste?</div>
        <div className="b-msg me">Alaciado japonés · Karla</div>
        <div className="b-msg bot">Total $1,200 · comisión $480 calculada · stock actualizado ✅</div>
        <div className="b-input"><span>Escribe un mensaje…</span><span>↵</span></div>
      </div>
    </div>
  );
}

function VendiCajaMockup() {
  return (
    <div className="frame tablet">
      <div className="frame-screen scaffold-rest">
        <div className="r-top">Cierre de caja</div>
        <div className="r-img">[ CORTE DEL DÍA ]</div>
        <div className="r-rows">
          <div className="r-row"><span>Ventas del día</span><span>$8,450</span></div>
          <div className="r-row"><span>Comisiones</span><span>$2,180</span></div>
          <div className="r-row"><span>Efectivo en caja</span><span>$4,120</span></div>
        </div>
      </div>
    </div>
  );
}

function Portafolio({ t }) {
  const ref = useReveal();
  const mocks = [VendiSalonMockup, VendiCajaMockup];
  return (
    <section className="portafolio grain" id="portafolio" ref={ref}>
      <div className="port-head">
        <div className="section-label mono reveal">{t.port.label}</div>
        <h2 className="display section-title reveal delay-1">{t.port.title}</h2>
      </div>
      <div className={`port-grid${t.port.items.length === 2 ? " is-two" : ""}`}>
        {t.port.items.map((p, i) => {
          const M = mocks[i];
          return (
            <div className={`port-card reveal delay-${i + 1}`} key={i}>
              <div className="port-mockup">
                <M name={p.name} />
              </div>
              <div className="port-meta">
                <span className="port-cat">{p.cat}</span>
                <h3>{p.name}<span className="dot">.</span></h3>
                <p>{p.type}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ============================================================
// CTA FINAL
// ============================================================

function CtaFinal({ t }) {
  const ref = useReveal();
  const videoRef = useRef(null);

  useEffect(() => {
    if (!hasGSAP() || !ref.current || !videoRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        videoRef.current,
        { yPercent: -10 },
        {
          yPercent: 10,
          ease: "none",
          scrollTrigger: {
            trigger: ref.current,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        }
      );
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section className="cta-final grain" id="cta" ref={ref}>
      <video ref={videoRef} className="video-bg" src="assets/sunset.mp4" autoPlay muted loop playsInline preload="none"></video>
      <div className="cta-overlay"></div>
      <div className="cta-content">
        <div className="section-label mono reveal">{t.cta.label}</div>
        <h2 className="cta-h reveal delay-1">
          {t.cta.qa}<br/>
          {t.cta.qb}<em>{t.cta.qbi}</em>{t.cta.qc}<span className="qmark">{t.cta.qmark}</span>
        </h2>
        <p className="cta-sub reveal delay-2">{t.cta.sub}</p>
        <div className="cta-buttons reveal delay-3">
          <a className="btn-call" href="tel:+523224758995">📞 &nbsp;{t.cta.btnCall}</a>
          <a className="btn-wa" href="https://wa.me/523224758995?text=Hola%20vallartaweb,%20me%20interesa%20saber%20m%C3%A1s" target="_blank" rel="noopener noreferrer">💬 &nbsp;{t.cta.btnWa}</a>
        </div>
        <div className="cta-foot reveal delay-4">{t.cta.foot}</div>
      </div>
    </section>
  );
}

// ============================================================
// FOOTER
// ============================================================

function Footer({ t }) {
  return (
    <footer>
      <div className="footer-grid">
        <div className="foot-col">
          <div className="foot-logo">vallarta<span className="dot">.</span>web</div>
          <p className="foot-tag">{t.foot.tag}</p>
          <p className="mono foot-est">{t.foot.est}</p>
        </div>
        <div className="foot-col">
          <span className="foot-label">{t.foot.navLabel}</span>
          <ul>
            {t.foot.navLinks.map((l, i) => (
              <li key={i}><a href={["#top","#servicios","#proceso","#portafolio","#cta"][i]}>{l}</a></li>
            ))}
          </ul>
        </div>
        <div className="foot-col">
          <span className="foot-label">{t.foot.contactLabel}</span>
          <ul>
            <li><a href="mailto:hola@vallartaweb.mx">hola@vallartaweb.mx</a></li>
            <li><a href="https://wa.me/523224758995">+52 322 475 8995</a></li>
            <li><a href="#">@vallartaweb</a></li>
          </ul>
        </div>
      </div>
      <div className="foot-bottom">
        <div>{t.foot.copy}</div>
        <div className="small">{t.foot.legal}</div>
      </div>
    </footer>
  );
}

// ============================================================
// APP
// ============================================================

function App() {
  const [lang, setLang] = useState("es");
  const [theme, setTheme] = useState("dark");
  const [audioOn, setAudioOn] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!hasGSAP() || !hasLenis()) return;
    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: false,
    });

    lenis.on("scroll", ScrollTrigger.update);
    const tickerFn = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(tickerFn);
    gsap.ticker.lagSmoothing(0);

    const refreshId = setTimeout(() => ScrollTrigger.refresh(), 300);

    return () => {
      clearTimeout(refreshId);
      gsap.ticker.remove(tickerFn);
      lenis.destroy();
    };
  }, []);

  const toggleAudio = useCallback(() => {
    setAudioOn((on) => {
      const next = !on;
      const a = audioRef.current;
      if (a) {
        if (next) {
          a.volume = 0.35;
          a.play().catch(() => {});
        } else {
          a.pause();
        }
      }
      return next;
    });
  }, []);

  const t = window.COPY[lang];

  return (
    <React.Fragment>
      <Cursor />
      <audio ref={audioRef} src="assets/ambient.mp3" loop preload="none"></audio>
      <Navbar lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} t={t} />
      <Hero t={t} audioOn={audioOn} toggleAudio={toggleAudio} />
      <Manifiesto t={t} />
      <Servicios t={t} />
      <Proceso t={t} />
      <Portafolio t={t} />
      <CtaFinal t={t} />
      <Footer t={t} />
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
