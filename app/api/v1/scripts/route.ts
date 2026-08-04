import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { salesScripts } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// GET /api/v1/scripts — Lista todos los guiones (activos o todos)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const soloActivos = searchParams.get('activo') === 'true';

    const query = db.select().from(salesScripts).orderBy(desc(salesScripts.createdAt));

    const scripts = soloActivos
      ? await db.select().from(salesScripts).where(eq(salesScripts.activo, true)).orderBy(desc(salesScripts.createdAt))
      : await query;

    return NextResponse.json(scripts);
  } catch (error) {
    console.error('[GET /api/v1/scripts]', error);
    return NextResponse.json({ error: 'Error al obtener guiones' }, { status: 500 });
  }
}

// POST /api/v1/scripts — Crear nuevo guion
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nombreGuion, contextoCampana, pasos, activo } = body;

    if (!nombreGuion || !pasos || !Array.isArray(pasos) || pasos.length === 0) {
      return NextResponse.json(
        { error: 'Campos requeridos: nombreGuion, pasos (array no vacío)' },
        { status: 400 }
      );
    }

    const [created] = await db.insert(salesScripts).values({
      nombreGuion,
      contextoCampana: contextoCampana || null,
      pasos,
      activo: activo !== undefined ? activo : true,
    }).returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('[POST /api/v1/scripts]', error);
    return NextResponse.json({ error: 'Error al crear guion' }, { status: 500 });
  }
}
