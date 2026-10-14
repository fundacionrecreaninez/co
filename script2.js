/* ==========================================================================
   Fundación Recreaniñez — Rifas v2 (con carrito + notificación WhatsApp)
   ========================================================================== */

/* ⚠️ Pega aquí la URL del NUEVO Web App (del Sheets nuevo) */
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxg3_fazr68Eg4h6f5X-Da8OuxFTDxBNbQk_5z6J3EXvMnajAz84oXGlAgFKwBmW7Vj9A/exec';

const DATOS_PAGO = {
  nequi:     '3243738833 [RESPONSABLE #1: JOSE LANDERO]',
  daviplata: '3242252005 [RESPONSABLE #2: FERNANDO CABALLERO]',
  llave:     'NO DISPONIBLE'
};

const ADMIN_PASS = 'Jose@Fernando';

let RIFA_ACTUAL = null;
let VENTAS_ACTUAL = [];
let CARRITO = [];
let GRUPO_ID_ACTUAL = null;

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

function normalizarUrlImagen(url) {
  if (!url) return '';
  const u = String(url).trim();
  const m1 = u.match(/\/file\/d\/([^/]+)/);
  if (m1) return 'https://drive.google.com/uc?export=view&id=' + m1[1];
  const m2 = u.match(/[?&]id=([^&]+)/);
  if (m2 && u.indexOf('drive.google.com') !== -1) {
    return 'https://drive.google.com/uc?export=view&id=' + m2[1];
  }
  return u;
}

/* ==========================================================================
   CARGAR RIFA
   ========================================================================== */
async function cargarRifaActiva() {
  const header = $('#rifaTituloPublico');
  if (!header) return;
  try {
    const data = await getJSON({ action: 'getRifaActiva' });
    if (!data.success || !data.rifa) {
      header.textContent = 'Aún no hay rifas activas';
      $('#rifaPremioPublico').textContent = 'Vuelve pronto.';
      $('#gridNumeros').innerHTML = '';
      return;
    }
    RIFA_ACTUAL = data.rifa;
    header.textContent = RIFA_ACTUAL.titulo;
    $('#rifaPremioPublico').textContent = 'Premio: ' + RIFA_ACTUAL.premio;
    $('#rifaValorPublico').textContent = formatoCOP(RIFA_ACTUAL.valor);
    $('#rifaTotalPublico').textContent = RIFA_ACTUAL.total + ' números';

    const imgWrap = $('#rifaImagenWrap');
    const imgEl = $('#rifaImagenPublica');
    if (RIFA_ACTUAL.imagen && RIFA_ACTUAL.imagen.trim()) {
      imgEl.src = normalizarUrlImagen(RIFA_ACTUAL.imagen);
      imgEl.onerror = () => imgWrap.classList.add('hidden');
      imgWrap.classList.remove('hidden');
    } else {
      imgWrap.classList.add('hidden');
    }

    if ($('#pagoNequi'))     $('#pagoNequi').textContent     = DATOS_PAGO.nequi;
    if ($('#pagoDaviplata')) $('#pagoDaviplata').textContent = DATOS_PAGO.daviplata;
    if ($('#pagoLlave'))     $('#pagoLlave').textContent     = DATOS_PAGO.llave;

    await cargarVentas(RIFA_ACTUAL.rifaId);
  } catch (err) {
    console.error('Error cargando rifa:', err);
    header.textContent = 'No se pudo cargar la rifa';
  }
}

async function cargarVentas(rifaId) {
  try {
    const data = await getJSON({ action: 'getVentas', rifaId });
    VENTAS_ACTUAL = data.ventas || [];
    renderGrid();
    renderProgreso();
  } catch (err) { console.error(err); }
}

/* ==========================================================================
   GRID Y CARRITO
   ========================================================================== */
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
    btn.dataset.numero = num;

    const estado = (mapa[num] || '').toString().trim().toLowerCase();

    if (estado === 'pagado') {
      btn.classList.add('vendido');
      btn.disabled = true;
      btn.title = 'Vendido';
    } else if (estado === 'por confirmar') {
      btn.classList.add('reservado');
      btn.disabled = true;
      btn.title = 'Pago por confirmar';
    } else {
      btn.title = 'Clic para agregar/quitar del carrito';
      if (CARRITO.indexOf(num) !== -1) btn.classList.add('en-carrito');
      btn.addEventListener('click', () => toggleCarrito(num));
    }
    grid.appendChild(btn);
  }
}

function toggleCarrito(numero) {
  const idx = CARRITO.indexOf(numero);
  if (idx === -1) {
    if (CARRITO.length >= 20) {
      alert('Máximo 20 números por compra.');
      return;
    }
    CARRITO.push(numero);
  } else {
    CARRITO.splice(idx, 1);
  }
  const btn = document.querySelector(`.numero-btn[data-numero="${numero}"]`);
  if (btn) btn.classList.toggle('en-carrito');
  actualizarCartBar();
}

function actualizarCartBar() {
  const bar = $('#cartBar');
  const n = CARRITO.length;
  const total = n * (RIFA_ACTUAL ? RIFA_ACTUAL.valor : 0);
  $('#cartCount').textContent = n;
  $('#cartTotal').textContent = formatoCOP(total);
  if (n > 0) bar.classList.add('visible');
  else bar.classList.remove('visible');
}

function limpiarCarrito() {
  CARRITO = [];
  $$('.numero-btn.en-carrito').forEach(b => b.classList.remove('en-carrito'));
  actualizarCartBar();
}

/* ==========================================================================
   MODAL
   ========================================================================== */
function abrirModal() {
  if (!CARRITO.length) return;
  const modal = $('#modalCompra');
  const nums = CARRITO.slice().sort();
  const total = nums.length * RIFA_ACTUAL.valor;

  const lista = $('#cartItemsList');
  lista.innerHTML = '';
  nums.forEach(num => {
    const row = document.createElement('div');
    row.className = 'item';
    row.innerHTML = `<span>Número <strong>${num}</strong></span><span>${formatoCOP(RIFA_ACTUAL.valor)}</span>`;
    lista.appendChild(row);
  });
  $('#modalTotal').textContent = formatoCOP(total);

  GRUPO_ID_ACTUAL = 'G' + Date.now();

  const f = $('#formCompra');
  if (f) f.reset();
  $('#msgCompra').textContent = '';
  $('#msgCompra').className = 'form-msg';

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function cerrarModal() {
  $('#modalCompra').classList.add('hidden');
  document.body.style.overflow = '';
  GRUPO_ID_ACTUAL = null;
}

function initModal() {
  const modal = $('#modalCompra');
  if (!modal) return;

  $('#modalCompraClose').addEventListener('click', cerrarModal);
  modal.addEventListener('click', e => { if (e.target === modal) cerrarModal(); });
  $('#btnComprar').addEventListener('click', abrirModal);
  $('#btnLimpiarCarrito').addEventListener('click', limpiarCarrito);

  $('#formCompra').addEventListener('submit', async e => {
    e.preventDefault();
    const msg = $('#msgCompra');
    const btn = $('#btnCompra');

    const nombre    = $('#compraNombre').value.trim();
    const telefono  = $('#compraTel').value.trim();
    const direccion = $('#compraDireccion').value.trim();
    const nota      = $('#compraNota') ? $('#compraNota').value.trim() : '';

    if (!nombre || !telefono || !direccion) {
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
        action: 'compraMultiple',
        rifaId: RIFA_ACTUAL.rifaId,
        numeros: CARRITO.slice(),
        grupoId: GRUPO_ID_ACTUAL,
        nombre: nombre,
        telefono: telefono,
        direccion: direccion,
        nota: nota,
        archivoNombre: archivo.name,
        archivoBase64: base64
      });

      if (data.success) {
        msg.className = 'form-msg ok';
        msg.textContent = '¡Listo! Tus números quedaron reservados. Te contactaremos para confirmar el pago.';
        setTimeout(async () => {
          cerrarModal();
          limpiarCarrito();
          await cargarVentas(RIFA_ACTUAL.rifaId);
        }, 1500);
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

function renderProgreso() {
  if (!RIFA_ACTUAL) return;
  const total = RIFA_ACTUAL.total;
  const vendidos = VENTAS_ACTUAL.length;
  const pct = total > 0 ? Math.round((vendidos / total) * 100) : 0;
  $('#progressFill').style.width = pct + '%';
  $('#progressText').textContent = pct + '% vendido';
  $('#progressCount').textContent = vendidos + ' / ' + total;
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

  $('#formCrearRifa').addEventListener('submit', async e => {
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
        e.target.reset();
        await cargarRifaActiva();
        cargarSelectRifasAdmin();
      } else throw new Error(data.message);
    } catch (err) {
      msg.className = 'form-msg err';
      msg.textContent = 'Error: ' + err.message;
    }
  });

  $('#btnSortear').addEventListener('click', () => {
    const vendidos = VENTAS_ACTUAL.filter(v => v.estadoPago === 'Pagado');
    if (!vendidos.length) { alert('Aún no hay números pagados para sortear.'); return; }
    const box = $('#ganadorBox');
    box.classList.remove('hidden');
    box.innerHTML = '<h3>Sorteando...</h3><div class="ganador-numero">—</div>';
    let c = 0;
    const itv = setInterval(() => {
      const r = vendidos[Math.floor(Math.random() * vendidos.length)];
      box.innerHTML = '<h3>Sorteando...</h3><div class="ganador-numero">' + r.numero + '</div>';
      c++;
      if (c > 20) { clearInterval(itv); mostrarGanador(vendidos); }
    }, 80);
  });
}

async function cargarSelectRifasAdmin() {
    try {
      const data = await getJSON({ action: 'getRifas' });
      const select = $('#adminSelectRifa');
      if (!select || !data.rifas) return;
      select.innerHTML = '';
  
      // Activas primero, cerradas después
      const ordenadas = data.rifas.slice().sort((a, b) => {
        const ea = a.estado === 'Activa' ? 0 : 1;
        const eb = b.estado === 'Activa' ? 0 : 1;
        return ea - eb;
      });
  
      ordenadas.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r.rifaId;
        opt.textContent = `${r.titulo} (${r.estado})`;
        select.appendChild(opt);
      });
  
      select.onchange = () => cargarVentasAdmin(select.value);
  
      // Cargar automáticamente la primera (que es la activa)
      if (ordenadas.length) {
        select.value = ordenadas[0].rifaId;
        cargarVentasAdmin(ordenadas[0].rifaId);
      }
    } catch (err) {
      console.error('Error cargando select:', err);
    }
  }

  async function cargarVentasAdmin(rifaId) {
    try {
      const data = await getJSON({ action: 'getVentas', rifaId });
      const ventas = data.ventas || [];
      console.log('📊 Rifas cargadas:', ventas.length, 'ventas');
      console.log('📊 Datos:', ventas);
  
      VENTAS_ACTUAL = ventas;
      const total = (RIFA_ACTUAL && RIFA_ACTUAL.rifaId === rifaId) ? RIFA_ACTUAL.total : null;
      $('#statVendidos').textContent = ventas.length;
      $('#statDisponibles').textContent = total ? (total - ventas.length) : '—';
      const valor = RIFA_ACTUAL ? RIFA_ACTUAL.valor : 0;
      $('#statRecaudo').textContent = formatoCOP(ventas.length * valor);
  
      renderPendientes(ventas, rifaId);
    } catch (err) {
      console.error('Error cargando ventas admin:', err);
    }
  }

  function renderPendientes(ventas, rifaId) {
    const cont = $('#listaPendientes');
    if (!cont) {
      console.warn('⚠️ No existe el contenedor #listaPendientes');
      return;
    }
  
    // Filtro flexible: acepta "Por confirmar", "por confirmar", " POR CONFIRMAR ", etc.
    const pendientes = ventas.filter(v => {
      const estado = (v.estadoPago || '').toString().trim().toLowerCase();
      return estado === 'por confirmar';
    });
  
    console.log('📋 Pendientes de confirmar:', pendientes.length);
  
    if (!pendientes.length) {
      cont.innerHTML = '<p class="empty-msg">No hay compras pendientes en esta rifa.</p>';
      return;
    }
  
    // Agrupar por Grupo_ID (o por timestamp+telefono si no hay)
    const grupos = {};
    pendientes.forEach(v => {
      const key = v.grupoId || v.timestamp || (v.comprador + '|' + v.telefono);
      if (!grupos[key]) {
        grupos[key] = {
          grupoId: v.grupoId,
          comprador: v.comprador,
          telefono: v.telefono,
          direccion: v.direccion,
          nota: v.nota,
          comprobanteUrl: v.comprobanteUrl,
          numeros: []
        };
      }
      grupos[key].numeros.push(v.numero);
    });
  
    const lista = Object.values(grupos);
    console.log('👥 Grupos armados:', lista.length);
  
    cont.innerHTML = '';
    lista.forEach(g => {
      const div = document.createElement('div');
      div.className = 'grupo-item';
  
      const linkComp = g.comprobanteUrl
        ? `<a href="${g.comprobanteUrl}" target="_blank" rel="noopener" class="btn-mini btn-ver">Ver comprobante</a>`
        : '<span style="font-size:.75rem;color:#999;">Sin comprobante</span>';
  
      const telLimpio = (g.telefono || '').replace(/\D/g, '');
      const waLink = telLimpio
        ? `<a href="https://wa.me/57${telLimpio}" target="_blank" rel="noopener" class="btn-mini btn-ver" style="background:#25D366;">WhatsApp</a>`
        : '';
  
      div.innerHTML = `
        <div class="grupo-head">
          <div><strong>${g.comprador || 'Sin nombre'}</strong></div>
          <div style="display:flex;gap:.35rem;flex-wrap:wrap;">
            ${waLink}
            ${linkComp}
          </div>
        </div>
        <div class="grupo-datos">
          <div><strong>Teléfono:</strong> ${g.telefono || '—'}</div>
          <div><strong>Dirección:</strong> ${g.direccion || '—'}</div>
          ${g.nota ? `<div><strong>Nota:</strong> ${g.nota}</div>` : ''}
        </div>
        <div class="grupo-numeros">
          ${g.numeros.map(n => `<span class="grupo-num">${n}</span>`).join('')}
        </div>
        <div class="grupo-acciones">
          <button type="button" class="btn-mini btn-confirmar" data-numeros="${g.numeros.join(',')}" data-rifa="${rifaId}">Confirmar pago</button>
          <button type="button" class="btn-mini btn-rechazar" data-numeros="${g.numeros.join(',')}" data-rifa="${rifaId}">Rechazar</button>
        </div>
      `;
      cont.appendChild(div);
    });
  
    // Enganchar botones
    cont.querySelectorAll('.btn-confirmar').forEach(b => {
      b.addEventListener('click', () => {
        accionPago('confirmarPagoMultiple', b.dataset.rifa, b.dataset.numeros.split(','), b, false);
      });
    });
    cont.querySelectorAll('.btn-rechazar').forEach(b => {
      b.addEventListener('click', () => {
        accionPago('eliminarVentaMultiple', b.dataset.rifa, b.dataset.numeros.split(','), b, true);
      });
    });
  }

  async function accionPago(action, rifaId, numeros, btn, esBorrar) {
    if (esBorrar && !confirm(`¿Rechazar y liberar los números ${numeros.join(', ')}?`)) return;
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = '...';
    try {
      const data = await postJSON({ action, rifaId, numeros });
      console.log('✅ Respuesta:', data);
      if (data.success) {
        // Recargar la lista
        await cargarVentasAdmin(rifaId);
        // Si la rifa activa es la misma, refrescar el grid público también
        if (RIFA_ACTUAL && RIFA_ACTUAL.rifaId === rifaId) {
          await cargarVentas(rifaId);
        }
      } else {
        alert('Error: ' + data.message);
        btn.disabled = false;
        btn.textContent = original;
      }
    } catch (err) {
      console.error(err);
      alert('Error: ' + err.message);
      btn.disabled = false;
      btn.textContent = original;
    }
  }

function mostrarGanador(vendidos) {
  const g = vendidos[Math.floor(Math.random() * vendidos.length)];
  $('#ganadorBox').innerHTML = `
    <h3>¡Número ganador!</h3>
    <div class="ganador-numero">${g.numero}</div>
    <p><strong>${g.comprador}</strong></p>
    <p>${g.telefono || ''}</p>
  `;
}

/* ==========================================================================
   INICIALIZACIÓN
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  initModal();
  initAdmin();
  cargarRifaActiva();
});