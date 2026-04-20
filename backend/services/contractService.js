const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, AlignmentType,
} = require("docx");

const OUTPUT_DIR = path.join(__dirname, "../storage/contracts");

function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("es-AR", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function formatCurrency(amount, currency = "USD") {
  if (!amount) return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency, minimumFractionDigits: 0,
  }).format(parseFloat(amount));
}

// ─── primitive builders ───────────────────────────────────────────────────────

function h1(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 300 },
    children: [new TextRun({ text, bold: true, size: 28 })],
  });
}

function section(text) {
  return new Paragraph({
    spacing: { before: 320, after: 120 },
    children: [new TextRun({ text, bold: true, size: 24 })],
  });
}

function p(fragments, opts = {}) {
  const runs = (Array.isArray(fragments) ? fragments : [fragments]).map((f) =>
    typeof f === "string"
      ? new TextRun({ text: f, size: 22 })
      : new TextRun({ text: String(f.text ?? ""), bold: !!f.bold, size: 22 })
  );
  return new Paragraph({
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing: { before: 60, after: 60 },
    children: runs,
  });
}

function field(label, value) {
  return p([{ text: `${label}: `, bold: true }, { text: value || "—" }]);
}

function blank() {
  return new Paragraph({ spacing: { before: 100, after: 100 }, children: [] });
}

function hr() {
  return new Paragraph({
    spacing: { before: 160, after: 160 },
    children: [new TextRun({ text: "─".repeat(65), size: 20 })],
  });
}

// ─── document builders per contract type ─────────────────────────────────────

function buildCompraventa(data) {
  const {
    fecha_emision, vendedor_nombre, vendedor_dni, vendedor_estado_civil, vendedor_domicilio,
    comprador_nombre, comprador_dni, comprador_estado_civil, comprador_domicilio,
    comprador_telefono, comprador_email,
    propiedad_direccion, propiedad_superficie, propiedad_matricula, propiedad_descripcion,
    precio, moneda, precio_numero, modalidad_pago, sena, fecha_escritura,
    comision_porcentaje, agencia_nombre, agencia_cuit, agencia_matricula,
    agencia_domicilio, agente_nombre,
  } = data;

  return [
    blank(),
    h1("CONTRATO DE COMPRAVENTA DE INMUEBLE"),
    p([`En la Ciudad Autónoma de Buenos Aires, a los ${fecha_emision}, entre las partes que a continuación se individualizan, se celebra el presente Contrato de Compraventa de Inmueble.`]),
    hr(),
    section("PRIMERA — PARTES"),
    p([{ text: "VENDEDOR/A:", bold: true }]),
    field("  Nombre completo", vendedor_nombre),
    field("  DNI / CUIT",      vendedor_dni),
    field("  Estado civil",    vendedor_estado_civil),
    field("  Domicilio legal", vendedor_domicilio),
    p('En adelante denominado/a "el/la Vendedor/a".'),
    blank(),
    p([{ text: "COMPRADOR/A:", bold: true }]),
    field("  Nombre completo", comprador_nombre),
    field("  DNI / CUIT",      comprador_dni),
    field("  Estado civil",    comprador_estado_civil),
    field("  Domicilio legal", comprador_domicilio),
    field("  Teléfono",        comprador_telefono),
    field("  Email",           comprador_email),
    p('En adelante denominado/a "el/la Comprador/a".'),
    hr(),
    section("SEGUNDA — OBJETO"),
    p([`El/la Vendedor/a declara ser titular del inmueble ubicado en ${propiedad_direccion}, con una superficie de ${propiedad_superficie}, inscripto bajo matrícula ${propiedad_matricula}.`]),
    propiedad_descripcion ? p(propiedad_descripcion) : blank(),
    hr(),
    section("TERCERA — PRECIO Y FORMA DE PAGO"),
    p([`El precio total se fija en ${precio} (${moneda} ${precio_numero}).`]),
    field("Modalidad de pago", modalidad_pago),
    field("Seña /adero",   sena),
    p("El saldo restante será abonado en el acto de escrituración."),
    hr(),
    section("CUARTA — FECHA DE ESCRITURACIÓN"),
    p([`La escritura traslativa de dominio se realizará el día ${fecha_escritura}, ante el escribano que designe el/la Comprador/a.`]),
    hr(),
    section("QUINTA — ESTADO DEL INMUEBLE"),
    p("El Inmueble se entrega en el estado en que se encuentra, habiendo sido verificado por el/la Comprador/a. El/la Vendedor/a garantiza que está libre de toda deuda, gravamen o hipoteca no informada."),
    hr(),
    section("SEXTA — GASTOS Y HONORARIOS"),
    p([`Los honorarios de la inmobiliaria se fijan en el ${comision_porcentaje} del precio total de la operación.`]),
    hr(),
    section("SÉPTIMA — INTERVENCIÓN INMOBILIARIA"),
    field("  Denominación",   agencia_nombre),
    field("  CUIT",           agencia_cuit),
    field("  Matrícula",      agencia_matricula),
    field("  Domicilio",      agencia_domicilio),
    field("  Agente a cargo", agente_nombre),
    hr(),
    section("OCTAVA — POSESIÓN"),
    p("La posesión real y efectiva del Inmueble será entregada en la fecha de escrituración, libre de personas y de toda ocupación."),
    hr(),
    section("NOVENA — INCUMPLIMIENTO"),
    p("En caso de incumplimiento del Comprador, el Vendedor retendrá la seña como daños y perjuicios. En caso de incumplimiento del Vendedor, devolverá el doble de la seña recibida (art. 1059 CCyCN)."),
    hr(),
    section("DÉCIMA — JURISDICCIÓN"),
    p("Las partes se someten a la jurisdicción de los tribunales ordinarios de la Ciudad Autónoma de Buenos Aires."),
    hr(),
    section("DÉCIMO PRIMERA — CONFORMIDAD"),
    p("Leído y ratificado el presente instrumento, las partes lo suscriben en señal de conformidad."),
    blank(), blank(), blank(),
    p("_________________________       _________________________", { }),
    p("       VENDEDOR/A                        COMPRADOR/A"),
    p([{ text: "Nombre: ", bold: true }, { text: vendedor_nombre }]),
    p([{ text: "Nombre: ", bold: true }, { text: comprador_nombre }]),
    blank(), blank(),
    p("_________________________"),
    p([{ text: "AGENTE: ", bold: true }, { text: agente_nombre }]),
    p([{ text: "Inmobiliaria: ", bold: true }, { text: agencia_nombre }]),
    p([{ text: "Matrícula: ", bold: true }, { text: agencia_matricula }]),
  ];
}

function buildAlquiler(data) {
  const {
    fecha_emision, vendedor_nombre, vendedor_dni, vendedor_estado_civil, vendedor_domicilio,
    comprador_nombre, comprador_dni, comprador_estado_civil, comprador_domicilio,
    comprador_telefono, comprador_email,
    propiedad_direccion, propiedad_superficie, propiedad_matricula,
    precio, moneda, modalidad_pago, sena, fecha_escritura,
    comision_porcentaje, agencia_nombre, agencia_cuit, agencia_matricula,
    agencia_domicilio, agente_nombre,
  } = data;

  return [
    blank(),
    h1("CONTRATO DE LOCACIÓN"),
    p(`En la Ciudad Autónoma de Buenos Aires, a los ${fecha_emision}.`),
    hr(),
    section("PRIMERA — PARTES"),
    p([{ text: "LOCADOR/A (propietario/a):", bold: true }]),
    field("  Nombre completo", vendedor_nombre),
    field("  DNI / CUIT",      vendedor_dni),
    field("  Estado civil",    vendedor_estado_civil),
    field("  Domicilio legal", vendedor_domicilio),
    blank(),
    p([{ text: "LOCATARIO/A (inquilino/a):", bold: true }]),
    field("  Nombre completo", comprador_nombre),
    field("  DNI / CUIT",      comprador_dni),
    field("  Estado civil",    comprador_estado_civil),
    field("  Domicilio legal", comprador_domicilio),
    field("  Teléfono",        comprador_telefono),
    field("  Email",           comprador_email),
    hr(),
    section("SEGUNDA — OBJETO"),
    p(`Inmueble ubicado en ${propiedad_direccion}, superficie ${propiedad_superficie}, matrícula ${propiedad_matricula}.`),
    hr(),
    section("TERCERA — CANON LOCATIVO"),
    p(`El alquiler mensual se fija en ${precio} (${moneda}).`),
    field("Modalidad de pago", modalidad_pago),
    field("Depósito de garantía", sena),
    hr(),
    section("CUARTA — PLAZO"),
    p(`El contrato tendrá vigencia desde ${fecha_emision} hasta ${fecha_escritura}, conforme art. 1198 CCyCN (plazo mínimo 3 años para uso habitacional).`),
    hr(),
    section("QUINTA — DESTINO"),
    p("El inmueble se destinará exclusivamente a uso habitacional, quedando prohibida cualquier actividad comercial o industrial."),
    hr(),
    section("SEXTA — HONORARIOS"),
    p(`Honorarios de intermediación: ${comision_porcentaje} del canon mensual.`),
    hr(),
    section("SÉPTIMA — INTERVENCIÓN INMOBILIARIA"),
    field("  Denominación",   agencia_nombre),
    field("  CUIT",           agencia_cuit),
    field("  Matrícula",      agencia_matricula),
    field("  Agente a cargo", agente_nombre),
    hr(),
    blank(), blank(), blank(),
    p("_________________________       _________________________"),
    p("        LOCADOR/A                        LOCATARIO/A"),
    p([{ text: "Nombre: ", bold: true }, { text: vendedor_nombre }]),
    p([{ text: "Nombre: ", bold: true }, { text: comprador_nombre }]),
    blank(), blank(),
    p("_________________________"),
    p([{ text: "AGENTE: ", bold: true }, { text: agente_nombre }]),
  ];
}

function buildReserva(data) {
  const {
    fecha_emision, vendedor_nombre, vendedor_dni, vendedor_domicilio,
    comprador_nombre, comprador_dni, comprador_domicilio, comprador_telefono,
    propiedad_direccion, precio, moneda, sena, fecha_escritura,
    agencia_nombre, agente_nombre, agencia_matricula,
  } = data;

  return [
    blank(),
    h1("CONTRATO DE RESERVA"),
    p(`Buenos Aires, ${fecha_emision}.`),
    hr(),
    section("PRIMERA — PARTES"),
    field("Reservante (comprador)", comprador_nombre),
    field("DNI",                    comprador_dni),
    field("Domicilio",              comprador_domicilio),
    field("Teléfono",               comprador_telefono),
    blank(),
    field("Propietario (vendedor)", vendedor_nombre),
    field("DNI",                    vendedor_dni),
    field("Domicilio",              vendedor_domicilio),
    hr(),
    section("SEGUNDA — INMUEBLE RESERVADO"),
    p(`Inmueble ubicado en ${propiedad_direccion}.`),
    hr(),
    section("TERCERA — PRECIO Y SEÑA"),
    p(`Precio total pactado: ${precio} (${moneda}).`),
    p(`El/la reservante entrega en este acto la suma de ${sena} en concepto de seña y a cuenta del precio.`),
    hr(),
    section("CUARTA — PLAZO DE RESERVA"),
    p(`La reserva tendrá vigencia hasta el ${fecha_escritura}, fecha en que deberá suscribirse el boleto de compraventa.`),
    hr(),
    section("QUINTA — CONDICIONES"),
    p("Si el/la reservante desiste, perderá la seña entregada. Si el/la propietario/a desiste, deberá devolver el doble de la seña recibida."),
    hr(),
    section("SEXTA — INTERVENCIÓN INMOBILIARIA"),
    field("Inmobiliaria", agencia_nombre),
    field("Matrícula",    agencia_matricula),
    field("Agente",       agente_nombre),
    hr(),
    blank(), blank(), blank(),
    p("_________________________       _________________________"),
    p("       RESERVANTE                        PROPIETARIO/A"),
    p([{ text: "Nombre: ", bold: true }, { text: comprador_nombre }]),
    p([{ text: "Nombre: ", bold: true }, { text: vendedor_nombre }]),
  ];
}

function buildMandato(data) {
  const {
    fecha_emision, vendedor_nombre, vendedor_dni, vendedor_domicilio,
    propiedad_direccion, propiedad_superficie, propiedad_matricula,
    precio, moneda, comision_porcentaje,
    agencia_nombre, agencia_cuit, agencia_matricula, agencia_domicilio, agente_nombre,
  } = data;

  return [
    blank(),
    h1("CONTRATO DE MANDATO / AUTORIZACIÓN PARA VENDER"),
    p(`Buenos Aires, ${fecha_emision}.`),
    hr(),
    section("PRIMERA — MANDANTE"),
    field("Nombre completo", vendedor_nombre),
    field("DNI / CUIT",      vendedor_dni),
    field("Domicilio legal", vendedor_domicilio),
    hr(),
    section("SEGUNDA — MANDATARIA"),
    field("Inmobiliaria",    agencia_nombre),
    field("CUIT",            agencia_cuit),
    field("Matrícula",       agencia_matricula),
    field("Domicilio",       agencia_domicilio),
    field("Agente a cargo",  agente_nombre),
    hr(),
    section("TERCERA — OBJETO DEL MANDATO"),
    p(`El/la mandante autoriza a la mandataria a gestionar la venta del inmueble ubicado en ${propiedad_direccion}, superficie ${propiedad_superficie}, matrícula ${propiedad_matricula}.`),
    hr(),
    section("CUARTA — PRECIO DE VENTA"),
    p(`El precio mínimo de venta autorizado es de ${precio} (${moneda}).`),
    hr(),
    section("QUINTA — HONORARIOS"),
    p(`La mandataria percibirá el ${comision_porcentaje} del precio final de venta en concepto de honorarios de intermediación.`),
    hr(),
    section("SEXTA — VIGENCIA"),
    p("El presente mandato tendrá una vigencia de 180 días corridos desde la fecha de firma, renovable por acuerdo de partes."),
    hr(),
    section("SÉPTIMA — OBLIGACIONES"),
    p("La mandataria se compromete a: publicar el inmueble en los medios acordados, realizar visitas con potenciales compradores, informar al mandante de toda oferta recibida, y actuar con diligencia y buena fe en todo momento."),
    hr(),
    blank(), blank(), blank(),
    p("_________________________       _________________________"),
    p("        MANDANTE                          MANDATARIA"),
    p([{ text: "Nombre: ", bold: true }, { text: vendedor_nombre }]),
    p([{ text: "Inmobiliaria: ", bold: true }, { text: agencia_nombre }]),
  ];
}

// ─── type → builder map ───────────────────────────────────────────────────────

const BUILDERS = {
  compraventa: buildCompraventa,
  alquiler:    buildAlquiler,
  reserva:     buildReserva,
  mandato:     buildMandato,
};

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Generates a .docx buffer and saves it to disk.
 * Returns { outputPath, filename }.
 */
async function generateContract({ contractType, lead, property, formData, agencyConfig }) {
  const builder = BUILDERS[contractType];
  if (!builder) throw new Error(`Tipo de contrato no reconocido: ${contractType}`);

  const data = {
    fecha_emision:         formatDate(new Date().toISOString()),
    // comprador
    comprador_nombre:      lead.name  || "",
    comprador_email:       lead.email || "",
    comprador_telefono:    lead.phone || "",
    comprador_dni:         formData.buyer_dni          || "",
    comprador_domicilio:   formData.buyer_address      || "",
    comprador_estado_civil:formData.buyer_civil_status || "",
    // vendedor
    vendedor_nombre:       formData.seller_name         || "",
    vendedor_dni:          formData.seller_dni          || "",
    vendedor_domicilio:    formData.seller_address      || "",
    vendedor_estado_civil: formData.seller_civil_status || "",
    // propiedad
    propiedad_direccion:   property?.address     || formData.property_address  || "",
    propiedad_superficie:  property?.surface     ? `${property.surface} m²`   : formData.property_surface || "",
    propiedad_matricula:   formData.property_registry   || "",
    propiedad_descripcion: property?.description || "",
    // operación
    precio:                formatCurrency(formData.price, formData.currency),
    precio_numero:         formData.price        || "",
    moneda:                formData.currency     || "USD",
    fecha_escritura:       formatDate(formData.closing_date),
    modalidad_pago:        formData.payment_method || "",
    sena:                  formData.deposit ? formatCurrency(formData.deposit, formData.currency) : "No aplica",
    comision_porcentaje:   formData.commission_pct ? `${formData.commission_pct}%` : "",
    // agencia
    agencia_nombre:        agencyConfig?.name       || "",
    agencia_cuit:          agencyConfig?.cuit        || "",
    agencia_matricula:     agencyConfig?.license     || "",
    agencia_domicilio:     agencyConfig?.address     || "",
    agente_nombre:         agencyConfig?.agent_name  || "",
  };

  const children = builder(data);

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  const buffer = await Packer.toBuffer(doc);

  ensureOutputDir();

  const slug     = lead.id.replace(/-/g, "");
  const filename = `contrato_${contractType}_${slug}_${Date.now()}.docx`;
  const outputPath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(outputPath, buffer);

  console.log('[CONTRACT] Generated:', filename);

  return { outputPath, filename };
}

module.exports = { generateContract };