import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/hooks/useAuth'
import { Layout } from '@/components/layout/Layout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { OwnerRoute } from '@/components/OwnerRoute'
import { SuperAdminRoute } from '@/components/SuperAdminRoute'
import { Home } from '@/pages/Home'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'
import { Dashboard } from '@/pages/Dashboard'
import { MapView } from '@/pages/MapView'
import { Profile } from '@/pages/Profile'
import { RoleRedirect } from '@/pages/RoleRedirect'
import { OwnerDashboard } from '@/pages/OwnerDashboard'
import { SuperAdminDashboard } from '@/pages/SuperAdminDashboard'

function App() {
  return (
    <div className="min-h-screen bg-gray-50">

      <AuthProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/map"
                element={
                  <ProtectedRoute>
                    <MapView />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <RoleRedirect />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/owner"
                element={
                  <OwnerRoute>
                    <OwnerDashboard />
                  </OwnerRoute>
                }
              />
              <Route
                path="/super-admin"
                element={
                  <SuperAdminRoute>
                    <SuperAdminDashboard />
                  </SuperAdminRoute>
                }
              />
            </Routes>
          </Layout>
        </Router>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </AuthProvider>
    </div>
  )
}

export default App