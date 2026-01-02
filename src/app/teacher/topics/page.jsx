'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function TeacherTopicsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [topics, setTopics] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    title: '',
    description: '',
    submissionDeadline: '',
    presentationDate: '',
    submissionConfig: {
      includeSourceCode: false,
      includeThumbnail: false,
      includeMaterials: false,
      includeGroupName: false,
    },
    classId: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login')
      return
    }
    if (status === 'authenticated' && session?.user.role !== 'teacher') {
      router.replace('/')
      return
    }
  }, [status, session, router])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resTopics, resClasses] = await Promise.all([
          fetch('/api/teacher/topics'),
          fetch('/api/teacher/classes')
        ]);

        if (resTopics.ok) {
          const data = await resTopics.json();
          setTopics(data);
        }
        if (resClasses.ok) {
          const data = await resClasses.json();
          setClasses(data);
        }
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const res = await fetch('/api/teacher/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create topic')
      }
      setTopics((prev) => [data, ...prev])
      setForm({
        title: '',
        description: '',
        submissionDeadline: '',
        presentationDate: '',
      })
    } catch (err) {
      console.error('Error in topic creation:', err);
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold mb-4">My Topics</h1>

      <section className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Create New Topic</h2>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              value={form.title}
              onChange={handleChange}
              required
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="classId">Link Class (Optional)</Label>
            <select
              id="classId"
              name="classId"
              value={form.classId}
              onChange={handleChange}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">-- No Class Restriction --</option>
              {classes.map(cls => (
                <option key={cls._id} value={cls._id}>{cls.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Linking a class restricts submissions and search to students in that class.</p>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <Label htmlFor="submissionDeadline">Submission Deadline</Label>
            <Input
              id="submissionDeadline"
              name="submissionDeadline"
              type="datetime-local"
              value={form.submissionDeadline}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <Label htmlFor="presentationDate">Presentation Date</Label>
            <Input
              id="presentationDate"
              name="presentationDate"
              type="datetime-local"
              value={form.presentationDate}
              onChange={handleChange}
              required
            />
          </div>

          {error && (
            <p className="md:col-span-2 text-sm text-red-600">{error}</p>
          )}

          <div className="md:col-span-2 space-y-2 border p-4 rounded-lg bg-gray-50">
            <Label className="font-semibold">Submission Requirements</Label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.submissionConfig.includeSourceCode}
                  onChange={(e) => setForm(p => ({
                    ...p,
                    submissionConfig: { ...p.submissionConfig, includeSourceCode: e.target.checked }
                  }))}
                  className="w-4 h-4"
                />
                <span className="text-sm">Source Code Link</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.submissionConfig.includeThumbnail}
                  onChange={(e) => setForm(p => ({
                    ...p,
                    submissionConfig: { ...p.submissionConfig, includeThumbnail: e.target.checked }
                  }))}
                  className="w-4 h-4"
                />
                <span className="text-sm">Thumbnail URL</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.submissionConfig.includeMaterials}
                  onChange={(e) => setForm(p => ({
                    ...p,
                    submissionConfig: { ...p.submissionConfig, includeMaterials: e.target.checked }
                  }))}
                  className="w-4 h-4"
                />
                <span className="text-sm">Other Materials</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.submissionConfig.includeGroupName}
                  onChange={(e) => setForm(p => ({
                    ...p,
                    submissionConfig: { ...p.submissionConfig, includeGroupName: e.target.checked }
                  }))}
                  className="w-4 h-4"
                />
                <span className="text-sm">Group Name (Optional)</span>
              </label>
            </div>
          </div>

          <div className="md:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Creating...' : 'Create Topic'}
            </Button>
          </div>
        </form>
      </section>

      <section className="glass-card p-6">
        <h2 className="text-lg font-semibold mb-3">Existing Topics</h2>
        {loading ? (
          <p>Loading topics...</p>
        ) : !topics.length ? (
          <p className="text-sm text-gray-500">No topics yet.</p>
        ) : (
          <ul className="space-y-3">
            {topics.map((topic) => (
              <li
                key={topic._id}
                className="border rounded-md p-3 flex flex-col gap-1 hover:bg-gray-50"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">{topic.title}</div>
                    <div className="text-sm text-gray-600">
                      {topic.description}
                    </div>
                  </div>
                  <Link href={`/teacher/topic/${topic._id}`}>
                    <Button size="sm" variant="outline">
                      Manage
                    </Button>
                  </Link>
                </div>
                <div className="text-xs text-gray-500 flex gap-4 mt-1">
                  <span>
                    Submission:{' '}
                    {topic.submissionDeadline
                      ? new Date(topic.submissionDeadline).toLocaleString()
                      : '-'}
                  </span>
                  <span>
                    Presentation:{' '}
                    {topic.presentationDate
                      ? new Date(topic.presentationDate).toLocaleString()
                      : '-'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}


