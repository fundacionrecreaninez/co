/* ==========================================================================
   Fundación Recreaniñez — Backend Google Apps Script
   ========================================================================== */

const CARPETA_COMPROBANTES = 'Recreaniñez_Comprobantes';

function initialSetup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let sh = ss.getSheetByName('Contacto') || ss.insertSheet('Contacto');
  if (sh.getLastRow() === 0) {
    sh.appendRow(['Timestamp', 'Nombre', 'Email', 'Mensaje']);
    sh.setFrozenRows(1);
  }
  sh = ss.getSheetByName('Aliados') || ss.insertSheet('Aliados');
  if (sh.getLastRow() === 0) {
    sh.appendRow(['Timestamp', 'Organizacion', 'Contacto', 'Email', 'Telefono', 'Mensaje']);
    sh.setFrozenRows(1);
  }
  sh = ss.getSheetByName('Rifas_Config') || ss.insertSheet('Rifas_Config');
  if (sh.getLastRow() === 0) {
    sh.appendRow(['Rifa_ID', 'Titulo', 'Premio', 'Valor_Numero', 'Total_Numeros', 'Estado', 'Fecha_Creacion']);
    sh.setFrozenRows(1);
  }
  sh = ss.getSheetByName('Rifas_Ventas') || ss.insertSheet('Rifas_Ventas');
  if (sh.getLastRow() === 0) {
    sh.appendRow(['Timestamp', 'Rifa_ID', 'Numero', 'Comprador', 'Telefono', 'Email', 'Estado_Pago', 'Comprobante_URL', 'Nota']);
    sh.setFrozenRows(1);
  }
  Logger.log('Configuración inicial completada.');
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    let result;
    switch (data.action) {
      case 'contacto':      result = guardarContacto(data);  break;
      case 'aliado':        result = guardarAliado(data);    break;
      case 'compra':        result = guardarCompra(data);    break;
      case 'crearRifa':     result = crearRifa(data);        break;
      case 'confirmarPago': result = confirmarPago(data);    break;
      default: result = { success: false, message: 'Acción desconocida: ' + data.action };
    }
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ success: false, message: err.toString() });
  }
}

function doGet(e) {
  const action = e.parameter.action;
  let result;
  try {
    switch (action) {
      case 'getRifaActiva': result = getRifaActiva(); break;
      case 'getRifas':      result = getRifas();      break;
      case 'getVentas':     result = getVentas(e.parameter.rifaId); break;
      default: result = { success: false, message: 'Acción desconocida' };
    }
  } catch (err) {
    result = { success: false, message: err.toString() };
  }
  return jsonResponse(result);
}

function guardarContacto(data) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Contacto');
  sh.appendRow([new Date(), data.nombre || '', data.email || '', data.mensaje || '']);
  return { success: true, message: 'Mensaje guardado' };
}

function guardarAliado(data) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Aliados');
  sh.appendRow([new Date(), data.organizacion || '', data.contacto || '', data.email || '', data.telefono || '', data.mensaje || '']);
  return { success: true, message: 'Aliado registrado' };
}

function guardarCompra(data) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Rifas_Ventas');
  const lastRow = sh.getLastRow();
  if (lastRow > 1) {
    const valores = sh.getRange(2, 1, lastRow - 1, 9).getValues();
    const yaExiste = valores.some(row =>
      String(row[1]).trim() === String(data.rifaId).trim() &&
      String(row[2]).trim() === String(data.numero).trim()
    );
    if (yaExiste) return { success: false, message: 'El número ' + data.numero + ' ya fue reservado.' };
  }

  let urlComprobante = '';
  if (data.archivoBase64) {
    urlComprobante = guardarArchivoEnDrive(data.archivoBase64, data.archivoNombre || 'comprobante', data.rifaId);
  }

  sh.appendRow([new Date(), data.rifaId, data.numero, data.nombre, data.telefono, data.email, 'Por confirmar', urlComprobante, data.nota || '']);
  return { success: true, message: 'Compra registrada', comprobante: urlComprobante };
}

function guardarArchivoEnDrive(base64, nombreArchivo, rifaId) {
  let carpetaPadre;
  const it = DriveApp.getFoldersByName(CARPETA_COMPROBANTES);
  carpetaPadre = it.hasNext() ? it.next() : DriveApp.createFolder(CARPETA_COMPROBANTES);

  let subcarpeta;
  const subIter = carpetaPadre.getFoldersByName('Rifa_' + rifaId);
  subcarpeta = subIter.hasNext() ? subIter.next() : carpetaPadre.createFolder('Rifa_' + rifaId);

  const partes = base64.split(',');
  const meta = partes[0];
  const contenido = partes[1];
  const tipoMatch = meta.match(/:(.*?);/);
  const tipo = tipoMatch ? tipoMatch[1] : 'application/octet-stream';

  const bytes = Utilities.base64Decode(contenido);
  const nombreFinal = new Date().getTime() + '_' + nombreArchivo;
  const blob = Utilities.newBlob(bytes, tipo, nombreFinal);

  const archivo = subcarpeta.createFile(blob);
  archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return archivo.getUrl();
}

function crearRifa(data) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Rifas_Config');
  const lastRow = sh.getLastRow();
  if (lastRow > 1) {
    for (let i = 2; i <= lastRow; i++) sh.getRange(i, 6).setValue('Cerrada');
  }
  const rifaId = 'R' + new Date().getTime();
  sh.appendRow([rifaId, data.titulo, data.premio, Number(data.valor), Number(data.total), 'Activa', new Date()]);
  return { success: true, rifaId };
}

function getRifaActiva() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Rifas_Config');
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return { success: false, message: 'No hay rifas' };
  const valores = sh.getRange(2, 1, lastRow - 1, 7).getValues();
  for (let i = valores.length - 1; i >= 0; i--) {
    if (String(valores[i][5]).trim() === 'Activa') {
      return {
        success: true,
        rifa: {
          rifaId: valores[i][0],
          titulo: valores[i][1],
          premio: valores[i][2],
          valor:  Number(valores[i][3]),
          total:  Number(valores[i][4]),
          estado: valores[i][5]
        }
      };
    }
  }
  return { success: false, message: 'No hay rifa activa' };
}

function getRifas() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Rifas_Config');
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return { success: true, rifas: [] };
  const valores = sh.getRange(2, 1, lastRow - 1, 7).getValues();
  const rifas = valores.map(r => ({
    rifaId: r[0], titulo: r[1], premio: r[2],
    valor: Number(r[3]), total: Number(r[4]), estado: r[5]
  }));
  return { success: true, rifas };
}

function getVentas(rifaId) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Rifas_Ventas');
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return { success: true, ventas: [] };
  const valores = sh.getRange(2, 1, lastRow - 1, 9).getValues();
  const ventas = valores
    .filter(r => String(r[1]).trim() === String(rifaId).trim())
    .map(r => ({
      numero:         String(r[2]),
      comprador:      r[3],
      telefono:       r[4],
      email:          r[5],
      estadoPago:     r[6],
      comprobanteUrl: r[7],
      nota:           r[8]
    }));
  return { success: true, ventas };
}

function confirmarPago(data) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Rifas_Ventas');
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return { success: false, message: 'Sin registros' };
  const valores = sh.getRange(2, 1, lastRow - 1, 9).getValues();
  for (let i = 0; i < valores.length; i++) {
    if (String(valores[i][1]) === String(data.rifaId) && String(valores[i][2]) === String(data.numero)) {
      sh.getRange(i + 2, 7).setValue('Pagado');
      return { success: true };
    }
  }
  return { success: false, message: 'No se encontró el registro' };
}