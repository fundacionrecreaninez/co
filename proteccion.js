/* ==========================================================================
   Fundación Recreaniñez — Protección básica del frontend
   --------------------------------------------------------------------------
   NOTA IMPORTANTE: esto NO impide ver el código real. Cualquier usuario con
   conocimientos puede abrir las DevTools desde el menú del navegador o
   deshabilitar JavaScript. Solo disuade a curiosos sin experiencia.
   ========================================================================== */

   (function () {
    'use strict';
  
    // --- 1) Bloquear clic derecho (menú contextual) ---
    document.addEventListener('contextmenu', function (e) {
      e.preventDefault();
    });
  
    // --- 2) Bloquear atajos de teclado comunes ---
    document.addEventListener('keydown', function (e) {
      const key = (e.key || '').toLowerCase();
  
      // F12 → DevTools
      if (e.key === 'F12') { e.preventDefault(); return false; }
  
      // Ctrl+Shift+I / J / C → DevTools (Chrome, Edge, Firefox)
      if (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(key)) {
        e.preventDefault(); return false;
      }
  
      // Ctrl+U → Ver código fuente
      if (e.ctrlKey && key === 'u') { e.preventDefault(); return false; }
  
      // Ctrl+S → Guardar página
      if (e.ctrlKey && key === 's') { e.preventDefault(); return false; }
  
      // Ctrl+A → Seleccionar todo el contenido
      if (e.ctrlKey && key === 'a' && !e.target.matches('input, textarea')) {
        e.preventDefault(); return false;
      }
    });
  
    // --- 3) Bloquear arrastrar imágenes ---
    document.addEventListener('dragstart', function (e) {
      if (e.target.tagName === 'IMG') e.preventDefault();
    });
  
    // --- 4) Bloquear copiar texto (excepto en formularios) ---
    document.addEventListener('copy', function (e) {
      if (e.target.matches('input, textarea')) return; // dejar copiar en formularios
      e.preventDefault();
    });
  
    // --- 5) Aviso en consola (disuasión psicológica) ---
    console.log('%c⚠ Alto', 'color:#dc2626;font-size:32px;font-weight:bold;');
    console.log(
      '%cEste sitio es de la Fundación Recreaniñez.\n' +
      'El contenido está protegido por derechos de autor.\n' +
      'Si quieres colaborar con nosotros, escríbenos al WhatsApp 302 602 2017.',
      'color:#1E3A8A;font-size:14px;'
    );
  
    // --- 6) Detectar DevTools abiertas (muy básico, solo avisa) ---
    let umbralTiempo = 200;
    const elemento = new Image();
    Object.defineProperty(elemento, 'id', {
      get: function () {
        // Si el navegador lee "id", es porque las DevTools están abiertas
        document.body.innerHTML = '';
        document.body.style.background = '#0f2356';
        document.body.style.color = '#fff';
        document.body.innerHTML =
          '<div style="display:flex;align-items:center;justify-content:center;' +
          'height:100vh;font-family:sans-serif;text-align:center;padding:2rem;">' +
          '<div><h1 style="font-size:2rem;">Contenido protegido</h1>' +
          '<p>Por seguridad, el sitio no puede visualizarse con las herramientas ' +
          'de desarrollador abiertas.</p>' +
          '<p>Cierra las DevTools y recarga la página.</p></div></div>';
        return '';
      }
    });
    setInterval(function () {
      const t0 = performance.now();
      Object.defineProperty(elemento, 'id', Object.getOwnPropertyDescriptor(elemento, 'id'));
      // (Nota: esta técnica de detección se omite a propósito aquí por ser
      //  frágil y molesta para usuarios legítimos. Solo se deja la disuasión).
    }, umbralTiempo);
  
  })();