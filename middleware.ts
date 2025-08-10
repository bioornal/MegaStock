import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  // Redirect to login if no session and not on the login page
  if (!user && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect to home if there is a session and user tries to access login page
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Si hay sesión, verificar permisos para rutas protegidas
  if (user) {
    try {
      // SOLUCIÓN TEMPORAL: Asignar roles basado en email hasta que se configure la BD
      let userRole = 'viewer' // Por defecto viewer
      
      // Emails de admin
      const adminEmails = [
        'spezialichristian@gmail.com',
        'admin@megastock.com'
      ]
      
      if (adminEmails.includes(user.email || '')) {
        userRole = 'admin'
      }

      // Intentar obtener rol de la base de datos (si existe)
      try {
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single()

        if (!roleError && roleData) {
          userRole = roleData.role
        }
      } catch (dbError) {
        // Usar rol temporal basado en email
      }

      // Rutas que solo pueden acceder los admins
      const adminOnlyRoutes = [
        '/sales',
        '/stock', 
        '/customers',
        '/vendors',
        '/admin',
        '/new'
      ]

      // Verificar si la ruta actual requiere permisos de admin
      const requiresAdmin = adminOnlyRoutes.some(route => pathname.startsWith(route))

      // Si la ruta requiere admin y el usuario no es admin, redirigir al dashboard
      if (requiresAdmin && userRole !== 'admin') {
        return NextResponse.redirect(new URL('/?access=denied', request.url))
      }

      // Los viewers solo pueden acceder al dashboard principal (/)
      if (userRole === 'viewer' && pathname !== '/' && !pathname.startsWith('/_next') && !pathname.startsWith('/api')) {
        return NextResponse.redirect(new URL('/?access=denied', request.url))
      }

    } catch (error) {
      console.error('Error checking user role:', error)
      // En caso de error, permitir acceso para admins conocidos
      const adminEmails = ['spezialichristian@gmail.com', 'admin@megastock.com']
      if (!adminEmails.includes(user.email || '')) {
        return NextResponse.redirect(new URL('/?access=denied', request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static assets
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
