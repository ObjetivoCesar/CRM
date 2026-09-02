import mysql from 'mysql2/promise';

async function main() {
    const pool = mysql.createPool({
        host: 'mysql.us.stackcp.com',
        port: 42755,
        user: 'Activaqrbasededatos-35303936889f',
        password: 'pwye546gfr',
        database: 'Activaqrbasededatos-35303936889f',
        waitForConnections: true,
        connectionLimit: 1,
        queueLimit: 0
    });

    try {
        console.log('⏳ Conectando a MySQL para agregar columna metadata...');
        
        // Check if the column exists
        const [columns] = await pool.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'Activaqrbasededatos-35303936889f' 
              AND TABLE_NAME = 'feria_votos' 
              AND COLUMN_NAME = 'metadata'
        `) as any;

        if (columns.length > 0) {
            console.log('✅ La columna metadata ya existe en feria_votos.');
        } else {
            console.log('⏳ Agregando columna metadata (JSON)...');
            await pool.query('ALTER TABLE feria_votos ADD COLUMN metadata JSON NULL;');
            console.log('✅ Columna metadata agregada exitosamente.');
        }

    } catch (error) {
        console.error('❌ Error alterando la tabla:', error);
    } finally {
        await pool.end();
        console.log('🔌 Conexión cerrada.');
    }
}

main();
