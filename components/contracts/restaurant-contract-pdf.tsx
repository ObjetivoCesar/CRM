import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { formatearLista, formatearFechaContrato, type RestaurantContractData } from '@/lib/contracts/restaurant-schema';

// Create styles
const styles = StyleSheet.create({
    page: {
        padding: 50,
        fontSize: 11,
        fontFamily: 'Helvetica',
        lineHeight: 1.6,
    },
    title: {
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
    },
    clause: {
        marginBottom: 15,
    },
    clauseTitle: {
        fontWeight: 'bold',
        marginBottom: 5,
    },
    paragraph: {
        textAlign: 'justify',
        marginBottom: 8,
    },
    list: {
        marginLeft: 20,
        marginBottom: 8,
    },
    listItem: {
        marginBottom: 4,
    },
    signatures: {
        marginTop: 40,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    signatureBlock: {
        width: '45%',
        textAlign: 'center',
    },
    signatureLine: {
        borderTop: '1px solid black',
        marginTop: 40,
        paddingTop: 5,
    },
});

interface RestaurantContractPDFProps {
    data: RestaurantContractData;
}

export function RestaurantContractPDF({ data }: RestaurantContractPDFProps) {
    const estructuraMenuText = formatearLista(data.estructuraMenu);
    const platosDestacadosText = formatearLista(data.platosDestacados);
    const fechaTexto = formatearFechaContrato(data.fechaFirma);
    const pagoContraEntrega = data.precioTotal - data.anticipo;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.title}>
                    <Text>CONTRATO PARA CREACIÓN DE SITIO WEB</Text>
                </View>
                <View style={styles.subtitle}>
                    <Text>{data.nombreRestaurante}</Text>
                </View>

                {/* PRIMERA: COMPARECIENTES */}
                <View style={styles.clause}>
                    <Text style={styles.clauseTitle}>PRIMERA: COMPARECIENTES.</Text>
                    <Text style={styles.paragraph}>
                        En la ciudad de {data.ciudad}, a los {fechaTexto}, comparecen por una parte el ING. CÉSAR AUGUSTO REYES JARAMILLO,
                        con RUC 1103421531001, a quien en adelante y para efectos de este contrato se le denominará simplemente como "CONTRATISTA";
                        y por otra parte el/la señor/a {data.nombreContratante}, con {data.tipoIdentificacion} {data.numeroIdentificacion},
                        en representación de {data.nombreRestaurante}, a quien en adelante se le denominará como "CONTRATANTE".
                        Ambas partes acuerdan celebrar el presente contrato bajo las siguientes cláusulas:
                    </Text>
                </View>

                {/* SEGUNDA: ANTECEDENTES */}
                <View style={styles.clause}>
                    <Text style={styles.clauseTitle}>SEGUNDA: ANTECEDENTES.</Text>
                    <Text style={styles.paragraph}>
                        El CONTRATANTE está interesado en la implementación de una página web {data.dominioWeb} para su restaurante,
                        de acuerdo con las especificaciones detalladas en la cláusula tercera.
                    </Text>
                </View>

                {/* TERCERA: OBJETO */}
                <View style={styles.clause}>
                    <Text style={styles.clauseTitle}>TERCERA: OBJETO.</Text>
                    <Text style={styles.paragraph}>
                        El siguiente objeto del presente contrato incluye los servicios:
                    </Text>

                    <Text style={[styles.paragraph, { fontWeight: 'bold' }]}>1. Diseño y construcción del sitio web:</Text>
                    <View style={styles.list}>
                        <Text style={styles.listItem}>• Hosting y dominio "{data.dominioWeb}" por 1 año.</Text>
                        <Text style={styles.listItem}>
                            • Página de Inicio enfocada en el restaurante, su autoridad, galería, información de contacto,
                            mapa de ubicación y enlaces a las páginas del menú.
                        </Text>
                        <Text style={styles.listItem}>• Páginas del Menú: {estructuraMenuText}</Text>
                        <Text style={styles.listItem}>• Páginas individuales destacadas: {platosDestacadosText}</Text>
                        <Text style={styles.listItem}>• Uso de colores de marca según el logo del restaurante.</Text>
                        <Text style={styles.listItem}>• Certificado SSL para seguridad del sitio.</Text>
                        <Text style={styles.listItem}>• Correo corporativo.</Text>
                    </View>

                    <Text style={[styles.paragraph, { fontWeight: 'bold' }]}>2. Entregables:</Text>
                    <View style={styles.list}>
                        <Text style={styles.listItem}>• Página web optimizada para búsquedas en Google (SEO básico).</Text>
                        <Text style={styles.listItem}>• Accesos administrativos a la página web.</Text>
                        <Text style={styles.listItem}>• Documentación de la estructura SEO de la página web.</Text>
                    </View>

                    <Text style={[styles.paragraph, { fontWeight: 'bold' }]}>3. Proceso:</Text>
                    <View style={styles.list}>
                        <Text style={styles.listItem}>
                            • Recolección de datos: Entrevista con el CONTRATANTE para recopilar toda la información del restaurante,
                            imágenes, menú y conocer sus objetivos.
                        </Text>
                        <Text style={styles.listItem}>
                            • Entrega versión 1: Sitio web listo para revisión y recepción de sugerencias o modificaciones.
                        </Text>
                        <Text style={styles.listItem}>
                            • Entrega final: Modificación según feedback y entrega definitiva del sitio web con todos los entregables.
                        </Text>
                    </View>
                </View>

                {/* CUARTA: PRECIO */}
                <View style={styles.clause}>
                    <Text style={styles.clauseTitle}>CUARTA: PRECIO.</Text>
                    <Text style={styles.paragraph}>
                        El costo total del servicio es de ${data.precioTotal} USD más IVA, pagadero de la siguiente manera:
                    </Text>
                    <View style={styles.list}>
                        <Text style={styles.listItem}>• ${data.anticipo} al momento de firmar el contrato.</Text>
                        <Text style={styles.listItem}>• ${pagoContraEntrega} contra entrega del sitio web versión final.</Text>
                    </View>
                </View>

                {/* QUINTA: PLAZO */}
                <View style={styles.clause}>
                    <Text style={styles.clauseTitle}>QUINTA: PLAZO.</Text>
                    <Text style={styles.paragraph}>
                        El plazo de entrega será de {data.plazoDias} días hábiles contados a partir de la firma del contrato y la entrega
                        completa de materiales (textos, imágenes, logo, menú) por parte del CONTRATANTE. Al finalizar, el CONTRATISTA
                        entregará al CONTRATANTE todos los accesos, documentación y entregables descritos en la cláusula tercera.
                    </Text>
                </View>

                {/* SEXTA: GARANTÍA */}
                <View style={styles.clause}>
                    <Text style={styles.clauseTitle}>SEXTA: GARANTÍA.</Text>
                    <Text style={styles.paragraph}>
                        El CONTRATISTA ofrece una garantía de {data.periodoGarantia} para modificaciones menores referentes al acuerdo
                        detallado en este contrato.
                    </Text>
                    <Text style={styles.paragraph}>
                        En caso de que se requieran servicios adicionales como ampliación del sitio web (más páginas, funcionalidades avanzadas,
                        integraciones), se realizará un alcance de precio adicional que deberá ser acordado por ambas partes.
                    </Text>
                    <Text style={styles.paragraph}>No se cubren problemas derivados de:</Text>
                    <View style={styles.list}>
                        <Text style={styles.listItem}>• Modificaciones realizadas por TERCEROS no autorizados.</Text>
                        <Text style={styles.listItem}>• Uso incorrecto del sitio web por parte del CONTRATANTE.</Text>
                        <Text style={styles.listItem}>• Cambios en plataformas de terceros (hosting, proveedores externos).</Text>
                    </View>
                    <Text style={styles.paragraph}>
                        Durante el período de garantía posterior a la entrega, se realizarán ajustes razonables para garantizar que el
                        producto final cumpla con las expectativas acordadas en este contrato.
                    </Text>
                </View>

                {/* SÉPTIMA: TERMINACIÓN */}
                <View style={styles.clause}>
                    <Text style={styles.clauseTitle}>SÉPTIMA: TERMINACIÓN.</Text>
                    <Text style={styles.paragraph}>El presente contrato podrá darse por terminado:</Text>
                    <View style={styles.list}>
                        <Text style={styles.listItem}>• Por mutuo acuerdo entre las partes.</Text>
                        <Text style={styles.listItem}>• Por incumplimiento de las obligaciones establecidas en este contrato.</Text>
                        <Text style={styles.listItem}>
                            • Por decisión unilateral del CONTRATANTE, en cuyo caso no procederá la devolución del anticipo entregado,
                            en razón de los avances realizados y la disponibilidad de recursos por parte del CONTRATISTA.
                        </Text>
                    </View>
                    <Text style={styles.paragraph}>
                        Si la cancelación ocurre una vez entregada la versión 1 del sitio web para revisión, el CONTRATANTE deberá
                        cancelar el valor total del proyecto.
                    </Text>
                    <Text style={styles.paragraph}>
                        En caso de controversias, las partes se someterán a los jueces competentes de la ciudad de {data.ciudad}.
                    </Text>
                </View>

                {/* OCTAVA: FIRMAS */}
                <View style={styles.clause}>
                    <Text style={styles.clauseTitle}>OCTAVA: FIRMAS.</Text>
                    <Text style={styles.paragraph}>
                        Para constancia de lo estipulado, las partes firman por duplicado en unidad de acto en {data.ciudad},
                        a los {fechaTexto}.
                    </Text>
                </View>

                {/* Signatures */}
                <View style={styles.signatures}>
                    <View style={styles.signatureBlock}>
                        <View style={styles.signatureLine}>
                            <Text>Ing. César Augusto Reyes Jaramillo</Text>
                            <Text>RUC: 1103421531001</Text>
                            <Text style={{ fontWeight: 'bold' }}>CONTRATISTA</Text>
                        </View>
                    </View>
                    <View style={styles.signatureBlock}>
                        <View style={styles.signatureLine}>
                            <Text>{data.nombreContratante}</Text>
                            <Text>{data.tipoIdentificacion}: {data.numeroIdentificacion}</Text>
                            <Text style={{ fontWeight: 'bold' }}>CONTRATANTE</Text>
                        </View>
                    </View>
                </View>
            </Page>
        </Document>
    );
}
