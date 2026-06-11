# vallartaweb

> Sitios web que venden mientras duermes.

Landing editorial premium para **vallartaweb**, agencia mexicana de desarrollo web y bots conversacionales con base en Puerto Vallarta. Sin build step, sin bundler, sin framework de servidor: HTML + React UMD + Babel Standalone + GSAP.

---

## Stack

| Capa | Tecnología |
|---|---|
| Markup | HTML5 semántico |
| Estilos | CSS3 con variables nativas + media queries |
| Vista | React 18 (UMD) via CDN |
| Transpilación | Babel Standalone (en navegador) |
| Animación | GSAP 3 + ScrollTrigger |
| Smooth scroll | Lenis 1.0 |
| Tipografía cinética | SplitType 0.3 |
| Hosting | Vercel (estático, edge) |
| Tipografías | Fraunces · Inter · JetBrains Mono (Google Fonts) |

---

## Estructura

```
vallartaweb/
├── index.html        # Punto de entrada, CDNs y meta tags
├── styles.css        # Sistema visual completo (variables, secciones, responsive)
├── app.jsx           # Componentes React, GSAP, Lenis, SplitType
├── copy.js           # Diccionario de traducciones (es / en)
├── favicon.svg       # Marca: "vw" + punto coral
├── og-image.html     # Plantilla 1200×630 para Open Graph (exportar a JPG)
├── vercel.json       # Headers de caché para /assets
└── assets/
    ├── hero.mp4         # Video de fondo del hero
    ├── manifiesto.mp4   # Video del manifiesto
    ├── servicios.mp4    # Video ambient de las tarjetas de servicios
    ├── sunset.mp4       # Video del CTA final
    └── ambient.mp3      # Audio ambiente toggleable
```

---

## Cómo funciona

1. **`index.html`** carga las tipografías, los CDN de React/Babel/GSAP/Lenis/SplitType y los archivos del proyecto (`copy.js`, `app.jsx`).
2. **`copy.js`** expone `window.COPY` con todas las cadenas traducidas en español e inglés.
3. **`app.jsx`** se transpila al vuelo con Babel Standalone (`type="text/babel"`). Define los componentes React y los renderiza en `#root`.
4. **GSAP + Lenis** se inicializan en `App` y sincronizan el smooth scroll con `ScrollTrigger`.
5. **SplitType** se aplica al `<h1>` del hero para revelar el texto carácter por carácter (`stagger 0.025`, `ease expo.out`).
6. **ScrollTrigger** anima el manifiesto con `scrub`, ilumina los pasos del proceso al 50% del viewport y aplica un parallax suave (`0.5x`) sobre el video del atardecer.
7. **Hover 3D tilt** sutil (máximo 8°) en las tarjetas de servicios — solo desktop.

---

## Secciones

1. **Hero** — Video de fondo, h1 con text reveal cinético, CTAs primarios.
2. **Manifiesto** — Posicionamiento de marca con video parallax y fade-in/out scroll-linked.
3. **Servicios** — 3 tarjetas (Páginas web · Landings · Bots) con tilt 3D.
4. **Proceso** — Timeline de 4 pasos que se iluminan secuencialmente al hacer scroll.
5. **Portafolio** — 3 cases (Casa Marlen · Olvera · Clínica Aurora) con mockups dibujados a mano en CSS.
6. **CTA Final** — Video de atardecer, botones de llamada y WhatsApp.
7. **Footer** — Nav, contacto, copyright.

---

## Desarrollo local

No requiere `npm install`. Basta con abrir `index.html` en el navegador o servirlo con cualquier static server:

```bash
# Opción 1 — abrir directo
start index.html        # Windows
open index.html         # macOS

# Opción 2 — servir
python -m http.server 8080
# luego http://localhost:8080
```

> Algunos navegadores restringen `autoplay` de video sin servidor. Si los videos no se reproducen al abrir como `file://`, usa un static server.

---

## Deploy

El sitio está desplegado en Vercel y se actualiza automáticamente con cada push a `main`. `vercel.json` configura cache `immutable` para los assets pesados.

```bash
git push origin main   # Vercel hace el resto
```

---

## Marca

| Token | Valor |
|---|---|
| Navy | `#0a2540` |
| Navy deep | `#050d18` |
| Coral | `#ff6b35` |
| Gold | `#fccc6c` |
| Beige | `#f8f5ef` |
| Mid-blue | `#1e5e8e` |

Tipografías: **Fraunces** (display, editorial), **Inter** (UI), **JetBrains Mono** (labels técnicos).

---

## Créditos

Diseño y código desde Puerto Vallarta para el mundo.
**MX · Establecido 2026.**
