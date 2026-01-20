import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { UserCheck, UserX, Clock, CheckCircle, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import type { Database } from '@/lib/supabase'

type OwnerApplication = Database['public']['Tables']['owner_applications']['Row']

interface OwnerApplicationWithProfile extends OwnerApplication {
  profiles?: {
    full_name: string | null
    email: string | null
  }
}

export function AdminRequestsPanel() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<OwnerApplicationWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean;
    request: OwnerApplicationWithProfile | null;
    action: 'approve' | 'reject';
  }>({
    open: false,
    request: null,
    action: 'approve',
  })
  const [reviewMessage, setReviewMessage] = useState('')

  const fetchRequests = async () => {
    if (!user) return

    try {
      // Check if user is super admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_role')
        .eq('id', user.id)
        .single()

      if (profile?.user_role !== 'super_admin') {
        toast.error('Access denied: Super admin privileges required')
        return
      }

      // Fetch only pending requests
      const { data: apps, error: appsError } = await supabase
        .from('owner_applications')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (appsError) throw appsError

      const userIds = (apps || []).map(a => a.user_id)
      let profilesMap: Record<string, { full_name: string | null; email: string | null }> = {}
      if (userIds.length > 0) {
        const { data: profs, error: profsError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds)
        if (profsError) throw profsError
        profilesMap = (profs || []).reduce((acc: any, p: any) => {
          acc[p.id] = { full_name: p.full_name ?? null, email: p.email ?? null }
          return acc
        }, {})
      }

      const combined = (apps || []).map(a => ({
        ...a,
        profiles: profilesMap[a.user_id] ?? { full_name: null, email: null }
      }))

      setRequests(combined)
    } catch (error) {
      // Error fetching requests
      toast.error('Failed to load owner applications')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [user])

  const handleReviewRequest = async () => {
    if (!reviewDialog.request || !user) return

    try {
      const approve = reviewDialog.action === 'approve'
      
      // Call the stored procedure
      const { error } = await supabase.rpc('process_owner_application', {
        p_application_id: reviewDialog.request.id,
        p_approve: approve,
        p_admin_notes: reviewMessage || null
      })

      if (error) throw error

      toast.success(`Request ${approve ? 'approved' : 'rejected'} successfully!`)
      
      // Close dialog and refresh
      setReviewDialog({ open: false, request: null, action: 'approve' })
      setReviewMessage('')
      await fetchRequests()
    } catch (error) {
      // Error reviewing request
      toast.error(`Failed to ${reviewDialog.action} request: ${error.message}`)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      case 'approved':
        return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>
      case 'rejected':
        return <Badge variant="outline" className="text-red-600 border-red-600"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Admin Requests</h2>
          <p className="text-gray-600">Review and manage location owner applications</p>
        </div>
        <Button onClick={fetchRequests} variant="outline">
          Refresh
        </Button>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No Owner Applications</h3>
            <p className="text-gray-500">No pending or processed owner applications found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request, index) => (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {request.profiles?.full_name || 'Unknown User'}
                      </CardTitle>
                      <p className="text-sm text-gray-600">{request.profiles?.email}</p>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Requested:</span> {new Date(request.created_at).toLocaleDateString()}
                      </div>
                      {request.reviewed_at && (
                        <div>
                          <span className="font-medium">Reviewed:</span> {new Date(request.reviewed_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    
                    {request.justification && (
                      <div>
                        <span className="font-medium text-sm">Justification:</span>
                        <p className="text-gray-700 mt-1 p-3 bg-gray-50 rounded">{request.justification}</p>
                      </div>
                    )}

                   {request.status === 'pending' && (
                      <div className="flex space-x-2 pt-3 border-t">
                        <Button
                          onClick={() => setReviewDialog({
                            open: true,
                            request,
                            action: 'approve'
                          })}
                          className="flex-1"
                          variant="default"
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => setReviewDialog({
                            open: true,
                            request,
                            action: 'reject'
                          })}
                          className="flex-1"
                          variant="destructive"
                        >
                          <UserX className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Review Dialog */}
      <AlertDialog open={reviewDialog.open} onOpenChange={(open) => 
        setReviewDialog(prev => ({ ...prev, open }))
      }>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {reviewDialog.action === 'approve' ? 'Approve' : 'Reject'} Owner Application
            </AlertDialogTitle>
            <AlertDialogDescription>
              {reviewDialog.action === 'approve' 
                ? `Grant location owner access to ${reviewDialog.request?.profiles?.full_name || 'this user'}?`
                : `Reject owner application from ${reviewDialog.request?.profiles?.full_name || 'this user'}?`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="reviewMessage">Message (optional)</Label>
              <Textarea
                id="reviewMessage"
                value={reviewMessage}
                onChange={(e) => setReviewMessage(e.target.value)}
                placeholder={`Add a message for the ${reviewDialog.action} decision...`}
                rows={3}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setReviewMessage('')}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReviewRequest}
              className={reviewDialog.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {reviewDialog.action === 'approve' ? 'Approve Request' : 'Reject Request'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}