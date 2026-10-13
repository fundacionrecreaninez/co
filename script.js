/* ==========================================================================
   Fundación Recreaniñez — JavaScript del frontend
   ========================================================================== */

/* ---- CONFIGURACIÓN: pega aquí la URL de tu Web App de Apps Script ---- */
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyRYc7F-FvKB_v5SkMY1H57TodnEdXgiO2yys-qrrtZAEyjHbDJ7jc9TnWjBbQvuRAi/exec';

/* Datos de pago mostrados en el modal */
const DATOS_PAGO = {
  nequi:     '324 373 8833',
  daviplata: 'NO DISPONIBLE',
  llave:     'NO DISPONIBLE'
};

/* Contraseña del panel admin */
const ADMIN_PASS = 'admin';

let RIFA_ACTUAL = null;
let VENTAS_ACTUAL = [];
let numeroSeleccionado = null;

/* ---- Helpers ---- */
const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

async function postJSON(payload) {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

async function getJSON(params) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${APPS_SCRIPT_URL}?${qs}`);
  return res.json();
}

const formatoCOP = n => '$' + Number(n || 0).toLocaleString('es-CO');
const pad2 = n => String(n).padStart(2, '0');

function archivoABase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/* Normaliza enlaces de Google Drive para que se vean como imagen */
function normalizarUrlImagen(url) {
  if (!url) return '';
  const u = String(url).trim();
  const match1 = u.match(/\/file\/d\/([^/]+)/);
  if (match1) return 'https://drive.google.com/uc?export=view&id=' + match1[1];
  const match2 = u.match(/[?&]id=([^&]+)/);
  if (match2 && u.indexOf('drive.google.com') !== -1) {
    return 'https://drive.google.com/uc?export=view&id=' + match2[1];
  }
  return u;
}

/* ==========================================================================
   NAVEGACIÓN
   ========================================================================== */
function initNav() {
  const toggle = $('#navToggle');
  const nav = $('#mainNav');

  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const abierto = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    });
  }

  $$('.sub-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const li = btn.closest('.has-sub');
      const abierto = li.classList.toggle('open');
      btn.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    });
  });

  $$('.main-nav a').forEach(a => {
    a.addEventListener('click', () => {
      if (window.innerWidth <= 900 && nav) {
        nav.classList.remove('open');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
        $$('.has-sub.open').forEach(li => li.classList.remove('open'));
      }
    });
  });

  const header = $('#siteHeader');
  if (header) {
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) {
      $$('.has-sub.open').forEach(li => li.classList.remove('open'));
      $$('.sub-toggle').forEach(b => b.setAttribute('aria-expanded', 'false'));
    }
  });
}

function initReveal() {
  const els = $$('.reveal');
  if (!('IntersectionObserver' in window) || !els.length) {
    els.forEach(e => e.classList.add('visible'));
    return;
  }
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add('visible');
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.12 });
  els.forEach(e => io.observe(e));
}

/* ==========================================================================
   FORMULARIO DE CONTACTO
   ========================================================================== */
function initFormContacto() {
  const form = $('#formContacto');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const msg = $('#msgContacto');
    const btn = $('#btnContacto');
    msg.className = 'form-msg';
    msg.textContent = 'Enviando...';
    btn.disabled = true;
    try {
      const data = await postJSON({
        action: 'contacto',
        nombre: form.nombre.value.trim(),
        email: form.email.value.trim(),
        mensaje: form.mensaje.value.trim()
      });
      if (data.success) {
        msg.className = 'form-msg ok';
        msg.textContent = '¡Gracias! Tu mensaje fue enviado correctamente.';
        form.reset();
      } else {
        throw new Error(data.message || 'Error del servidor');
      }
    } catch (err) {
      msg.className = 'form-msg err';
      msg.textContent = 'Error: ' + err.message;
      console.error(err);
    } finally { btn.disabled = false; }
  });
}

/* ==========================================================================
   FORMULARIO DE ALIADOS
   ========================================================================== */
function initFormAliado() {
  const form = $('#formAliado');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const msg = $('#msgAliado');
    const btn = $('#btnAliado');
    msg.className = 'form-msg';
    msg.textContent = 'Enviando...';
    btn.disabled = true;
    try {
      const data = await postJSON({
        action: 'aliado',
        organizacion: form.organizacion.value.trim(),
        contacto: form.contacto.value.trim(),
        email: form.email.value.trim(),
        telefono: form.telefono.value.trim(),
        mensaje: form.mensaje.value.trim()
      });
      if (data.success) {
        msg.className = 'form-msg ok';
        msg.textContent = '¡Gracias! Recibimos tu postulación.';
        form.reset();
      } else {
        throw new Error(data.message || 'Error del servidor');
      }
    } catch (err) {
      msg.className = 'form-msg err';
      msg.textContent = 'Error: ' + err.message;
      console.error(err);
    } finally { btn.disabled = false; }
  });
}

/* ==========================================================================
   SISTEMA DE RIFAS — VISTA PÚBLICA
   ========================================================================== */
async function cargarRifaActiva() {
  const header = $('#rifaTituloPublico');
  if (!header) return;
  try {
    const data = await getJSON({ action: 'getRifaActiva' });
    if (!data.success || !data.rifa) {
      header.textContent = 'Aún no hay rifas activas';
      $('#rifaPremioPublico').textContent = 'Vuelve pronto para conocer nuestras próximas rifas solidarias.';
      $('#gridNumeros').innerHTML = '';
      return;
    }
    RIFA_ACTUAL = data.rifa;
    header.textContent = RIFA_ACTUAL.titulo;
    $('#rifaPremioPublico').textContent = 'Premio: ' + RIFA_ACTUAL.premio;
    $('#rifaValorPublico').textContent = formatoCOP(RIFA_ACTUAL.valor);
    $('#rifaTotalPublico').textContent = RIFA_ACTUAL.total + ' números';

    // Imagen del premio
    const imgWrap = $('#rifaImagenWrap');
    const imgEl = $('#rifaImagenPublica');
    if (imgWrap && imgEl) {
      if (RIFA_ACTUAL.imagen && RIFA_ACTUAL.imagen.trim()) {
        imgEl.src = normalizarUrlImagen(RIFA_ACTUAL.imagen);
        imgEl.onerror = () => imgWrap.classList.add('hidden');
        imgWrap.classList.remove('hidden');
      } else {
        imgWrap.classList.add('hidden');
      }
    }

    // Datos de pago
    if ($('#pagoNequi'))     $('#pagoNequi').textContent     = DATOS_PAGO.nequi;
    if ($('#pagoDaviplata')) $('#pagoDaviplata').textContent = DATOS_PAGO.daviplata;
    if ($('#pagoLlave'))     $('#pagoLlave').textContent     = DATOS_PAGO.llave;

    await cargarVentas(RIFA_ACTUAL.rifaId);
  } catch (err) {
    console.error('Error cargando rifa:', err);
    header.textContent = 'No se pudo cargar la rifa';
    $('#rifaPremioPublico').textContent = 'Verifica la configuración del Web App.';
  }
}

async function cargarVentas(rifaId) {
  try {
    const data = await getJSON({ action: 'getVentas', rifaId });
    VENTAS_ACTUAL = data.ventas || [];
    renderGrid();
    renderProgreso();
  } catch (err) { console.error('Error cargando ventas:', err); }
}

function renderGrid() {
  const grid = $('#gridNumeros');
  if (!grid || !RIFA_ACTUAL) return;

  const mapa = {};
  VENTAS_ACTUAL.forEach(v => { mapa[pad2(v.numero)] = v.estadoPago; });

  grid.innerHTML = '';
  for (let i = 0; i < RIFA_ACTUAL.total; i++) {
    const num = pad2(i);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'numero-btn';
    btn.textContent = num;

    const estado = (mapa[num] || '').toString().trim().toLowerCase();

    if (estado === 'pagado') {
      btn.classList.add('vendido');
      btn.disabled = true;
      btn.title = 'Número vendido';
    } else if (estado === 'por confirmar') {
      btn.classList.add('reservado');
      btn.disabled = true;
      btn.title = 'Pago por confirmar';
    } else {
      btn.title = 'Disponible — clic para comprar';
      btn.addEventListener('click', () => abrirModalCompra(num));
    }
    grid.appendChild(btn);
  }
}

function renderProgreso() {
  if (!RIFA_ACTUAL) return;
  const total = RIFA_ACTUAL.total;
  const vendidos = VENTAS_ACTUAL.length;
  const porcentaje = total > 0 ? Math.round((vendidos / total) * 100) : 0;
  $('#progressFill').style.width = porcentaje + '%';
  $('#progressText').textContent = porcentaje + '% vendido';
  $('#progressCount').textContent = vendidos + ' / ' + total;
}

/* ==========================================================================
   MODAL DE COMPRA
   ========================================================================== */
function abrirModalCompra(numero) {
  numeroSeleccionado = numero;
  $('#modalNumero').textContent = numero;
  $('#modalCompra').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  const f = $('#formCompra');
  if (f) f.reset();
  $('#msgCompra').textContent = '';
  $('#msgCompra').className = 'form-msg';
}

function cerrarModalCompra() {
  $('#modalCompra').classList.add('hidden');
  document.body.style.overflow = '';
  numeroSeleccionado = null;
}

function initModalCompra() {
  const modal = $('#modalCompra');
  if (!modal) return;

  $('#modalCompraClose').addEventListener('click', cerrarModalCompra);
  modal.addEventListener('click', e => { if (e.target === modal) cerrarModalCompra(); });

  const form = $('#formCompra');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const msg = $('#msgCompra');
    const btn = $('#btnCompra');

    if (!numeroSeleccionado) {
      msg.className = 'form-msg err';
      msg.textContent = 'No se ha seleccionado ningún número.';
      return;
    }

    // Validar campos requeridos
    const nombre   = $('#compraNombre').value.trim();
    const telefono = $('#compraTel').value.trim();
    const email    = $('#compraEmail') ? $('#compraEmail').value.trim() : '';
    const nota     = $('#compraNota') ? $('#compraNota').value.trim() : '';

    if (!nombre || !telefono || !email) {
      msg.className = 'form-msg err';
      msg.textContent = 'Completa todos los campos obligatorios.';
      return;
    }

    const fileInput = $('#compraComprobante');
    const archivo = fileInput.files[0];
    if (!archivo) {
      msg.className = 'form-msg err';
      msg.textContent = 'Debes subir el comprobante de pago.';
      return;
    }
    if (archivo.size > 5 * 1024 * 1024) {
      msg.className = 'form-msg err';
      msg.textContent = 'El comprobante debe pesar menos de 5 MB.';
      return;
    }

    msg.className = 'form-msg';
    msg.textContent = 'Subiendo comprobante...';
    btn.disabled = true;

    try {
      const base64 = await archivoABase64(archivo);
      const data = await postJSON({
        action: 'compra',
        rifaId: RIFA_ACTUAL.rifaId,
        numero: numeroSeleccionado,
        nombre: nombre,
        telefono: telefono,
        email: email,
        nota: nota,
        archivoNombre: archivo.name,
        archivoBase64: base64
      });

      if (data.success) {
        msg.className = 'form-msg ok';
        msg.textContent = '¡Listo! Tu número quedó reservado. Te contactaremos para confirmar el pago.';
        setTimeout(async () => {
          cerrarModalCompra();
          await cargarVentas(RIFA_ACTUAL.rifaId);
        }, 1500);
      } else {
        throw new Error(data.message || 'Error del servidor');
      }
    } catch (err) {
      msg.className = 'form-msg err';
      msg.textContent = 'Error: ' + err.message;
      console.error('DETALLE:', err);
    } finally { btn.disabled = false; }
  });
}

/* ==========================================================================
   PANEL ADMIN
   ========================================================================== */
function initAdmin() {
  const btn = $('#btnToggleAdmin');
  const panel = $('#panelAdmin');
  if (!btn || !panel) return;

  btn.addEventListener('click', () => {
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  $('#btnAdminLogin').addEventListener('click', () => {
    const pass = $('#adminPass').value;
    const msg = $('#adminLoginMsg');
    if (pass === ADMIN_PASS) {
      $('#adminLogin').classList.add('hidden');
      $('#adminContent').classList.remove('hidden');
      msg.textContent = '';
      cargarSelectRifasAdmin();
    } else {
      msg.className = 'form-msg err';
      msg.textContent = 'Contraseña incorrecta.';
    }
  });

  $$('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.admin-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      $$('.admin-tab-panel').forEach(p => p.classList.toggle('hidden', p.dataset.panel !== target));
    });
  });

  const formCrear = $('#formCrearRifa');
  if (formCrear) {
    formCrear.addEventListener('submit', async e => {
      e.preventDefault();
      const msg = $('#msgCrearRifa');
      msg.className = 'form-msg';
      msg.textContent = 'Creando...';
      try {
        const data = await postJSON({
          action: 'crearRifa',
          titulo: $('#rifaTitulo').value.trim(),
          premio: $('#rifaPremio').value.trim(),
          imagen: $('#rifaImagen') ? $('#rifaImagen').value.trim() : '',
          valor: Number($('#rifaValor').value),
          total: Number($('#rifaTotal').value)
        });
        if (data.success) {
          msg.className = 'form-msg ok';
          msg.textContent = 'Rifa creada correctamente.';
          formCrear.reset();
          await cargarRifaActiva();
          cargarSelectRifasAdmin();
        } else {
          throw new Error(data.message || 'Error del servidor');
        }
      } catch (err) {
        msg.className = 'form-msg err';
        msg.textContent = 'Error: ' + err.message;
        console.error(err);
      }
    });
  }

  const btnSortear = $('#btnSortear');
  if (btnSortear) {
    btnSortear.addEventListener('click', () => {
      if (!VENTAS_ACTUAL.length) { alert('Aún no hay números vendidos para esta rifa.'); return; }
      const ganadorBox = $('#ganadorBox');
      ganadorBox.classList.remove('hidden');
      ganadorBox.innerHTML = '<h3>Sorteando...</h3><div class="ganador-numero">—</div>';
      let c = 0;
      const interval = setInterval(() => {
        const r = VENTAS_ACTUAL[Math.floor(Math.random() * VENTAS_ACTUAL.length)];
        ganadorBox.innerHTML = '<h3>Sorteando...</h3><div class="ganador-numero">' + r.numero + '</div>';
        c++;
        if (c > 20) { clearInterval(interval); mostrarGanador(); }
      }, 80);
    });
  }
}

async function cargarSelectRifasAdmin() {
  try {
    const data = await getJSON({ action: 'getRifas' });
    const select = $('#adminSelectRifa');
    if (!select || !data.rifas) return;
    select.innerHTML = '';
    data.rifas.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r.rifaId;
      opt.textContent = `${r.titulo} (${r.rifaId})`;
      select.appendChild(opt);
    });
    select.onchange = () => cargarVentasAdmin(select.value);
    if (data.rifas.length) cargarVentasAdmin(data.rifas[0].rifaId);
  } catch (err) { console.error(err); }
}

async function cargarVentasAdmin(rifaId) {
  try {
    const data = await getJSON({ action: 'getVentas', rifaId });
    const ventas = data.ventas || [];
    VENTAS_ACTUAL = ventas.filter(v => v.estadoPago === 'Pagado' || v.estadoPago === 'Por confirmar');
    const total = (RIFA_ACTUAL && RIFA_ACTUAL.rifaId === rifaId) ? RIFA_ACTUAL.total : null;
    $('#statVendidos').textContent = ventas.length;
    $('#statDisponibles').textContent = total ? (total - ventas.length) : '—';
    const valor = RIFA_ACTUAL ? RIFA_ACTUAL.valor : 0;
    $('#statRecaudo').textContent = formatoCOP(ventas.length * valor);
  } catch (err) { console.error(err); }
}

function mostrarGanador() {
  if (!VENTAS_ACTUAL.length) return;
  const g = VENTAS_ACTUAL[Math.floor(Math.random() * VENTAS_ACTUAL.length)];
  $('#ganadorBox').innerHTML = `
    <h3>¡Número ganador!</h3>
    <div class="ganador-numero">${g.numero}</div>
    <p><strong>${g.comprador}</strong></p>
    <p>${g.telefono || ''} ${g.email ? '· ' + g.email : ''}</p>
  `;
}

/* ==========================================================================
   INICIALIZACIÓN
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initReveal();
  initFormContacto();
  initFormAliado();
  initModalCompra();
  if ($('#rifaPublica')) {
    initAdmin();
    cargarRifaActiva();
  }
});