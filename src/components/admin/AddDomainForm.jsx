'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const ROLE_OPTIONS = [
  { value: 'student', label: 'Student' },
  { value: 'teacher', label: 'Teacher' },
]

export function AddDomainForm({ onSubmit }) {
  const [domain, setDomain] = useState('')
  const [role, setRole] = useState('teacher')
  const [requiresVerification, setRequiresVerification] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await onSubmit({ domain, role, requiresVerification })
      setDomain('')
      setRole('teacher')
      setRequiresVerification(false)
    } catch (err) {
      setError(err.message || 'Failed to add domain')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="domain">Domain</Label>
        <Input
          id="domain"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="hcmus.edu.vn"
          required
        />
      </div>
      <div>
        <Label htmlFor="role">Role</Label>
        <select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="mt-1 block w-full border rounded-md px-2 py-1 text-sm"
        >
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center space-x-2">
        <input
          id="requiresVerification"
          type="checkbox"
          checked={requiresVerification}
          onChange={(e) => setRequiresVerification(e.target.checked)}
          className="h-4 w-4"
        />
        <Label htmlFor="requiresVerification">
          Require email verification for this domain
        </Label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={loading}>
        {loading ? 'Adding...' : 'Add Domain'}
      </Button>
    </form>
  )
}


