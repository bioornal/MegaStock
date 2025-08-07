import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// GET - Listar todos los usuarios
export async function GET() {
  console.log('🚀 GET /api/admin/users - Iniciando listado de usuarios')
  
  try {
    const supabase = createClient()
    
    // Verificar que el usuario actual es admin
    console.log('🔐 Verificando autenticación del usuario actual...')
    const { data: { user }, error: getAuthError } = await supabase.auth.getUser()
    
    console.log('📊 Resultado de autenticación:', {
      user: user ? { id: user.id, email: user.email } : null,
      error: getAuthError?.message
    })
    
    if (getAuthError) {
      console.log('❌ Error de autenticación:', getAuthError)
      return NextResponse.json({ error: 'Error de autenticación' }, { status: 401 })
    }
    
    if (!user) {
      console.log('❌ Usuario no autenticado')
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    
    console.log('✅ Usuario autenticado:', user.email)

    console.log('🔍 Verificando rol de administrador...')
    const { data: roleData, error: getRoleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    console.log('📋 Resultado de consulta de rol:', {
      roleData,
      error: getRoleError?.message
    })

    if (getRoleError) {
      console.log('❌ Error consultando rol:', getRoleError)
      return NextResponse.json({ error: 'Error al verificar permisos' }, { status: 500 })
    }

    if (roleData?.role !== 'admin') {
      console.log('❌ Usuario no es administrador. Rol actual:', roleData?.role)
      return NextResponse.json({ error: 'Solo administradores pueden acceder' }, { status: 403 })
    }
    
    console.log('✅ Usuario es administrador')

    // Usar cliente admin para obtener usuarios
    const adminClient = createAdminClient()
    
    // Obtener usuarios de auth
    const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers()
    if (authError) {
      console.error('Error obteniendo usuarios:', authError)
      return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 })
    }

    // Obtener roles
    const { data: roleData2, error: listRoleError } = await supabase
      .from('user_roles')
      .select('user_id, role')

    if (listRoleError) {
      console.error('Error obteniendo roles:', listRoleError)
      return NextResponse.json({ error: 'Error al obtener roles' }, { status: 500 })
    }

    // Combinar datos
    const usersWithRoles = authUsers.users.map(user => {
      const userRole = roleData2?.find(r => r.user_id === user.id)
      return {
        id: user.id,
        email: user.email || '',
        role: userRole?.role || null,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at || null
      }
    })

    return NextResponse.json({ users: usersWithRoles })
  } catch (error) {
    console.error('Error en GET /api/admin/users:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// POST - Crear nuevo usuario
export async function POST(request: NextRequest) {
  console.log('🚀 POST /api/admin/users - Iniciando creación de usuario')
  
  try {
    const supabase = createClient()
    
    // Verificar que el usuario actual es admin
    console.log('🔐 Verificando autenticación del usuario actual...')
    const { data: { user }, error: postAuthError } = await supabase.auth.getUser()
    
    console.log('📊 Resultado de autenticación POST:', {
      user: user ? { id: user.id, email: user.email } : null,
      error: postAuthError?.message
    })
    
    if (postAuthError) {
      console.log('❌ Error de autenticación:', postAuthError)
      return NextResponse.json({ error: 'Error de autenticación' }, { status: 401 })
    }
    
    if (!user) {
      console.log('❌ Usuario no autenticado')
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    console.log('✅ Usuario autenticado:', user.email)

    console.log('🔍 Verificando rol de administrador...')
    const { data: postRoleData, error: postRoleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    console.log('📋 Resultado de consulta de rol POST:', {
      roleData: postRoleData,
      error: postRoleError?.message
    })
    
    if (postRoleError) {
      console.log('❌ Error consultando rol:', postRoleError)
      return NextResponse.json({ error: 'Error al verificar permisos' }, { status: 500 })
    }
    
    if (postRoleData?.role !== 'admin') {
      console.log('❌ Usuario no es administrador. Rol actual:', postRoleData?.role)
      return NextResponse.json({ error: 'Solo administradores pueden crear usuarios' }, { status: 403 })
    }
    console.log('✅ Usuario es administrador')

    // Obtener datos del request
    console.log('📝 Obteniendo datos del request...')
    const { email, password, role } = await request.json()
    console.log('📧 Email:', email)
    console.log('🔑 Password length:', password?.length)
    console.log('👤 Role:', role)

    if (!email || !password) {
      console.log('❌ Email o contraseña faltantes')
      return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 })
    }

    if (password.length < 6) {
      console.log('❌ Contraseña muy corta')
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
    }

    if (!['admin', 'viewer'].includes(role)) {
      console.log('❌ Rol inválido')
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
    }
    console.log('✅ Validaciones pasadas')

    // Usar cliente admin para crear usuario
    console.log('🔧 Creando cliente admin de Supabase...')
    let adminClient
    let newUser
    let createError
    
    try {
      adminClient = createAdminClient()
      console.log('✅ Cliente admin creado exitosamente')
    } catch (adminError) {
      console.error('💥 Error creando cliente admin:', adminError)
      return NextResponse.json({ error: 'Error de configuración del servidor' }, { status: 500 })
    }
      
    // Crear usuario en Supabase Auth
    console.log('👤 Creando usuario en Supabase Auth...')
    const createResult = await adminClient.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true
    })
    
    newUser = createResult.data
    createError = createResult.error
    console.log('📊 Resultado de creación:', { newUser: !!newUser?.user, error: createError?.message })

    if (createError) {
      console.error('Error creando usuario:', createError)
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    if (!newUser.user) {
      return NextResponse.json({ error: 'Error al crear el usuario' }, { status: 500 })
    }

    // Asignar rol en la tabla user_roles
    console.log('📝 Asignando rol en la base de datos...')
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        email: email,
        role: role
      })

    if (roleError) {
      console.error('Error asignando rol:', roleError)
      // Si falla la asignación de rol, eliminar el usuario creado
      console.log('🗑️ Eliminando usuario debido a error en asignación de rol...')
      await adminClient.auth.admin.deleteUser(newUser.user.id)
      return NextResponse.json({ error: 'Error al asignar rol al usuario' }, { status: 500 })
    }

    console.log('🎉 Usuario creado exitosamente!')
    return NextResponse.json({ 
      success: true, 
      message: `Usuario ${email} creado exitosamente con rol ${role}`,
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        role: role,
        created_at: newUser.user.created_at
      }
    })

  } catch (error) {
    console.error('Error en POST /api/admin/users:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// DELETE - Eliminar usuario
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Verificar que el usuario actual es admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleData?.role !== 'admin') {
      return NextResponse.json({ error: 'Solo administradores pueden eliminar usuarios' }, { status: 403 })
    }

    // Obtener email del usuario a eliminar
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email es requerido' }, { status: 400 })
    }

    // No permitir eliminar al admin principal
    if (email === 'spezialichristian@gmail.com') {
      return NextResponse.json({ error: 'No se puede eliminar al administrador principal' }, { status: 400 })
    }

    // Usar cliente admin para obtener y eliminar usuario
    const adminClient = createAdminClient()
    
    // Buscar el usuario por email
    const { data: userData, error: listError } = await adminClient.auth.admin.listUsers()
    if (listError) {
      console.error('Error listando usuarios:', listError)
      return NextResponse.json({ error: 'Error al buscar usuario' }, { status: 500 })
    }

    const targetUser = userData.users.find(u => u.email === email)
    if (!targetUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Eliminar de user_roles primero
    const { error: roleError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', targetUser.id)

    if (roleError) {
      console.error('Error eliminando rol:', roleError)
      return NextResponse.json({ error: 'Error al eliminar rol del usuario' }, { status: 500 })
    }

    // Eliminar el usuario de Supabase Auth
    const { error: authError } = await adminClient.auth.admin.deleteUser(targetUser.id)
    if (authError) {
      console.error('Error eliminando usuario:', authError)
      return NextResponse.json({ error: 'Error al eliminar usuario de autenticación' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: `Usuario ${email} eliminado exitosamente` 
    })

  } catch (error) {
    console.error('Error en DELETE /api/admin/users:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
