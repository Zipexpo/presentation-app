'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import FeedbackModal from '@/components/ui/FeedbackModal'
import { ExternalLink, Video, FileText, ImageIcon, Calendar, Clock, Edit3, ArrowLeft, LayoutGrid, List, Search, Filter, Plus, X, AlertTriangle } from 'lucide-react'

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

  // UI Feedback State
  const [feedback, setFeedback] = useState({ isOpen: false, type: 'info', title: '', message: '' });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null });

  const [form, setForm] = useState({
    projectName: '',
    groupNumber: '',
  })

  // View & Filter State
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'table'
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest') // 'newest' | 'oldest' | 'name' | 'group'

  // Edit State
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '', description: '', submissionDeadline: '', presentationDate: '',
    submissionConfig: { includeSourceCode: false, includeThumbnail: false, includeMaterials: false, includeGroupName: false },
    presentationConfig: { durationPerProject: 10, questionDuration: 5, breakDuration: 2, gradingRubric: [], completionMessage: '', defaultResource: 'presentation', gradingType: 'rubric', surveyQuestions: [] },
    classId: ''
  });

  const [selectedProject, setSelectedProject] = useState(null);
  const [showAddProject, setShowAddProject] = useState(false);

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
            presentationConfig: dataTopic.topic.presentationConfig || { durationPerProject: 10, questionDuration: 5, breakDuration: 2, gradingRubric: [], completionMessage: '', defaultResource: 'presentation', gradingType: 'rubric', surveyQuestions: [], maxCommentsPerProject: 0 },
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

  // Filter & Sort Logic
  const filteredProjects = useMemo(() => {
    let result = [...projects];

    // Search
    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.projectName?.toLowerCase().includes(lowerQ) ||
        p.groupNumber?.toString().includes(lowerQ) ||
        p.members?.some(m => m.name.toLowerCase().includes(lowerQ) || m.email.toLowerCase().includes(lowerQ))
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0);
      if (sortBy === 'oldest') return new Date(a.submittedAt || 0) - new Date(b.submittedAt || 0);
      if (sortBy === 'name') return (a.projectName || '').localeCompare(b.projectName || '');
      if (sortBy === 'group') return (a.groupNumber || 999) - (b.groupNumber || 999);
      return 0;
    });

    return result;
  }, [projects, searchQuery, sortBy]);

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
        setFeedback({ isOpen: true, type: 'success', title: 'Success', message: 'Topic settings updated successfully.' });
      } else {
        setFeedback({ isOpen: true, type: 'error', title: 'Update Failed', message: data.error || 'Could not update topic.' });
      }
    } catch (err) {
      console.error(err);
      setFeedback({ isOpen: true, type: 'error', title: 'Error', message: 'An unexpected error occurred.' });
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
      setShowAddProject(false); // Close modal
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // Countdown Logic
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getCountdown = (targetDate) => {
    if (!targetDate) return null;
    const end = new Date(targetDate);
    const diff = end - now;
    if (diff <= 0) return null;

    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / 1000 / 60) % 60);
    const s = Math.floor((diff / 1000) % 60);

    if (d > 0) {
      return <span className="text-6xl font-bold text-slate-400">{d}D</span>;
    }
    if (h > 0) {
      return <span className="text-5xl font-bold text-lime-500">{h}h</span>;
    }
    return <span className="text-5xl font-bold text-red-500">{m}m {s}s</span>;
  };

  if (loading) return <div className="p-10 text-center text-slate-500 animate-pulse">Loading topic details...</div>
  if (!topic) return <div className="p-10 text-center text-red-500 font-bold">{error || 'Topic not found'}</div>

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <button onClick={() => router.push('/teacher/topics')} className="text-sm font-medium text-slate-500 hover:text-blue-600 flex items-center gap-1 mb-2 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Topics
          </button>
          <h1 className="text-3xl font-bold text-slate-900">{topic.title}</h1>
          <p className="text-slate-600 mt-1 max-w-2xl">{topic.description}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowEdit(!showEdit)} className="bg-white/50 text-slate-700 hover:bg-white border-none shadow-sm backdrop-blur-sm">
            <Edit3 className="w-4 h-4 mr-2" />
            {showEdit ? 'Cancel Edit' : 'Edit Topic'}
          </Button>
          <Button onClick={() => router.push(`/presentation/${id}`)} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200">
            <Video className="w-4 h-4 mr-2" /> Start Presentation
          </Button>
        </div>
      </div>

      {/* Edit Form (Collapsible) */}
      {
        showEdit && (
          <section className="glass-card p-4 md:p-6 border-l-4 border-blue-500 animate-in slide-in-from-top-4 fade-in duration-300">
            <h2 className="text-lg font-semibold mb-4">Edit Topic Settings</h2>
            <form onSubmit={handleUpdateTopic} className="space-y-4">
              {/* Submission Deadline */}
              <div>
                <Label>Title</Label>
                <Input value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} className="bg-white/50 border-slate-200" />
              </div>
              <div>
                <Label>Description</Label>
                <Input value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} className="bg-white/50 border-slate-200" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Submission Deadline</Label>
                  <Input type="datetime-local" value={editForm.submissionDeadline} onChange={e => setEditForm({ ...editForm, submissionDeadline: e.target.value })} className="bg-white/50" />
                </div>
                <div>
                  <Label>Presentation Date</Label>
                  <Input type="datetime-local" value={editForm.presentationDate} onChange={e => setEditForm({ ...editForm, presentationDate: e.target.value })} className="bg-white/50" />
                </div>
              </div>
              <div className="pt-4 border-t border-slate-200">
                <h3 className="font-semibold text-slate-800 mb-2">Access & Permissions</h3>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2 rounded-lg border border-slate-200 hover:bg-slate-100 transition">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      checked={editForm.presentationConfig?.allowComments ?? true}
                      onChange={(e) => setEditForm(p => ({ ...p, presentationConfig: { ...p.presentationConfig, allowComments: e.target.checked } }))}
                    />
                    <div>
                      <span className="block text-sm font-bold text-slate-700">Allow Comments</span>
                      <span className="block text-xs text-slate-500">Students can leave text feedback</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2 rounded-lg border border-slate-200 hover:bg-slate-100 transition">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      checked={editForm.presentationConfig?.allowGuest ?? false}
                      onChange={(e) => setEditForm(p => ({ ...p, presentationConfig: { ...p.presentationConfig, allowGuest: e.target.checked } }))}
                    />
                    <div>
                      <span className="block text-sm font-bold text-slate-700">Guest Grading</span>
                      <span className="block text-xs text-slate-500">Allow grading without login</span>
                    </div>
                  </label>
                </div>

                <div className="mt-4">
                  <Label>Max Comments per Project (0 = Unlimited)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={editForm.presentationConfig?.maxCommentsPerProject ?? 0}
                    onChange={(e) => setEditForm(p => ({ ...p, presentationConfig: { ...p.presentationConfig, maxCommentsPerProject: Number(e.target.value) } }))}
                    className="bg-white/50 border-slate-200 mt-1"
                  />
                  <p className="text-xs text-slate-500 mt-1">Limit how many times a single student/guest can comment on one project.</p>
                </div>
              </div>

              <div>
                <Label>Linked Class</Label>
                <select value={editForm.classId} onChange={e => setEditForm({ ...editForm, classId: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-white/50 px-3 py-2 text-sm">
                  <option value="">-- No Class Restriction --</option>
                  {classes.map(cls => (<option key={cls._id} value={cls._id}>{cls.name}</option>))}
                </select>
              </div>
              {/* Toggles */}
              <div className="space-y-2 border border-slate-200/60 p-4 rounded-lg bg-white/30">
                <Label className="font-semibold">Submission Requirements</Label>
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editForm.submissionConfig.includeSourceCode} onChange={(e) => setEditForm(p => ({ ...p, submissionConfig: { ...p.submissionConfig, includeSourceCode: e.target.checked } }))} className="w-4 h-4" />
                    <span className="text-sm">Source Code</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editForm.submissionConfig.includeThumbnail} onChange={(e) => setEditForm(p => ({ ...p, submissionConfig: { ...p.submissionConfig, includeThumbnail: e.target.checked } }))} className="w-4 h-4" />
                    <span className="text-sm">Thumbnail</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editForm.submissionConfig.includeMaterials} onChange={(e) => setEditForm(p => ({ ...p, submissionConfig: { ...p.submissionConfig, includeMaterials: e.target.checked } }))} className="w-4 h-4" />
                    <span className="text-sm">Materials</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editForm.submissionConfig.includeGroupName} onChange={(e) => setEditForm(p => ({ ...p, submissionConfig: { ...p.submissionConfig, includeGroupName: e.target.checked } }))} className="w-4 h-4" />
                    <span className="text-sm font-semibold text-blue-600">Group Name</span>
                  </label>
                </div>
              </div>
              {/* Dynamic Resources */}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <Label className="font-semibold">Additional Resources</Label>
                  <Button type="button" size="sm" variant="outline" onClick={() => setEditForm(p => ({ ...p, resourceRequirements: [...(p.resourceRequirements || []), { label: '', type: 'url' }] }))}>+ Add</Button>
                </div>
                <div className="space-y-3">
                  {editForm.resourceRequirements && editForm.resourceRequirements.map((req, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input value={req.label} onChange={(e) => {
                        const newReqs = [...editForm.resourceRequirements]; newReqs[idx].label = e.target.value; setEditForm(p => ({ ...p, resourceRequirements: newReqs }));
                      }} className="flex-1 bg-white/50" placeholder="Label" />
                      <select value={req.type} onChange={(e) => {
                        const newReqs = [...editForm.resourceRequirements]; newReqs[idx].type = e.target.value; setEditForm(p => ({ ...p, resourceRequirements: newReqs }));
                      }} className="h-10 rounded-md border border-input bg-white/50 px-3 py-2 text-sm">
                        <option value="url">Link</option> <option value="pdf">PDF</option> <option value="image">Image</option> <option value="video">Video</option>
                      </select>
                      <Button type="button" variant="destructive" size="icon" onClick={() => {
                        const newReqs = editForm.resourceRequirements.filter((_, i) => i !== idx); setEditForm(p => ({ ...p, resourceRequirements: newReqs }));
                      }}>&times;</Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Presentation Settings */}
              <div className="pt-4 border-t border-slate-200">
                <h3 className="font-semibold text-slate-800 mb-2">Presentation Settings</h3>
                <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Presentation Duration (Min)</Label>
                    <Input type="number" min="0" value={editForm.presentationConfig?.durationPerProject || 10} onChange={(e) => setEditForm(p => ({ ...p, presentationConfig: { ...p.presentationConfig, durationPerProject: Number(e.target.value) } }))} className="bg-white/50" />
                  </div>
                  <div>
                    <Label>Q&A Duration (Min)</Label>
                    <Input type="number" min="0" value={editForm.presentationConfig?.questionDuration || 5} onChange={(e) => setEditForm(p => ({ ...p, presentationConfig: { ...p.presentationConfig, questionDuration: Number(e.target.value) } }))} className="bg-white/50" />
                  </div>
                  <div>
                    <Label>Break Duration (Min)</Label>
                    <Input type="number" min="0" value={editForm.presentationConfig?.breakDuration || 2} onChange={(e) => setEditForm(p => ({ ...p, presentationConfig: { ...p.presentationConfig, breakDuration: Number(e.target.value) } }))} className="bg-white/50" />
                  </div>
                </div>

                <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-2">
                  <Label className="font-medium text-slate-800">Scoring Method</Label>
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setEditForm(p => ({ ...p, presentationConfig: { ...p.presentationConfig, gradingType: 'rubric' } }))}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${editForm.presentationConfig?.gradingType !== 'survey' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Rubric
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditForm(p => {
                        const rubric = p.presentationConfig?.gradingRubric || [];
                        let survey = p.presentationConfig?.surveyQuestions || [];
                        // Auto-migrate if survey is empty but rubric has items
                        if (survey.length === 0 && rubric.length > 0) {
                          setConfirmModal({
                            isOpen: true,
                            message: `Import ${rubric.length} rubric criteria as Scale questions?`,
                            onConfirm: () => {
                              const newSurvey = rubric.map(r => ({
                                type: 'scale',
                                question: r.label,
                                scaleConfig: { min: 1, max: r.maxScore || 10, minLabel: 'Poor', maxLabel: 'Excellent' }
                              }));
                              setEditForm(prev => ({ ...prev, presentationConfig: { ...prev.presentationConfig, gradingType: 'survey', surveyQuestions: newSurvey } }));
                              setConfirmModal({ isOpen: false, message: '', onConfirm: null });
                            },
                            onCancel: () => setConfirmModal({ isOpen: false, message: '', onConfirm: null })
                          });
                          // Return current state, waiting for confirm. If they confirm, we update again.
                          return p;
                        }
                        return { ...p, presentationConfig: { ...p.presentationConfig, gradingType: 'survey', surveyQuestions: survey } };
                      })}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${editForm.presentationConfig?.gradingType === 'survey' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Survey
                    </button>
                  </div>
                </div>

                {editForm.presentationConfig?.gradingType === 'survey' ? (
                  /* SURVEY EDITOR */
                  <div className="space-y-6">
                    {editForm.presentationConfig?.surveyQuestions?.map((q, qIdx) => (
                      <div key={qIdx} className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 group">

                        {/* New Flex Header Layout */}
                        <div className="flex flex-col-reverse justify-between items-start mb-4 gap-4 sm:flex-row sm:items-start">
                          <div className="flex-1 w-full">
                            <Label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Question {qIdx + 1}</Label>
                            <Input
                              placeholder="e.g. Rate the design quality"
                              value={q.question}
                              className="bg-white font-medium shadow-sm w-full"
                              onChange={(e) => {
                                const newQs = [...editForm.presentationConfig.surveyQuestions];
                                newQs[qIdx].question = e.target.value;
                                setEditForm(p => ({ ...p, presentationConfig: { ...p.presentationConfig, surveyQuestions: newQs } }));
                              }}
                            />
                          </div>
                          <div className="flex gap-2 items-center self-end sm:self-auto sm:pt-6">
                            <select
                              value={q.type || 'choice'}
                              onChange={(e) => {
                                const newQs = [...editForm.presentationConfig.surveyQuestions];
                                newQs[qIdx].type = e.target.value;
                                const t = e.target.value;
                                if ((t === 'scale' || t === 'rating') && !newQs[qIdx].scaleConfig) {
                                  newQs[qIdx].scaleConfig = { min: 1, max: 5, minLabel: 'Poor', maxLabel: 'Excellent' };
                                }
                                setEditForm(p => ({ ...p, presentationConfig: { ...p.presentationConfig, surveyQuestions: newQs } }));
                              }}
                              className="h-10 text-xs rounded-md border border-slate-300 bg-white px-3 cursor-pointer focus:ring-2 focus:ring-blue-500/20 shadow-sm outline-none font-medium"
                            >
                              <option value="choice">Multiple Choice</option>
                              <option value="rating">Star Rating (5 Stars)</option>
                              <option value="scale">Numeric Scale</option>
                              <option value="text">Text Response</option>
                            </select>
                            <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100" onClick={() => {
                              const newQs = editForm.presentationConfig.surveyQuestions.filter((_, i) => i !== qIdx);
                              setEditForm(p => ({ ...p, presentationConfig: { ...p.presentationConfig, surveyQuestions: newQs } }));
                            }}><X className="w-5 h-5" /></Button>
                          </div>
                        </div>

                        {/* CONFIG: CHOICE */}
                        {(q.type === 'choice' || !q.type) && (
                          <div className="space-y-2 pl-4 border-l-2 border-slate-200">
                            {q.options?.map((opt, oIdx) => (
                              <div key={oIdx} className="flex gap-2 items-center">
                                <div className="w-4 h-4 rounded-full border border-slate-300 bg-white shrink-0" />
                                <Input
                                  placeholder="Option Label"
                                  value={opt.label}
                                  className="bg-white text-sm h-8"
                                  onChange={(e) => {
                                    const newQs = [...editForm.presentationConfig.surveyQuestions];
                                    newQs[qIdx].options[oIdx].label = e.target.value;
                                    setEditForm(p => ({ ...p, presentationConfig: { ...p.presentationConfig, surveyQuestions: newQs } }));
                                  }}
                                />
                                <div className="w-20 relative shrink-0">
                                  <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-bold">PTS</span>
                                  <Input
                                    type="number"
                                    value={opt.score}
                                    className="bg-white text-sm h-8 pr-8"
                                    onChange={(e) => {
                                      const newQs = [...editForm.presentationConfig.surveyQuestions];
                                      newQs[qIdx].options[oIdx].score = Number(e.target.value);
                                      setEditForm(p => ({ ...p, presentationConfig: { ...p.presentationConfig, surveyQuestions: newQs } }));
                                    }}
                                  />
                                </div>
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500 shrink-0" onClick={() => {
                                  const newQs = [...editForm.presentationConfig.surveyQuestions];
                                  newQs[qIdx].options = newQs[qIdx].options.filter((_, i) => i !== oIdx);
                                  setEditForm(p => ({ ...p, presentationConfig: { ...p.presentationConfig, surveyQuestions: newQs } }));
                                }}>&times;</Button>
                              </div>
                            ))}
                            <Button type="button" size="sm" variant="ghost" className="text-blue-600 h-8 text-xs" onClick={() => {
                              const newQs = [...editForm.presentationConfig.surveyQuestions];
                              if (!newQs[qIdx].options) newQs[qIdx].options = [];
                              newQs[qIdx].options.push({ label: '', score: 0 });
                              setEditForm(p => ({ ...p, presentationConfig: { ...p.presentationConfig, surveyQuestions: newQs } }));
                            }}>+ Add Option</Button>
                          </div>
                        )}

                        {/* CONFIG: RATING / SCALE */}
                        {(q.type === 'rating' || q.type === 'scale') && (
                          <div className="bg-white/50 p-3 rounded-lg border border-slate-200">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
                              <div>
                                <Label className="text-[10px] uppercase text-slate-500 font-bold">Min Value</Label>
                                <Input type="number" value={q.scaleConfig?.min ?? 1} onChange={(e) => {
                                  const newQs = [...editForm.presentationConfig.surveyQuestions];
                                  if (!newQs[qIdx].scaleConfig) newQs[qIdx].scaleConfig = {};
                                  newQs[qIdx].scaleConfig.min = Number(e.target.value);
                                  setEditForm(p => ({ ...p, presentationConfig: { ...p.presentationConfig, surveyQuestions: newQs } }));
                                }} className="h-8 text-sm bg-white" />
                              </div>
                              <div>
                                <Label className="text-[10px] uppercase text-slate-500 font-bold">Max Value</Label>
                                <Input type="number" value={q.scaleConfig?.max ?? 5} onChange={(e) => {
                                  const newQs = [...editForm.presentationConfig.surveyQuestions];
                                  if (!newQs[qIdx].scaleConfig) newQs[qIdx].scaleConfig = {};
                                  newQs[qIdx].scaleConfig.max = Number(e.target.value);
                                  setEditForm(p => ({ ...p, presentationConfig: { ...p.presentationConfig, surveyQuestions: newQs } }));
                                }} className="h-8 text-sm bg-white" />
                              </div>
                              <div>
                                <Label className="text-[10px] uppercase text-slate-500 font-bold">Min Label</Label>
                                <Input placeholder="Poor" value={q.scaleConfig?.minLabel ?? ''} onChange={(e) => {
                                  const newQs = [...editForm.presentationConfig.surveyQuestions];
                                  if (!newQs[qIdx].scaleConfig) newQs[qIdx].scaleConfig = {};
                                  newQs[qIdx].scaleConfig.minLabel = e.target.value;
                                  setEditForm(p => ({ ...p, presentationConfig: { ...p.presentationConfig, surveyQuestions: newQs } }));
                                }} className="h-8 text-sm bg-white" />
                              </div>
                              <div>
                                <Label className="text-[10px] uppercase text-slate-500 font-bold">Max Label</Label>
                                <Input placeholder="Excellent" value={q.scaleConfig?.maxLabel ?? ''} onChange={(e) => {
                                  const newQs = [...editForm.presentationConfig.surveyQuestions];
                                  if (!newQs[qIdx].scaleConfig) newQs[qIdx].scaleConfig = {};
                                  newQs[qIdx].scaleConfig.maxLabel = e.target.value;
                                  setEditForm(p => ({ ...p, presentationConfig: { ...p.presentationConfig, surveyQuestions: newQs } }));
                                }} className="h-8 text-sm bg-white" />
                              </div>
                            </div>
                            <p className="text-[10px] text-slate-400 italic">Values will be used directly as points.</p>
                          </div>
                        )}

                        {/* CONFIG: TEXT */}
                        {q.type === 'text' && (
                          <div className="bg-white/50 p-3 rounded-lg border border-slate-200">
                            <Label className="text-[10px] uppercase text-slate-500 font-bold">Max Possible Score</Label>
                            <Input type="number" value={q.textConfig?.maxScore ?? 0} onChange={(e) => {
                              const newQs = [...editForm.presentationConfig.surveyQuestions];
                              if (!newQs[qIdx].textConfig) newQs[qIdx].textConfig = {};
                              newQs[qIdx].textConfig.maxScore = Number(e.target.value);
                              setEditForm(p => ({ ...p, presentationConfig: { ...p.presentationConfig, surveyQuestions: newQs } }));
                            }} className="h-8 text-sm w-32 bg-white" />
                            <p className="text-xs text-slate-500 mt-2">
                              <span className="font-bold text-red-500">Note:</span> Text answers require manual grading.
                              Default score will be 0 until rated.
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                      <Button type="button" variant="outline" className="flex-1 border-dashed" onClick={() => {
                        const newQs = [...(editForm.presentationConfig.surveyQuestions || [])];
                        newQs.push({ question: '', type: 'choice', options: [{ label: 'Yes', score: 10 }, { label: 'No', score: 0 }] });
                        setEditForm(p => ({ ...p, presentationConfig: { ...p.presentationConfig, surveyQuestions: newQs } }));
                      }}>+ Add Survey Question</Button>

                      <div className="flex gap-2">
                        <Button type="button" variant="outline" className="text-slate-600 gap-2" onClick={() => {
                          const csvContent = "Type,Question,Config\nchoice,Example Choice Question,Option1:10;Option2:5\nrating,Example Rating,1;5;Poor;Excellent\nscale,Example Scale,1;10;Low;High\ntext,Example Text,10";
                          const blob = new Blob([csvContent], { type: 'text/csv' });
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'survey_sample.csv';
                          a.click();
                        }}>
                          <FileText className="w-4 h-4" /> Sample CSV
                        </Button>
                        <div className="relative">
                          <Button type="button" variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 gap-2 pointer-events-none">
                            <ArrowLeft className="w-4 h-4 rotate-90" /> Import CSV
                          </Button>
                          <Input
                            type="file"
                            accept=".csv"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = (evt) => {
                                const lines = evt.target.result.split('\n').filter(l => l.trim());
                                if (lines.length < 2) return alert('Invalid CSV');

                                const newQuestions = [];
                                // Skip header
                                for (let i = 1; i < lines.length; i++) {
                                  // Detailed CSV Parsing to handle quotes and commas inside fields
                                  const parseCSVLine = (str) => {
                                    const res = [];
                                    let current = "";
                                    let inQuote = false;
                                    for (let c = 0; c < str.length; c++) {
                                      const char = str[c];
                                      if (char === '"' && str[c + 1] === '"') { current += '"'; c++; continue; } // Double quote escape
                                      if (char === '"') { inQuote = !inQuote; continue; }
                                      if (char === ',' && !inQuote) { res.push(current.trim()); current = ""; continue; }
                                      current += char;
                                    }
                                    res.push(current.trim());
                                    return res;
                                  };

                                  const parts = parseCSVLine(lines[i]);
                                  const type = parts[0]?.toLowerCase() || 'choice';
                                  const question = parts[1];
                                  const configStr = parts[2];

                                  if (!question) continue;

                                  const qObj = { type: type, question };

                                  if (type === 'choice') {
                                    qObj.options = configStr ? configStr.split(';').map(opt => {
                                      const [label, score] = opt.split(':');
                                      return { label: label || 'Option', score: Number(score) || 0 };
                                    }) : [];
                                  } else if (type === 'scale' || type === 'rating') {
                                    const [min, max, minLabel, maxLabel] = configStr ? configStr.split(';') : [1, 5, 'Poor', 'Excellent'];
                                    qObj.scaleConfig = {
                                      min: Number(min) || 1,
                                      max: Number(max) || 5,
                                      minLabel: minLabel || 'Poor',
                                      maxLabel: maxLabel || 'Excellent'
                                    };
                                  } else if (type === 'text') {
                                    qObj.textConfig = { maxScore: Number(configStr) || 0 };
                                  }
                                  newQuestions.push(qObj);
                                }



                                setConfirmModal({
                                  isOpen: true,
                                  message: `Import ${newQuestions.length} questions? This will append to existing questions.`,
                                  onConfirm: () => {
                                    setEditForm(p => ({
                                      ...p,
                                      presentationConfig: {
                                        ...p.presentationConfig,
                                        surveyQuestions: [...(p.presentationConfig.surveyQuestions || []), ...newQuestions]
                                      }
                                    }));
                                    setConfirmModal({ isOpen: false, message: '', onConfirm: null });
                                  }
                                });
                                e.target.value = null; // Reset
                              };
                              reader.readAsText(file);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* RUBRIC EDITOR */
                  <div className="space-y-3 bg-slate-50 p-3 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <Label className="font-medium text-slate-600">Grading Rubric (Sliders)</Label>
                      <Button type="button" size="sm" variant="outline" onClick={() => setEditForm(p => ({ ...p, presentationConfig: { ...(p.presentationConfig || {}), gradingRubric: [...(p.presentationConfig?.gradingRubric || []), { label: '', maxScore: 10 }] } }))}>+ Add Criteria</Button>
                    </div>
                    {editForm.presentationConfig?.gradingRubric?.map((criteria, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <Input value={criteria.label} onChange={(e) => {
                          const newRubric = [...editForm.presentationConfig.gradingRubric]; newRubric[idx].label = e.target.value;
                          setEditForm(p => ({ ...p, presentationConfig: { ...p.presentationConfig, gradingRubric: newRubric } }));
                        }} className="flex-1 bg-white" placeholder="Criteria (e.g. Creativity)" />

                        <div className="w-24 relative">
                          <span className="absolute right-8 top-2 text-xs text-slate-400">/</span>
                          <Input type="number" value={criteria.maxScore} onChange={(e) => {
                            const newRubric = [...editForm.presentationConfig.gradingRubric]; newRubric[idx].maxScore = Number(e.target.value);
                            setEditForm(p => ({ ...p, presentationConfig: { ...p.presentationConfig, gradingRubric: newRubric } }));
                          }} className="bg-white" placeholder="Max" />
                        </div>

                        <Button type="button" variant="ghost" size="icon" className="text-red-400 hover:text-red-600" onClick={() => {
                          const newRubric = editForm.presentationConfig.gradingRubric.filter((_, i) => i !== idx);
                          setEditForm(p => ({ ...p, presentationConfig: { ...p.presentationConfig, gradingRubric: newRubric } }));
                        }}>&times;</Button>
                      </div>
                    ))}
                    {!editForm.presentationConfig?.gradingRubric?.length && <p className="text-sm text-slate-400 italic text-center">No grading criteria set.</p>}
                  </div>
                )}
              </div>
              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto">Save Changes</Button>
            </form>
          </section >
        )
      }

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-4 md:p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><Clock className="w-6 h-6" /></div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Submission Deadline</p>
              <p className="font-semibold text-slate-800">{topic.submissionDeadline ? new Date(topic.submissionDeadline).toLocaleString() : 'Not set'}</p>
            </div>
          </div>
          <div>
            {getCountdown(topic.submissionDeadline)}
          </div>
        </div>
        <div className="glass-card p-4 md:p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cyan-100 text-cyan-600 rounded-lg"><Calendar className="w-6 h-6" /></div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Presentation Date</p>
              <p className="font-semibold text-slate-800">{topic.presentationDate ? new Date(topic.presentationDate).toLocaleString() : 'Not set'}</p>
            </div>
          </div>
          <div>
            {getCountdown(topic.presentationDate)}
          </div>
        </div>
      </div>

      {/* Share & Import */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="glass-card p-4 md:p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><ExternalLink className="w-4 h-4" /> Share Link</h2>
          <div className="flex gap-2">
            <Input readOnly value={`${window.location.origin}/student/submit-project/${id}`} className="bg-white/50" />
            <Button variant="outline" onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/student/submit-project/${id}`);
              setFeedback({ isOpen: true, type: 'success', title: 'Copied', message: 'Link copied to clipboard!' });
            }}>Copy</Button>
          </div>
        </section>

        <section className="glass-card p-4 md:p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">Import Projects (CSV)</h2>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label htmlFor="csvFile" className="text-xs text-slate-500 mb-1 block">Group, Name, Emails (semicolon)</Label>
              <Input id="csvFile" type="file" accept=".csv" className="bg-white/50 cursor-pointer" onChange={(e) => {
                const file = e.target.files[0]; if (!file) return;
                const reader = new FileReader();
                reader.onload = async (evt) => {
                  const lines = evt.target.result.split('\n').filter(l => l.trim());
                  const projectsToImport = lines.map(line => {
                    const parts = line.split(','); return { groupNumber: parseInt(parts[0]?.trim()) || undefined, projectName: parts[1]?.trim(), members: parts[2]?.trim()?.split(';').map(e => ({ email: e.trim() })) || [] };
                  }).filter(p => p.projectName);

                  setConfirmModal({
                    isOpen: true,
                    message: `Import ${projectsToImport.length} projects?`,
                    onConfirm: async () => {
                      setSaving(true);
                      try {
                        const res = await fetch(`/api/teacher/topics/${id}/import`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projects: projectsToImport }) });
                        if (res.ok) {
                          const d = await res.json();
                          setProjects(p => [...p, ...d.projects]);
                          setFeedback({ isOpen: true, type: 'success', title: 'Imported', message: `Successfully imported ${d.projects.length} projects.` });
                        } else {
                          setFeedback({ isOpen: true, type: 'error', title: 'Import Failed', message: 'Failed to import projects.' });
                        }
                      } finally {
                        setSaving(false);
                        setConfirmModal({ isOpen: false, message: '', onConfirm: null });
                        e.target.value = null;
                      }
                    }
                  });
                }; reader.readAsText(file);
              }} />
            </div>
          </div>
        </section>
      </div>

      {/* Projects List Section */}
      <section className="space-y-4">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <h2 className="text-2xl font-bold text-slate-800">Student Projects</h2>

          {/* Control Bar */}
          <div className="glass-card px-4 py-3 flex flex-col md:flex-row gap-3 items-center w-full xl:w-auto">
            <div className="relative w-full md:flex-1 xl:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white/50 border-slate-200/60 focus:bg-white w-full"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
              <div className="flex gap-2 flex-1 md:flex-none">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="h-10 flex-1 md:w-32 rounded-md border border-slate-200/60 bg-white/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="name">Name</option>
                  <option value="group">Group</option>
                </select>

                <div className="flex bg-slate-100/50 p-1 rounded-lg border border-slate-200/50 shrink-0">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                    title="Grid View"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-2 rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                    title="Table View"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <Button onClick={() => setShowAddProject(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-lg shadow-blue-500/20 shrink-0">
                <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Project</span><span className="sm:hidden">Add</span>
              </Button>
            </div>
          </div>
        </div>

        {!filteredProjects.length ? (
          <div className="glass-card p-10 text-center text-slate-500 border-2 border-dashed border-slate-200/50">
            {searchQuery ? 'No projects match your search.' : 'No projects submitted yet.'}
          </div>
        ) : (
          <>
            {viewMode === 'table' ? (
              /* TABLE VIEW */
              <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200/60 text-sm">
                    <thead className="bg-slate-50/50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Project</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Group</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Members</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Submitted</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Links</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white/40">
                      {filteredProjects.map((p) => (
                        <tr key={p._id} className="hover:bg-white/60 transition-colors">
                          <td className="px-4 py-3 font-medium">
                            <div className="flex items-center gap-3">
                              {p.thumbnailUrl ? <img src={p.thumbnailUrl} className="w-10 h-10 rounded-md object-cover shadow-sm" /> : <div className="w-10 h-10 bg-slate-200 rounded-md flex items-center justify-center text-xs text-slate-500">No Img</div>}
                              {p.projectName}
                            </div>
                          </td>
                          <td className="px-4 py-3">{p.groupNumber ?? '-'}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-0.5">
                              {p.members?.map((m, i) => <span key={i} className="text-xs text-slate-600" title={m.email}>{m.name}</span>)}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{p.submittedAt ? new Date(p.submittedAt).toLocaleDateString() : '-'}</td>
                          <td className="px-4 py-3 flex gap-2">
                            {p.videoLink && <Video className="w-4 h-4 text-red-500" />}
                            {p.presentationLink && <FileText className="w-4 h-4 text-orange-500" />}
                          </td>
                          <td className="px-4 py-3">
                            <Button size="sm" variant="ghost" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => setSelectedProject(p)}>View</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* GRID VIEW */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProjects.map((p) => (
                  <div key={p._id} className="glass-card group relative overflow-hidden transition-all hover:scale-[1.02] hover:shadow-xl flex flex-col">
                    {/* Thumbnail */}
                    <div className="h-40 bg-slate-100 relative group-hover:opacity-90 transition-opacity">
                      {p.thumbnailUrl ? (
                        <img src={p.thumbnailUrl} alt={p.projectName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
                          <ImageIcon className="w-12 h-12 text-blue-200" />
                        </div>
                      )}
                      {p.groupNumber && (
                        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur text-blue-700 text-xs font-bold px-2 py-1 rounded-full shadow-sm">
                          Group {p.groupNumber}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="font-bold text-slate-800 text-lg mb-1 truncate" title={p.projectName}>{p.projectName}</h3>
                      <p className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {new Date(p.submittedAt).toLocaleDateString()}
                      </p>

                      {/* Members Stack */}
                      <div className="mt-auto mb-4">
                        <div className="flex -space-x-2 overflow-hidden py-1">
                          {p.members && p.members.length > 0 ? (
                            p.members.slice(0, 4).map((m, i) => (
                              <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs" title={m.name}>
                                {m.name.charAt(0)}
                              </div>
                            ))
                          ) : <span className="text-xs text-slate-400 italic">No members</span>}
                          {p.members && p.members.length > 4 && (
                            <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-medium">
                              +{p.members.length - 4}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <div className="flex gap-2">
                          {p.videoLink && <Video className="w-4 h-4 text-red-400" />}
                          {p.presentationLink && <FileText className="w-4 h-4 text-orange-400" />}
                        </div>
                        <Button size="sm" variant="outline" className="h-8 text-xs border-blue-200 text-blue-600 hover:bg-blue-50" onClick={() => setSelectedProject(p)}>
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* Manual Add Project Modal */}
      <Dialog open={showAddProject} onOpenChange={setShowAddProject}>
        <DialogContent className="glass-card border-none max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Manually Add Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div>
              <Label>Project Name</Label>
              <Input
                value={form.projectName}
                onChange={handleChange}
                name="projectName"
                required
                className="bg-white/50"
                placeholder="e.g. Solar System VR"
              />
            </div>
            <div>
              <Label>Group Number (Optional)</Label>
              <Input
                value={form.groupNumber}
                onChange={handleChange}
                name="groupNumber"
                type="number"
                className="bg-white/50"
                placeholder="e.g. 5"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => setShowAddProject(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">Add Project</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Modal Re-use */}
      <Dialog open={!!selectedProject} onOpenChange={(open) => !open && setSelectedProject(null)}>
        <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh] glass-card border-none">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              {selectedProject?.projectName}
              {selectedProject?.groupNumber && <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Group {selectedProject.groupNumber}</span>}
            </DialogTitle>
          </DialogHeader>

          {selectedProject && (
            <div className="space-y-6">
              {/* Hero / Thumbnail */}
              {selectedProject.thumbnailUrl && (
                <div className="w-full h-48 bg-slate-100 rounded-xl overflow-hidden shadow-inner">
                  <img src={selectedProject.thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Team Members */}
              <div>
                <h3 className="font-semibold text-slate-800 mb-3 border-b border-slate-200 pb-2">Team Members</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {selectedProject.members && selectedProject.members.length > 0 ? selectedProject.members.map((m, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-white/60 rounded-xl shadow-sm border border-white/50">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-cyan-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg">
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">{m.name}</div>
                        <div className="text-xs text-slate-500">{m.email}</div>
                      </div>
                    </div>
                  )) : <p className="text-slate-500 italic">No members listed.</p>}
                </div>
              </div>

              {/* Primary Links */}
              <div>
                <h3 className="font-semibold text-slate-800 mb-3 border-b border-slate-200 pb-2">Primary Links</h3>
                <div className="flex flex-wrap gap-3">
                  {selectedProject.videoLink && (
                    <a href={selectedProject.videoLink} target="_blank" className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-xl hover:bg-red-100 transition shadow-sm border border-red-100">
                      <Video className="w-5 h-5" /> Demo Video
                      <ExternalLink className="w-3 h-3 opacity-50" />
                    </a>
                  )}
                  {selectedProject.presentationLink && (
                    <a href={selectedProject.presentationLink} target="_blank" className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 rounded-xl hover:bg-orange-100 transition shadow-sm border border-orange-100">
                      <FileText className="w-5 h-5" /> Slides
                      <ExternalLink className="w-3 h-3 opacity-50" />
                    </a>
                  )}
                  {selectedProject.sourceCodeLink && (
                    <a href={selectedProject.sourceCodeLink} target="_blank" className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition shadow-sm border border-slate-200">
                      <ExternalLink className="w-5 h-5" /> Source Code
                    </a>
                  )}
                </div>
              </div>

              {/* Resources & Materials (Simplified Rendering) */}
              {(selectedProject.resources?.length > 0 || selectedProject.additionalMaterials?.length > 0) && (
                <div>
                  <h3 className="font-semibold text-slate-800 mb-3 border-b border-slate-200 pb-2">Resources</h3>
                  <div className="grid gap-2">
                    {[...(selectedProject.resources || []), ...(selectedProject.additionalMaterials || [])].map((res, i) => (
                      <a key={i} href={res.url} target="_blank" className="flex items-center justify-between p-3 bg-white/50 border border-white/60 rounded-lg hover:bg-white transition group">
                        <span className="font-medium text-slate-700 flex items-center gap-2">
                          <ExternalLink className="w-4 h-4 text-blue-500" /> {res.label || 'Resource'}
                        </span>
                        <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* FEEDBACK & CONFIRM MODALS */}
      <FeedbackModal
        isOpen={feedback.isOpen}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onClose={() => setFeedback(p => ({ ...p, isOpen: false }))}
      />

      <Dialog open={confirmModal.isOpen} onOpenChange={(open) => !open && setConfirmModal(p => ({ ...p, isOpen: false }))}>
        <DialogContent className="glass-card border-none max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800">
              <AlertTriangle className="w-5 h-5 text-orange-500" /> Confirm Action
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-slate-600">
            {confirmModal.message}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmModal(p => ({ ...p, isOpen: false }))}>Cancel</Button>
            <Button onClick={confirmModal.onConfirm} className="bg-blue-600 hover:bg-blue-700 text-white">Confirm</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div >
  )
}
