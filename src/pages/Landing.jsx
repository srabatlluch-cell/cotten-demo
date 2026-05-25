import { useNavigate } from "react-router-dom";
import { useRef, useState, useEffect } from "react";
import {
  MapPin, Phone, Clock, Shield, Award, Star,
  Zap, Activity, Smile, Sparkles, ChevronDown,
  CheckCircle, Globe, Menu, X,
} from "lucide-react";

/* ── Images ───────────────────────────────────────────────── */
const UNSPLASH_HERO    = "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=1200&auto=format&fit=crop&q=80";
const UNSPLASH_TREATS  = "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=1200&auto=format&fit=crop&q=80";
const UNSPLASH_DOCTOR  = "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&auto=format&fit=crop&q=80";
const UNSPLASH_CONTACT = "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=1200&auto=format&fit=crop&q=80";

/* ── Animation helpers ────────────────────────────────────── */
const EASE = "cubic-bezier(0.25, 0.46, 0.45, 0.94)";

const fadeUp = (vis, delay = 0, dur = 0.85) => ({
  opacity: vis ? 1 : 0,
  transform: vis ? "translateY(0)" : "translateY(28px)",
  transition: `opacity ${dur}s ${EASE} ${delay}s, transform ${dur}s ${EASE} ${delay}s`,
});

const slideFrom = (vis, dir = "left", delay = 0) => ({
  opacity: vis ? 1 : 0,
  transform: vis ? "translateX(0)" : `translateX(${dir === "left" ? "-46px" : "46px"})`,
  transition: `opacity 1s ${EASE} ${delay}s, transform 1s ${EASE} ${delay}s`,
});

/* ── Intersection Observer hook ───────────────────────────── */
function useReveal(threshold = 0.12) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

/* ── Static data ──────────────────────────────────────────── */
const treatments = [
  {
    icon: Zap,
    title: "Implantología Basal",
    tag: "Especialidad principal",
    desc: "Técnica avanzada con implantes de carga inmediata. Recupere su sonrisa en 72 horas con resultados permanentes y sin necesidad de injertos óseos.",
    featured: true,
    modal: {
      description: "La implantología basal es una técnica revolucionaria que permite colocar implantes dentales en pacientes que han perdido hueso, sin necesidad de injertos óseos previos. El Dr. Philippe Cotten es pionero en España con más de 27 años de experiencia.",
      sections: [
        {
          heading: "Ventajas",
          items: ["Sin injerto óseo", "Carga inmediata — dientes en 72 h", "Apto para pacientes con hueso insuficiente", "Alta tasa de éxito"],
        },
        {
          heading: "¿Para quién?",
          items: ["Pacientes con pérdida ósea severa", "Pacientes que han fracasado con implantes convencionales", "Pacientes edéntulos totales"],
        },
      ],
    },
  },
  {
    icon: Activity,
    title: "Periodoncia",
    tag: "Salud gingival",
    desc: "Tratamiento integral de enfermedades periodontales para recuperar y mantener la salud de sus encías con las técnicas más actuales.",
    featured: false,
    modal: {
      description: "Tratamiento especializado de las enfermedades de las encías y los tejidos de soporte dental. Prevenimos y tratamos la periodontitis para mantener la salud de tus encías y conservar tus dientes naturales.",
      sections: [
        {
          heading: "Tratamientos",
          items: ["Limpieza profesional profunda", "Raspado y alisado radicular", "Cirugía periodontal", "Mantenimiento periodontal"],
        },
        {
          heading: "Señales de alerta",
          items: ["Encías que sangran", "Mal aliento persistente", "Dientes que se mueven", "Encías retraídas"],
        },
      ],
    },
  },
  {
    icon: Smile,
    title: "Ortodoncia",
    tag: "Alineación dental",
    desc: "Brackets estéticos y alineadores invisibles para corregir la posición de sus dientes con total comodidad y discreción.",
    featured: false,
    modal: {
      description: "Corregimos la posición de tus dientes y mandíbula para conseguir una sonrisa perfecta y una mordida funcional. Disponemos de ortodoncia tradicional y alineadores invisibles.",
      sections: [
        {
          heading: "Opciones disponibles",
          items: ["Brackets metálicos", "Brackets estéticos (cerámica)", "Alineadores invisibles (Invisalign)", "Ortodoncia lingual"],
        },
        {
          heading: "¿Quién puede tratarse?",
          items: ["Adultos, niños y adolescentes", "Casos leves y complejos", "Compatible con otros tratamientos dentales"],
        },
      ],
    },
  },
  {
    icon: Sparkles,
    title: "Estética Dental",
    tag: "Sonrisa perfecta",
    desc: "Blanqueamiento profesional, carillas de porcelana y diseño de sonrisa para una apariencia natural y radiante.",
    featured: false,
    modal: {
      description: "Transformamos tu sonrisa con los últimos avances en estética dental. Desde un blanqueamiento hasta un cambio completo de imagen con carillas de porcelana.",
      sections: [
        {
          heading: "Tratamientos",
          items: ["Blanqueamiento dental profesional", "Carillas de porcelana", "Composite dental", "Diseño de sonrisa digital"],
        },
        {
          heading: "Resultado",
          items: ["Sonrisas naturales y duraderas adaptadas a tu rostro", "Tratamientos mínimamente invasivos", "Resultados visibles desde la primera sesión"],
        },
      ],
    },
  },
];

/* ── Treatment modal ──────────────────────────────────────── */
function TreatmentModal({ treatment, onClose, onContact }) {
  const { icon: Icon, title, featured, modal } = treatment;

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{
        background: "rgba(10,16,32,0.72)",
        backdropFilter: "blur(6px)",
        animation: "ccFadeIn 0.22s ease",
      }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl"
        style={{
          background: "white",
          boxShadow: "0 32px 80px rgba(0,0,0,0.38)",
          animation: "ccSlideUp 0.28s cubic-bezier(0.25,0.46,0.45,0.94)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Gold accent bar */}
        <div style={{ height: 4, background: "linear-gradient(90deg, #1a2744, #c9a96e)", borderRadius: "12px 12px 0 0" }} />

        {/* Header */}
        <div className="px-7 pt-6 pb-5 flex items-start justify-between gap-4" style={{ borderBottom: "1px solid #f3f0ea" }}>
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: featured ? "linear-gradient(135deg,#1a2744,#243256)" : "linear-gradient(135deg,rgba(26,39,68,0.07),rgba(26,39,68,0.13))" }}
            >
              <Icon size={22} style={{ color: featured ? "#c9a96e" : "#1a2744" }} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest font-semibold mb-0.5" style={{ color: "#c9a96e" }}>
                {featured ? "Especialidad principal" : "Tratamiento"}
              </p>
              <h2 className="text-xl font-semibold" style={{ color: "#1a2744" }}>{title}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl flex-shrink-0 hover:bg-gray-100 transition-colors"
            style={{ color: "#9ca3af" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-7 py-6 space-y-6">
          {/* Description */}
          <p className="text-sm leading-relaxed" style={{ color: "#374151" }}>
            {modal.description}
          </p>

          {/* Sections */}
          {modal.sections.map(({ heading, items }) => (
            <div key={heading}>
              <p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: "#1a2744" }}>
                {heading}
              </p>
              <div className="space-y-2">
                {items.map(item => (
                  <div key={item} className="flex items-start gap-3">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: "rgba(201,169,110,0.15)" }}
                    >
                      <CheckCircle size={11} style={{ color: "#c9a96e" }} />
                    </div>
                    <p className="text-sm" style={{ color: "#374151" }}>{item}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="px-7 pb-7">
          <button
            onClick={onContact}
            className="w-full py-3.5 rounded-xl text-sm font-semibold tracking-wide transition-all"
            style={{
              background: "linear-gradient(135deg, #1a2744, #243256)",
              color: "white",
              boxShadow: "0 6px 20px rgba(26,39,68,0.25)",
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = "1";    e.currentTarget.style.transform = "translateY(0)"; }}
          >
            Solicitar cita para {title}
          </button>
          <p className="text-xs text-center mt-3" style={{ color: "#9ca3af" }}>
            Primera consulta sin compromiso · +34 932 041 069
          </p>
        </div>
      </div>

      <style>{`
        @keyframes ccFadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes ccSlideUp { from { opacity: 0; transform: translateY(24px) scale(0.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>
    </div>
  );
}

const testimonials = [
  {
    name: "Carmen R.",
    treatment: "Implantes Basales",
    stars: 5,
    quote: "En menos de una semana tenía una sonrisa completamente nueva. El Dr. Cotten es un profesional extraordinario, con una paciencia y dedicación que no había encontrado en ningún otro especialista. Totalmente recomendable.",
  },
  {
    name: "Jordi M.",
    treatment: "Full Arch Completo",
    stars: 5,
    quote: "Llevaba años sin poder comer con normalidad. Gracias al tratamiento de carga inmediata del Dr. Cotten, ahora disfruto de cada comida. El equipo de la clínica es excepcional en todos los aspectos.",
  },
  {
    name: "Montserrat V.",
    treatment: "Implante Basal + Periodoncia",
    stars: 5,
    quote: "Me daba mucho miedo la cirugía, pero el Dr. Cotten y su equipo me explicaron todo con detalle y se aseguraron de que estuviera completamente cómoda. El resultado ha superado todas mis expectativas.",
  },
];

const credentials = [
  { value: "27+",    label: "Años de experiencia" },
  { value: "3.000+", label: "Implantes colocados"  },
  { value: "98%",    label: "Tasa de éxito"         },
];

/* ── Component ────────────────────────────────────────────── */
export default function Landing() {
  const navigate = useNavigate();

  /* scroll-to refs */
  const heroRef    = useRef(null);
  const treatRef   = useRef(null);
  const doctorRef  = useRef(null);
  const contactRef = useRef(null);

  /* ui state */
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navSolid,       setNavSolid]       = useState(false);
  const [heroImgY,       setHeroImgY]       = useState(0);
  const [hoveredCard,    setHoveredCard]    = useState(null);
  const [activeModal,    setActiveModal]    = useState(null);

  /* combined scroll handler */
  const lastScrollY = useRef(0);
  useEffect(() => {
    const onScroll = () => {
      const y          = window.scrollY;
      const goingDown  = y > lastScrollY.current;
      lastScrollY.current = y;

      /* navbar solid/transparent */
      if (y < 80) {
        setNavSolid(false);
      } else if (goingDown) {
        setNavSolid(true);
      } else {
        /* scrolling up — transparent once back inside hero area */
        const heroH = heroRef.current?.offsetHeight ?? 800;
        setNavSolid(y > heroH * 0.45);
      }

      /* hero parallax — image moves up slower than page */
      setHeroImgY(y * 0.26);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Intersection observer reveal hooks (must be top-level) */
  const [treatHeadRef,  treatHeadVis]  = useReveal(0.15);
  const [treatGridRef,  treatGridVis]  = useReveal(0.05);
  const [drLeftRef,     drLeftVis]     = useReveal(0.12);
  const [drRightRef,    drRightVis]    = useReveal(0.12);
  const [testHeadRef,   testHeadVis]   = useReveal(0.15);
  const [testGridRef,   testGridVis]   = useReveal(0.05);
  const [ctaHeadRef,    ctaHeadVis]    = useReveal(0.15);
  const [ctaCardsRef,   ctaCardsVis]   = useReveal(0.05);

  /* helpers */
  const scrollTo = (ref) => {
    setMobileMenuOpen(false);
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const navLinks = [
    { label: "Inicio",       ref: heroRef    },
    { label: "Tratamientos", ref: treatRef   },
    { label: "Dr. Cotten",   ref: doctorRef  },
    { label: "Contacto",     ref: contactRef },
  ];

  /* treatment card hover style */
  const cardHoverStyle = (title, featured) => ({
    transform:  hoveredCard === title ? "translateY(-4px)" : "translateY(0)",
    transition: "transform 0.32s ease, box-shadow 0.32s ease",
    boxShadow:  hoveredCard === title
      ? featured
        ? "0 20px 55px rgba(26,39,68,0.45)"
        : "inset 3px 0 0 #c9a96e, 0 14px 44px rgba(0,0,0,0.10)"
      : "none",
  });

  /* ── JSX ──────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* ════════════════════════════════════════════════════════
          NAVBAR
      ════════════════════════════════════════════════════════ */}
      <header
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          background:    navSolid ? "rgba(26,39,68,0.97)"  : "transparent",
          backdropFilter:navSolid ? "blur(14px)"            : "none",
          borderBottom:  navSolid ? "1px solid rgba(201,169,110,0.15)" : "1px solid transparent",
          boxShadow:     navSolid ? "0 4px 28px rgba(0,0,0,0.28)"     : "none",
          transition:    "background 0.45s ease, backdrop-filter 0.45s ease, box-shadow 0.45s ease, border-color 0.45s ease",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <button onClick={() => scrollTo(heroRef)} className="flex items-center gap-3 group">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #c9a96e, #d9bc8a)",
                transition: "transform 0.25s ease",
              }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.08)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            >
              <span className="text-white font-bold text-sm">CC</span>
            </div>
            <div className="text-left">
              <p className="text-white font-semibold text-base leading-tight">Clínica Cotten</p>
              <p className="text-xs tracking-widest uppercase" style={{ color: "#c9a96e" }}>Implantología Basal</p>
            </div>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map(({ label, ref }) => (
              <button
                key={label}
                onClick={() => scrollTo(ref)}
                className="text-sm tracking-wide"
                style={{
                  color: "rgba(255,255,255,0.70)",
                  transition: "color 0.2s ease",
                }}
                onMouseEnter={e => e.currentTarget.style.color = "white"}
                onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.70)"}
              >
                {label}
              </button>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <a
              href="tel:+34932041069"
              className="hidden md:flex items-center gap-2 text-sm py-2 px-4 rounded-full"
              style={{
                border: "1px solid rgba(255,255,255,0.22)",
                color: "rgba(255,255,255,0.80)",
                transition: "border-color 0.25s ease, color 0.25s ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(255,255,255,0.5)"; e.currentTarget.style.color="white"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(255,255,255,0.22)"; e.currentTarget.style.color="rgba(255,255,255,0.80)"; }}
            >
              <Phone size={13} />
              +34 932 041 069
            </a>
            <button
              onClick={() => navigate("/acceso-paciente")}
              className="hidden md:flex text-sm px-5 py-2 rounded-full font-medium"
              style={{
                background: "linear-gradient(135deg, #c9a96e, #d9bc8a)",
                color: "#1a2744",
                transition: "opacity 0.25s ease, transform 0.25s ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity="0.88"; e.currentTarget.style.transform="scale(1.04)"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity="1";    e.currentTarget.style.transform="scale(1)";    }}
            >
              Portal Paciente
            </button>
            <button
              className="md:hidden p-2 rounded-lg"
              style={{ color: "rgba(255,255,255,0.85)", transition: "color 0.2s ease" }}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        <div
          className="md:hidden overflow-hidden"
          style={{
            maxHeight: mobileMenuOpen ? "400px" : "0",
            transition: "max-height 0.4s ease",
            background: "rgba(26,39,68,0.98)",
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div className="px-6 pb-6 pt-3 flex flex-col gap-2">
            {navLinks.map(({ label, ref }) => (
              <button
                key={label}
                onClick={() => scrollTo(ref)}
                className="text-left text-sm py-2.5"
                style={{ color: "rgba(255,255,255,0.70)" }}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => navigate("/acceso-paciente")}
              className="mt-2 text-sm px-5 py-3 rounded-xl font-medium text-center"
              style={{ background: "linear-gradient(135deg, #c9a96e, #d9bc8a)", color: "#1a2744" }}
            >
              Portal Paciente
            </button>
          </div>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════════════ */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex flex-col lg:flex-row"
        style={{ background: "linear-gradient(135deg, #111b33 0%, #1a2744 100%)" }}
      >
        {/* Left — text (load animations) */}
        <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-20 pt-32 pb-16 lg:py-0 z-10">
          <div className="max-w-xl">
            {/* Badge pill */}
            <div
              className="cc-hero-el cc-d1 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs uppercase tracking-widest mb-8 border"
              style={{ borderColor: "rgba(201,169,110,0.4)", color: "#c9a96e", background: "rgba(201,169,110,0.08)" }}
            >
              <Award size={12} />
              27 años · Especialistas en Implantología Basal
            </div>

            {/* H1 — three lines, last in gold */}
            <h1 className="cc-hero-el cc-d2 text-4xl md:text-5xl xl:text-6xl font-light text-white leading-tight mb-6">
              Especialistas en<br />
              Implantología Basal<br />
              <span className="font-semibold" style={{ color: "#c9a96e" }}>en Barcelona</span>
            </h1>

            {/* Subtitle */}
            <p className="cc-hero-el cc-d3 text-lg leading-relaxed mb-7 max-w-md" style={{ color: "rgba(255,255,255,0.60)" }}>
              Más de 27 años devolviendo la funcionalidad y la confianza a nuestros pacientes. Pioneros en implantología basal en España desde 2004.
            </p>

            {/* Credential chips */}
            <div className="cc-hero-el cc-d4 flex flex-wrap gap-2 mb-10">
              {[
                { icon: Award,        text: "Pioneros en España · 2004"     },
                { icon: CheckCircle,  text: "Técnica sin injerto óseo"       },
                { icon: Zap,          text: "Carga inmediata disponible"     },
              ].map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
                  style={{ background: "rgba(201,169,110,0.10)", border: "1px solid rgba(201,169,110,0.25)", color: "#c9a96e" }}
                >
                  <Icon size={11} />
                  {text}
                </div>
              ))}
            </div>

            {/* CTA buttons */}
            <div className="cc-hero-el cc-d5 flex flex-wrap gap-4 mb-10">
              <button
                onClick={() => navigate("/acceso-paciente")}
                className="cc-btn-pulse px-8 py-4 rounded-xl text-sm font-semibold tracking-wide"
                style={{
                  background: "linear-gradient(135deg, #c9a96e, #d9bc8a)",
                  color: "#1a2744",
                  boxShadow: "0 8px 30px rgba(201,169,110,0.38)",
                  transition: "transform 0.3s ease, opacity 0.3s ease",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform="translateY(-3px) scale(1.03)"; e.currentTarget.style.boxShadow="0 14px 40px rgba(201,169,110,0.60)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform="translateY(0) scale(1)";       e.currentTarget.style.boxShadow="0 8px 30px rgba(201,169,110,0.38)"; }}
              >
                Acceso Paciente
              </button>
              <button
                onClick={() => navigate("/acceso-personal")}
                className="px-8 py-4 rounded-xl text-sm font-medium tracking-wide"
                style={{
                  border: "1px solid rgba(255,255,255,0.28)",
                  color: "white",
                  transition: "background 0.3s ease, transform 0.3s ease, border-color 0.3s ease",
                }}
                onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,0.10)"; e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.borderColor="rgba(255,255,255,0.50)"; }}
                onMouseLeave={e => { e.currentTarget.style.background="transparent";            e.currentTarget.style.transform="translateY(0)";   e.currentTarget.style.borderColor="rgba(255,255,255,0.28)"; }}
              >
                Acceso Personal
              </button>
            </div>

            {/* Trust bar */}
            <div className="cc-hero-el cc-d6 flex items-center gap-0 pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}>
              {[
                { stat: "+27 años",   label: "de experiencia"    },
                { stat: "+1.000",     label: "pacientes tratados" },
                { stat: "0 injertos", label: "técnica basal"      },
              ].map(({ stat, label }, i) => (
                <div key={stat} className="flex items-center">
                  <div className="px-5 first:pl-0 text-center">
                    <p className="text-xl font-bold leading-tight" style={{ color: "#c9a96e" }}>{stat}</p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.40)" }}>{label}</p>
                  </div>
                  {i < 2 && (
                    <div className="w-px h-8 flex-shrink-0" style={{ background: "rgba(255,255,255,0.12)" }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — photo with parallax */}
        <div className="relative lg:w-[52%] min-h-64 lg:min-h-0 overflow-hidden">
          <img
            src={UNSPLASH_HERO}
            alt="Clínica dental moderna"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "130%",
              objectFit: "cover",
              objectPosition: "center center",
              transform: `translateY(-${heroImgY}px)`,
              willChange: "transform",
            }}
          />
          {/* Navy fade from left */}
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(105deg, #1a2744 0%, rgba(26,39,68,0.42) 44%, rgba(26,39,68,0.12) 100%)" }}
          />
          {/* Floating badge (slides in from right on load) */}
          <div
            className="cc-badge-in absolute bottom-10 right-8 px-5 py-4 rounded-2xl hidden lg:block"
            style={{ background: "rgba(26,39,68,0.85)", border: "1px solid rgba(201,169,110,0.30)", backdropFilter: "blur(14px)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(201,169,110,0.18)" }}>
                <Shield size={18} style={{ color: "#c9a96e" }} />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">Carga Inmediata</p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.50)" }}>Implantes en 72 horas</p>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll cue — gentle float, no bounce */}
        <button
          onClick={() => scrollTo(treatRef)}
          className="cc-float absolute bottom-8 left-1/2 hidden lg:flex flex-col items-center gap-2"
          style={{ color: "rgba(255,255,255,0.32)", transition: "color 0.25s ease" }}
          onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,0.65)"}
          onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.32)"}
        >
          <span className="text-xs uppercase tracking-widest">Descubra más</span>
          <ChevronDown size={17} />
        </button>
      </section>

      {/* ════════════════════════════════════════════════════════
          TRATAMIENTOS
      ════════════════════════════════════════════════════════ */}
      <section ref={treatRef} className="relative py-24 overflow-hidden" style={{ background: "#faf9f7" }}>
        {/* Subtle background texture */}
        <div className="absolute inset-0" style={{ opacity: 0.04 }}>
          <img src={UNSPLASH_TREATS} alt="" className="w-full h-full object-cover" />
        </div>
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, #faf9f7 0%, rgba(250,249,247,0.93) 50%, #faf9f7 100%)" }}
        />

        <div className="relative max-w-6xl mx-auto px-6">
          {/* Section header — fade up on reveal */}
          <div ref={treatHeadRef} className="text-center mb-16" style={fadeUp(treatHeadVis)}>
            <p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: "#c9a96e" }}>
              Nuestros tratamientos
            </p>
            <h2 className="text-4xl md:text-5xl font-light mb-5" style={{ color: "#1a2744" }}>
              Soluciones para cada<br />
              <span className="font-semibold">necesidad dental</span>
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto leading-relaxed">
              Combinamos tecnología de vanguardia con más de 27 años de experiencia clínica para ofrecerle los mejores resultados.
            </p>
          </div>

          {/* Cards — staggered fade up */}
          <div ref={treatGridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {treatments.map(({ icon: Icon, title, tag, desc, featured }, i) => (
              <div
                key={title}
                className={featured ? "md:col-span-2 lg:col-span-2" : ""}
                style={fadeUp(treatGridVis, i * 0.12)}
              >
                <div
                  className="relative rounded-3xl p-7 flex flex-col h-full"
                  style={{
                    ...(featured
                      ? { background: "linear-gradient(135deg, #1a2744 0%, #243256 100%)" }
                      : { background: "white", border: "1px solid #e8e2d9" }
                    ),
                    ...cardHoverStyle(title, featured),
                  }}
                  onMouseEnter={() => setHoveredCard(title)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  {featured && (
                    <span
                      className="absolute top-5 right-5 text-xs px-3 py-1 rounded-full font-medium"
                      style={{ background: "rgba(201,169,110,0.20)", color: "#c9a96e" }}
                    >
                      Especialidad
                    </span>
                  )}
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                    style={featured
                      ? { background: "rgba(201,169,110,0.15)" }
                      : { background: "linear-gradient(135deg, rgba(26,39,68,0.06), rgba(26,39,68,0.12))" }
                    }
                  >
                    <Icon size={22} style={{ color: featured ? "#c9a96e" : "#1a2744" }} />
                  </div>
                  <p className="text-xs uppercase tracking-wider mb-2" style={{ color: featured ? "#c9a96e" : "#9ca3af" }}>
                    {tag}
                  </p>
                  <h3 className="text-xl font-semibold mb-3" style={{ color: featured ? "white" : "#1a2744" }}>
                    {title}
                  </h3>
                  <p className="text-sm leading-relaxed flex-1" style={{ color: featured ? "rgba(255,255,255,0.65)" : "#6b7280" }}>
                    {desc}
                  </p>
                  <button
                    onClick={() => setActiveModal({ icon, title, featured, modal })}
                    className="mt-6 text-xs font-semibold uppercase tracking-wider self-start"
                    style={{
                      color: featured ? "#c9a96e" : "#1a2744",
                      transition: "opacity 0.2s ease",
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = "0.60"}
                    onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                  >
                    Saber más →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          DR. COTTEN
      ════════════════════════════════════════════════════════ */}
      <section ref={doctorRef} className="py-24" style={{ background: "linear-gradient(135deg, #111b33 0%, #1a2744 100%)" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Photo — slides in from left */}
            <div ref={drLeftRef} className="flex flex-col items-center lg:items-start gap-6" style={slideFrom(drLeftVis, "left")}>
              <div className="relative">
                <div
                  className="w-64 h-64 md:w-72 md:h-72 rounded-full overflow-hidden"
                  style={{
                    border: "4px solid rgba(201,169,110,0.50)",
                    boxShadow: "0 0 0 12px rgba(201,169,110,0.07), 0 24px 60px rgba(0,0,0,0.40)",
                  }}
                >
                  <img
                    src={UNSPLASH_DOCTOR}
                    alt="Dr. Philippe Cotten"
                    className="w-full h-full object-cover"
                    style={{ objectPosition: "top center" }}
                  />
                  <div className="absolute inset-0 rounded-full" style={{ background: "rgba(26,39,68,0.07)" }} />
                </div>
                <div
                  className="absolute -bottom-3 -right-3 w-20 h-20 rounded-full"
                  style={{ background: "linear-gradient(135deg, #c9a96e, #d9bc8a)", opacity: 0.17 }}
                />
              </div>

              {/* Achievement badges */}
              <div className="flex gap-4 flex-wrap justify-center lg:justify-start">
                {credentials.map(({ value, label }, i) => (
                  <div
                    key={label}
                    className="px-5 py-3 rounded-2xl text-center"
                    style={{
                      background: "rgba(201,169,110,0.10)",
                      border: "1px solid rgba(201,169,110,0.22)",
                      ...fadeUp(drLeftVis, 0.2 + i * 0.12),
                    }}
                  >
                    <p className="text-2xl font-bold" style={{ color: "#c9a96e" }}>{value}</p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.50)" }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Bio — slides in from right */}
            <div ref={drRightRef} style={slideFrom(drRightVis, "right", 0.1)}>
              <p className="text-xs uppercase tracking-widest font-semibold mb-4" style={{ color: "#c9a96e" }}>
                Conozca a su especialista
              </p>
              <h2 className="text-4xl md:text-5xl font-light text-white mb-1">Dr. Philippe</h2>
              <h2 className="text-4xl md:text-5xl font-semibold text-white mb-8">Cotten</h2>

              <div className="space-y-5 mb-8" style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.875rem", lineHeight: "1.75" }}>
                <p>
                  Con más de 27 años dedicados exclusivamente a la implantología basal, el Dr. Philippe Cotten es uno de los referentes internacionales en esta técnica revolucionaria que permite rehabilitar bocas completas en apenas 72 horas.
                </p>
                <p>
                  Formado en las mejores instituciones europeas y con experiencia en más de 3.000 implantes colocados, el Dr. Cotten ha ayudado a miles de pacientes a recuperar su sonrisa, su capacidad masticatoria y, sobre todo, su calidad de vida.
                </p>
                <p>
                  Su clínica en el corazón de Barcelona combina tecnología diagnóstica de última generación —TAC de haz cónico, planificación 3D— con un trato cercano y personalizado que caracteriza a Clínica Cotten.
                </p>
              </div>

              <div className="space-y-3 mb-10">
                {[
                  "Miembro de la Sociedad Española de Implantes (SEI)",
                  "Formación especializada en implantología basal en Europa",
                  "Clínica certificada con protocolo de carga inmediata",
                  "Más de 27 años de ejercicio ininterrumpido en Barcelona",
                ].map((item, i) => (
                  <div
                    key={item}
                    className="flex items-start gap-3"
                    style={fadeUp(drRightVis, 0.3 + i * 0.10)}
                  >
                    <CheckCircle size={15} className="mt-0.5 flex-shrink-0" style={{ color: "#c9a96e" }} />
                    <p className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>{item}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => scrollTo(contactRef)}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-xl text-sm font-semibold"
                style={{
                  background: "linear-gradient(135deg, #c9a96e, #d9bc8a)",
                  color: "#1a2744",
                  boxShadow: "0 8px 30px rgba(201,169,110,0.28)",
                  transition: "transform 0.3s ease, box-shadow 0.3s ease",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow="0 14px 44px rgba(201,169,110,0.52)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)";    e.currentTarget.style.boxShadow="0 8px 30px rgba(201,169,110,0.28)"; }}
              >
                Solicitar primera consulta
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          TESTIMONIOS
      ════════════════════════════════════════════════════════ */}
      <section className="py-24" style={{ background: "#faf9f7" }}>
        <div className="max-w-6xl mx-auto px-6">
          {/* Header */}
          <div ref={testHeadRef} className="text-center mb-16" style={fadeUp(testHeadVis)}>
            <p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: "#c9a96e" }}>
              Testimonios
            </p>
            <h2 className="text-4xl md:text-5xl font-light mb-5" style={{ color: "#1a2744" }}>
              Lo que dicen<br />
              <span className="font-semibold">nuestros pacientes</span>
            </h2>
            <p className="max-w-md mx-auto leading-relaxed" style={{ color: "#6b7280" }}>
              Más de 27 años de sonrisas restauradas hablan por sí solos.
            </p>
          </div>

          {/* Cards — staggered */}
          <div ref={testGridRef} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map(({ name, treatment, stars, quote }, i) => (
              <div
                key={name}
                className="bg-white rounded-3xl p-8 flex flex-col"
                style={{
                  border: "1px solid #e8e2d9",
                  ...fadeUp(testGridVis, i * 0.15),
                  transition: `opacity 0.85s ${EASE} ${i * 0.15}s, transform 0.85s ${EASE} ${i * 0.15}s`,
                }}
              >
                <div className="flex gap-1 mb-5">
                  {Array.from({ length: stars }).map((_, si) => (
                    <Star key={si} size={14} fill="#c9a96e" style={{ color: "#c9a96e" }} />
                  ))}
                </div>
                <p className="text-sm leading-relaxed flex-1 mb-6" style={{ color: "#374151" }}>
                  "{quote}"
                </p>
                <div className="flex items-center gap-3 pt-5" style={{ borderTop: "1px solid #f0ede8" }}>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #1a2744, #243256)" }}
                  >
                    {name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#1a2744" }}>{name}</p>
                    <p className="text-xs" style={{ color: "#c9a96e" }}>{treatment}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          CONTACTO
      ════════════════════════════════════════════════════════ */}
      <section ref={contactRef} className="relative py-24 overflow-hidden">
        {/* Barcelona background */}
        <div className="absolute inset-0">
          <img src={UNSPLASH_CONTACT} alt="Barcelona" className="w-full h-full object-cover" />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(135deg, rgba(17,27,51,0.94) 0%, rgba(26,39,68,0.88) 60%, rgba(17,27,51,0.93) 100%)" }}
          />
        </div>

        <div className="relative max-w-6xl mx-auto px-6">
          {/* Header */}
          <div ref={ctaHeadRef} className="text-center mb-14" style={fadeUp(ctaHeadVis)}>
            <p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: "#c9a96e" }}>
              Contáctenos
            </p>
            <h2 className="text-4xl md:text-5xl font-light text-white mb-4">
              Dé el primer paso<br />
              <span className="font-semibold">hacia su nueva sonrisa</span>
            </h2>
            <p className="max-w-md mx-auto" style={{ color: "rgba(255,255,255,0.50)" }}>
              Nuestro equipo está a su disposición para resolver todas sus dudas y programar su primera consulta.
            </p>
          </div>

          {/* Info cards — staggered from bottom */}
          <div ref={ctaCardsRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-14">
            {[
              { icon: MapPin, label: "Dirección", lines: ["Calle de Sabino Arana 40", "1°, 2ª · 08028 Barcelona"] },
              { icon: Phone,  label: "Teléfono",  lines: ["+34 932 041 069", "Llamadas y WhatsApp"]           },
              { icon: Clock,  label: "Horario",   lines: ["Lunes – Viernes", "9:30 – 19:00 h"]                },
              { icon: Globe,  label: "Web",        lines: ["clinica-cotten.com", "info@clinica-cotten.com"]    },
            ].map(({ icon: Icon, label, lines }, i) => (
              <div
                key={label}
                className="p-6 rounded-2xl"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  backdropFilter: "blur(8px)",
                  ...fadeUp(ctaCardsVis, i * 0.10),
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(201,169,110,0.15)" }}
                >
                  <Icon size={18} style={{ color: "#c9a96e" }} />
                </div>
                <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.40)" }}>{label}</p>
                {lines.map(line => (
                  <p key={line} className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.80)" }}>{line}</p>
                ))}
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate("/acceso-paciente")}
              className="w-full sm:w-auto px-10 py-4 rounded-xl text-sm font-semibold tracking-wide"
              style={{
                background: "linear-gradient(135deg, #c9a96e, #d9bc8a)",
                color: "#1a2744",
                boxShadow: "0 8px 30px rgba(201,169,110,0.32)",
                transition: "transform 0.3s ease, box-shadow 0.3s ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow="0 14px 44px rgba(201,169,110,0.56)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)";    e.currentTarget.style.boxShadow="0 8px 30px rgba(201,169,110,0.32)"; }}
            >
              Acceso Portal Paciente
            </button>
            <a
              href="tel:+34932041069"
              className="w-full sm:w-auto px-10 py-4 rounded-xl text-sm font-medium tracking-wide text-center"
              style={{
                border: "1px solid rgba(255,255,255,0.28)",
                color: "white",
                transition: "background 0.3s ease, border-color 0.3s ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,0.10)"; e.currentTarget.style.borderColor="rgba(255,255,255,0.50)"; }}
              onMouseLeave={e => { e.currentTarget.style.background="transparent";            e.currentTarget.style.borderColor="rgba(255,255,255,0.28)"; }}
            >
              Llamar ahora
            </a>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          TREATMENT MODAL
      ════════════════════════════════════════════════════════ */}
      {activeModal && (
        <TreatmentModal
          treatment={activeModal}
          onClose={() => setActiveModal(null)}
          onContact={() => {
            setActiveModal(null);
            scrollTo(contactRef);
          }}
        />
      )}

      {/* ════════════════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════════════════ */}
      <footer style={{ background: "#0d1526", borderTop: "1px solid rgba(201,169,110,0.12)" }}>
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #c9a96e, #d9bc8a)" }}
              >
                <span className="text-white font-bold text-xs">CC</span>
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: "rgba(255,255,255,0.80)" }}>Clínica Cotten</p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.30)" }}>Dr. Philippe Cotten · Colegiado nº 08/123456</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6">
              {navLinks.map(({ label, ref }) => (
                <button
                  key={label}
                  onClick={() => scrollTo(ref)}
                  className="text-xs"
                  style={{ color: "rgba(255,255,255,0.32)", transition: "color 0.2s ease" }}
                  onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,0.65)"}
                  onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.32)"}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
              <Shield size={11} />
              <span>© 2026 · Datos protegidos RGPD</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
