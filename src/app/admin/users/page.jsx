'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

const ROLE_OPTIONS = ['student', 'teacher', 'admin']

export default function AdminUsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login')
      return
    }
    if (status === 'authenticated' && session?.user.role !== 'admin') {
      router.replace('/')
      return
    }
  }, [status, session, router])

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/admin/users')
        const data = await res.json()
        if (res.ok) setUsers(data)
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [])

  const updateUser = async (id, updates) => {
    setSavingId(id)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      })
      const data = await res.json()
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u._id === id ? { ...u, ...data } : u)))
      } else {
        console.error('Failed to update user', data)
      }
    } finally {
      setSavingId(null)
    }
  }

  if (loading) {
    return <div className="p-6">Loading users...</div>
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      <div className="overflow-x-auto border rounded-md bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Name</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Email</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Role</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Active</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr key={user._id}>
                <td className="px-3 py-2">{user.name || '-'}</td>
                <td className="px-3 py-2">{user.email}</td>
                <td className="px-3 py-2">
                  <select
                    value={user.role}
                    onChange={(e) =>
                      updateUser(user._id, { role: e.target.value })
                    }
                    className="border rounded px-2 py-1 text-sm"
                    disabled={savingId === user._id}
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  {user.active ? (
                    <span className="text-green-600 text-xs font-semibold">
                      Active
                    </span>
                  ) : (
                    <span className="text-red-600 text-xs font-semibold">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={savingId === user._id}
                    onClick={() =>
                      updateUser(user._id, { active: !user.active })
                    }
                  >
                    {user.active ? 'Deactivate' : 'Activate'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}


