import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// POST - Setup inicial del administrador
export async function POST() {
  console.log('🚀 POST /api/setup-admin - Configurando administrador inicial')
  
  try {
    const supabase = createClient()
    
    // Obtener el usuario actual
    console.log('🔐 Obteniendo usuario actual...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('❌ Usuario no autenticado')
      return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 })
    }
    
    console.log('✅ Usuario encontrado:', user.email)
    
    // Verificar si ya tiene rol
    console.log('🔍 Verificando si ya tiene rol asignado...')
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()
    
    if (existingRole) {
      console.log('ℹ️ Usuario ya tiene rol:', existingRole.role)
      return NextResponse.json({ 
        message: `Usuario ${user.email} ya tiene el rol: ${existingRole.role}`,
        currentRole: existingRole.role
      })
    }
    
    // Insertar rol de admin
    console.log('📝 Insertando rol de administrador...')
    const { error: insertError } = await supabase
      .from('user_roles')
      .insert({
        user_id: user.id,
        email: user.email,
        role: 'admin'
      })
    
    if (insertError) {
      console.error('❌ Error insertando rol:', insertError)
      return NextResponse.json({ error: 'Error al asignar rol de administrador' }, { status: 500 })
    }
    
    console.log('🎉 Rol de administrador asignado exitosamente!')
    return NextResponse.json({ 
      success: true,
      message: `Usuario ${user.email} configurado como administrador exitosamente`,
      user: {
        id: user.id,
        email: user.email,
        role: 'admin'
      }
    })
    
  } catch (error) {
    console.error('💥 Error en setup-admin:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
