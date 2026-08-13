/* escena.js — arma la escena y dibuja un cuadro cualquiera del bucle.

   Aquí ya no vive ningún efecto: el motor prepara la figura (recorte, halos,
   encuadre) y después recorre la lista de efectos del estilo en orden. Los
   efectos están en efectos.js y se pueden prender, apagar y combinar.

   REGLA DE ORO: todo se mueve en función de `fase` (0 a 1) con frecuencias
   enteras, y cada partícula recorre su camino un número exacto de veces por
   vuelta. Así el último cuadro empalma con el primero y el bucle no salta.

   Recibe `crearLienzo(w,h)` en vez de importar una librería de canvas, para
   correr igual en Node y en el navegador. */

(function (raiz, fabrica) {
  const api = fabrica();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (raiz.Motor = raiz.Motor || {}).escena = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const esNodo = typeof module === "object" && module.exports;
  const Recorte = esNodo ? require("./recorte") : self.Motor.recorte;
  const Estilos = esNodo ? require("./estilos") : self.Motor.estilos;
  const Efectos = esNodo ? require("./efectos") : self.Motor.efectos;

  const TAU = Math.PI * 2;
  const ORDEN = ["fondo", "frente", "acabado"];

  // Halo por dilatación: la silueta repetida en anillos. Se calcula UNA vez;
  // hacerlo por cuadro costaría 60 dibujos de pantalla completa cada vez.
  //
  // OJO con el radio y la fuerza: en una figura sola y estrecha esto da un
  // contorno, pero en una ilustración de grupo la dilatación cierra los huecos
  // entre personajes y el brillo se satura hasta volverse un rectángulo
  // sólido. Por eso cada estilo trae sus propios números.
  function halo(silueta, radio, color, fuerza, crearLienzo, anillos, pasos) {
    const c = crearLienzo(silueta.width, silueta.height);
    const g = c.getContext("2d");
    g.globalCompositeOperation = "lighter";

    for (let a = 1; a <= anillos; a++) {
      const r = (radio * a) / anillos;
      g.globalAlpha = fuerza / a;
      for (let p = 0; p < pasos; p++) {
        const ang = (p / pasos) * TAU;
        g.drawImage(silueta, Math.cos(ang) * r, Math.sin(ang) * r);
      }
    }

    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-in";
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    return c;
  }

  function tenir(fuente, color, crearLienzo) {
    const c = crearLienzo(fuente.width, fuente.height);
    const g = c.getContext("2d");
    g.drawImage(fuente, 0, 0);
    g.globalCompositeOperation = "source-in";
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    return c;
  }

  function crearEscena(opciones) {
    const imagen = opciones.imagen;
    const estilo = opciones.estilo;
    const W = opciones.ancho;
    const H = opciones.alto;
    const crearLienzo = opciones.crearLienzo;

    const pulso = Estilos.hacerPulso(estilo.pulso);
    const esRecorte = estilo.modo === "recorte";

    let figura = null, silueta = null, halos = null;
    let fx = 0, fy = 0, fw = 0, fh = 0;
    let lamina = null, lw = 0, lh = 0, lx = 0, ly = 0;

    if (esRecorte) {
      const recortada = Recorte.quitarFondo(imagen, crearLienzo);
      const caja = Recorte.recuadro(recortada);

      const util = crearLienzo(caja.w, caja.h);
      util.getContext("2d").drawImage(recortada, -caja.x, -caja.y);

      const escala = Math.min((W * 0.94) / caja.w, (H * 0.80) / caja.h);
      fw = Math.round(caja.w * escala);
      fh = Math.round(caja.h * escala);
      fx = Math.round((W - fw) / 2);

      // Una figura alta se asienta abajo y respira arriba. Una ilustración
      // casi cuadrada, si se asienta abajo, deja un hueco enorme en la mitad
      // de arriba: esa se centra.
      const abajo = Math.round(H * 0.97 - fh);
      const centrada = Math.round(H * 0.48 - fh / 2);
      fy = estilo.colocacion === "abajo" ? abajo
         : estilo.colocacion === "centrada" ? centrada
         : (fh < H * 0.72 ? centrada : abajo);

      figura = crearLienzo(fw, fh);
      figura.getContext("2d").drawImage(util, 0, 0, fw, fh);

      const h = estilo.halo;
      silueta = tenir(figura, "#ffffff", crearLienzo);
      halos = {
        lejos: halo(silueta, Math.round(fw * h.lejos), estilo.auraLejana, h.fuerza, crearLienzo, 4, 14),
        cerca: halo(silueta, Math.round(fw * h.cerca), estilo.auraCercana, h.fuerza, crearLienzo, 3, 12),
      };
    } else {
      const contener = estilo.encaje === "contener";
      const esc = contener
        ? Math.min(W / imagen.width, H / imagen.height)
        : Math.max(W / imagen.width, H / imagen.height) * 1.06;
      lw = Math.round(imagen.width * esc);
      lh = Math.round(imagen.height * esc);
      lx = Math.round((W - lw) / 2);
      ly = Math.round(H * 0.44 - lh / 2);
      lamina = crearLienzo(lw, lh);
      lamina.getContext("2d").drawImage(imagen, 0, 0, lw, lh);
    }

    // ---- efectos: se resuelven sus valores y se preparan una sola vez -----
    const base = { W: W, H: H, esRecorte: esRecorte, crearLienzo: crearLienzo,
                   fx: fx, fy: fy, fw: fw, fh: fh, silueta: silueta, bob: 0 };

    const activos = [];
    let vibracion = null;

    for (const ef of (estilo.efectos || [])) {
      if (ef.activo === false) continue;
      const receta = Efectos.BANCO[ef.tipo];
      if (!receta) continue;

      const p = Object.assign({}, receta.def, ef);
      if (receta.capa === "figura") { vibracion = p; continue; }

      activos.push({
        receta: receta,
        p: p,
        // el estilo puede mover un efecto de capa: el resplandor va detrás de
        // una figura recortada, pero encima de una lámina
        capa: p.capa || receta.capa,
        estado: receta.preparar ? receta.preparar(p, base) : null,
      });
    }

    function dibujar(g, fase, cuadro) {
      const p = pulso(fase);
      const respira = 0.5 + 0.5 * Math.sin(fase * TAU);

      // la figura respira: sube y baja unos pixeles
      let bob = Math.sin(fase * TAU) * (H * 0.004);
      if (vibracion && p > vibracion.umbral) {
        const f = (p - vibracion.umbral) / Math.max(0.01, 1 - vibracion.umbral);
        const r = Efectos.azar(cuadro * 313);
        bob += (r() - 0.5) * vibracion.fuerza * f * Math.max(0.4, W / 1080) * 2;
      }

      const c = Object.assign({}, base, {
        fase: fase, cuadro: cuadro, p: p, respira: respira, bob: bob,
      });

      // cielo
      const cielo = g.createLinearGradient(0, 0, 0, H);
      cielo.addColorStop(0, estilo.cielo[0]);
      cielo.addColorStop(0.55, estilo.cielo[1]);
      cielo.addColorStop(1, estilo.cielo[2]);
      g.fillStyle = cielo;
      g.fillRect(0, 0, W, H);

      const pintarCapa = (capa) => {
        for (let i = 0; i < activos.length; i++) {
          if (activos[i].capa !== capa) continue;
          activos[i].receta.dibujar(g, activos[i].p, c, activos[i].estado);
        }
      };

      pintarCapa("fondo");

      if (esRecorte) {
        const h = estilo.halo;
        g.save();
        g.globalCompositeOperation = "lighter";
        g.globalAlpha = h.alfaLejos[0] + h.alfaLejos[1] * p;
        g.drawImage(halos.lejos, fx, fy + bob, fw, fh);
        g.globalAlpha = h.alfaCerca[0] + h.alfaCerca[1] * p;
        g.drawImage(halos.cerca, fx, fy + bob, fw, fh);
        g.restore();

        g.drawImage(figura, fx, fy + bob, fw, fh);
      } else {
        const z = 1 + 0.030 * respira;
        const dw = lw * z, dh = lh * z;
        const dx = lx - (dw - lw) / 2;
        const dy = ly - (dh - lh) / 2;
        g.drawImage(lamina, dx, dy, dw, dh);

        // Si la lámina no llena la pantalla queda un canto recto que delata el
        // montaje: se difumina hacia el fondo por arriba y por abajo.
        if (estilo.encaje === "contener") {
          const pluma = Math.round(H * 0.06);
          const arriba = g.createLinearGradient(0, dy, 0, dy + pluma);
          arriba.addColorStop(0, estilo.cielo[1]);
          arriba.addColorStop(1, "rgba(0,0,0,0)");
          g.fillStyle = arriba;
          g.fillRect(0, dy, W, pluma);

          const abajo = g.createLinearGradient(0, dy + dh, 0, dy + dh - pluma);
          abajo.addColorStop(0, estilo.cielo[1]);
          abajo.addColorStop(1, "rgba(0,0,0,0)");
          g.fillStyle = abajo;
          g.fillRect(0, dy + dh - pluma, W, pluma);
        }
      }

      pintarCapa("frente");
      pintarCapa("acabado");
    }

    return { dibujar };
  }

  return { crearEscena, ORDEN };
});
