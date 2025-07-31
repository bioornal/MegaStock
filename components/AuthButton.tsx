import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { User, LogOut } from 'lucide-react'

export default async function AuthButton() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const signOut = async () => {
    'use server'

    const supabase = createClient()
    await supabase.auth.signOut()
    return redirect('/login')
  }

  return user ? (
    <div className="d-flex align-items-center">
      <span className="navbar-text me-3 d-flex align-items-center text-white">
        <User className="me-2" size={20} />
        {user.email}
      </span>
      <form action={signOut}>
        <button className="btn btn-outline-danger d-flex align-items-center">
          <LogOut className="me-1" size={16} />
          Salir
        </button>
      </form>
    </div>
  ) : null
}
