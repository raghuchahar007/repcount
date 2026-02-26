import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const pathname = request.nextUrl.pathname

  // Pure public routes — skip auth entirely
  const skipAuthRoutes = ['/gym', '/checkin']
  const isSkipAuth = skipAuthRoutes.some(route => pathname.startsWith(route)) || pathname === '/'
  if (isSkipAuth) {
    return response
  }

  // Now check auth for all other routes
  const { data: { user } } = await supabase.auth.getUser()

  // Unauthenticated on protected route → redirect to login
  const isLoginRoute = pathname.startsWith('/login')
  if (!user && !isLoginRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Authenticated on /login → redirect to dashboard
  if (user && isLoginRoute) {
    const roleCookie = request.cookies.get('repcount_role')?.value
    const role = roleCookie || (await (async () => {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      return profile?.role
    })())
    const url = request.nextUrl.clone()
    url.pathname = role === 'owner' ? '/owner' : '/m'
    return NextResponse.redirect(url)
  }

  // Role-based route protection
  if (user && (pathname.startsWith('/owner') || pathname.startsWith('/m'))) {
    const roleCookie = request.cookies.get('repcount_role')?.value
    const role = roleCookie || (await (async () => {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      return profile?.role
    })())

    if (pathname.startsWith('/owner') && role !== 'owner') {
      return NextResponse.redirect(new URL('/m', request.url))
    }
    if (pathname.startsWith('/m') && role === 'owner') {
      return NextResponse.redirect(new URL('/owner', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icons).*)',
  ],
}
