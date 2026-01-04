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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import FeedbackModal from '@/components/ui/FeedbackModal'
import PresetManager from '@/components/teacher/PresetManager'
import EvaluationEditor from '@/components/teacher/EvaluationEditor'
import { ExternalLink, Video, FileText, ImageIcon, Calendar, Clock, Edit3, ArrowLeft, LayoutGrid, List, Search, Filter, Plus, X, AlertTriangle, Trash2, Share2 } from 'lucide-react'
import { getGoogleDriveDirectLink, getGoogleDrivePreviewLink } from '@/lib/utils'

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
    submissionConfig: {
      includeSourceCode: false, includeThumbnail: false, includeMaterials: false, includeGroupName: false, includeVideo: true, includePresentation: true,
      labels: { sourceCode: 'Source Code', thumbnail: 'Thumbnail', materials: 'Additional Materials', groupName: 'Group Name', video: 'Demo Video', presentation: 'Presentation Slides' }
    },
    resourceRequirements: [],
    presentationConfig: { durationPerProject: 10, questionDuration: 5, breakDuration: 2, gradingRubric: [], completionMessage: '', defaultResource: 'presentation', gradingType: 'rubric', surveyQuestions: [] },
    classId: ''
  });

  const [selectedProject, setSelectedProject] = useState(null);
  const [showAddProject, setShowAddProject] = useState(false);

  // Sharing State
  const [isOwner, setIsOwner] = useState(false);
  const [invitedTeachers, setInvitedTeachers] = useState([]);
  const [showShareDialog, setShowShareDialog] = useState(false);

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
          console.log('Topic Permissions:', { isOwner: dataTopic.isOwner, invited: dataTopic.topic.invitedTeachers });
          setTopic(dataTopic.topic)
          setProjects(dataTopic.projects)
          setIsOwner(dataTopic.isOwner !== false);
          setInvitedTeachers(dataTopic.topic.invitedTeachers || []);

          // Populate edit form
          // Auto-migrate Logic
          let presConfig = dataTopic.topic.presentationConfig || { durationPerProject: 10, gradingRubric: [], gradingType: 'survey', surveyQuestions: [] };

          if ((!presConfig.gradingType || presConfig.gradingType === 'rubric') && presConfig.gradingRubric?.length > 0 && (!presConfig.surveyQuestions || presConfig.surveyQuestions.length === 0)) {
            // Migrate Rubric to Survey
            const newSurvey = presConfig.gradingRubric.map(r => ({
              type: 'scale',
              question: r.label,
              scaleConfig: { min: 1, max: r.maxScore || 10, minLabel: 'Poor', maxLabel: 'Excellent' }
            }));
            presConfig = { ...presConfig, gradingType: 'survey', surveyQuestions: newSurvey };
          } else if (!presConfig.gradingType) {
            presConfig.gradingType = 'survey';
          }

          setEditForm({
            title: dataTopic.topic.title,
            description: dataTopic.topic.description,
            submissionDeadline: dataTopic.topic.submissionDeadline ? new Date(dataTopic.topic.submissionDeadline).toISOString().slice(0, 16) : '',
            presentationDate: dataTopic.topic.presentationDate ? new Date(dataTopic.topic.presentationDate).toISOString().slice(0, 16) : '',
            submissionConfig: {
              ...{
                includeSourceCode: false, includeThumbnail: false, includeMaterials: false, includeGroupName: false, includeVideo: true, includePresentation: true,
                labels: { sourceCode: 'Source Code', thumbnail: 'Thumbnail', materials: 'Additional Materials', groupName: 'Group Name', video: 'Demo Video', presentation: 'Presentation Slides' }
              },
              ...(dataTopic.topic.submissionConfig || {})
            },
            resourceRequirements: dataTopic.topic.resourceRequirements || [],
            presentationConfig: presConfig,
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

  // Invite Handlers
  const handleUpdateInvites = async (newInvites) => {
    try {
      const res = await fetch(`/api/teacher/topics/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitedTeachers: newInvites }),
      });
      if (res.ok) {
        setInvitedTeachers(newInvites);
        setFeedback({ isOpen: true, type: 'success', title: 'Invites Updated', message: 'Topic sharing settings saved.' });
        setShowShareDialog(false);
      } else {
        throw new Error('Failed to update invites');
      }
    } catch (err) {
      setFeedback({ isOpen: true, type: 'error', title: 'Error', message: err.message });
    }
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
          {isOwner ? (
            <>
              <Button onClick={() => setShowShareDialog(true)} className="bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200 shadow-sm">
                <Share2 className="w-4 h-4 mr-2" />
                Share Topic
              </Button>
              <Button onClick={() => setShowEdit(!showEdit)} className="bg-white/50 text-slate-700 hover:bg-white border-none shadow-sm backdrop-blur-sm">
                <Edit3 className="w-4 h-4 mr-2" />
                {showEdit ? 'Cancel Edit' : 'Edit Topic'}
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg border border-amber-200 text-sm font-medium">
              <AlertTriangle className="w-4 h-4" /> Read Only View
            </div>
          )}
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
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="scoring">Scoring Method</TabsTrigger>
                  <TabsTrigger value="targeted">Targeted Evaluation</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* Row 1: Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase">Title</Label>
                      <Input value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} className="bg-white/50 border-slate-200 h-9" />
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-slate-500 uppercase">Linked Class</Label>
                      <select value={editForm.classId} onChange={e => setEditForm({ ...editForm, classId: e.target.value })} className="flex h-9 w-full rounded-md border border-input bg-white/50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                        <option value="">-- No Class Restriction --</option>
                        {classes.map(cls => (<option key={cls._id} value={cls._id}>{cls.name}</option>))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-500 uppercase">Description</Label>
                    <Input value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} className="bg-white/50 border-slate-200 h-9" />
                  </div>

                  {/* Row 2: Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-bold text-slate-500 uppercase">Submission Deadline</Label>
                      <Input type="datetime-local" value={editForm.submissionDeadline} onChange={e => setEditForm({ ...editForm, submissionDeadline: e.target.value })} className="bg-white/50 h-9" />
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-slate-500 uppercase">Presentation Date</Label>
                      <Input type="datetime-local" value={editForm.presentationDate} onChange={e => setEditForm({ ...editForm, presentationDate: e.target.value })} className="bg-white/50 h-9" />
                    </div>
                  </div>

                  {/* Row 3: Configs (Side-by-Side) */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
                    {/* Left: Permissions & Req */}
                    <div className="space-y-3 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                      <h3 className="text-xs font-bold text-slate-800 uppercase mb-2 flex items-center gap-2">
                        <Edit3 className="w-3 h-3" /> Permissions & Requirements
                      </h3>

                      <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-2 cursor-pointer text-sm">
                          <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" checked={editForm.presentationConfig?.allowComments ?? true} onChange={(e) => setEditForm(p => ({ ...p, presentationConfig: { ...p.presentationConfig, allowComments: e.target.checked } }))} />
                          <span>Allow Comments</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-sm">
                          <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" checked={editForm.presentationConfig?.allowGuest ?? false} onChange={(e) => setEditForm(p => ({ ...p, presentationConfig: { ...p.presentationConfig, allowGuest: e.target.checked } }))} />
                          <span>Guest Grading</span>
                        </label>
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        <Label className="text-xs whitespace-nowrap">Max Comments/Project:</Label>
                        <Input type="number" min="0" value={editForm.presentationConfig?.maxCommentsPerProject ?? 0} onChange={(e) => setEditForm(p => ({ ...p, presentationConfig: { ...p.presentationConfig, maxCommentsPerProject: Number(e.target.value) } }))} className="w-20 h-7 text-xs bg-white" placeholder="0=Inf" />
                      </div>

                      <div className="h-px bg-slate-200 my-2" />

                      <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {/* Source Code */}
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1.5 cursor-pointer text-sm text-slate-600 min-w-[140px]">
                            <input type="checkbox" checked={editForm.submissionConfig.includeSourceCode} onChange={(e) => setEditForm(p => ({ ...p, submissionConfig: { ...p.submissionConfig, includeSourceCode: e.target.checked } }))} className="rounded" />
                            Source Code
                          </label>
                          <Input className="h-6 text-xs w-[120px] bg-white" placeholder="Label" value={editForm.submissionConfig.labels?.sourceCode || 'Source Code'} onChange={(e) => setEditForm(p => ({ ...p, submissionConfig: { ...p.submissionConfig, labels: { ...p.submissionConfig.labels, sourceCode: e.target.value } } }))} />
                        </div>

                        {/* Thumbnail */}
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1.5 cursor-pointer text-sm text-slate-600 min-w-[140px]">
                            <input type="checkbox" checked={editForm.submissionConfig.includeThumbnail} onChange={(e) => setEditForm(p => ({ ...p, submissionConfig: { ...p.submissionConfig, includeThumbnail: e.target.checked } }))} className="rounded" />
                            Thumbnail
                          </label>
                          <Input className="h-6 text-xs w-[120px] bg-white" placeholder="Label" value={editForm.submissionConfig.labels?.thumbnail || 'Thumbnail'} onChange={(e) => setEditForm(p => ({ ...p, submissionConfig: { ...p.submissionConfig, labels: { ...p.submissionConfig.labels, thumbnail: e.target.value } } }))} />
                        </div>

                        {/* Materials */}
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1.5 cursor-pointer text-sm text-slate-600 min-w-[140px]">
                            <input type="checkbox" checked={editForm.submissionConfig.includeMaterials} onChange={(e) => setEditForm(p => ({ ...p, submissionConfig: { ...p.submissionConfig, includeMaterials: e.target.checked } }))} className="rounded" />
                            Materials
                          </label>
                          <Input className="h-6 text-xs w-[120px] bg-white" placeholder="Label" value={editForm.submissionConfig.labels?.materials || 'Additional Materials'} onChange={(e) => setEditForm(p => ({ ...p, submissionConfig: { ...p.submissionConfig, labels: { ...p.submissionConfig.labels, materials: e.target.value } } }))} />
                        </div>

                        {/* Group Name */}
                        <div className="flex items-center gap-2 bg-blue-50 py-1 px-2 rounded-lg -ml-2 w-fit">
                          <label className="flex items-center gap-1.5 cursor-pointer text-sm text-blue-600 font-medium min-w-[132px]">
                            <input type="checkbox" checked={editForm.submissionConfig.includeGroupName} onChange={(e) => setEditForm(p => ({ ...p, submissionConfig: { ...p.submissionConfig, includeGroupName: e.target.checked } }))} className="rounded" />
                            Group Name
                          </label>
                          <Input className="h-6 text-xs w-[120px] bg-white border-blue-200 text-blue-800" placeholder="Label" value={editForm.submissionConfig.labels?.groupName || 'Group Name'} onChange={(e) => setEditForm(p => ({ ...p, submissionConfig: { ...p.submissionConfig, labels: { ...p.submissionConfig.labels, groupName: e.target.value } } }))} />
                        </div>

                        <div className="w-full h-px bg-slate-200/50 my-1" />

                        {/* Video */}
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1.5 cursor-pointer text-sm text-slate-600 min-w-[140px]">
                            <input type="checkbox" checked={editForm.submissionConfig.includeVideo !== false} onChange={(e) => setEditForm(p => ({ ...p, submissionConfig: { ...p.submissionConfig, includeVideo: e.target.checked } }))} className="rounded" />
                            Demo Video
                          </label>
                          <Input className="h-6 text-xs w-[120px] bg-white" placeholder="Label" value={editForm.submissionConfig.labels?.video || 'Demo Video'} onChange={(e) => setEditForm(p => ({ ...p, submissionConfig: { ...p.submissionConfig, labels: { ...p.submissionConfig.labels, video: e.target.value } } }))} />
                        </div>

                        {/* Presentation */}
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1.5 cursor-pointer text-sm text-slate-600 min-w-[140px]">
                            <input type="checkbox" checked={editForm.submissionConfig.includePresentation !== false} onChange={(e) => setEditForm(p => ({ ...p, submissionConfig: { ...p.submissionConfig, includePresentation: e.target.checked } }))} className="rounded" />
                            Presentation Slides
                          </label>
                          <Input className="h-6 text-xs w-[120px] bg-white" placeholder="Label" value={editForm.submissionConfig.labels?.presentation || 'Presentation Slides'} onChange={(e) => setEditForm(p => ({ ...p, submissionConfig: { ...p.submissionConfig, labels: { ...p.submissionConfig.labels, presentation: e.target.value } } }))} />
                        </div>
                      </div>
                    </div>

                    {/* Right: Presentation Timings */}
                    <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                      <h3 className="text-xs font-bold text-slate-800 uppercase mb-2 flex items-center gap-2">
                        <Clock className="w-3 h-3" /> Timings (Minutes)
                      </h3>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-[10px] text-slate-500 uppercase">Per Project</Label>
                          <Input type="number" min="1" value={editForm.presentationConfig?.durationPerProject || 10} onChange={(e) => setEditForm(p => ({ ...p, presentationConfig: { ...p.presentationConfig, durationPerProject: Number(e.target.value) } }))} className="bg-white h-8" />
                        </div>
                        <div>
                          <Label className="text-[10px] text-slate-500 uppercase">Q&A</Label>
                          <Input type="number" min="0" value={editForm.presentationConfig?.questionDuration || 5} onChange={(e) => setEditForm(p => ({ ...p, presentationConfig: { ...p.presentationConfig, questionDuration: Number(e.target.value) } }))} className="bg-white h-8" />
                        </div>
                        <div>
                          <Label className="text-[10px] text-slate-500 uppercase">Break</Label>
                          <Input type="number" min="0" value={editForm.presentationConfig?.breakDuration || 2} onChange={(e) => setEditForm(p => ({ ...p, presentationConfig: { ...p.presentationConfig, breakDuration: Number(e.target.value) } }))} className="bg-white h-8" />
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="flex justify-between items-center mb-1">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase">Req. Resources</Label>
                          <Button type="button" size="sm" variant="ghost" className="h-5 text-[10px] text-blue-600" onClick={() => setEditForm(p => ({ ...p, resourceRequirements: [...(p.resourceRequirements || []), { label: '', type: 'url' }] }))}>+ Add</Button>
                        </div>
                        <div className="space-y-1 max-h-[100px] overflow-y-auto">
                          {editForm.resourceRequirements?.map((req, idx) => (
                            <div key={idx} className="flex gap-1">
                              <Input value={req.label} onChange={(e) => { const newReqs = [...editForm.resourceRequirements]; newReqs[idx].label = e.target.value; setEditForm(p => ({ ...p, resourceRequirements: newReqs })); }} className="h-7 text-xs bg-white" placeholder="Label" />
                              <select value={req.type} onChange={(e) => { const newReqs = [...editForm.resourceRequirements]; newReqs[idx].type = e.target.value; setEditForm(p => ({ ...p, resourceRequirements: newReqs })); }} className="h-7 w-20 text-[10px] rounded border bg-white px-1">
                                <option value="url">Link</option><option value="pdf">PDF</option><option value="image">Img</option><option value="video">Vid</option><option value="presentation">Pres.</option>
                              </select>
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input type="checkbox" checked={req.optional || false} onChange={(e) => { const newReqs = [...editForm.resourceRequirements]; newReqs[idx].optional = e.target.checked; setEditForm(p => ({ ...p, resourceRequirements: newReqs })); }} className="w-3 h-3 rounded text-blue-600" />
                                <span className="text-[10px] text-slate-500">Opt</span>
                              </label>
                              <button type="button" className="text-red-400 hover:text-red-600 px-1" onClick={() => { const newReqs = editForm.resourceRequirements.filter((_, i) => i !== idx); setEditForm(p => ({ ...p, resourceRequirements: newReqs })); }}>&times;</button>
                            </div>
                          ))}
                          {!editForm.resourceRequirements?.length && <p className="text-[10px] text-slate-400 italic">No resources required.</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="scoring" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="pt-2">
                    <EvaluationEditor
                      title="Scoring Method (Survey)"
                      questions={editForm.presentationConfig?.surveyQuestions || []}
                      onChange={(newQs) => setEditForm(p => ({ ...p, presentationConfig: { ...p.presentationConfig, surveyQuestions: newQs, gradingType: 'survey' } }))}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="targeted" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="pt-2">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="font-semibold text-slate-800">Targeted Evaluation (Special Accounts)</h3>
                        <p className="text-xs text-slate-500">Enable a separate survey for specific evaluators (judges, teachers).</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={editForm.presentationConfig?.specialEvaluationConfig?.enabled || false}
                          onChange={(e) => setEditForm(p => ({ ...p, presentationConfig: { ...p.presentationConfig, specialEvaluationConfig: { ...(p.presentationConfig?.specialEvaluationConfig || {}), enabled: e.target.checked } } }))}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>

                    {editForm.presentationConfig?.specialEvaluationConfig?.enabled && (
                      <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-4 animate-in slide-in-from-top-2">
                        <div>
                          <Label className="text-indigo-800 font-bold mb-1 block">Authorized Evaluators</Label>
                          <p className="text-xs text-slate-500 mb-2">Enter email addresses separated by commas.</p>
                          <textarea
                            className="w-full rounded-lg border-slate-300 p-3 text-sm focus:ring-indigo-500 font-mono"
                            rows={3}
                            placeholder="judge1@university.edu, teacher2@school.com"
                            value={editForm.presentationConfig?.specialEvaluationConfig?.evaluatorEmails?.join(', ') || ''}
                            onChange={(e) => {
                              const emails = e.target.value.split(',').map(s => s.trim());
                              setEditForm(p => ({ ...p, presentationConfig: { ...p.presentationConfig, specialEvaluationConfig: { ...(p.presentationConfig?.specialEvaluationConfig || {}), evaluatorEmails: emails } } }))
                            }}
                          />
                        </div>

                        <div>
                          <EvaluationEditor
                            title="Special Survey Questions"
                            questions={editForm.presentationConfig?.specialEvaluationConfig?.surveyQuestions || []}
                            onChange={(newQs) => setEditForm(p => ({ ...p, presentationConfig: { ...p.presentationConfig, specialEvaluationConfig: { ...(p.presentationConfig?.specialEvaluationConfig || {}), surveyQuestions: newQs } } }))}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto mt-4">Save Changes</Button>
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

      {/* Resources Info */}
      <div className="glass-card p-4 md:p-6">
        <h3 className="text-sm font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4" /> Required Resources
        </h3>
        <div className="flex flex-wrap gap-3">
          {topic.resourceRequirements?.length > 0 ? (
            topic.resourceRequirements.map((req, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700">
                <span className={`uppercase text-[10px] font-bold px-1.5 py-0.5 rounded ${req.type === 'video' ? 'bg-red-100 text-red-600' : req.type === 'image' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                  {req.type}
                </span>
                <span className="font-medium">{req.label}</span>
                {req.optional && <span className="text-[10px] text-slate-400 bg-white border border-slate-100 px-1 rounded ml-1">Optional</span>}
              </div>
            ))
          ) : (
            <p className="text-slate-400 italic text-sm">No specific resources required.</p>
          )}
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
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="csvFile" className="text-xs text-slate-500 mb-1 block">
                Format: <span className="font-mono">
                  Group #, Group Name, Project Name, Members (emails separated by ;)
                  {editForm.submissionConfig?.includeVideo ? ', Video Link' : ''}
                  {editForm.submissionConfig?.includePresentation ? ', Presentation Link' : ''}
                  {editForm.submissionConfig?.includeSourceCode ? ', Source Code' : ''}
                  {editForm.submissionConfig?.includeThumbnail ? ', Thumbnail URL' : ''}
                  {editForm.resourceRequirements?.length > 0 ? ', ' + editForm.resourceRequirements.map(r => r.label).join(', ') : ''}
                </span>
                <span className="ml-2 text-orange-500 block sm:inline">*No commas in names. Use semicolon (;) for multiple emails.</span>
              </Label>
              <Input id="csvFile" type="file" accept=".csv" className="bg-white/50 cursor-pointer" onChange={(e) => {
                const file = e.target.files[0]; if (!file) return;
                const reader = new FileReader();
                reader.onload = async (evt) => {
                  let content = evt.target.result;
                  if (content.charCodeAt(0) === 0xFEFF) { content = content.slice(1); }
                  const lines = content.split('\n').filter(l => l.trim());
                  // Skip header if present (heuristic: if first line has 'Group' or 'Name')
                  const startIdx = lines[0].toLowerCase().includes('name') ? 1 : 0;

                  const projectsToImport = lines.slice(startIdx).map(line => {
                    const parts = line.split(',');
                    let colIdx = 4; // Start after Group#, GroupName, ProjName, Members

                    const project = {
                      groupNumber: parseInt(parts[0]?.trim()) || undefined,
                      groupName: parts[1]?.trim(),
                      projectName: parts[2]?.trim(),
                      members: parts[3]?.trim()?.split(';').map(e => ({ email: e.trim() })) || []
                    };

                    if (editForm.submissionConfig?.includeVideo) {
                      project.videoLink = parts[colIdx++]?.trim();
                    }
                    if (editForm.submissionConfig?.includePresentation) {
                      const val = parts[colIdx++]?.trim();
                      project.presentationLink = val ? getGoogleDrivePreviewLink(val) : undefined;
                    }
                    if (editForm.submissionConfig?.includeSourceCode) {
                      project.sourceCodeLink = parts[colIdx++]?.trim();
                    }
                    if (editForm.submissionConfig?.includeThumbnail) {
                      const val = parts[colIdx++]?.trim();
                      project.thumbnailUrl = val ? getGoogleDriveDirectLink(val) : undefined;
                    }

                    // Parse Dynamic Resources
                    const dynamicResources = [];
                    if (editForm.resourceRequirements && editForm.resourceRequirements.length > 0) {
                      editForm.resourceRequirements.forEach((req) => {
                        const val = parts[colIdx++]?.trim();
                        if (val) {
                          let finalUrl = val;
                          if (req.type === 'image') finalUrl = getGoogleDriveDirectLink(val);
                          else if (req.type === 'presentation') finalUrl = getGoogleDrivePreviewLink(val);
                          else if (req.type === 'url') finalUrl = getGoogleDriveDirectLink(val);  // Keep as is for generic URLs or use Direct if beneficial

                          dynamicResources.push({
                            label: req.label,
                            type: req.type || 'url',
                            url: finalUrl
                          });
                        }
                      });
                    }
                    project.resources = dynamicResources;

                    return project;
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
                          const err = await res.json();
                          setFeedback({ isOpen: true, type: 'error', title: 'Import Failed', message: err.error || 'Failed to import projects.' });
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
            <Button variant="outline" onClick={() => {
              let headers = "Group Number,Group Name,Project Name,Members (emails separated by ;)";
              let example = `1,Alpha Team,Solar System VR,alice@school.edu;bob@school.edu`;

              if (editForm.submissionConfig?.includeVideo) {
                headers += ",Video Link";
                example += ",https://youtu.be/...";
              }
              if (editForm.submissionConfig?.includePresentation) {
                headers += ",Presentation Link";
                example += ",https://docs.google.com/...";
              }
              if (editForm.submissionConfig?.includeSourceCode) {
                headers += ",Source Code Link";
                example += ",https://github.com/...";
              }
              if (editForm.submissionConfig?.includeThumbnail) {
                headers += ",Thumbnail URL";
                example += ",https://example.com/image.jpg";
              }

              if (editForm.resourceRequirements && editForm.resourceRequirements.length > 0) {
                headers += "," + editForm.resourceRequirements.map(r => r.label).join(",");
                example += "," + editForm.resourceRequirements.map(() => "https://example.com/resource").join(",");
              }

              const csvContent = "data:text/csv;charset=utf-8,%SAME%F%BB%BF" + encodeURIComponent(headers + "\n" + example);
              const link = document.createElement("a");
              link.setAttribute("href", csvContent);
              link.setAttribute("download", "projects_dynamic_template.csv");
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}>
              <FileText className="w-4 h-4 mr-2" /> Sample CSV
            </Button>
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

              {isOwner && (
                <Button onClick={() => setShowAddProject(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-lg shadow-blue-500/20 shrink-0">
                  <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Project</span><span className="sm:hidden">Add</span>
                </Button>
              )}
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
                              {p.thumbnailUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={getGoogleDriveDirectLink(p.thumbnailUrl)} alt={p.projectName || "Project Thumbnail"} className="w-10 h-10 rounded-md object-cover shadow-sm" referrerPolicy="no-referrer" />
                              ) : <div className="w-10 h-10 bg-slate-200 rounded-md flex items-center justify-center text-xs text-slate-500">No Img</div>}
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
                          <td className="px-4 py-3 flex gap-2 items-center">
                            <Button size="sm" variant="ghost" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => setSelectedProject(p)}>View</Button>
                            {isOwner && (
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => {
                                setConfirmModal({
                                  isOpen: true,
                                  message: `Delete project "${p.projectName}"?`,
                                  onConfirm: async () => {
                                    const res = await fetch(`/api/teacher/topics/${id}/projects/${p._id}`, { method: 'DELETE' });
                                    if (res.ok) {
                                      setProjects(prev => prev.filter(proj => proj._id !== p._id));
                                      setFeedback({ isOpen: true, type: 'success', title: 'Deleted', message: 'Project deleted successfully.' });
                                    } else {
                                      setFeedback({ isOpen: true, type: 'error', title: 'Error', message: 'Failed to delete project.' });
                                    }
                                    setConfirmModal({ isOpen: false, message: '', onConfirm: null });
                                  }
                                });
                              }}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
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
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={getGoogleDriveDirectLink(p.thumbnailUrl)} alt={p.projectName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="h-8 text-xs border-blue-200 text-blue-600 hover:bg-blue-50" onClick={() => setSelectedProject(p)}>
                            View Details
                          </Button>
                          {isOwner && (
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => {
                              setConfirmModal({
                                isOpen: true,
                                message: `Delete project "${p.projectName}"?`,
                                onConfirm: async () => {
                                  const res = await fetch(`/api/teacher/topics/${id}/projects/${p._id}`, { method: 'DELETE' });
                                  if (res.ok) {
                                    setProjects(prev => prev.filter(proj => proj._id !== p._id));
                                    setFeedback({ isOpen: true, type: 'success', title: 'Deleted', message: 'Project deleted successfully.' });
                                  } else {
                                    setFeedback({ isOpen: true, type: 'error', title: 'Error', message: 'Failed to delete project.' });
                                  }
                                  setConfirmModal({ isOpen: false, message: '', onConfirm: null });
                                }
                              });
                            }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={getGoogleDriveDirectLink(selectedProject.thumbnailUrl)} alt="Thumbnail" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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
      %SAME%

      {/* Share / Invite Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share Topic</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Invite other teachers to view this topic (Read Only). They will see it in the &quot;Topic Sharing&quot; mode but cannot make changes.
            </p>
            <div className="space-y-2">
              <Label>Invited Teachers (Emails)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="teacher@example.com"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = e.currentTarget.value.trim();
                      if (val && !invitedTeachers.includes(val)) {
                        handleUpdateInvites([...invitedTeachers, val]);
                        e.currentTarget.value = '';
                      }
                    }
                  }}
                />
                <Button onClick={(e) => {
                  const input = e.currentTarget.previousElementSibling;
                  const val = input.value.trim();
                  if (val && !invitedTeachers.includes(val)) {
                    handleUpdateInvites([...invitedTeachers, val]);
                    input.value = '';
                  }
                }}>Add</Button>
              </div>
            </div>
            <div className="space-y-1">
              {invitedTeachers.map(email => (
                <div key={email} className="flex items-center justify-between p-2 bg-slate-50 rounded border text-sm">
                  <span>{email}</span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500" onClick={() => handleUpdateInvites(invitedTeachers.filter(t => t !== email))}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {invitedTeachers.length === 0 && <p className="text-xs text-slate-400 italic">No invites yet.</p>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div >
  )
}
