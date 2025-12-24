import React from 'react';
import { Text, View, StyleSheet, Image, Font, Document, Page } from '@react-pdf/renderer';

// Registrar fuente (opcional, usaremos Helvetica por defecto que soporta bold)
// Font.register({ family: 'Roboto', src: '...' });

const styles = StyleSheet.create({
    page: {
        paddingTop: 120, // Reduced top padding (closer to the visual start of text)
        paddingBottom: 100, // Reduced bottom padding
        paddingHorizontal: 75, // approx 2.65cm
        fontFamily: 'Helvetica',
        fontSize: 11,
        lineHeight: 1.5,
        color: '#333',
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 90, // Reduced height for the header container
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerImage: {
        width: '100%',
        height: '100%',
        objectFit: 'cover', // Changed to cover to ensure full width
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 120, // Increased height significantly to prevent cropping
        justifyContent: 'flex-end', // Align content to bottom
    },
    footerImage: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: 'bottom', // Anchor image to bottom edge
    },
    pageNumber: {
        position: 'absolute',
        bottom: 10,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontSize: 9,
        color: '#888',
    },
    // Estilos de contenido
    h1: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
        marginTop: 15,
        color: '#000',
        textTransform: 'uppercase',
    },
    h2: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
        marginTop: 12,
        color: '#222',
        borderBottom: '1pt solid #ddd',
        paddingBottom: 3,
    },
    h3: {
        fontSize: 13,
        fontWeight: 'bold',
        marginBottom: 6,
        marginTop: 10,
        color: '#444',
    },
    text: {
        marginBottom: 8,
        textAlign: 'justify',
    },
    bulletPoint: {
        flexDirection: 'row',
        marginBottom: 4,
        marginLeft: 10,
    },
    bullet: {
        width: 10,
        fontSize: 12,
    },
    bulletContent: {
        flex: 1,
    },
    // Tablas
    table: {
        display: 'flex',
        width: 'auto',
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        marginVertical: 10,
    },
    tableRow: {
        flexDirection: 'row',
    },
    tableColHeader: {
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        backgroundColor: '#f3f4f6',
        padding: 5,
        flex: 1,
    },
    tableCol: {
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        padding: 5,
        flex: 1,
    },
    tableCellHeader: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    tableCell: {
        fontSize: 10,
    }
});

// Utilidad simple para procesar Markdown
const MarkdownRenderer = ({ content }: { content: string }) => {
    const lines = content.split('\n');
    const elements = [];
    let inTable = false;
    let tableHeader: string[] = [];
    let tableRows: string[][] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Skip empty lines in some contexts
        if (!line) continue;

        // Detectar Tablas
        if (line.startsWith('|')) {
            const cols = line.split('|').filter(c => c.trim() !== '').map(c => c.trim());
            if (!inTable) {
                // Posible header o fila
                if (!line.includes('---')) {
                    inTable = true;
                    tableHeader = cols;
                }
            } else {
                if (!line.includes('---')) {
                    tableRows.push(cols);
                }
            }
            // Si la siguiente línea no es tabla, cerramos tabla
            if (i + 1 >= lines.length || !lines[i + 1].trim().startsWith('|')) {
                if (inTable) {
                    elements.push(
                        <View key={`table-${i}`} style={styles.table}>
                            {/* Header */}
                            <View style={styles.tableRow}>
                                {tableHeader.map((h, idx) => (
                                    <View key={idx} style={styles.tableColHeader}>
                                        <Text style={styles.tableCellHeader}>{h}</Text>
                                    </View>
                                ))}
                            </View>
                            {/* Rows */}
                            {tableRows.map((row, rIdx) => (
                                <View key={rIdx} style={styles.tableRow}>
                                    {row.map((cell, cIdx) => (
                                        <View key={cIdx} style={styles.tableCol}>
                                            <Text style={styles.tableCell}>{cell}</Text>
                                        </View>
                                    ))}
                                </View>
                            ))}
                        </View>
                    );
                    inTable = false;
                    tableHeader = [];
                    tableRows = [];
                }
            }
            continue;
        }

        // Headers
        if (line.startsWith('### ')) {
            elements.push(<Text key={i} style={styles.h3}>{line.replace('### ', '')}</Text>);
        } else if (line.startsWith('## ')) {
            elements.push(<Text key={i} style={styles.h2}>{line.replace('## ', '')}</Text>);
        } else if (line.startsWith('# ')) {
            elements.push(<Text key={i} style={styles.h1}>{line.replace('# ', '')}</Text>);
        }
        // Bullets
        else if (line.startsWith('- ') || line.startsWith('* ')) {
            elements.push(
                <View key={i} style={styles.bulletPoint}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.bulletContent}>{line.replace(/^[-*] /, '')}</Text>
                </View>
            );
        }
        // Texto normal
        else {
            // Bold simple parsing: **text** -> text (limpiamos asteriscos por ahora para MVP)
            // Idealmente usar un parser recursivo, pero para MVP limpiamos
            const cleanLine = line.replace(/\*\*/g, '');
            elements.push(<Text key={i} style={styles.text}>{cleanLine}</Text>);
        }
    }

    return <>{elements}</>;
};

export const QuotationDocument = ({ content, logoUrl, footerUrl }: { content: string, logoUrl: string, footerUrl: string }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            {/* Header Fijo */}
            <View fixed style={styles.header}>
                {/* Validamos si hay URL, si no mostramos texto o nada */}
                {logoUrl ? <Image style={styles.headerImage} src={logoUrl} /> : <Text>Membrete</Text>}
            </View>

            {/* Contenido Principal */}
            <View>
                <MarkdownRenderer content={content} />
            </View>

            {/* Footer Fijo */}
            <View fixed style={styles.footer}>
                {footerUrl ? <Image style={styles.footerImage} src={footerUrl} /> : <Text>Pie de Página</Text>}
            </View>

            {/* Número de Página */}
            <Text
                style={styles.pageNumber}
                render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
                fixed
            />
        </Page>
    </Document>
);


