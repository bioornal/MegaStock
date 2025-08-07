import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUserRoleServer } from '@/lib/auth-server'

// Cliente admin con service role key (solo disponible en servidor)
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    const { email, role } = await request.json()

    if (!email || !role) {
      return NextResponse.json(
        { success: false, message: 'Email y rol son requeridos' },
        { status: 400 }
      )
    }

    // Verificar que el usuario actual es admin
    const currentUserRole = await getCurrentUserRoleServer()
    console.log('Current user role in API:', currentUserRole)
    
    // Debug: Verificar variables de entorno
    console.log('SUPABASE_URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
    console.log('SERVICE_ROLE_KEY length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0)
    
    if (currentUserRole !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Solo los administradores pueden crear usuarios' },
        { status: 403 }
      )
    }

    // Usar cliente admin con service role key
    const adminClient = createAdminClient()
    
    const { data, error } = await adminClient.auth.admin.generateLink({
      type: 'invite',
      email: email,
      options: {
        data: { role: role },
      },
    })

    if (error) {
      console.error('Error generating invitation link:', error.message)
      if (error.message.includes('already registered')) {
        return NextResponse.json(
          { success: false, message: 'Un usuario con este email ya está registrado' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { success: false, message: `Error al generar la invitación: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Enlace de invitación generado correctamente',
      invitationLink: data.properties.action_link,
    })

  } catch (e: any) {
    console.error('Unexpected error in create-invitation:', e)
    return NextResponse.json(
      { success: false, message: `Error inesperado: ${e.message}` },
      { status: 500 }
    )
  }
}
