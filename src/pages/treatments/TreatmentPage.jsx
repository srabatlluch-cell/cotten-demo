import { useParams, useNavigate } from "react-router-dom";
import { useRef, useState, useEffect } from "react";
import {
  ArrowLeft, Phone, MapPin, Clock, Shield,
  ChevronDown, ChevronUp, ExternalLink,
} from "lucide-react";
import { TREATMENTS } from "../../data/treatments";

/* ─── Animation helpers ──────────────────────────────────────── */
const EASE = "cubic-bezier(0.25, 0.46, 0.45, 0.94)";

function useReveal(threshold = 0.12) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

const fadeUp = (vis, delay = 0) => ({
  opacity: vis ? 1 : 0,
  transform: vis ? "translateY(0)" : "translateY(32px)",
  transition: `opacity 0.80s ${EASE} ${delay}s, transform 0.80s ${EASE} ${delay}s`,
});

/* ─── FAQ accordion item ─────────────────────────────────────── */
function FaqItem({ q, a, index }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.10)",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 text-left"
        style={{ padding: "22px 0", background: "transparent" }}
      >
        <span style={{ color: "white", fontSize: "0.97rem", fontWeight: 500, lineHeight: 1.5 }}>
          {q}
        </span>
        <div
          className="flex-shrink-0 flex items-center justify-center rounded-full"
          style={{
            width: 32, height: 32,
            background: open ? "rgba(201,169,110,0.25)" : "rgba(255,255,255,0.07)",
            border: "1px solid rgba(201,169,110,0.30)",
            transition: "background 0.2s ease",
          }}
        >
          {open
            ? <ChevronUp size={16} style={{ color: "#c9a96e" }} />
            : <ChevronDown size={16} style={{ color: "#c9a96e" }} />
          }
        </div>
      </button>
      <div
        style={{
          maxHeight: open ? 400 : 0,
          overflow: "hidden",
          transition: "max-height 0.38s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        <p style={{ color: "rgba(255,255,255,0.58)", fontSize: "0.9rem", lineHeight: 1.8, paddingBottom: 22 }}>
          {a}
        </p>
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────── */
export default function TreatmentPage() {
  const { slug } = useParams();
  const navigate  = useNavigate();
  const data      = TREATMENTS[slug];

  /* Redirect 404 */
  useEffect(() => {
    if (!data) navigate("/", { replace: true });
  }, [data, navigate]);

  /* Parallax */
  const [heroImgY, setHeroImgY] = useState(0);
  useEffect(() => {
    const onScroll = () => setHeroImgY(window.scrollY * 0.28);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Scroll reveal hooks */
  const [introRef,    introVis]    = useReveal(0.10);
  const [benefRef,    benefVis]    = useReveal(0.08);
  const [processRef,  processVis]  = useReveal(0.08);
  const [faqRef,      faqVis]      = useReveal(0.08);
  const [ctaRef,      ctaVis]      = useReveal(0.12);

  const contactRef = useRef(null);
  const scrollToContact = () =>
    contactRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  if (!data) return null;

  const { title, tag, heroSubtitle, intro, stats, benefits, steps, faqs } = data;

  return (
    <div className="min-h-screen" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", background: "#faf9f7" }}>

      {/* ══════════════════════════════════════════════════════
          NAVBAR
      ══════════════════════════════════════════════════════ */}
      <header
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          background: "rgba(13,21,38,0.97)",
          backdropFilter: "blur(14px)",
          borderBottom: "1px solid rgba(201,169,110,0.18)",
          height: 64,
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
          {/* Back */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 rounded-xl transition-colors"
            style={{
              color: "rgba(255,255,255,0.65)",
              fontSize: "0.82rem",
              padding: "6px 12px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              transition: "background 0.2s ease, color 0.2s ease",
            }}
            onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,0.12)"; e.currentTarget.style.color="white"; }}
            onMouseLeave={e => { e.currentTarget.style.background="rgba(255,255,255,0.06)"; e.currentTarget.style.color="rgba(255,255,255,0.65)"; }}
          >
            <ArrowLeft size={14} />
            Volver
          </button>

          {/* Logo */}
          <button onClick={() => navigate("/")} className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#c9a96e,#d9bc8a)" }}
            >
              <span style={{ color: "white", fontWeight: 700, fontSize: 12 }}>CC</span>
            </div>
            <div className="hidden sm:block text-left">
              <p style={{ color: "rgba(255,255,255,0.90)", fontWeight: 600, fontSize: "0.88rem", lineHeight: 1.2 }}>Clínica Cotten</p>
              <p style={{ color: "#c9a96e", fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.10em" }}>Barcelona · Odontología Avanzada</p>
            </div>
          </button>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <a
              href="tel:+34932041069"
              className="hidden md:flex items-center gap-2 text-sm py-2 px-4 rounded-full"
              style={{
                border: "1px solid rgba(255,255,255,0.22)",
                color: "rgba(255,255,255,0.80)",
                fontSize: "0.82rem",
                transition: "border-color 0.2s ease, color 0.2s ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(255,255,255,0.5)"; e.currentTarget.style.color="white"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(255,255,255,0.22)"; e.currentTarget.style.color="rgba(255,255,255,0.80)"; }}
            >
              <Phone size={12} />
              +34 932 041 069
            </a>
            <button
              onClick={() => navigate("/acceso-paciente")}
              className="text-sm px-4 py-2 rounded-full font-medium"
              style={{
                background: "linear-gradient(135deg,#c9a96e,#d9bc8a)",
                color: "#1a2744",
                fontSize: "0.82rem",
                transition: "opacity 0.2s ease",
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              Portal Paciente
            </button>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════ */}
      <section
        className="relative flex flex-col justify-center overflow-hidden"
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg,#0d1526 0%,#1a2744 55%,#1e3058 100%)",
          paddingTop: 64,
        }}
      >
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(201,169,110,0.06) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            transform: `translateY(${heroImgY * 0.4}px)`,
          }}
        />
        {/* Gold glow top-right */}
        <div
          className="absolute pointer-events-none"
          style={{ top: -120, right: -120, width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,169,110,0.10) 0%, transparent 65%)" }}
        />

        <div className="relative max-w-6xl mx-auto px-6 md:px-10 py-24">
          {/* Tag */}
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
            style={{ background: "rgba(201,169,110,0.12)", border: "1px solid rgba(201,169,110,0.28)", color: "#c9a96e", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em" }}
          >
            {tag}
          </div>

          {/* Title */}
          <h1
            className="text-white font-light leading-none mb-5"
            style={{ fontSize: "clamp(2.6rem, 6vw, 5rem)" }}
          >
            {title}
          </h1>

          {/* Gold rule */}
          <div style={{ width: 64, height: 3, background: "linear-gradient(90deg,#c9a96e,rgba(201,169,110,0.15))", borderRadius: 2, marginBottom: 24 }} />

          {/* Subtitle */}
          <p
            className="leading-relaxed mb-12"
            style={{ color: "rgba(255,255,255,0.58)", fontSize: "clamp(1rem, 1.8vw, 1.25rem)", maxWidth: 580 }}
          >
            {heroSubtitle}
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-4 mb-20">
            <button
              onClick={scrollToContact}
              className="flex items-center gap-2 rounded-xl font-semibold"
              style={{
                padding: "16px 36px",
                background: "linear-gradient(135deg,#c9a96e,#d9bc8a)",
                color: "#1a2744",
                fontSize: "0.92rem",
                boxShadow: "0 8px 32px rgba(201,169,110,0.38)",
                transition: "transform 0.25s ease, box-shadow 0.25s ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow="0 16px 48px rgba(201,169,110,0.55)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)";    e.currentTarget.style.boxShadow="0 8px 32px rgba(201,169,110,0.38)"; }}
            >
              Solicitar consulta gratuita
            </button>
            <a
              href="tel:+34932041069"
              className="flex items-center gap-2 rounded-xl font-medium"
              style={{
                padding: "16px 28px",
                border: "1px solid rgba(255,255,255,0.25)",
                color: "rgba(255,255,255,0.85)",
                fontSize: "0.92rem",
                transition: "background 0.25s ease, border-color 0.25s ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,0.09)"; e.currentTarget.style.borderColor="rgba(255,255,255,0.45)"; }}
              onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.borderColor="rgba(255,255,255,0.25)"; }}
            >
              <Phone size={15} />
              +34 932 041 069
            </a>
          </div>

          {/* Stats bar */}
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
            style={{ borderTop: "1px solid rgba(255,255,255,0.10)", paddingTop: 40 }}
          >
            {stats.map(({ value, label }) => (
              <div key={label}>
                <p style={{ color: "#c9a96e", fontSize: "clamp(1.4rem, 2.5vw, 2.1rem)", fontWeight: 700, lineHeight: 1, marginBottom: 8 }}>
                  {value}
                </p>
                <p style={{ color: "rgba(255,255,255,0.38)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.09em", lineHeight: 1.4 }}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          INTRO — 2 columns
      ══════════════════════════════════════════════════════ */}
      <section ref={introRef} style={{ background: "white", padding: "96px 24px" }}>
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-16 items-start">
          {/* Left: text */}
          <div className="lg:col-span-3" style={fadeUp(introVis, 0)}>
            <p
              style={{
                color: "#c9a96e",
                fontSize: "0.68rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                marginBottom: 16,
              }}
            >
              Sobre el tratamiento
            </p>
            <p style={{ color: "#374151", fontSize: "1.1rem", lineHeight: 1.9 }}>
              {intro}
            </p>
          </div>

          {/* Right: stat cards */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-4" style={fadeUp(introVis, 0.18)}>
            {stats.map(({ value, label }) => (
              <div
                key={label}
                className="rounded-2xl p-6 flex flex-col"
                style={{ background: "linear-gradient(135deg,#faf9f7,#f5f0e8)", border: "1px solid #ede8df" }}
              >
                <p style={{ color: "#1a2744", fontSize: "clamp(1.2rem, 2vw, 1.6rem)", fontWeight: 700, lineHeight: 1.1, marginBottom: 8 }}>
                  {value}
                </p>
                <p style={{ color: "#9ca3af", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", lineHeight: 1.4 }}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          BENEFITS
      ══════════════════════════════════════════════════════ */}
      <section ref={benefRef} style={{ background: "#faf9f7", padding: "96px 24px" }}>
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16" style={fadeUp(benefVis, 0)}>
            <p style={{ color: "#c9a96e", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 12 }}>
              Ventajas
            </p>
            <h2 style={{ color: "#1a2744", fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)", fontWeight: 300, lineHeight: 1.2 }}>
              Por qué elegir <strong style={{ fontWeight: 700 }}>Clínica Cotten</strong>
            </h2>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {benefits.map(({ icon: BIcon, title: btitle, desc }, i) => (
              <div
                key={btitle}
                className="rounded-3xl p-7 flex flex-col"
                style={{
                  background: "white",
                  border: "1px solid #e8e2d9",
                  boxShadow: "0 2px 16px rgba(0,0,0,0.04)",
                  ...fadeUp(benefVis, i * 0.10),
                }}
              >
                <div
                  className="flex items-center justify-center rounded-2xl mb-5 flex-shrink-0"
                  style={{ width: 52, height: 52, background: "linear-gradient(135deg,#1a2744,#243256)" }}
                >
                  <BIcon size={22} style={{ color: "#c9a96e" }} />
                </div>
                <h3 style={{ color: "#1a2744", fontSize: "0.95rem", fontWeight: 700, marginBottom: 10, lineHeight: 1.3 }}>
                  {btitle}
                </h3>
                <p style={{ color: "#6b7280", fontSize: "0.84rem", lineHeight: 1.75, flex: 1 }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          PROCESS
      ══════════════════════════════════════════════════════ */}
      <section ref={processRef} style={{ background: "white", padding: "96px 24px" }}>
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16" style={fadeUp(processVis, 0)}>
            <p style={{ color: "#c9a96e", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 12 }}>
              Cómo funciona
            </p>
            <h2 style={{ color: "#1a2744", fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)", fontWeight: 300, lineHeight: 1.2 }}>
              El proceso <strong style={{ fontWeight: 700 }}>paso a paso</strong>
            </h2>
          </div>

          {/* Steps — horizontal on desktop */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-0">
            {steps.map(({ title: stitle, desc }, idx) => (
              <div
                key={stitle}
                className="relative flex flex-row md:flex-col gap-5 md:gap-0 pb-10 md:pb-0 md:pr-8 last:pr-0"
                style={fadeUp(processVis, idx * 0.12)}
              >
                {/* Mobile vertical connector */}
                {idx < steps.length - 1 && (
                  <div className="absolute md:hidden" style={{ left: 21, top: 46, bottom: 0, width: 2, background: "linear-gradient(180deg,rgba(201,169,110,0.4),rgba(201,169,110,0.04))" }} />
                )}
                {/* Desktop horizontal connector */}
                {idx < steps.length - 1 && (
                  <div className="absolute hidden md:block" style={{ top: 21, left: "calc(44px + 16px)", right: 0, height: 2, background: "linear-gradient(90deg,rgba(201,169,110,0.4),rgba(201,169,110,0.04))" }} />
                )}

                {/* Number bubble */}
                <div
                  className="flex items-center justify-center rounded-full font-bold flex-shrink-0 mb-0 md:mb-6"
                  style={{
                    width: 44, height: 44,
                    background: "linear-gradient(135deg,#c9a96e,#d9bc8a)",
                    color: "#1a2744",
                    fontSize: "0.95rem",
                    boxShadow: "0 6px 20px rgba(201,169,110,0.35)",
                    position: "relative", zIndex: 1,
                  }}
                >
                  {idx + 1}
                </div>

                {/* Content */}
                <div>
                  <p style={{ color: "#1a2744", fontSize: "0.92rem", fontWeight: 700, marginBottom: 8, lineHeight: 1.3 }}>
                    {stitle}
                  </p>
                  <p style={{ color: "#6b7280", fontSize: "0.83rem", lineHeight: 1.75 }}>
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FAQ
      ══════════════════════════════════════════════════════ */}
      <section
        ref={faqRef}
        style={{ background: "linear-gradient(135deg,#0d1526 0%,#1a2744 100%)", padding: "96px 24px" }}
      >
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-14" style={fadeUp(faqVis, 0)}>
            <p style={{ color: "#c9a96e", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 12 }}>
              Preguntas frecuentes
            </p>
            <h2 style={{ color: "white", fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)", fontWeight: 300, lineHeight: 1.2 }}>
              Resolvemos sus <strong style={{ fontWeight: 700 }}>dudas</strong>
            </h2>
          </div>

          {/* Accordion */}
          <div style={fadeUp(faqVis, 0.15)}>
            {faqs.map((item, i) => (
              <FaqItem key={i} q={item.q} a={item.a} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          CTA FINAL
      ══════════════════════════════════════════════════════ */}
      <section
        ref={contactRef}
        style={{
          background: "linear-gradient(135deg,#b8924a 0%,#c9a96e 40%,#d9bc8a 100%)",
          padding: "96px 24px",
        }}
      >
        <div ref={ctaRef} className="max-w-4xl mx-auto text-center" style={fadeUp(ctaVis, 0)}>
          <h2
            style={{ color: "#1a2744", fontSize: "clamp(1.8rem, 4vw, 3rem)", fontWeight: 300, lineHeight: 1.2, marginBottom: 16 }}
          >
            ¿Listo para recuperar<br />
            <strong style={{ fontWeight: 700 }}>su sonrisa?</strong>
          </h2>
          <p style={{ color: "rgba(26,39,68,0.65)", fontSize: "1rem", marginBottom: 48 }}>
            Primera consulta gratuita y sin compromiso. Le atendemos personalmente.
          </p>

          {/* Info strip */}
          <div className="flex flex-wrap justify-center gap-8 mb-12">
            {[
              { icon: Phone,  text: "+34 932 041 069"               },
              { icon: MapPin, text: "C/ Sabino Arana 40, Barcelona"  },
              { icon: Clock,  text: "Lunes – Viernes, 9:30 – 19:00" },
            ].map(({ icon: InfoIcon, text }) => (
              <div key={text} className="flex items-center gap-2">
                <InfoIcon size={16} style={{ color: "#1a2744", opacity: 0.60 }} />
                <span style={{ color: "#1a2744", fontSize: "0.88rem", fontWeight: 500, opacity: 0.80 }}>
                  {text}
                </span>
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="tel:+34932041069"
              className="flex items-center gap-2 rounded-xl font-semibold w-full sm:w-auto justify-center"
              style={{
                padding: "18px 40px",
                background: "#1a2744",
                color: "white",
                fontSize: "0.95rem",
                boxShadow: "0 8px 32px rgba(26,39,68,0.30)",
                transition: "transform 0.25s ease, box-shadow 0.25s ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow="0 16px 48px rgba(26,39,68,0.45)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)";    e.currentTarget.style.boxShadow="0 8px 32px rgba(26,39,68,0.30)"; }}
            >
              <Phone size={16} />
              Llamar ahora
            </a>
            <button
              onClick={() => navigate("/acceso-paciente")}
              className="flex items-center gap-2 rounded-xl font-medium w-full sm:w-auto justify-center"
              style={{
                padding: "18px 36px",
                background: "rgba(26,39,68,0.12)",
                border: "2px solid rgba(26,39,68,0.30)",
                color: "#1a2744",
                fontSize: "0.95rem",
                transition: "background 0.25s ease, border-color 0.25s ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.background="rgba(26,39,68,0.20)"; e.currentTarget.style.borderColor="rgba(26,39,68,0.50)"; }}
              onMouseLeave={e => { e.currentTarget.style.background="rgba(26,39,68,0.12)"; e.currentTarget.style.borderColor="rgba(26,39,68,0.30)"; }}
            >
              Acceso Portal Paciente
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════ */}
      <footer style={{ background: "#0d1526", borderTop: "1px solid rgba(201,169,110,0.12)" }}>
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#c9a96e,#d9bc8a)" }}>
                <span style={{ color: "white", fontWeight: 700, fontSize: 10 }}>CC</span>
              </div>
              <p style={{ color: "rgba(255,255,255,0.40)", fontSize: "0.78rem" }}>
                © 2026 Clínica Cotten · Dr. Philippe Cotten · Datos protegidos RGPD
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Shield size={11} style={{ color: "rgba(255,255,255,0.25)" }} />
              <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.72rem" }}>Colegiado nº 08/123456</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}