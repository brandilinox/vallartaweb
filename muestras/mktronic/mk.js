/* MKTronic — demo VallartaWeb. Sonido 100% sintetizado con Web Audio (sin archivos de audio). */
(function () {
'use strict';
var I = '/muestras/mktronic/img/';
var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
var FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
var MOB = innerWidth < 860;
var WA = '523223181218';
function $(s, c) { return (c || document).querySelector(s); }
function $$(s, c) { return [].slice.call((c || document).querySelectorAll(s)); }
function st(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
var root = document.documentElement;
if (FINE && !RM) root.classList.add('fine');

/* =====================================================================
   SONIDO — motor, turbo, llantas, cambios, campana del tablero
   ===================================================================== */
var Snd = (function () {
  var ctx, master, eng, nbuf, on = false, ready = false, mis = false;
  function init() {
    if (ready) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC(); } catch (e) { return false; }
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = .004; comp.release.value = .2;
    master = ctx.createGain(); master.gain.value = 0;
    master.connect(comp); comp.connect(ctx.destination);
    nbuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    var d = nbuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    eng = buildEngine();
    ready = true;
    setInterval(misfireTick, 110);
    return true;
  }
  function noise() { var s = ctx.createBufferSource(); s.buffer = nbuf; s.loop = true; s.loopStart = Math.random(); return s; }
  function bq(type, f, q) { var b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q || 1; return b; }
  function gain(v) { var g = ctx.createGain(); g.gain.value = v; return g; }
  function curve(k) { var n = 2048, c = new Float32Array(n); for (var i = 0; i < n; i++) { var x = i * 2 / n - 1; c[i] = (1 + k) * x / (1 + k * Math.abs(x)); } return c; }

  function buildEngine() {
    var out = gain(0), lp = bq('lowpass', 500, 2.5), ws = ctx.createWaveShaper(), am = gain(.75), mix = gain(.5);
    ws.curve = curve(7); ws.oversample = '2x';
    var lfo = ctx.createOscillator(), lg = gain(.25);
    lfo.frequency.value = 14; lfo.connect(lg); lg.connect(am.gain); lfo.start();
    // armónicos del encendido (4 cilindros): fundamental, sub, 2º, retumbo
    var defs = [['sawtooth', 1, .5, 0], ['square', .5, .32, 0], ['sawtooth', 2, .16, 9], ['triangle', .25, .45, 0], ['sawtooth', 1.5, .1, -6]];
    var oscs = defs.map(function (d) {
      var o = ctx.createOscillator(); o.type = d[0]; o.detune.value = d[3];
      var g = gain(d[2]); o.connect(g); g.connect(mix); o.frequency.value = 28 * d[1]; o.start();
      return { o: o, m: d[1] };
    });
    // admisión / escape (ruido)
    var nz = noise(), nb = bq('bandpass', 700, .8), ng = gain(.13);
    nz.connect(nb); nb.connect(ng); ng.connect(mix); nz.start();
    mix.connect(am); am.connect(ws); ws.connect(lp); lp.connect(out); out.connect(master);
    return { out: out, lp: lp, oscs: oscs, lfo: lfo, lg: lg, nb: nb, am: am, rpm: 850 };
  }
  function setRPM(rpm, vol, tc) {
    if (!ready) return;
    tc = tc || .05;
    var t = ctx.currentTime, f = rpm / 60 * 2;
    eng.oscs.forEach(function (x) { x.o.frequency.setTargetAtTime(f * x.m, t, tc); });
    eng.lfo.frequency.setTargetAtTime(f / 2, t, tc);
    eng.lg.gain.setTargetAtTime(Math.max(.05, .3 - rpm / 26000), t, tc);
    eng.lp.frequency.setTargetAtTime(200 + rpm * .45, t, tc);
    eng.nb.frequency.setTargetAtTime(380 + rpm * .32, t, tc);
    eng.out.gain.setTargetAtTime(vol, t, tc * 1.6);
    eng.rpm = rpm;
  }
  function env(g, t, a, peak, dec) {
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(.0001, t + a + dec);
  }
  function can() { return ready && on; }

  // válvula de alivio del turbo: "pssshh-tutututu"
  function blowoff(v) {
    if (!can()) return; v = v || .4;
    var t = ctx.currentTime, n = noise(), hp = bq('highpass', 900, .7), bp = bq('bandpass', 3400, 1.1), g = gain(0);
    var fl = ctx.createOscillator(), fg = gain(v * .4);
    bp.frequency.setValueAtTime(3400, t); bp.frequency.exponentialRampToValueAtTime(650, t + .6);
    fl.type = 'square'; fl.frequency.setValueAtTime(26, t); fl.frequency.linearRampToValueAtTime(14, t + .6);
    fl.connect(fg); fg.connect(g.gain);
    n.connect(hp); hp.connect(bp); bp.connect(g); g.connect(master);
    env(g, t, .012, v, .62);
    n.start(t); n.stop(t + .7); fl.start(t + .1); fl.stop(t + .62);
  }
  // rechinido de llantas
  function screech(dur, v) {
    if (!can()) return; dur = dur || .9; v = v || .5;
    var t = ctx.currentTime, n = noise(), b1 = bq('bandpass', 2300, 13), b2 = bq('bandpass', 3350, 15), g = gain(0);
    var vib = ctx.createOscillator(), vg = gain(260);
    vib.frequency.value = 7; vib.connect(vg); vg.connect(b1.frequency); vg.connect(b2.frequency);
    b1.frequency.setValueAtTime(2600, t); b1.frequency.linearRampToValueAtTime(2000, t + dur);
    n.connect(b1); n.connect(b2); b1.connect(g); b2.connect(g); g.connect(master);
    g.gain.setValueAtTime(.0001, t);
    g.gain.linearRampToValueAtTime(v * 3.2, t + .06);
    g.gain.setValueAtTime(v * 3.2, t + dur);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur + .35);
    n.start(t); n.stop(t + dur + .4); vib.start(t); vib.stop(t + dur + .4);
  }
  // cambio de marcha: golpe + clic
  function shift() {
    if (!can()) return;
    var t = ctx.currentTime, o = ctx.createOscillator(), g = gain(0), n = noise(), hp = bq('highpass', 2500, .7), ng = gain(0);
    o.type = 'sine'; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(42, t + .16);
    o.connect(g); g.connect(master); env(g, t, .005, .55, .18);
    n.connect(hp); hp.connect(ng); ng.connect(master); env(ng, t, .002, .22, .04);
    o.start(t); o.stop(t + .25); n.start(t); n.stop(t + .08);
  }
  // campana del tablero
  function chime() {
    if (!can()) return;
    var t = ctx.currentTime;
    [1047, 1568].forEach(function (f, i) {
      var o = ctx.createOscillator(), g = gain(0); o.type = 'sine'; o.frequency.value = f;
      o.connect(g); g.connect(master); env(g, t + i * .004, .006, .16, .75); o.start(t); o.stop(t + .9);
    });
  }
  function tick() {
    if (!can()) return;
    var t = ctx.currentTime, o = ctx.createOscillator(), g = gain(0);
    o.type = 'sine'; o.frequency.value = 2600; o.connect(g); g.connect(master); env(g, t, .002, .035, .03);
    o.start(t); o.stop(t + .06);
  }
  function whoosh() {
    if (!can()) return;
    var t = ctx.currentTime, n = noise(), b = bq('bandpass', 400, 1.4), g = gain(0);
    b.frequency.setValueAtTime(300, t); b.frequency.exponentialRampToValueAtTime(2600, t + .35);
    n.connect(b); b.connect(g); g.connect(master); env(g, t, .12, .35, .3);
    n.start(t); n.stop(t + .5);
  }
  // marcha de arranque "rr-rr-rr"
  function crank(dur) {
    if (!can()) return;
    var t = ctx.currentTime, n = noise(), lp = bq('lowpass', 520, 1), g = gain(0), o = ctx.createOscillator(), og = gain(.1);
    var lfo = ctx.createOscillator(), lfg = gain(.3);
    o.type = 'sawtooth'; o.frequency.value = 52; o.connect(og); og.connect(lp);
    lfo.type = 'square'; lfo.frequency.value = 11; lfo.connect(lfg); lfg.connect(g.gain);
    n.connect(lp); lp.connect(g); g.connect(master);
    g.gain.setValueAtTime(.32, t); g.gain.setValueAtTime(.32, t + dur - .05); g.gain.linearRampToValueAtTime(0, t + dur);
    n.start(t); o.start(t); lfo.start(t); n.stop(t + dur); o.stop(t + dur); lfo.stop(t + dur);
  }
  function misfireTick() {
    if (!mis || !can() || !eng) return;
    if (Math.random() < .42) {
      var t = ctx.currentTime;
      eng.am.gain.cancelScheduledValues(t);
      eng.am.gain.setValueAtTime(.06, t);
      eng.am.gain.setValueAtTime(.75, t + .05 + Math.random() * .05);
    }
  }
  function enable(v) {
    if (v && !ready && !init()) return false;
    on = !!v;
    st('mk-snd', on ? '1' : '0');
    $('#snd').setAttribute('aria-pressed', on);
    root.classList.toggle('snd-on', on);
    if (!ready) return on;
    if (on) { ctx.resume(); master.gain.setTargetAtTime(.9, ctx.currentTime, .12); }
    else { master.gain.setTargetAtTime(0, ctx.currentTime, .06); setTimeout(function () { if (!on && ctx) ctx.suspend(); }, 400); }
    return on;
  }
  document.addEventListener('visibilitychange', function () {
    if (!ready) return;
    if (document.hidden) ctx.suspend(); else if (on) ctx.resume();
  });
  return {
    init: init, enable: enable, on: function () { return can(); }, setRPM: setRPM,
    blowoff: blowoff, screech: screech, shift: shift, chime: chime, tick: tick, whoosh: whoosh, crank: crank,
    misfire: function (v) { mis = v; }
  };
})();

/* =====================================================================
   IDIOMAS
   ===================================================================== */
var T = {
  es: {
    title: 'MKTronic · Programación automotriz en Puerto Vallarta',
    'gate.hint': 'Presiona para arrancar · con sonido', 'gate.muted': 'Entrar sin sonido',
    'nav.svc': 'Servicios', 'nav.shop': 'Taller', 'nav.ct': 'Contacto', 'nav.quote': 'Cotiza',
    'h.l1': 'Especialistas', 'h.l2': 'en programación', 'h.l3': 'automotriz',
    'h.lead': 'Computadoras y módulos probados, listos para funcionar en tu vehículo de media o alta gama. Compra con seguridad y respaldo profesional.',
    'cta.wa': 'Cotiza en WhatsApp', 'cta.svc': 'Ver servicios →',
    'hud.g': 'en Google · 34 opiniones', ship: 'Envíos seguros a todo México', 'hud.hint': 'Scroll = acelera',
    'in.kick': 'Computadoras automotrices (ECU)',
    'in.h': '¿Necesitas una <span class="r">computadora</span> <em>automotriz</em> confiable?',
    'in.p1': 'En MKTronic ofrecemos computadoras y módulos probados, listos para funcionar en tu vehículo de media o alta gama.',
    'in.p2': 'Compra con seguridad y respaldo profesional, evitando sorpresas o reemplazos innecesarios.',
    'in.q': 'Cotiza la tuya hoy y mantén tu auto funcionando como debe.',
    'in.tag': 'Banco de pruebas', 'in.tag2': 'Simulación de ECU',
    'st.1': 'Google · 34 opiniones', 'st.2': 'Servicios especializados', 'st.k': 'mil', 'st.4': 'Seguidores en Facebook',
    'sv.kick': 'Nuestros servicios', 'sv.h': 'Doce <span class="r">marchas</span><br><em>bajo el cofre</em>', 'sv.swipe': 'Desliza →', 'sv.gear': 'MARCHA',
    'sv.cta': '¿Cuál <span class="r">necesitas?</span>', 'sv.real': 'Foto real',
    'ce.kick': 'Consejo MKTronic', 'ce.h': '¿Tu Check Engine está <span class="r">parpadeando?</span>',
    'ce.p': 'Fíjate con el motor encendido. Toca para ver la diferencia:', 'ce.fija': 'Fija', 'ce.blink': 'Parpadeando',
    'ce.f1': '<b>Fija</b>La luz permanece encendida.',
    'ce.b1': '<b>Si parpadea, reduce la velocidad suavemente.</b>Evita acelerones y busca un lugar seguro para detenerte si continúa.',
    'ce.b2': '<b>¿Dejó de parpadear al bajar la velocidad?</b>No aceleres para “probarlo”. Solicita una revisión, aunque vuelva a sentirse normal.',
    'ce.b3': '<b>¿El carro también tiembla, da jalones o pierde fuerza?</b>Detente en un lugar seguro y pide asistencia. No lo fuerces para llegar al taller.',
    'ce.b4': '<b>Cuéntale al técnico qué pasó.</b>¿Fue al acelerar, en una subida o con el motor frío? ¿Hubo jaloneos o pérdida de fuerza? Esos detalles ayudan a orientar el diagnóstico.',
    'ce.ear': '🔊 Toca “Parpadeando” y escucha al motor fallar',
    'ce.src': 'Consejo publicado por MKTronic en su Facebook', 'ce.cta': 'Pide tu escaneo por WhatsApp',
    'ga.kick': 'Trabajos reales', 'ga.h': 'En el <span class="r">taller</span>', 'ga.br': 'Han pasado por aquí:',
    'rv.kick': 'Opiniones en Google', 'rv.p': '34 opiniones en Google Maps', 'rv.btn': 'Ver en Google →',
    q1: 'Excelente servicio, me atendieron de inmediato y solucionaron mi problema.',
    q2: 'Muy profesionales y honestos en sus trabajos.',
    q3: 'Buena atención, trabajan bien y buenos resultados.',
    q4: 'Muy rápidos y confiables.', qc: 'Opinión en Google',
    'ct.h': 'Arranca <span class="r">hoy.</span>', 'ct.call': 'Llamar 322 318 1218', 'ct.tels': 'Teléfonos',
    'ct.t1': 'Llamadas y WhatsApp', 'ct.t2': 'Llamadas', 'ct.mail': 'Correo', 'ct.hrs': 'Horario', 'ct.loc': 'Ubicación', 'ct.go': 'Cómo llegar',
    demo: '<b>DEMO / MUESTRA</b> · Propuesta de sitio hecha por <a href="https://vallartaweb.vercel.app">VallartaWeb</a> para MKTronic. Datos, opiniones e imágenes tomados de sus canales públicos (sitio, Facebook y Google Maps). Sonidos generados por código.',
    open: 'Abierto · cierra ', closed: 'Cerrado ahora', closedDay: 'Cerrado',
    days: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
    waq: 'Hola MKTronic, quiero cotizar', wace: 'Hola MKTronic, se me prendió el Check Engine'
  },
  en: {
    title: 'MKTronic · Automotive programming in Puerto Vallarta',
    'gate.hint': 'Press to start · sound on', 'gate.muted': 'Enter without sound',
    'nav.svc': 'Services', 'nav.shop': 'Shop', 'nav.ct': 'Contact', 'nav.quote': 'Quote',
    'h.l1': 'Automotive', 'h.l2': 'programming', 'h.l3': 'specialists',
    'h.lead': 'Tested ECUs and modules, ready to run in your mid- or high-end vehicle. Buy with confidence and professional backing.',
    'cta.wa': 'Get a quote on WhatsApp', 'cta.svc': 'See services →',
    'hud.g': 'on Google · 34 reviews', ship: 'Safe shipping across Mexico', 'hud.hint': 'Scroll = throttle',
    'in.kick': 'Automotive computers (ECU)',
    'in.h': 'Need a <span class="r">reliable</span> <em>car</em> computer?',
    'in.p1': 'At MKTronic we offer tested computers and modules, ready to run in your mid- or high-end vehicle.',
    'in.p2': 'Buy with confidence and professional backing, avoiding surprises or unnecessary replacements.',
    'in.q': 'Get yours quoted today and keep your car running the way it should.',
    'in.tag': 'Test bench', 'in.tag2': 'ECU simulation',
    'st.1': 'Google · 34 reviews', 'st.2': 'Specialized services', 'st.k': 'K', 'st.4': 'Facebook followers',
    'sv.kick': 'Our services', 'sv.h': 'Twelve <span class="r">gears</span><br><em>under the hood</em>', 'sv.swipe': 'Swipe →', 'sv.gear': 'GEAR',
    'sv.cta': 'Which one <span class="r">do you need?</span>', 'sv.real': 'Real photo',
    'ce.kick': 'MKTronic tip', 'ce.h': 'Is your Check Engine <span class="r">flashing?</span>',
    'ce.p': 'Check it with the engine running. Tap to see the difference:', 'ce.fija': 'Steady', 'ce.blink': 'Flashing',
    'ce.f1': '<b>Steady</b>The light stays on.',
    'ce.b1': '<b>If it flashes, slow down gently.</b>Avoid hard acceleration and find a safe place to stop if it continues.',
    'ce.b2': '<b>Did it stop flashing when you slowed down?</b>Don’t accelerate to “test it”. Ask for an inspection, even if it feels normal again.',
    'ce.b3': '<b>Is the car also shaking, jerking or losing power?</b>Stop in a safe place and call for assistance. Don’t force it to reach the shop.',
    'ce.b4': '<b>Tell the technician what happened.</b>Was it when accelerating, going uphill or with a cold engine? Was there jerking or loss of power? Those details help guide the diagnosis.',
    'ce.ear': '🔊 Tap “Flashing” and hear the engine misfire',
    'ce.src': 'Tip published by MKTronic on their Facebook (translated)', 'ce.cta': 'Book a scan on WhatsApp',
    'ga.kick': 'Real jobs', 'ga.h': 'In the <span class="r">shop</span>', 'ga.br': 'Recently in the shop:',
    'rv.kick': 'Google reviews', 'rv.p': '34 reviews on Google Maps', 'rv.btn': 'See on Google →',
    q1: 'Excellent service, they helped me right away and solved my problem.',
    q2: 'Very professional and honest in their work.',
    q3: 'Good service, they work well and get good results.',
    q4: 'Very fast and reliable.', qc: 'Google review (translated)',
    'ct.h': 'Start it <span class="r">today.</span>', 'ct.call': 'Call 322 318 1218', 'ct.tels': 'Phones',
    'ct.t1': 'Calls & WhatsApp', 'ct.t2': 'Calls', 'ct.mail': 'Email', 'ct.hrs': 'Hours', 'ct.loc': 'Location', 'ct.go': 'Directions',
    demo: '<b>DEMO / SAMPLE</b> · Website proposal made by <a href="https://vallartaweb.vercel.app">VallartaWeb</a> for MKTronic. Data, reviews and images taken from their public channels (website, Facebook and Google Maps). Sounds generated in code.',
    open: 'Open · closes ', closed: 'Closed now', closedDay: 'Closed',
    days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    waq: 'Hi MKTronic, I would like a quote', wace: 'Hi MKTronic, my Check Engine light came on'
  }
};
var SVC = [
  { i: 's-ecu', big: 1, hot: 1, es: ['Venta de computadoras automotrices (ECU)', 'Contamos con diferentes modelos y compatibilidades para múltiples marcas.'], en: ['Automotive computer sales (ECU)', 'We carry different models and compatibilities for multiple brands.'] },
  { i: 'bmw-llave', real: 1, es: ['Servicio de programación', 'Programación y clonación de computadoras, llaves, tableros y kilometraje.'], en: ['Programming service', 'Programming and cloning of ECUs, keys, instrument clusters and mileage.'] },
  { i: 's-reparacion', es: ['Reparación de computadoras', 'Por fallas comunes, tales como cortos y picos de voltaje. Evaluamos con equipo especializado.'], en: ['ECU repair', 'For common failures such as shorts and voltage spikes. We evaluate with specialized equipment.'] },
  { i: 'banco', real: 1, big: 1, es: ['Simulación de computadoras', 'Conectamos tu pieza a un banco de pruebas que reproduce las condiciones del vehículo. Así confirmamos si funciona correctamente y evitamos reemplazarla sin necesidad.'], en: ['ECU simulation', 'We connect your part to a test bench that reproduces the vehicle’s conditions, confirming whether it works correctly and avoiding an unnecessary replacement.'] },
  { i: 'porsche-llaves', real: 1, es: ['Cerrajería automotriz', 'Vendemos, duplicamos y programamos llaves con chip, controles y smart keys, con equipos especializados para distintas marcas.'], en: ['Automotive locksmith', 'We sell, duplicate and program chip keys, remotes and smart keys, with specialized equipment for different brands.'] },
  { i: 's-tpms', es: ['Sensores TPMS', 'Instalamos y programamos sensores de presión de llantas compatibles con el sistema del vehículo. Sincronización precisa.'], en: ['TPMS sensors', 'We install and program tire-pressure sensors compatible with your vehicle’s system. Precise synchronization.'] },
  { i: 'mercedes-escaner', real: 1, big: 1, es: ['Escaneo por computadora', 'Escaneo automotriz con equipos profesionales para detectar fallas electrónicas, códigos de error y advertencias del tablero.'], en: ['Computer diagnostic scan', 'Automotive scanning with professional equipment to detect electronic faults, error codes and dashboard warnings.'] },
  { i: 's-llantas', es: ['Venta de neumáticos', 'Neumáticos para diferentes tipos de vehículo y estilo de manejo.'], en: ['Tire sales', 'Tires for different vehicle types and driving styles.'] },
  { i: 's-mantenimiento', es: ['Mantenimiento preventivo', 'Revisión de niveles, filtros, frenos, batería y más, para que tu vehículo funcione de forma óptima y segura.'], en: ['Preventive maintenance', 'Fluid levels, filters, brakes, battery and more, so your vehicle runs optimally and safely.'] },
  { i: 's-suspension', es: ['Servicio completo de suspensión', 'Inspección, diagnóstico y reemplazo de piezas dañadas: amortiguadores, rótulas, horquillas, bujes y nivelación.'], en: ['Full suspension service', 'Inspection, diagnosis and replacement of damaged parts: shocks, ball joints, control arms, bushings and leveling.'] },
  { i: 's-tuning', hot: 1, es: ['Tuning / optimización de desempeño', 'Un aumento en los caballos de fuerza: mejora notable en potencia, eficiencia y respuesta, sin comprometer la seguridad del motor.'], en: ['Tuning / performance optimization', 'A horsepower boost: a noticeable improvement in power, efficiency and response, without compromising engine safety.'] },
  { i: 's-inmo', es: ['Inmo Off', 'Desactivación del inmovilizador desde la computadora (ECU) para que el motor arranque sin la llave codificada original. Útil si se perdió la llave, se cambió la computadora o el inmovilizador está dañado.'], en: ['Immo Off', 'Immobilizer deactivation from the ECU so the engine starts without the original coded key. Useful if the key was lost, the ECU was replaced or the immobilizer is damaged.'] }
];
var GAL = [
  ['mercedes-escaner', 'w8 t3 wide', 'Escaneo · Mercedes-Benz', 'Scan · Mercedes-Benz'],
  ['kia-ecu', 't3', 'Reemplazo de computadora · Kia Rio', 'ECU replacement · Kia Rio'],
  ['porsche-llaves', 't3', 'Llaves · Porsche', 'Keys · Porsche'],
  ['mini', 't3', 'Diagnóstico · Mini Cooper', 'Diagnostics · Mini Cooper'],
  ['bmw-llave', 't3', 'Programación de llave · BMW', 'Key programming · BMW'],
  ['banco', 'w6 t2 wide', 'Banco de pruebas', 'Test bench'],
  ['nissan-llave', 'w6 t2 wide', 'Llave con chip · Nissan', 'Chip key · Nissan'],
  ['fachada', 'w12 t2 wide', 'Calle Veracruz 667 · El Pitillal', 'Calle Veracruz 667 · El Pitillal']
];
var TK = {
  es: [['Computadoras ECU', 'Programación', 'Llaves con chip', 'Escaneo', 'Sensores TPMS', 'Tuning', 'Inmo Off', 'Simulación'], ['Envíos a todo México', 'Smart keys', 'Kilometraje', 'Tableros', 'Suspensión', 'Neumáticos', 'Mantenimiento']],
  en: [['ECU computers', 'Programming', 'Chip keys', 'Diagnostics', 'TPMS sensors', 'Tuning', 'Immo Off', 'Simulation'], ['Shipping across Mexico', 'Smart keys', 'Mileage', 'Clusters', 'Suspension', 'Tires', 'Maintenance']]
};
var SCHED = { 0: null, 1: [540, 1200], 2: [540, 1200], 3: [540, 1200], 4: [540, 1200], 5: [540, 1200], 6: [540, 960] };

function pickLang() {
  var q = (location.search.match(/[?&]lang=(es|en)/) || [])[1];
  if (q) return q;
  var s = st('mk-lang'); if (s === 'es' || s === 'en') return s;
  return /^es/i.test(navigator.language || 'es') ? 'es' : 'en';
}
var L = pickLang();

/* ----- texto que se "decodifica" (estilo ECU) ----- */
var GLY = '01#%&/<>ABCDEF$';
function scramble(el, ms) {
  if (RM || !el) return;
  ms = ms || 900;
  var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), nodes = [], n;
  while ((n = w.nextNode())) if (n.data.trim()) nodes.push({ n: n, f: n.data });
  var total = nodes.reduce(function (a, x) { return a + x.f.length; }, 0), t0 = performance.now();
  el.classList.add('glitch');
  (function f(t) {
    var p = Math.min(1, (t - t0) / ms), k = 0;
    nodes.forEach(function (x) {
      var s = '';
      for (var i = 0; i < x.f.length; i++, k++) {
        var c = x.f[i];
        s += (c === ' ' || k / total < p * 1.15 - .1) ? c : GLY[(Math.random() * GLY.length) | 0];
      }
      x.n.data = p >= 1 ? x.f : s;
    });
    if (p < 1) requestAnimationFrame(f); else el.classList.remove('glitch');
  })(t0);
}

function waHref(kind) { return 'https://wa.me/' + WA + '?text=' + encodeURIComponent(T[L][kind === 'ce' ? 'wace' : 'waq']); }

function applyLang(lang, anim) {
  L = lang; st('mk-lang', lang);
  var D = T[lang];
  root.lang = lang === 'en' ? 'en' : 'es-MX';
  document.title = D.title;
  $$('[data-i18n]').forEach(function (el) { var v = D[el.getAttribute('data-i18n')]; if (v != null) el.innerHTML = v; });
  $$('[data-lang]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-lang') === lang); });
  $$('[data-wa]').forEach(function (a) { a.href = waHref(a.getAttribute('data-wa')); });
  renderTicker(); renderServices(); renderGallery(); renderHours();
  if (anim) { $$('#h1 .ln>span, .h2').forEach(function (el) { var r = el.getBoundingClientRect(); if (r.bottom > 0 && r.top < innerHeight) scramble(el, 700); }); }
  if (window.ScrollTrigger) requestAnimationFrame(function () { ScrollTrigger.refresh(); });
}

/* ----- render dinámico ----- */
function renderTicker() {
  [['#tk1', 0], ['#tk2', 1]].forEach(function (x) {
    var h = TK[L][x[1]].map(function (s) { return '<span>' + s + '</span>'; }).join('');
    $(x[0]).innerHTML = h + h + h + h;
  });
}
var track = $('#track');
function renderServices() {
  var h = '';
  SVC.forEach(function (s, k) {
    var n = (k < 9 ? '0' : '') + (k + 1), d = s[L];
    h += '<article class="sc' + (s.big ? ' big' : '') + (s.hot ? ' hot' : '') + '"><div class="ph"><img src="' + I + s.i + '.jpg" alt="' + d[0] + '" loading="lazy"><span class="num">' + n + '</span>' + (s.real ? '<span class="real">' + T[L]['sv.real'] + '</span>' : '') + '</div><div class="tx"><h3>' + d[0] + '</h3><p>' + d[1] + '</p></div></article>';
  });
  h += '<div class="svc-cta"><h2 class="h2">' + T[L]['sv.cta'] + '</h2><a class="btn btn-red wa" data-wa="q" href="' + waHref('q') + '" target="_blank" rel="noopener">' + T[L]['cta.wa'] + '</a></div>';
  track.innerHTML = h;
}
var bento = $('#bento');
function renderGallery() {
  bento.innerHTML = GAL.map(function (g, k) {
    var c = L === 'en' ? g[3] : g[2];
    return '<button class="' + g[1] + ' in" data-k="' + k + '" data-c="' + c + '" aria-label="' + c + '"><img src="' + I + g[0] + '.jpg" alt="' + c + '" loading="lazy"></button>';
  }).join('');
  if (!galShown) $$('button', bento).forEach(function (b) { b.classList.remove('in'); });
}
var galShown = false;
function nowMX() {
  var o = {};
  new Intl.DateTimeFormat('en-US', { timeZone: 'America/Mexico_City', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false })
    .formatToParts(new Date()).forEach(function (x) { o[x.type] = x.value; });
  return { d: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(o.weekday), m: (+o.hour % 24) * 60 + (+o.minute) };
}
function fm(m) { var h = Math.floor(m / 60), mm = m % 60, ap = h >= 12 ? 'p.m.' : 'a.m.'; h = h % 12 || 12; return h + (mm ? ':' + (mm < 10 ? '0' : '') + mm : '') + ' ' + ap; }
function renderHours() {
  var n = nowMX(), today = SCHED[n.d], open = today && n.m >= today[0] && n.m < today[1], D = T[L];
  $('#dot').className = 'dot ' + (open ? 'on' : 'off');
  $('#status').textContent = open ? D.open + fm(today[1]) : D.closed;
  $('#hrs').innerHTML = [1, 2, 3, 4, 5, 6, 0].map(function (d) {
    var s = SCHED[d];
    return '<li' + (d === n.d ? ' class="today"' : '') + '><span>' + D.days[d] + '</span><span>' + (s ? fm(s[0]) + ' – ' + fm(s[1]) : D.closedDay) + '</span></li>';
  }).join('');
}

/* ----- medidores (ticks) ----- */
function gaugeTicks(sel, cx, n, r1b, r1s, r2, redFrom, labels, lr, fs) {
  var g = $(sel), s = '';
  for (var i = 0; i <= n; i++) {
    var a = (-225 + i * (270 / n)) * Math.PI / 180, big = i % (n / 8) === 0, r1 = big ? r1b : r1s, red = i >= redFrom;
    s += '<line x1="' + (cx + r1 * Math.cos(a)).toFixed(1) + '" y1="' + (cx + r1 * Math.sin(a)).toFixed(1) + '" x2="' + (cx + r2 * Math.cos(a)).toFixed(1) + '" y2="' + (cx + r2 * Math.sin(a)).toFixed(1) + '" stroke="' + (red ? '#ff2121' : '#4a4a55') + '" stroke-width="' + (big ? 3 : 1.4) + '"/>';
    if (labels && big) s += '<text x="' + (cx + lr * Math.cos(a)).toFixed(1) + '" y="' + (cx + 7 + lr * Math.sin(a)).toFixed(1) + '" text-anchor="middle" fill="' + (red ? '#ff2121' : '#888') + '" font-family="Anton" font-size="' + fs + '">' + (i / (n / 8)) + '</text>';
  }
  g.innerHTML = s;
}
gaugeTicks('#ticks', 150, 32, 108, 116, 124, 26);
gaugeTicks('#dticks', 200, 40, 150, 160, 172, 33, true, 128, 22);
gaugeTicks('#mticks', 60, 16, 44, 48, 52, 13);
function needleDeg(rpm) { return -135 + clamp(rpm / 8000, 0, 1) * 270; }

/* =====================================================================
   ARRANQUE (puerta "ENGINE START")
   ===================================================================== */
var gate = $('#gate'), launched = false;
function revSequence(withSound) {
  gate.classList.add('rev');
  var nd = $('#needle'), rv = $('#rpmv'), lights = $$('#shift i');
  var crankMs = withSound ? 750 : 0, D = RM ? 300 : (withSound ? 1900 : 1200);
  if (withSound) { Snd.crank(.75); gate.classList.add('shake'); }
  setTimeout(function () {
    gate.classList.remove('shake');
    var t0 = null;
    (function f(t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / D);
      // catch → pequeño golpe → subida a la zona roja → limitador
      var e;
      if (p < .12) e = .2 * (p / .12);
      else if (p < .22) e = .2 - .08 * ((p - .12) / .1);
      else if (p < .85) e = .12 + .8 * Math.pow((p - .22) / .63, 1.5);
      else e = .92 + Math.sin((p - .85) / .15 * Math.PI * 5) * .025;
      var rpm = 800 + e * 7000;
      nd.style.transform = 'rotate(' + needleDeg(rpm) + 'deg)';
      rv.textContent = (rpm / 1000).toFixed(1);
      lights.forEach(function (l, k) { l.classList.toggle('on', rpm > 5000 + k * 420); });
      if (withSound) Snd.setRPM(rpm, .22 + .32 * e, .025);
      if (p < 1) requestAnimationFrame(f);
      else {
        $('#shift').classList.add('flash');
        if (withSound) { Snd.blowoff(.5); Snd.setRPM(850, .1, .25); }
        nd.style.transition = 'transform .9s cubic-bezier(.2,.8,.2,1)';
        nd.style.transform = 'rotate(' + needleDeg(850) + 'deg)';
        setTimeout(launch, RM ? 0 : 420);
      }
    })(performance.now());
  }, crankMs);
}
function launch() {
  if (launched) return; launched = true;
  document.body.classList.add('go');
  if (window.__lenis) __lenis.start();
  setTimeout(function () { document.body.classList.add('gone'); }, 1500);
  $('#rpmhud').classList.add('on');
  setTimeout(function () { $('#mhint').classList.add('gone'); }, 6000);
  heroIntro();
  engineLoop();
}
$('#start').addEventListener('click', function () {
  var ok = Snd.enable(true);
  revSequence(!!ok);
});
$('#enterMuted').addEventListener('click', function () { Snd.enable(false); revSequence(false); });
$$('[data-lang]').forEach(function (b) {
  b.addEventListener('click', function () { if (b.getAttribute('data-lang') !== L) { applyLang(b.getAttribute('data-lang'), launched); Snd.tick(); } });
});
$('#snd').addEventListener('click', function () {
  var v = !Snd.on();
  Snd.enable(v);
  if (v) Snd.setRPM(1600, .2, .05);
});

/* =====================================================================
   MOTOR LIGADO AL SCROLL + tacómetros + líneas de velocidad
   ===================================================================== */
var rpm = 850, lastY = scrollY, lastT = performance.now(), vel = 0, blipUntil = 0, lastBO = 0, peak = 850, mis = false;
var mN = $('#mneedle'), mR = $('#mrpm'), dN = $('#dneedle'), dR = $('#drpm'), vl = $('#vlines');
(function () {
  if (RM) return;
  var h = '';
  for (var i = 0; i < (MOB ? 7 : 14); i++) h += '<i style="top:' + (4 + Math.random() * 92) + '%;animation-duration:' + (.5 + Math.random() * .9) + 's;animation-delay:' + (-Math.random()) + 's;opacity:' + (.25 + Math.random() * .6) + '"></i>';
  vl.innerHTML = h;
})();
function engineLoop() {
  var now = performance.now(), dt = Math.max(1, now - lastT), y = scrollY;
  var inst = Math.abs(y - lastY) / dt * 1000;
  vel += (inst - vel) * .25;
  lastY = y; lastT = now;
  var target = 850 + clamp(vel / 2800, 0, 1) * 6300;
  if (now < blipUntil) target = Math.max(target, 4200);
  rpm += (target - rpm) * (target > rpm ? .12 : .045);
  if (rpm > peak) peak = rpm;
  if (peak > 4600 && target < 1800 && rpm < peak - 1800 && now - lastBO > 1600) { Snd.blowoff(.3); lastBO = now; peak = rpm; }
  if (rpm < 1500) peak = rpm;
  var shown = rpm + (mis ? (Math.random() - .5) * 420 : 0);
  if (!document.hidden) {
    mN.style.transform = 'rotate(' + needleDeg(shown) + 'deg)';
    mR.textContent = Math.round(shown / 10) * 10;
    dN.style.transform = 'rotate(' + needleDeg(shown) + 'deg)';
    dR.textContent = Math.round(shown / 10) * 10;
    vl.style.opacity = clamp((rpm - 1800) / 4500, 0, .85);
  }
  Snd.setRPM(rpm, .075 + .2 * clamp((rpm - 850) / 6300, 0, 1), .06);
  requestAnimationFrame(engineLoop);
}
function blip() { blipUntil = performance.now() + 220; }

/* =====================================================================
   HUMO WebGL (reacciona al mouse y al acelerador)
   ===================================================================== */
(function smoke() {
  var c = $('#smoke'); if (RM || !c) return;
  var gl = c.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
  if (!gl) return;
  var vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var fs = [
    'precision mediump float;uniform vec2 R;uniform float T;uniform vec2 M;uniform float V;',
    'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}',
    'float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}',
    'void main(){vec2 uv=gl_FragCoord.xy/R;float asp=R.x/R.y;vec2 p=vec2(uv.x*asp,uv.y)*2.2;',
    'vec2 dm=vec2((uv.x-M.x)*asp,uv.y-M.y);float md=exp(-dot(dm,dm)*12.);p-=normalize(dm+1e-4)*md*.45;',
    'float t=T*.1;vec2 q=vec2(fbm(p+vec2(t*1.4,-t*.25)),fbm(p+vec2(5.2,1.3)+vec2(-t*.8,t*.4)));',
    'float d=fbm(p+2.6*q+vec2(-t*1.7,t*.2));',
    'float m=smoothstep(.98,.05,uv.y)*(.4+.6*smoothstep(.05,.75,uv.x));m*=1.-md*.8;',
    'float s=clamp(smoothstep(.42,.95,d)*m*(.85+V*.7),0.,1.);',
    'vec3 col=mix(vec3(.74,.76,.82),vec3(1.,.16,.1),smoothstep(.45,1.,uv.x)*smoothstep(.85,0.,uv.y)*.85);',
    'gl_FragColor=vec4(col*s,s)*.92;}'
  ].join('\n');
  function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; }
  var v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs); if (!v || !f) return;
  var pr = gl.createProgram(); gl.attachShader(pr, v); gl.attachShader(pr, f); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
  gl.useProgram(pr);
  var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var uR = gl.getUniformLocation(pr, 'R'), uT = gl.getUniformLocation(pr, 'T'), uM = gl.getUniformLocation(pr, 'M'), uV = gl.getUniformLocation(pr, 'V');
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  var S = MOB ? .35 : .5;
  function rs() { c.width = Math.max(2, c.clientWidth * S | 0); c.height = Math.max(2, c.clientHeight * S | 0); gl.viewport(0, 0, c.width, c.height); }
  rs(); addEventListener('resize', rs);
  var vis = true, T0 = 0, last = performance.now(), mx = .75, my = .25, tx = .75, ty = .25;
  new IntersectionObserver(function (e) { vis = e[0].isIntersecting; }).observe($('#hero'));
  $('#hero').addEventListener('pointermove', function (e) { var r = c.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width; ty = 1 - (e.clientY - r.top) / r.height; });
  (function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!vis || document.hidden) return;
    var thr = clamp((rpm - 850) / 6000, 0, 1);
    T0 += dt * (1 + thr * 3);
    mx += (tx - mx) * .06; my += (ty - my) * .06;
    gl.uniform2f(uR, c.width, c.height); gl.uniform1f(uT, T0 + 20); gl.uniform2f(uM, mx, my); gl.uniform1f(uV, thr);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  })(last);
})();

/* =====================================================================
   SERVICIOS: marcha, cambio, rechinido
   ===================================================================== */
var gn = $('#gn'), rb = $('#rb'), gear = 1;
function hud(p) {
  var i = clamp(Math.ceil(p * 12) || 1, 1, 12);
  rb.style.transform = 'scaleX(' + Math.max(.08, p) + ')';
  if (i !== gear) {
    var up = i > gear;
    gear = i; gn.textContent = (i < 10 ? '0' : '') + i;
    if (launched) { Snd.shift(); blip(); }
    if (window.gsap && !RM) gsap.fromTo(gn, { yPercent: up ? 100 : -100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .32, ease: 'power3.out' });
  }
}
track.addEventListener('scroll', function () { var m = track.scrollWidth - track.clientWidth; if (m > 0) hud(track.scrollLeft / m); }, { passive: true });
track.addEventListener('pointermove', function (e) {
  var c = e.target.closest('.sc'); if (!c) return;
  var r = c.getBoundingClientRect(); c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px');
});
var lastScreech = 0;
function drift() { var n = performance.now(); if (n - lastScreech > 3500 && launched) { lastScreech = n; Snd.screech(.85, .5); } }

/* =====================================================================
   CHECK ENGINE
   ===================================================================== */
var dash = $('#dash'), ceVis = false, ceBlink = false;
$$('.tog button').forEach(function (b) {
  b.addEventListener('click', function () {
    $$('.tog button').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
    ceBlink = b.getAttribute('data-m') === 'blink';
    dash.classList.toggle('blink', ceBlink);
    $('#st-fija').hidden = ceBlink; $('#st-blink').hidden = !ceBlink;
    Snd.chime(); if (ceBlink) setTimeout(Snd.chime, 550);
    setMis();
    if (window.gsap && !RM) gsap.from('#st-' + (ceBlink ? 'blink' : 'fija') + ' li', { x: 40, opacity: 0, stagger: .08, duration: .5, ease: 'power3.out' });
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  });
});
function setMis() { mis = ceBlink && ceVis; Snd.misfire(mis); }
new IntersectionObserver(function (e) { ceVis = e[0].isIntersecting; setMis(); }, { threshold: .2 }).observe($('#check'));

/* =====================================================================
   GALERÍA + LIGHTBOX
   ===================================================================== */
var lb = $('#lb'), li = $('img', lb), lc = $('.cap', lb), cur = 0;
function show(k) { cur = (k + GAL.length) % GAL.length; var g = GAL[cur]; li.src = I + g[0] + '.jpg'; lc.textContent = L === 'en' ? g[3] : g[2]; li.alt = lc.textContent; }
bento.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; show(+b.getAttribute('data-k')); lb.classList.add('on'); Snd.whoosh(); if (window.__lenis) __lenis.stop(); });
function closeLb() { lb.classList.remove('on'); if (window.__lenis) __lenis.start(); }
$('.x', lb).onclick = closeLb;
$('.pv', lb).onclick = function () { show(cur - 1); Snd.tick(); };
$('.nx', lb).onclick = function () { show(cur + 1); Snd.tick(); };
lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });
addEventListener('keydown', function (e) {
  if (!lb.classList.contains('on')) return;
  if (e.key === 'Escape') closeLb(); if (e.key === 'ArrowLeft') show(cur - 1); if (e.key === 'ArrowRight') show(cur + 1);
});
var sx = 0;
lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
lb.addEventListener('touchend', function (e) { var d = e.changedTouches[0].clientX - sx; if (Math.abs(d) > 50) show(cur + (d < 0 ? 1 : -1)); });

/* =====================================================================
   REVELADO, CONTADORES, NAV, CURSOR, TILT
   ===================================================================== */
function count(el) {
  if (el.__c) return; el.__c = 1;
  var to = +el.getAttribute('data-to'), dec = +(el.getAttribute('data-dec') || 0), t0 = null;
  (function f(t) { if (!t0) t0 = t; var p = Math.min(1, (t - t0) / 1400), e = 1 - Math.pow(1 - p, 3); el.textContent = (to * e).toFixed(dec); if (p < 1) requestAnimationFrame(f); })(performance.now());
}
function reveal(el) {
  if (el.classList.contains('in') && !el.matches('.bento button')) return;
  el.classList.add('in'); $$('.cnt', el).forEach(count); if (el.classList.contains('cnt')) count(el);
  if (el.id === 'bento') { galShown = true; $$('button', el).forEach(function (b, i) { setTimeout(function () { b.classList.add('in'); }, i * 90); }); }
}
var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { reveal(e.target); io.unobserve(e.target); } }); }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
var watch = $$('[data-rv], .score .cnt').concat([bento]);
watch.forEach(function (el) { io.observe(el); });
function chk() {
  watch.forEach(function (el) {
    if (el.__done) return;
    var r = el.getBoundingClientRect();
    if (r.top < innerHeight * .94 && r.bottom > 0) { el.__done = 1; reveal(el); io.unobserve(el); }
  });
}
var nav = $('#nav'), fab = $('#fab');
function onScroll() { var y = scrollY; nav.classList.toggle('solid', y > 40); fab.classList.toggle('on', y > innerHeight * .7); chk(); }
addEventListener('scroll', onScroll, { passive: true });

if (FINE && !RM) {
  var cr = $('.cur-r'), cd = $('.cur-d'), px = innerWidth / 2, py = innerHeight / 2, rx = px, ry = py;
  addEventListener('pointermove', function (e) { if (!root.classList.contains('moved')) root.classList.add('moved'); px = e.clientX; py = e.clientY; cd.style.transform = 'translate(' + px + 'px,' + py + 'px)'; });
  (function loop() { rx += (px - rx) * .18; ry += (py - ry) * .18; cr.style.transform = 'translate(' + rx + 'px,' + ry + 'px)'; requestAnimationFrame(loop); })();
  var lastTick = 0;
  document.addEventListener('pointerover', function (e) {
    var t = e.target.closest('a,button,.sc');
    cr.classList.toggle('h', !!t);
    if (t && performance.now() - lastTick > 90) { lastTick = performance.now(); Snd.tick(); }
    if (t && t.closest('.wa')) blip();
  });
  var tl = $('#tilt'), tr = tl.parentNode;
  tr.addEventListener('mousemove', function (e) { var b = tr.getBoundingClientRect(), x = (e.clientX - b.left) / b.width - .5, y = (e.clientY - b.top) / b.height - .5; tl.style.transform = 'rotateY(' + (x * 14) + 'deg) rotateX(' + (-y * 12) + 'deg)'; tl.style.setProperty('--gx', (x + .5) * 100 + '%'); });
  tr.addEventListener('mouseleave', function () { tl.style.transform = ''; });
}

/* =====================================================================
   GSAP / LENIS
   ===================================================================== */
function heroIntro() {
  if (!window.gsap || RM) { scramble($('#h1'), 1); return; }
  gsap.from('#h1 .ln>span', { yPercent: 110, skewY: 8, duration: 1.2, ease: 'power4.out', stagger: .12, delay: .3 });
  setTimeout(function () { scramble($('#h1'), 1100); }, 300);
  gsap.from('.hero .kick, .hero .lead, .hero .ctas, .hud>div', { y: 30, opacity: 0, duration: 1, ease: 'power3.out', stagger: .08, delay: .7 });
  gsap.fromTo('#herobg', { scale: 1.25 }, { scale: 1.04, duration: 2.6, ease: 'power2.out' });
}
applyLang(L, false);
renderHours();
setInterval(renderHours, 60000);

if (window.gsap && window.ScrollTrigger && !RM) {
  gsap.registerPlugin(ScrollTrigger);
  if (window.Lenis) {
    var lenis = new Lenis({ lerp: .09 }); window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); }); gsap.ticker.lagSmoothing(0);
    lenis.stop();
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) { var t = $(a.getAttribute('href')); if (t) { e.preventDefault(); lenis.scrollTo(t, { duration: 1.6 }); } });
    });
  }
  gsap.to('#herobg', { yPercent: 14, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero-in', { y: -80, opacity: .1, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });
  var sk = gsap.quickTo('.ticker .row', 'skewX', { duration: .4, ease: 'power3' });
  ScrollTrigger.create({ onUpdate: function (s) { sk(clamp(s.getVelocity() / -180, -14, 14)); } });
  var mm = gsap.matchMedia();
  mm.add('(min-width: 900px)', function () {
    var dist = function () { return track.scrollWidth - innerWidth; };
    gsap.to(track, { x: function () { return -dist(); }, ease: 'none', scrollTrigger: { trigger: '#servicios', start: 'top top', end: function () { return '+=' + dist(); }, pin: true, scrub: .7, invalidateOnRefresh: true, anticipatePin: 1, onUpdate: function (s) { hud(s.progress); }, onEnter: drift, onEnterBack: drift } });
    gsap.fromTo('#tire', { xPercent: 0 }, { xPercent: -45, ease: 'none', scrollTrigger: { trigger: '#servicios', start: 'top top', end: function () { return '+=' + dist(); }, scrub: true } });
  });
  mm.add('(max-width: 899px)', function () {
    ScrollTrigger.create({ trigger: '#servicios', start: 'top 60%', onEnter: drift });
  });
  gsap.from('#dash', { rotate: -25, scale: .85, ease: 'none', scrollTrigger: { trigger: '#check', start: 'top bottom', end: 'center center', scrub: true } });
  gsap.fromTo('.ct .h2', { letterSpacing: '.2em' }, { letterSpacing: '0em', ease: 'none', scrollTrigger: { trigger: '#contacto', start: 'top bottom', end: 'top 30%', scrub: true } });
  gsap.fromTo('#giant', { '--fill': '0%' }, { '--fill': '100%', ease: 'none', scrollTrigger: { trigger: 'footer', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  addEventListener('load', function () { ScrollTrigger.refresh(); });
} else {
  new IntersectionObserver(function (e) { if (e[0].isIntersecting) drift(); }).observe($('#servicios'));
}

/* sonido recordado: si ya lo activó antes, la puerta lo sugiere; el navegador exige un toque para sonar */
if (st('mk-snd') === '0') $('#snd').setAttribute('aria-pressed', 'false');
onScroll();
window.MK_OK = true; /* solo si todo cargó sin errores; si no, el respaldo del <head> quita la puerta */
})();
