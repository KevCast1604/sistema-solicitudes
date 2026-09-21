import { NextRequest, NextResponse } from 'next/server';
import { SolicitudesService, ServiceError } from '@/lib/services/solicitudes.service';
import { updateSolicitudSchema } from '@/lib/validations/solicitud';
import { ZodError } from 'zod';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const solicitud = await SolicitudesService.getById(id);
    return NextResponse.json(solicitud);
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error en GET /api/solicitudes/[id]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = updateSolicitudSchema.parse(body);

    const updated = await SolicitudesService.update(id, validatedData);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Datos de actualización inválidos', details: error.issues },
        { status: 400 }
      );
    }
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error en PATCH /api/solicitudes/[id]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
