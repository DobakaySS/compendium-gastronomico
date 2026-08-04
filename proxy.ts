import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { userRole, canWrite, canAdmin, type Role } from "@/lib/roles"

const protectedRoutes = [
  "/dashboard",
  "/ingredients",
  "/authors",
  "/recipes",
  "/admin",
]
const writeRoutes = [
  "/dashboard",
  "/ingredients/new",
  "/authors/new",
  "/recipes/new",
  "/recipes/smart-import",
]
const adminRoutes = ["/admin"]
const publicRoutes = ["/login"]

function roleOf(user: {
  is_anonymous?: boolean
  app_metadata?: Record<string, unknown> | null
} | null): Role {
  return userRole(user)
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Cadastro público desabilitado: apenas o admin cria contas.
  if (path.startsWith("/signup")) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  const isProtectedRoute = protectedRoutes.some((route) =>
    path.startsWith(route)
  )
  const isWriteRoute = writeRoutes.some((route) => path.startsWith(route))
  const isAdminRoute = adminRoutes.some((route) => path.startsWith(route))
  const isPublicRoute = publicRoutes.some((route) => path.startsWith(route))

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const toLogin = () =>
    NextResponse.redirect(
      (() => {
        const url = new URL("/login", request.url)
        url.searchParams.set("next", path)
        return url
      })()
    )

  // Rotas de admin: exige usuário admin autenticado.
  if (isAdminRoute) {
    if (!user || !canAdmin(roleOf(user))) return toLogin()
  }

  // Rotas de escrita (dashboard e /new): exige permissão de escrita.
  if (isWriteRoute) {
    if (!user) return toLogin()
    if (!canWrite(roleOf(user))) {
      return NextResponse.redirect(new URL("/", request.url))
    }
  }

  if (isProtectedRoute && !user) {
    return toLogin()
  }

  if (isPublicRoute && user) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return response
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|gif|ico|webp|txt|xml)$).*)",
  ],
}