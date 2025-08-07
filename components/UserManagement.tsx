'use client'

import { useState, useEffect, useTransition } from 'react'
// import { getAllUsersWithRoles, deleteUser, updateUserRole, AppUser, UserRole } from '@/lib/auth'
import { UserRole } from '@/lib/auth'

// Interfaces temporales hasta crear las API routes
interface AppUser {
  id: string
  email: string
  role: UserRole | null
}
import { Trash2, UserPlus, Copy, X } from 'lucide-react'

export default function UserManagement() {
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [invitationLink, setInvitationLink] = useState<string | null>(null)

  const fetchUsers = async () => {
    try {
      // TODO: Crear API route para obtener usuarios
      // const fetched = await getAllUsersWithRoles()
      // setUsers(fetched)
      setUsers([])
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const role = (form.elements.namedItem('role') as HTMLSelectElement).value as UserRole
    if (!email) { alert('Email requerido'); return }

    console.log('Creating invitation for:', email, 'with role:', role)
    startTransition(async () => {
      try {
        const response = await fetch('/api/admin/create-invitation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, role }),
        })
        
        const res = await response.json()
        console.log('Invitation result:', res)
        
        if (res.success) {
          alert(res.message)
          setInvitationLink(res.invitationLink ?? null)
          fetchUsers()
        } else {
          alert(`Error: ${res.message}`)
          console.error('Invitation failed:', res.message)
        }
      } catch (error) {
        console.error('Unexpected error:', error)
        alert('Error inesperado al crear invitación')
      }
    })
  }

  const handleRole = (id: string, role: UserRole) => {
    startTransition(async () => {
      // TODO: Crear API route para actualizar rol
      // const res = await updateUserRole(id, role)
      // if (res.success) {
      //   fetchUsers()
      //   alert('Rol actualizado exitosamente')
      // } else {
      //   alert(res.message)
      // }
      alert('Función temporalmente deshabilitada - creando API routes')
    })
  }

  const handleDelete = (id: string, email: string) => {
    if (email === 'spezialichristian@gmail.com') return alert('No puedes eliminar al admin principal')
    if (!confirm(`Eliminar ${email}?`)) return
    startTransition(async () => {
      // TODO: Crear API route para eliminar usuario
      // const res = await deleteUser(id)
      // if (res.success) {
      //   fetchUsers()
      //   alert('Usuario eliminado exitosamente')
      // } else {
      //   alert(res.message)
      // }
      alert('Función temporalmente deshabilitada - creando API routes')
    })
  }

  return (
    <div className='card w-100'>
      <div className='card-header d-flex justify-content-between align-items-center'>
        <h5 className='mb-0'>Gestión de Usuarios</h5>
        <button className='btn btn-outline-primary btn-sm' onClick={() => { setShowForm(!showForm); setInvitationLink(null) }}>
          {showForm ? <X size={16} className='me-1'/> : <UserPlus size={16} className='me-1'/>}
          {showForm ? 'Cancelar' : 'Crear Usuario'}
        </button>
      </div>
      <div className='card-body'>
        {showForm && (
          <form onSubmit={handleSubmit} className='border p-3 mb-4 rounded'>
            <div className='row g-3 align-items-end'>
              <div className='col-md-5'>
                <label className='form-label'>Email</label>
                <input name='email' type='email' className='form-control' required />
              </div>
              <div className='col-md-3'>
                <label className='form-label'>Rol</label>
                <select name='role' className='form-select' defaultValue='viewer'>
                  <option value='viewer'>Viewer</option>
                  <option value='admin'>Admin</option>
                </select>
              </div>
              <div className='col-md-2'>
                <button type='submit' className='btn btn-success w-100' disabled={isPending}>{isPending ? 'Generando…' : 'Generar'}</button>
              </div>
            </div>
          </form>
        )}

        {invitationLink && (
          <div className='alert alert-success d-flex align-items-center justify-content-between'>
            <div className='me-2 flex-grow-1 overflow-auto'>{invitationLink}</div>
            <button className='btn btn-outline-secondary btn-sm' onClick={() => { navigator.clipboard.writeText(invitationLink); alert('Copiado') }}>
              <Copy size={14}/>
            </button>
          </div>
        )}

        {loading ? <p>Cargando…</p> : (
          <div className='table-responsive'>
            <table className='table table-striped align-middle'>
              <thead><tr><th>Email</th><th>Rol</th><th style={{width:'80px'}}>Acciones</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td>
                      <select className='form-select form-select-sm' value={u.role ?? ''} onChange={e => handleRole(u.id, e.target.value as UserRole)} disabled={isPending || u.email === 'spezialichristian@gmail.com'}>
                        <option value='admin'>Admin</option>
                        <option value='viewer'>Viewer</option>
                      </select>
                    </td>
                    <td>
                      <button className='btn btn-danger btn-sm' onClick={() => handleDelete(u.id, u.email)} disabled={isPending || u.email === 'spezialichristian@gmail.com'}>
                        <Trash2 size={14}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
