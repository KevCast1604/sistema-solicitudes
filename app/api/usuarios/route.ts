import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const usuarios = await prisma.usuario.findMany({
      orderBy: {
        nombre: 'asc',
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
      },
    });

    return NextResponse.json(usuarios);
  } catch (error) {
    console.error('Error en GET /api/usuarios:', error);
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 });
  }
}
