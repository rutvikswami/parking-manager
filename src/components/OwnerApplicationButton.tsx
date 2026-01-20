import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, Crown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

interface OwnerApplication {
  id: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  reviewed_at?: string
  admin_notes?: string
}

export function OwnerApplicationButton() {
  const { user } = useAuth()
  const [application, setApplication] = useState<OwnerApplication | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    contact_person: '',
    phone: '',
    email: '',
    justification: ''
  })
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    if (user) {
      checkExistingApplication()
    }
  }, [user])

  const checkExistingApplication = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('owner_applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        if (error.code === 'PGRST205') {
          setApplication(null)
          return
        }
        throw error
      }
      setApplication(data)
    } catch (error) {
      setApplication(null)
    }
  }

  const submitApplication = async () => {
    if (!user) return
    if (!form.contact_person || !form.phone || !form.email || !form.justification) {
      toast.error('Please fill all fields')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('owner_applications')
        .insert({
          user_id: user.id,
          contact_person: form.contact_person,
          phone: form.phone,
          email: form.email,
          justification: form.justification,
        })

      if (error) {
        if (error.code === 'PGRST205') {
          toast.error('Owner application system not set up yet. Contact the administrator.')
          setShowForm(false)
          return
        }
        throw error
      }

      toast.success('Application submitted successfully!')
      setForm({ contact_person: '', phone: '', email: '', justification: '' })
      setShowForm(false)
      await checkExistingApplication()
    } catch (error) {
      toast.error('Failed to submit application. Contact administrator.')
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  if (application) {
    const getStatusText = () => {
      switch (application.status) {
        case 'pending':
          return 'Owner application pending review'
        case 'approved':
          return 'Application approved! You are now a location owner.'
        case 'rejected':
          return 'Application was rejected'
      }
    }

    const getStatusColor = () => {
      switch (application.status) {
        case 'pending':
          return 'border-yellow-200 bg-yellow-50'
        case 'approved':
          return 'border-green-200 bg-green-50'
        case 'rejected':
          return 'border-red-200 bg-red-50'
      }
    }

    return (
      <Card className={`${getStatusColor()}`}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="flex-1">
              <p className="text-sm font-medium">{getStatusText()}</p>
              <p className="text-xs text-gray-500">
                Applied {new Date(application.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (showForm) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Crown className="h-5 w-5 text-blue-500" />
            <span>Apply to Become a Location Owner</span>
          </CardTitle>
          <CardDescription>
            Provide details to justify your ownership request. A super admin will review your application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contact_person">Contact Person</Label>
              <Input id="contact_person" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="justification">Justification</Label>
            <Textarea id="justification" rows={4} value={form.justification} onChange={(e) => setForm({ ...form, justification: e.target.value })} placeholder="Explain why you should be granted location owner access" />
          </div>
          <div className="flex space-x-2">
            <Button onClick={submitApplication} disabled={loading}>{loading ? 'Submitting...' : 'Submit Application'}</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm font-medium text-blue-900">Want to manage locations?</p>
              <p className="text-xs text-blue-700">Apply to become a Location Owner</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowForm(true)}>Become Owner</Button>
        </div>
      </CardContent>
    </Card>
  )
}
