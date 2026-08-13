/* app.js — la interfaz.
   La vista previa usa el MISMO motor que el render (src/escena.js), así que
   lo que se ve en el celular de la pantalla es lo que sale en el MP4. */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const crearLienzo = (w, h) => {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  };

  let ESTILOS = {};
  let BANCO = {};
  let estilo = null;          // la receta en curso, ya editada por el usuario
  let imagen = null;          // la imagen original, tamaño completo
  let imagenPrevia = null;    // copia reducida, para que la previa sea ágil
  let dataURL = null;
  let escena = null;
  let reconstruir = null;

  const previo = $("previo");
  const gPrevio = previo.getContext("2d");

  // --------------------------------------------------------------- utilería

  // La previa reconstruye la escena entera (recorte + halos). A tamaño
  // original eso tarda; con una copia reducida es instantáneo y se ve igual.
  function reducir(img, ladoMax) {
    const esc = Math.min(1, ladoMax / Math.max(img.width, img.height));
    if (esc === 1) return img;
    const c = crearLienzo(img.width * esc, img.height * esc);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return c;
  }

  const esperar = (ms, fn) => {
    let t = 0;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  };

  function medidas() {
    const [a, l] = $("tamano").value.split("x").map(Number);
    return { ancho: a, alto: l };
  }

  // ------------------------------------------------------- vista previa

  function armarEscena() {
    if (!imagenPrevia) return;
    $("cargando").hidden = false;

    // se cede un cuadro al navegador para que alcance a pintar "Preparando…"
    requestAnimationFrame(() => {
      try {
        const { ancho, alto } = medidas();
        previo.width = 288;
        previo.height = Math.round((alto / ancho) * 288);
        escena = Motor.escena.crearEscena({
          imagen: imagenPrevia,
          estilo: estilo,
          ancho: previo.width,
          alto: previo.height,
          crearLienzo: crearLienzo,
        });
      } catch (e) {
        console.error(e);
        escena = null;
      }
      $("cargando").hidden = true;
    });
  }

  function animar(ahora) {
    requestAnimationFrame(animar);
    if (!escena) return;
    const cuadros = Math.round(Number($("seg").value) * Number($("fps").value));
    const cuadro = Math.floor((ahora / 1000) * Number($("fps").value)) % cuadros;
    escena.dibujar(gPrevio, cuadro / cuadros, cuadro);
  }

  // ------------------------------------------------------ campos de efecto

  function campoRango(ef, campo, receta) {
    const esc = campo.escala || 1;
    const val = ef[campo.clave] != null ? ef[campo.clave] : receta.def[campo.clave];

    const cont = document.createElement("div");
    cont.className = "fila";

    const lab = document.createElement("label");
    const marca = document.createElement("span");
    marca.className = "valor";
    lab.append(campo.etiqueta + " ", marca);

    const inp = document.createElement("input");
    inp.type = "range";
    inp.min = campo.min;
    inp.max = campo.max;
    inp.step = campo.paso;
    inp.value = Math.round(val * esc);
    lab.htmlFor = inp.id = "ef_" + campo.clave + "_" + Math.random().toString(36).slice(2, 8);

    const mostrar = () => {
      marca.textContent = esc === 1 ? inp.value : (Number(inp.value) / esc).toFixed(2);
    };
    mostrar();

    inp.addEventListener("input", () => {
      ef[campo.clave] = esc === 1 ? Number(inp.value) : Number(inp.value) / esc;
      mostrar();
      reconstruir();
    });

    cont.append(lab, inp);
    return cont;
  }

  function campoColor(ef, campo, receta) {
    const cont = document.createElement("div");
    cont.className = "fila";

    const inp = document.createElement("input");
    inp.type = "color";
    inp.value = ef[campo.clave] || receta.def[campo.clave] || "#ffffff";
    inp.id = "ef_" + campo.clave + "_" + Math.random().toString(36).slice(2, 8);

    const lab = document.createElement("label");
    lab.htmlFor = inp.id;
    lab.textContent = campo.etiqueta;

    inp.addEventListener("input", () => {
      ef[campo.clave] = inp.value;
      reconstruir();
    });

    cont.append(lab, inp);
    return cont;
  }

  function campoColores(ef, campo, receta) {
    const cont = document.createElement("div");
    cont.className = "fila fila-alta";

    const lab = document.createElement("label");
    lab.textContent = campo.etiqueta;

    const caja = document.createElement("div");
    caja.className = "colores";

    if (!ef[campo.clave]) ef[campo.clave] = receta.def[campo.clave].slice();
    const lista = ef[campo.clave];

    const repintar = () => {
      caja.innerHTML = "";
      lista.forEach((color, i) => {
        const c = document.createElement("input");
        c.type = "color";
        c.value = color;
        c.setAttribute("aria-label", `Color ${i + 1}`);
        c.addEventListener("input", () => { lista[i] = c.value; reconstruir(); });
        caja.appendChild(c);
      });

      if (lista.length > 1) {
        const menos = document.createElement("button");
        menos.type = "button";
        menos.textContent = "−";
        menos.title = "Quitar el último";
        menos.addEventListener("click", () => { lista.pop(); repintar(); reconstruir(); });
        caja.appendChild(menos);
      }

      const mas = document.createElement("button");
      mas.type = "button";
      mas.textContent = "+";
      mas.title = "Agregar un color";
      mas.addEventListener("click", () => { lista.push("#ffffff"); repintar(); reconstruir(); });
      caja.appendChild(mas);
    };

    repintar();
    cont.append(lab, caja);
    return cont;
  }

  // ------------------------------------------------------ lista de efectos

  function pintarEfectos() {
    const caja = $("efectos");
    caja.innerHTML = "";

    if (!estilo.efectos.length) {
      caja.innerHTML = '<p class="dato">Sin efectos. Agrega alguno abajo.</p>';
      return;
    }

    estilo.efectos.forEach((ef, i) => {
      const receta = BANCO[ef.tipo];
      if (!receta) return;

      const tarjeta = document.createElement("div");
      tarjeta.className = "efecto" + (ef.activo === false ? " apagado" : "");

      const cab = document.createElement("div");
      cab.className = "efecto-cab";

      const palanca = document.createElement("label");
      palanca.className = "palanca";
      const chk = document.createElement("input");
      chk.type = "checkbox";
      chk.checked = ef.activo !== false;
      chk.addEventListener("change", () => {
        ef.activo = chk.checked;
        tarjeta.classList.toggle("apagado", !chk.checked);
        reconstruir();
      });
      const nom = document.createElement("span");
      nom.textContent = receta.nombre;
      palanca.append(chk, nom);

      const btns = document.createElement("div");
      btns.className = "efecto-btns";
      const boton = (texto, titulo, fn, apagado) => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = texto;
        b.title = titulo;
        b.disabled = !!apagado;
        b.addEventListener("click", fn);
        return b;
      };
      btns.append(
        boton("↑", "Subir", () => mover(i, -1), i === 0),
        boton("↓", "Bajar", () => mover(i, 1), i === estilo.efectos.length - 1),
        boton("×", "Quitar", () => {
          estilo.efectos.splice(i, 1);
          pintarEfectos();
          reconstruir();
        })
      );

      cab.append(palanca, btns);

      const pista = document.createElement("p");
      pista.className = "efecto-pista";
      pista.textContent = receta.pista;

      const campos = document.createElement("div");
      campos.className = "efecto-campos";
      for (const campo of receta.campos || []) {
        if (campo.tipo === "rango") campos.appendChild(campoRango(ef, campo, receta));
        else if (campo.tipo === "color") campos.appendChild(campoColor(ef, campo, receta));
        else if (campo.tipo === "colores") campos.appendChild(campoColores(ef, campo, receta));
      }

      tarjeta.append(cab, pista, campos);
      caja.appendChild(tarjeta);
    });
  }

  function mover(i, paso) {
    const destino = i + paso;
    if (destino < 0 || destino >= estilo.efectos.length) return;
    const [ef] = estilo.efectos.splice(i, 1);
    estilo.efectos.splice(destino, 0, ef);
    pintarEfectos();
    reconstruir();
  }

  // ----------------------------------------------------------- formulario

  function volcarEstilo() {
    $("modo").value = estilo.modo;
    $("colocacion").value = estilo.colocacion || "auto";
    $("encaje").value = estilo.encaje || "contener";
    $("auraLejana").value = estilo.auraLejana;
    $("auraCercana").value = estilo.auraCercana;
    $("haloLejos").value = Math.round(estilo.halo.lejos * 1000);
    $("haloFuerza").value = Math.round(estilo.halo.fuerza * 100);
    $("cielo0").value = estilo.cielo[0];
    $("cielo1").value = estilo.cielo[1];
    $("cielo2").value = estilo.cielo[2];
    $("tipoPulso").value = (estilo.pulso && estilo.pulso.tipo) || "fluido";
    $("velocidad").value = (estilo.pulso && estilo.pulso.frec1) || 1;
    pintarEfectos();
    refrescarEtiquetas();
  }

  function leerControles() {
    estilo.modo = $("modo").value;
    estilo.colocacion = $("colocacion").value;
    estilo.encaje = $("encaje").value;
    estilo.auraLejana = $("auraLejana").value;
    estilo.auraCercana = $("auraCercana").value;
    estilo.halo.lejos = Number($("haloLejos").value) / 1000;
    estilo.halo.cerca = estilo.halo.lejos / 3;
    estilo.halo.fuerza = Number($("haloFuerza").value) / 100;
    estilo.cielo = [$("cielo0").value, $("cielo1").value, $("cielo2").value];

    const tipo = $("tipoPulso").value;
    estilo.pulso = tipo === "latido"
      ? { tipo: "latido" }
      : Object.assign({}, estilo.pulso, { tipo: "fluido", frec1: Number($("velocidad").value) });

    refrescarEtiquetas();
  }

  function refrescarEtiquetas() {
    $("vHaloLejos").textContent = (Number($("haloLejos").value) / 10).toFixed(1) + "%";
    $("vHaloFuerza").textContent = (Number($("haloFuerza").value) / 100).toFixed(2);
    $("vSeg").textContent = $("seg").value + " s";
    $("vVelocidad").textContent = "×" + $("velocidad").value;

    const modo = $("modo").value;
    document.querySelectorAll("[data-solo]").forEach((el) => {
      el.hidden = el.dataset.solo !== modo;
    });
    const pulso = $("tipoPulso").value;
    document.querySelectorAll("[data-solo-pulso]").forEach((el) => {
      el.hidden = el.dataset.soloPulso !== pulso;
    });
  }

  // ------------------------------------------------------------- imagen

  function cargarArchivo(file) {
    if (!file || !file.type.startsWith("image/")) {
      avisar("Ese archivo no es una imagen.");
      return;
    }

    const lector = new FileReader();
    lector.onload = () => {
      const img = new Image();
      img.onload = async () => {
        imagen = img;
        imagenPrevia = reducir(img, 700);
        dataURL = lector.result;

        $("datosImagen").hidden = false;
        $("datosImagen").textContent = `${file.name} · ${img.width}×${img.height}`;
        $("renderizar").disabled = false;
        $("vacio").hidden = true;
        if (!$("nombre").value) {
          $("nombre").value = file.name.replace(/\.[^.]+$/, "").slice(0, 40);
        }

        revisarTamano(img);
        await detectarModo();
        armarEscena();
      };
      img.onerror = () => avisar("No pude abrir esa imagen.");
      img.src = lector.result;
    };
    lector.readAsDataURL(file);
  }

  function revisarTamano(img) {
    const { ancho, alto } = medidas();
    if (img.width < ancho * 0.6) {
      avisar(`La imagen mide ${img.width}×${img.height} y el fondo va a ser ` +
             `${ancho}×${alto}. Hay que estirarla, así que va a verse suave. ` +
             `Si consigues una versión más grande, queda mucho mejor.`);
    } else {
      $("avisoImagen").hidden = true;
    }
  }

  function avisar(texto) {
    $("avisoImagen").hidden = false;
    $("avisoImagen").textContent = texto;
  }

  // El servidor decide si la imagen trae fondo blanco recortable o si ya
  // trae su propia atmósfera, y ajusta el tratamiento solo.
  async function detectarModo() {
    try {
      const r = await fetch("/api/detectar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagen: dataURL }),
      });
      const info = await r.json();
      if (info.modo && info.modo !== estilo.modo) {
        estilo.modo = info.modo;
        $("modo").value = info.modo;
        refrescarEtiquetas();
      }
    } catch (e) {
      console.warn("No se pudo detectar el tratamiento:", e.message);
    }
  }

  // ------------------------------------------------------------- render

  async function renderizar() {
    if (!dataURL) return;

    const { ancho, alto } = medidas();
    $("renderizar").disabled = true;
    $("progreso").hidden = false;
    $("barraLlena").style.width = "0%";
    $("textoProgreso").textContent = "Mandando la imagen…";

    try {
      const r = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagen: dataURL,
          estilo: estilo,
          ancho: ancho,
          alto: alto,
          fps: Number($("fps").value),
          seg: Number($("seg").value),
          nombre: $("nombre").value,
        }),
      });
      const { id, error } = await r.json();
      if (error) throw new Error(error);
      seguir(id);
    } catch (e) {
      $("textoProgreso").textContent = "Falló: " + e.message;
      $("renderizar").disabled = false;
    }
  }

  function seguir(id) {
    const reloj = setInterval(async () => {
      try {
        const est = await (await fetch("/api/trabajo/" + id)).json();

        const pct = Math.round((est.progreso / Math.max(1, est.total)) * 100);
        $("barraLlena").style.width = pct + "%";
        $("textoProgreso").textContent = `Renderizando… ${est.progreso} de ${est.total} cuadros`;

        if (est.listo) {
          clearInterval(reloj);
          $("renderizar").disabled = false;
          if (est.error) {
            $("textoProgreso").textContent = "Falló: " + est.error;
          } else {
            $("barraLlena").style.width = "100%";
            $("textoProgreso").textContent = "Listo: " + est.archivo;
            cargarSalidas();
          }
        }
      } catch (e) {
        clearInterval(reloj);
        $("textoProgreso").textContent = "Se perdió la conexión con el servidor.";
        $("renderizar").disabled = false;
      }
    }, 400);
  }

  async function cargarSalidas() {
    const lista = $("listaSalidas");
    try {
      const salidas = await (await fetch("/api/salidas")).json();
      lista.innerHTML = "";

      if (!salidas.length) {
        lista.innerHTML = '<li class="nada">Todavía no hay ninguno</li>';
        return;
      }

      for (const s of salidas) {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = "/salidas/" + encodeURIComponent(s.archivo);
        a.textContent = s.archivo;
        a.download = s.archivo;
        const peso = document.createElement("span");
        peso.className = "peso";
        peso.textContent = s.kb > 1024 ? (s.kb / 1024).toFixed(1) + " MB" : s.kb + " KB";
        li.append(a, peso);
        lista.appendChild(li);
      }
    } catch (e) {
      lista.innerHTML = '<li class="nada">No pude leer la carpeta</li>';
    }
  }

  // ------------------------------------------------------------ arranque

  async function arrancar() {
    reconstruir = esperar(160, armarEscena);

    ESTILOS = await (await fetch("/api/estilos")).json();
    BANCO = Motor.efectos.BANCO;

    const sel = $("estilo");
    for (const clave of Object.keys(ESTILOS)) {
      const op = document.createElement("option");
      op.value = clave;
      op.textContent = ESTILOS[clave].nombre;
      sel.appendChild(op);
    }

    // catálogo de efectos disponibles
    const nuevo = $("nuevoEfecto");
    for (const tipo of Object.keys(BANCO)) {
      const op = document.createElement("option");
      op.value = tipo;
      op.textContent = BANCO[tipo].nombre;
      nuevo.appendChild(op);
    }
    const mostrarPista = () => { $("pistaNuevo").textContent = BANCO[nuevo.value].pista; };
    nuevo.addEventListener("change", mostrarPista);
    mostrarPista();

    $("btnAgregar").addEventListener("click", () => {
      estilo.efectos.push({ tipo: nuevo.value, activo: true });
      pintarEfectos();
      reconstruir();
      $("efectos").lastElementChild.scrollIntoView({ block: "nearest" });
    });

    const aplicarEstilo = () => {
      estilo = Motor.estilos.clonar(ESTILOS[sel.value]);
      $("pistaEstilo").textContent = estilo.pista;
      volcarEstilo();
      if (imagenPrevia) armarEscena();
    };

    sel.addEventListener("change", aplicarEstilo);
    aplicarEstilo();

    const controles = ["modo", "colocacion", "encaje", "auraLejana", "auraCercana",
                       "haloLejos", "haloFuerza", "cielo0", "cielo1", "cielo2",
                       "tipoPulso", "velocidad"];
    for (const id of controles) {
      $(id).addEventListener("input", () => { leerControles(); reconstruir(); });
    }

    $("tamano").addEventListener("change", () => {
      if (imagen) revisarTamano(imagen);
      reconstruir();
    });
    $("seg").addEventListener("input", refrescarEtiquetas);

    $("restablecer").addEventListener("click", aplicarEstilo);
    $("renderizar").addEventListener("click", renderizar);

    // elegir imagen: clic, teclado o arrastrar
    const zona = $("soltar");
    zona.addEventListener("click", () => $("archivo").click());
    zona.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("archivo").click(); }
    });
    $("archivo").addEventListener("change", (e) => cargarArchivo(e.target.files[0]));

    ["dragenter", "dragover"].forEach((ev) =>
      zona.addEventListener(ev, (e) => { e.preventDefault(); zona.classList.add("encima"); }));
    ["dragleave", "drop"].forEach((ev) =>
      zona.addEventListener(ev, (e) => { e.preventDefault(); zona.classList.remove("encima"); }));
    zona.addEventListener("drop", (e) => cargarArchivo(e.dataTransfer.files[0]));

    cargarSalidas();
    requestAnimationFrame(animar);
  }

  arrancar().catch((e) => {
    console.error(e);
    document.body.insertAdjacentHTML("afterbegin",
      '<p class="aviso" style="margin:20px 30px">No pude hablar con el servidor. ' +
      "¿Sigue abierta la ventana negra de <strong>Iniciar.bat</strong>?</p>");
  });
})();
