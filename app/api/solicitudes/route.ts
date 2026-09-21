import { NextRequest, NextResponse } from 'next/server';
import { SolicitudesService, ServiceError } from '@/lib/services/solicitudes.service';
import { createSolicitudSchema, querySolicitudesSchema } from '@/lib/validations/solicitud';
import { ZodError } from 'zod';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = {
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 10,
      search: searchParams.get('search') || undefined,
      estado: searchParams.get('estado') || undefined,
      prioridad: searchParams.get('prioridad') || undefined,
      categoria: searchParams.get('categoria') || undefined,
      responsableId: searchParams.get('responsableId') || undefined,
    };

    const parsedQuery = querySolicitudesSchema.parse(queryParams);
    const result = await SolicitudesService.list(parsedQuery);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Parámetros de consulta inválidos', details: error.issues },
        { status: 400 }
      );
    }
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error en GET /api/solicitudes:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createSolicitudSchema.parse(body);
    const result = await SolicitudesService.create(validatedData);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Datos de solicitud inválidos', details: error.issues },
        { status: 400 }
      );
    }
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error en POST /api/solicitudes:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
