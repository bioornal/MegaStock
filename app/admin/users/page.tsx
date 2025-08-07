'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import UserManagement from '@/components/UserManagement'
import { Users, Shield } from 'lucide-react'

export default function AdminUsersPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <div className="container mt-4">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <h2 className="mb-1 d-flex align-items-center">
                  <Shield className="me-2 text-primary" />
                  Panel de Administración
                </h2>
                <p className="text-muted mb-0">
                  Gestión de usuarios y asignación de roles del sistema
                </p>
              </div>
              <div className="badge bg-primary fs-6">
                <Users className="me-1" size={16} />
                Solo Administradores
              </div>
            </div>
          </div>
        </div>

        {/* Componente de gestión de usuarios */}
        <div className="row">
          <div className="col-12">
            <UserManagement />
          </div>
        </div>

        {/* Información adicional */}
        <div className="row mt-4">
          <div className="col-12">
            <div className="card bg-light">
              <div className="card-body">
                <h6 className="card-title">Instrucciones de Uso</h6>
                <ul className="mb-0">
                  <li>Los nuevos usuarios se registran automáticamente como <strong>Viewer</strong></li>
                  <li>Solo los <strong>Administradores</strong> pueden cambiar roles de usuarios</li>
                  <li>Los cambios se aplican inmediatamente en el sistema</li>
                  <li>Los usuarios deben refrescar la página para ver los cambios</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
