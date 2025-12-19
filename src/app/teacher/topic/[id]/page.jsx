'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function TopicDetailPage() {
  const { id } = useParams()
  const { data: session, status } = useSession()
  const router = useRouter()

  const [topic, setTopic] = useState(null)
  const [classes, setClasses] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    projectName: '',
    groupNumber: '',
  })

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

  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '', description: '', submissionDeadline: '', presentationDate: '',
    submissionConfig: { includeSourceCode: false, includeThumbnail: false, includeMaterials: false, includeGroupName: false }
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resTopic, resClasses] = await Promise.all([
          fetch(`/api/teacher/topics/${id}`),
          fetch('/api/teacher/classes')
        ]);

        const dataTopic = await resTopic.json();

        if (resClasses.ok) {
          setClasses(await resClasses.json());
        }

        if (resTopic.ok) {
          setTopic(dataTopic.topic)
          setProjects(dataTopic.projects)
          // Populate edit form
          setEditForm({
            title: dataTopic.topic.title,
            description: dataTopic.topic.description,
            submissionDeadline: dataTopic.topic.submissionDeadline ? new Date(dataTopic.topic.submissionDeadline).toISOString().slice(0, 16) : '',
            presentationDate: dataTopic.topic.presentationDate ? new Date(dataTopic.topic.presentationDate).toISOString().slice(0, 16) : '',
            submissionConfig: dataTopic.topic.submissionConfig || { includeSourceCode: false, includeThumbnail: false, includeMaterials: false, includeGroupName: false },
            classId: dataTopic.topic.classId || ''
          });
        } else {
          setError(dataTopic.error || 'Failed to load topic')
        }
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchData()
  }, [id])

  const handleUpdateTopic = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/teacher/topics/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (res.ok) {
        setTopic(data);
        setShowEdit(false);
        alert('Topic updated successfully');
      } else {
        alert('Error updating: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = {
        projectName: form.projectName,
        groupNumber: form.groupNumber ? Number(form.groupNumber) : undefined,
      }
      const res = await fetch(`/api/teacher/topics/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add project')
      }
      setProjects((prev) => [...prev, data])
      setForm({ projectName: '', groupNumber: '' })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-6">Loading topic...</div>
  }

  if (!topic) {
    return <div className="p-6 text-red-600">{error || 'Topic not found'}</div>
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{topic.title}</h1>
          <p className="text-sm text-gray-600 mt-1">{topic.description}</p>
          <div className="text-xs text-gray-500 flex gap-4 mt-2">
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
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/teacher/topics')}>
            Back
          </Button>
          <Button onClick={() => setShowEdit(!showEdit)}>
            {showEdit ? 'Cancel Edit' : 'Edit Topic'}
          </Button>
        </div>
      </div>

      {showEdit && (
        <section className="bg-white rounded-lg shadow p-4 space-y-4 border-l-4 border-blue-500">
          <h2 className="text-lg font-semibold">Edit Topic Settings</h2>
          <form onSubmit={handleUpdateTopic} className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={editForm.title}
                onChange={e => setEditForm({ ...editForm, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={editForm.description}
                onChange={e => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>
            <div>
              <Label>Linked Class</Label>
              <select
                value={editForm.classId}
                onChange={e => setEditForm({ ...editForm, classId: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">-- No Class Restriction --</option>
                {classes.map(cls => (
                  <option key={cls._id} value={cls._id}>{cls.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Submission Deadline</Label>
                <Input
                  type="datetime-local"
                  value={editForm.submissionDeadline}
                  onChange={e => setEditForm({ ...editForm, submissionDeadline: e.target.value })}
                />
              </div>
              <div>
                <Label>Presentation Date</Label>
                <Input
                  type="datetime-local"
                  value={editForm.presentationDate}
                  onChange={e => setEditForm({ ...editForm, presentationDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2 border p-4 rounded-lg bg-gray-50">
              <Label className="font-semibold">Submission Requirements</Label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.submissionConfig.includeSourceCode}
                    onChange={(e) => setEditForm(p => ({
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
                    checked={editForm.submissionConfig.includeThumbnail}
                    onChange={(e) => setEditForm(p => ({
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
                    checked={editForm.submissionConfig.includeMaterials}
                    onChange={(e) => setEditForm(p => ({
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
                    checked={editForm.submissionConfig.includeGroupName}
                    onChange={(e) => setEditForm(p => ({
                      ...p,
                      submissionConfig: { ...p.submissionConfig, includeGroupName: e.target.checked }
                    }))}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-semibold text-blue-600">Require Group Name</span>
                </label>
              </div>

              {/* Dynamic Resource Requirements */}
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center mb-2">
                  <Label className="font-semibold">Additional Resources (Dynamic)</Label>
                  <Button type="button" size="sm" variant="outline" onClick={() => setEditForm(p => ({
                    ...p,
                    resourceRequirements: [...(p.resourceRequirements || []), { label: '', type: 'url' }]
                  }))}>
                    + Add Resource
                  </Button>
                </div>
                <div className="space-y-3">
                  {editForm.resourceRequirements && editForm.resourceRequirements.map((req, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input
                        placeholder="Resource Label (e.g. Poster, Report)"
                        value={req.label}
                        onChange={(e) => {
                          const newReqs = [...editForm.resourceRequirements];
                          newReqs[idx].label = e.target.value;
                          setEditForm(p => ({ ...p, resourceRequirements: newReqs }));
                        }}
                        className="flex-1"
                      />
                      <select
                        value={req.type}
                        onChange={(e) => {
                          const newReqs = [...editForm.resourceRequirements];
                          newReqs[idx].type = e.target.value;
                          setEditForm(p => ({ ...p, resourceRequirements: newReqs }));
                        }}
                        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="url">Link / URL</option>
                        <option value="pdf">PDF Document</option>
                        <option value="image">Image / Poster</option>
                        <option value="video">Video</option>
                      </select>
                      <Button type="button" variant="destructive" size="icon" onClick={() => {
                        const newReqs = editForm.resourceRequirements.filter((_, i) => i !== idx);
                        setEditForm(p => ({ ...p, resourceRequirements: newReqs }));
                      }}>
                        &times;
                      </Button>
                    </div>
                  ))}
                  {editForm.resourceRequirements?.length === 0 && (
                    <p className="text-sm text-gray-500 italic">No additional resources required.</p>
                  )}
                </div>
              </div>
            </div>

            <Button type="submit" disabled={saving}>Save Changes</Button>
          </form>
        </section>
      )
      }

      <section className="bg-white rounded-lg shadow p-4 space-y-4">
        <h2 className="text-lg font-semibold">Share for Students</h2>
        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={`${window.location.origin}/student/submit-project/${id}`}
          />
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/student/submit-project/${id}`)
              alert('Link copied!')
            }}
          >
            Copy Link
          </Button>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow p-4 space-y-4">
        <h2 className="text-lg font-semibold">Import Projects (CSV)</h2>
        <div className="text-sm text-gray-500 mb-2">
          Format: Group Number (optional), Project Name, Member Emails (semicolon separated)
          <br />Example: <code>1, Super Project, alice@test.com;bob@test.com</code>
        </div>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <Label htmlFor="csvFile">Select CSV File</Label>
            <Input
              id="csvFile"
              type="file"
              accept=".csv"
              onChange={(e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = async (evt) => {
                  const text = evt.target.result;
                  const lines = text.split('\n').filter(l => l.trim());
                  const projectsToImport = lines.map(line => {
                    // Simple CSV Parse: GroupNo,Name,Members
                    // Note: This is a basic split, assumes no commas in values
                    const parts = line.split(',');
                    const groupNumber = parseInt(parts[0]?.trim()) || undefined;
                    const projectName = parts[1]?.trim();
                    const membersRaw = parts[2]?.trim();

                    const members = membersRaw
                      ? membersRaw.split(';').map(email => ({ email: email.trim() }))
                      : [];

                    return { groupNumber, projectName, members };
                  }).filter(p => p.projectName); // Filter valid lines

                  if (confirm(`Ready to import ${projectsToImport.length} projects?`)) {
                    setSaving(true);
                    try {
                      const res = await fetch(`/api/teacher/topics/${id}/import`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ projects: projectsToImport }),
                      });
                      const data = await res.json();
                      if (res.ok) {
                        alert(`Imported ${data.importedCount} projects.`);
                        // Refresh projects
                        setProjects(prev => [...prev, ...data.projects]);
                      } else {
                        alert('Error importing: ' + data.error);
                      }
                    } catch (err) {
                      console.error(err);
                      alert('Failed to import.');
                    } finally {
                      setSaving(false);
                      // Clear input
                      e.target.value = null;
                    }
                  }
                };
                reader.readAsText(file);
              }}
            />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow p-4 space-y-4">
        <h2 className="text-lg font-semibold">Add Project (Manual)</h2>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label htmlFor="projectName">Project Name</Label>
            <Input
              id="projectName"
              name="projectName"
              value={form.projectName}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <Label htmlFor="groupNumber">Group Number (optional)</Label>
            <Input
              id="groupNumber"
              name="groupNumber"
              type="number"
              value={form.groupNumber}
              onChange={handleChange}
              min={1}
            />
          </div>

          {error && (
            <p className="md:col-span-2 text-sm text-red-600">{error}</p>
          )}

          <div className="md:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Adding...' : 'Add Project'}
            </Button>
          </div>
        </form>
      </section>

      <section className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-3">Projects in this Topic</h2>
        {!projects.length ? (
          <p className="text-sm text-gray-500">No projects yet.</p>
        ) : (
          <div className="overflow-x-auto border rounded-md">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Project</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Group</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Submitted At</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Links</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Materials</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {projects.map((p) => (
                  <tr key={p._id}>
                    <td className="px-3 py-2 font-medium">
                      <div className="flex items-center gap-2">
                        {p.thumbnailUrl && <img src={p.thumbnailUrl} alt="Thumb" className="w-8 h-8 rounded object-cover" />}
                        {p.projectName}
                      </div>
                    </td>
                    <td className="px-3 py-2">{p.groupNumber ?? '-'}</td>
                    <td className="px-3 py-2">
                      {p.submittedAt
                        ? new Date(p.submittedAt).toLocaleString()
                        : '-'}
                    </td>
                    <td className="px-3 py-2 space-x-2 text-xs">
                      {p.videoLink && <a href={p.videoLink} target="_blank" className="text-blue-600 underline">Video</a>}
                      {p.presentationLink && <a href={p.presentationLink} target="_blank" className="text-blue-600 underline">Slides</a>}
                      {p.sourceCodeLink && <a href={p.sourceCodeLink} target="_blank" className="text-blue-600 underline">Code</a>}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {p.additionalMaterials?.map((m, i) => (
                        <div key={i}>
                          <a href={m.url} target="_blank" className="text-blue-600 underline">{m.label || 'Material'}</a>
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div >
  )
}


