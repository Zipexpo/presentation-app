'use client';
import { Video, Presentation, Link as LinkIcon, Palette, FileText, MonitorPlay, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import FeedbackModal from '@/components/ui/FeedbackModal';
import { getEmbedUrl, getLinkType, getGoogleDriveDirectLink, isEmbeddable } from '@/lib/utils';

const PDFPreview = dynamic(() => import('./PDFPreview'), { ssr: false });

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription, DialogHeader } from '@/components/ui/dialog';
import LinkBadge from '@/components/ui/LinkBadge';
import MemberSearchDialog from './MemberSearchDialog';

export default function TopicSubmissionForm({ topicId, topicConfig, existingSubmission }) {
    const { data: session } = useSession();
    const config = topicConfig || {};

    // URL helper used from outer scope


    const getDocViewerUrl = (url) => {
        if (!url) return '';
        return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
    };

    // ...existing code...
    const [form, setForm] = useState({
        groupNumber: '',
        groupName: '',
        projectName: '',
        videoLink: '',
        presentationLink: '',
        storageLink: '',
        sourceCodeLink: '',
        thumbnailUrl: '',
        resources: [],
    });

    const [members, setMembers] = useState([]);
    const [additionalMaterials, setAdditionalMaterials] = useState([]);

    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    // Consolidated feedback state for Modal
    const [feedback, setFeedback] = useState({ isOpen: false, type: 'error', title: '', message: '' });
    const [videoTitle, setVideoTitle] = useState('');
    const [showCoverUrlInput, setShowCoverUrlInput] = useState(false);
    const [pendingDeletions, setPendingDeletions] = useState([]);

    // Pre-fill if editing
    useEffect(() => {
        if (existingSubmission) {
            setForm({
                groupNumber: existingSubmission.groupNumber || '',
                groupName: existingSubmission.groupName || '',
                projectName: existingSubmission.projectName || '',
                videoLink: existingSubmission.videoLink || '',
                presentationLink: existingSubmission.presentationLink || '',
                storageLink: existingSubmission.storageLink || '',
                sourceCodeLink: existingSubmission.sourceCodeLink || '',
                thumbnailUrl: existingSubmission.thumbnailUrl || '',
                resources: existingSubmission.resources || [],
            });
            if (existingSubmission.members?.length) {
                setMembers(existingSubmission.members);
            }
            if (existingSubmission.additionalMaterials?.length) {
                setAdditionalMaterials(existingSubmission.additionalMaterials);
            }
        }
    }, [existingSubmission]);

    // Fetch video title
    useEffect(() => {
        const url = form.videoLink;
        if (!url) {
            setVideoTitle('');
            return;
        }

        const type = getLinkType(url);
        if (type !== 'YouTube' && type !== 'Vimeo') return;

        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/utils/oembed?url=${encodeURIComponent(url)}`);
                if (res.ok) {
                    const data = await res.json();
                    setVideoTitle(data.title);
                } else {
                    setVideoTitle('');
                }
            } catch (err) {
                console.error('Failed to fetch video title', err);
                setVideoTitle('');
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [form.videoLink]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleMemberChange = (index, field, value) => {
        const newMembers = [...members];
        newMembers[index][field] = value;
        setMembers(newMembers);
    };

    const addMember = () => {
        setMembers([...members, { name: '', studentId: '', email: '' }]);
    };

    const removeMember = (index) => {
        setMembers(members.filter((_, i) => i !== index));
    };

    const handleMaterialChange = (index, field, value) => {
        const newMats = [...additionalMaterials];
        newMats[index][field] = value;
        setAdditionalMaterials(newMats);
    };

    const addMaterial = () => {
        setAdditionalMaterials([...additionalMaterials, { label: '', url: '' }]);
    };

    const removeMaterial = (index) => {
        setAdditionalMaterials(additionalMaterials.filter((_, i) => i !== index));
    };

    const [uploadingImage, setUploadingImage] = useState(false);

    const getPublicIdFromUrl = (url) => {
        if (!url || !url.includes('cloudinary.com')) return null;
        try {
            const regex = /\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z]+$/;
            const match = url.match(regex);
            return match ? match[1] : null;
        } catch (e) {
            return null;
        }
    };

    const deleteOldImage = async (url) => {
        const publicId = getPublicIdFromUrl(url);
        if (!publicId) return;

        try {
            await fetch('/api/utils/delete-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ public_id: publicId })
            });
        } catch (err) {
            console.error('Failed to delete old image', err);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Get config from Env
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

        if (!cloudName || !uploadPreset) {
            alert('Cloudinary configuration missing. Please check .env file.');
            return;
        }

        setUploadingImage(true);
        try {
            // Queue old image for deletion if it exists
            if (form.thumbnailUrl) {
                setPendingDeletions(prev => [...prev, form.thumbnailUrl]);
            }

            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', uploadPreset);

            const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const err = await res.json();
                console.error('Cloudinary error:', err);
                throw new Error(err.error?.message || 'Image upload failed');
            }

            const data = await res.json();
            setForm(prev => ({ ...prev, thumbnailUrl: data.secure_url }));
        } catch (err) {
            console.error(err);
            alert(`Upload failed: ${err.message}`);
        } finally {
            setUploadingImage(false);
            e.target.value = '';
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        // Reset feedback
        setFeedback({ isOpen: false, type: 'error', title: '', message: '' });

        // Validation for Dynamic Resources
        const missingResources = [];
        if (config?.resourceRequirements) {
            config.resourceRequirements.forEach(req => {
                if (req.optional) return;
                const userRes = form.resources.find(r => r.label === req.label);
                if (!userRes || !userRes.url || !userRes.url.trim()) {
                    missingResources.push(req.label);
                }
            });
        }

        if (missingResources.length > 0) {
            setFeedback({
                isOpen: true,
                type: 'error',
                title: 'Missing Requirements',
                message: `Please provide links for the following required resources: ${missingResources.join(', ')}`
            });
            setSubmitting(false);
            return;
        }

        try {
            const payload = {
                topicId,
                groupNumber: form.groupNumber ? Number(form.groupNumber) : undefined,
                groupName: form.groupName,
                projectName: form.projectName,
                members,
                links: {
                    video: form.videoLink,
                    presentation: form.presentationLink,
                    storage: form.storageLink,
                    sourceCode: form.sourceCodeLink,
                    thumbnailUrl: form.thumbnailUrl,
                },
                resources: form.resources,
                additionalMaterials
            };

            const res = await fetch('/api/student/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to submit');

            // Process pending image deletions on success
            if (pendingDeletions.length > 0) {
                pendingDeletions.forEach(url => deleteOldImage(url));
                setPendingDeletions([]);
            }

            setSuccess(true);
            // Don't clear form if updating, maybe just show success
        } catch (err) {
            setFeedback({
                isOpen: true,
                type: 'error',
                title: 'Submission Failed',
                message: err.message || 'An unexpected error occurred.'
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="bg-green-50 border border-green-200 text-green-700 p-6 rounded-lg text-center">
                <h3 className="text-xl font-bold mb-2">
                    {existingSubmission ? 'Updated Successfully!' : 'Submission Successful!'}
                </h3>
                <p>Your project has been saved.</p>
                <Button onClick={() => setSuccess(false)} variant="outline" className="mt-4">
                    Continue Editing
                </Button>
            </div>
        );
    }




    const addMemberFromDialog = (memberData) => {
        const exists = members.some(m =>
            (m.email && m.email === memberData.email) ||
            (m.studentId && m.studentId === memberData.studentId)
        );

        if (exists) {
            setFeedback({
                isOpen: true,
                type: 'error',
                title: 'Duplicate Member',
                message: 'This student is already added to your team list.'
            });
            return;
        }
        setMembers([...members, memberData]);
    };

    return (
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-white rounded-xl shadow-xl overflow-hidden border border-gray-100 my-8">

            {/* Global Error Alert */}
            <FeedbackModal
                isOpen={feedback.isOpen}
                onClose={() => setFeedback({ ...feedback, isOpen: false })}
                type={feedback.type}
                title={feedback.title}
                message={feedback.message}
            />

            {/* Hero / Thumbnail Section */}
            <div className="relative h-48 sm:h-64 bg-gray-100 group">
                {!showCoverUrlInput && form.thumbnailUrl ? (
                    <>
                        {/* If embeddable (e.g. Drive), use iframe. Else use img */}
                        {isEmbeddable(form.thumbnailUrl) ? (
                            <div className="absolute inset-0 w-full h-full bg-black">
                                <iframe
                                    src={getEmbedUrl(form.thumbnailUrl, 'image')}
                                    className="w-full h-full border-0"
                                    allowFullScreen
                                    referrerPolicy="no-referrer"
                                />
                                {/* Overlay transparent div to process clicks for overlay buttons if needed? No, buttons are z-index higher */}
                            </div>
                        ) : (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={getGoogleDriveDirectLink(form.thumbnailUrl)} alt="Cover" className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" referrerPolicy="no-referrer" />
                        )}

                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
                            {/* Inner buttons need pointer-events-auto */}
                            <div className="flex gap-2 pointer-events-auto">
                                <Button type="button" variant="secondary" size="sm" onClick={() => document.getElementById('thumbnail-upload-hero').click()}>
                                    <ImageIcon className="w-4 h-4 mr-2" /> Change
                                </Button>
                                <Button type="button" variant="secondary" size="sm" onClick={() => setShowCoverUrlInput(true)}>
                                    <LinkIcon className="w-4 h-4 mr-2" /> URL
                                </Button>
                                <Button type="button" variant="destructive" size="sm" onClick={() => { if (form.thumbnailUrl) setPendingDeletions(prev => [...prev, form.thumbnailUrl]); handleChange({ target: { name: 'thumbnailUrl', value: '' } }); }}>
                                    Remove
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    showCoverUrlInput ? (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 bg-gray-50">
                            <div className="flex w-full max-w-sm gap-2">
                                <Input
                                    placeholder="Paste image URL (https://...)"
                                    autoFocus
                                    className="bg-white"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (e.target.value) {
                                                if (form.thumbnailUrl) setPendingDeletions(prev => [...prev, form.thumbnailUrl]);
                                                handleChange({ target: { name: 'thumbnailUrl', value: e.target.value } });
                                                setShowCoverUrlInput(false);
                                            }
                                        }
                                    }}
                                />
                                <Button
                                    type="button"
                                    onClick={(e) => {
                                        const input = e.currentTarget.previousElementSibling;
                                        if (input.value) {
                                            if (form.thumbnailUrl) setPendingDeletions(prev => [...prev, form.thumbnailUrl]);
                                            handleChange({ target: { name: 'thumbnailUrl', value: input.value } });
                                            setShowCoverUrlInput(false);
                                        }
                                    }}
                                >
                                    Add
                                </Button>
                                <Button type="button" variant="ghost" onClick={() => setShowCoverUrlInput(false)}>Cancel</Button>
                            </div>
                            <p className="text-xs text-gray-400">Supported: JPG, PNG, WebP, GIF</p>
                        </div>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-4">
                            <div className="flex flex-col items-center gap-1">
                                <ImageIcon className="w-12 h-12 opacity-30" />
                                <span className="text-sm font-medium opacity-70">{config.labels?.thumbnail || 'Add Cover Image'}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="gap-2 bg-white"
                                    onClick={() => document.getElementById('thumbnail-upload-hero').click()}
                                >
                                    Upload
                                </Button>
                                <span className="text-xs opacity-50">or</span>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="gap-2 bg-white"
                                    onClick={() => setShowCoverUrlInput(true)}
                                >
                                    <LinkIcon className="w-3 h-3" /> Paste URL
                                </Button>
                            </div>
                        </div>
                    )
                )}
                <input id="thumbnail-upload-hero" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                {uploadingImage && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
                        <span className="animate-pulse font-bold text-indigo-600">Uploading Cover...</span>
                    </div>
                )}
            </div>

            {/* Content Body */}
            <div className="p-6 sm:p-8 space-y-8">

                {/* Header Inputs */}
                <div className="space-y-4 border-b pb-6">
                    <div className="flex flex-wrap gap-4 items-center justify-between">
                        {/* Group Badge / Number */}
                        <div className="flex items-center gap-2 text-indigo-600 font-semibold tracking-wide uppercase text-xs sm:text-sm bg-indigo-50 px-3 py-1 rounded-full">
                            <span className="whitespace-nowrap">{config.labels?.groupName || 'Group'}</span>
                            <Input
                                id="groupNumber" name="groupNumber" type="number"
                                className="w-12 h-auto py-0 px-1 border-none bg-transparent hover:bg-white focus:bg-white text-indigo-700 font-bold focus-visible:ring-0 p-0 rounded text-center"
                                value={form.groupNumber} onChange={handleChange} required placeholder="#"
                            />
                            {config.includeGroupName && (
                                <>
                                    <span className="text-indigo-300">|</span>
                                    <Input
                                        id="groupName" name="groupName"
                                        className="h-auto py-0 px-1 border-none bg-transparent hover:bg-white focus:bg-white text-indigo-700 font-bold focus-visible:ring-0 p-0 rounded w-full min-w-[100px]"
                                        value={form.groupName} onChange={handleChange} placeholder="Team Name"
                                    />
                                </>
                            )}
                        </div>
                        {/* Status or other metadata could go here */}
                    </div>

                    <div>
                        <Label htmlFor="projectName" className="sr-only">Project Name</Label>
                        <Input
                            id="projectName" name="projectName" required
                            className="text-3xl sm:text-4xl font-extrabold border-none px-0 shadow-none focus-visible:ring-0 placeholder:text-gray-300 h-auto"
                            value={form.projectName} onChange={handleChange}
                            placeholder="Enter Project Title"
                        />
                    </div>
                </div>

                {/* Main Fields */}
                <div className="grid gap-8">

                    {/* Team Members Section */}
                    <section className="space-y-3">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <span className="w-1 h-6 bg-indigo-500 rounded-full inline-block"></span>
                                Team Members
                            </h3>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={session?.user && members.some(m => m.email === session.user.email)}
                                    onClick={() => {
                                        if (session?.user) {
                                            addMemberFromDialog({
                                                name: session.user.name,
                                                email: session.user.email,
                                                studentId: '', // We don't have exact studentId in session yet, use empty
                                                isRegistered: true
                                            });
                                        }
                                    }}
                                >
                                    {session?.user && members.some(m => m.email === session.user.email) ? 'Added' : 'Add Me'}
                                </Button>
                                <MemberSearchDialog onAddMember={addMemberFromDialog} topicId={topicId} />
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            {members.map((member, idx) => (
                                <div key={idx} className="flex items-start gap-3 bg-gray-50 hover:bg-gray-100 p-3 rounded-lg border border-transparent hover:border-gray-200 transition-all group">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg shrink-0">
                                        {member.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-sm truncate flex items-center gap-1">
                                            {member.name}
                                            {member.isRegistered && <span className="text-green-500 text-[10px]" title="Verified">✓</span>}
                                        </div>
                                        <div className="text-xs text-gray-500 truncate">{member.studentId}</div>
                                        <div className="text-xs text-gray-400 truncate">{member.email}</div>
                                    </div>
                                    <button type="button" onClick={() => removeMember(idx)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                                        ✕
                                    </button>
                                </div>
                            ))}
                            {members.length === 0 && (
                                <div className="sm:col-span-2 text-center py-6 text-gray-400 border-2 border-dashed rounded-lg bg-gray-50/50">
                                    No members added yet. Click search to add.
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Links Section */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            <span className="w-1 h-6 bg-green-500 rounded-full inline-block"></span>
                            Project Links
                        </h3>

                        <div className="space-y-4 max-w-xl">
                            {/* Presentation */}
                            {(config.includePresentation !== false) && (
                                <div>
                                    <div className="flex justify-between items-center mb-1.5">
                                        <Label htmlFor="presentationLink" className="block text-gray-600 font-medium">
                                            {config.labels?.presentation || 'Presentation Slides'}
                                        </Label>
                                        <div className="flex items-center gap-2">
                                            {form.presentationLink && getLinkType(form.presentationLink) && <LinkBadge type={getLinkType(form.presentationLink)} />}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <div className="relative flex-1">
                                            <Input
                                                id="presentationLink" name="presentationLink"
                                                value={form.presentationLink} onChange={handleChange}
                                                placeholder="https://docs.google.com/presentation/..."
                                                className="pl-9 bg-white"
                                            />
                                            <Presentation className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                                        </div>

                                        {form.presentationLink && (
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                                        <MonitorPlay className="w-5 h-5" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-4xl w-full h-[80vh] p-0 flex flex-col bg-black/90 border-0">
                                                    <DialogHeader className="sr-only">
                                                        <DialogTitle>Presentation Preview</DialogTitle>
                                                    </DialogHeader>
                                                    <div className="flex-1 w-full overflow-hidden relative">
                                                        <iframe src={getEmbedUrl(form.presentationLink, 'presentation')} className="w-full h-full absolute inset-0" frameBorder="0" allowFullScreen referrerPolicy="no-referrer" title="Preview" />
                                                    </div>
                                                    <div className="p-2 flex justify-center">
                                                        <a href={form.presentationLink} target="_blank" rel="noopener noreferrer">
                                                            <Button variant="secondary" size="sm" className="h-8 text-xs gap-2">
                                                                Open Original <ExternalLink className="w-3 h-3" />
                                                            </Button>
                                                        </a>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Video */}
                            {(config.includeVideo !== false) && (
                                <div>
                                    <div className="flex justify-between items-center mb-1.5">
                                        <Label htmlFor="videoLink" className="block text-gray-600 font-medium">
                                            {config.labels?.video || 'Demo Video'}
                                        </Label>
                                        <div className="flex items-center gap-2">
                                            {form.videoLink && getLinkType(form.videoLink) && <LinkBadge type={getLinkType(form.videoLink)} />}
                                            {videoTitle && <span className="text-xs text-gray-500 truncate max-w-[200px] bg-gray-100 px-1.5 py-0.5 rounded">{videoTitle}</span>}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <div className="relative flex-1">
                                            <Input
                                                id="videoLink" name="videoLink"
                                                value={form.videoLink} onChange={handleChange}
                                                placeholder="https://youtube.com/..."
                                                className="pl-9 bg-white"
                                            />
                                            <Video className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                                        </div>
                                        {form.videoLink && (
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                                        <MonitorPlay className="w-5 h-5" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-4xl w-full h-[80vh] p-0 flex flex-col bg-black/90 border-0">
                                                    <DialogHeader className="sr-only">
                                                        <DialogTitle>Video Preview</DialogTitle>
                                                    </DialogHeader>
                                                    <div className="flex-1 w-full overflow-hidden relative">
                                                        <iframe src={getEmbedUrl(form.videoLink, 'video')} className="w-full h-full absolute inset-0" frameBorder="0" allowFullScreen referrerPolicy="no-referrer" title="Preview" />
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Source Code */}
                            {config.includeSourceCode && (
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center mb-1">
                                        <Label htmlFor="sourceCodeLink">{config.labels?.sourceCode || 'Source Code (GitHub/GitLab)'}</Label>
                                        <div className="flex items-center gap-2">
                                            {form.sourceCodeLink && getLinkType(form.sourceCodeLink) && (
                                                <LinkBadge type={getLinkType(form.sourceCodeLink)} />
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <div className="relative flex-1">
                                            <Input
                                                id="sourceCodeLink" name="sourceCodeLink"
                                                value={form.sourceCodeLink} onChange={handleChange}
                                                placeholder="https://github.com/..."
                                                className="pl-9"
                                            />
                                            <LinkIcon className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                                        </div>
                                        {form.sourceCodeLink && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-10 w-10 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                onClick={() => window.open(form.sourceCodeLink, '_blank')}
                                            >
                                                <ExternalLink className="w-5 h-5" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Dynamic Resource Inputs */}
                            {topicConfig?.resourceRequirements?.map((req, idx) => {
                                const resourceValue = form.resources.find(r => r.label === req.label)?.url || '';

                                // Helper to extract filename
                                const getFilename = (url) => {
                                    if (!url) return null;
                                    try {
                                        const urlObj = new URL(url);
                                        const pathname = urlObj.pathname;
                                        const name = pathname.split('/').pop();
                                        return name.length > 20 ? name.substring(0, 20) + '...' : name;
                                    } catch { return null; }
                                };
                                const filename = getFilename(resourceValue);

                                return (
                                    <div key={idx} className="space-y-2">
                                        <div className="flex justify-between items-center mb-1">
                                            <Label>
                                                {req.label}
                                                {req.type !== 'url' && <span className="text-xs text-gray-400 font-normal ml-1">({req.type})</span>}
                                                {req.optional && <span className="text-xs text-slate-400 font-normal italic ml-2">(Optional)</span>}
                                            </Label>
                                            <div className="flex items-center gap-2">
                                                {resourceValue && getLinkType(resourceValue) && <LinkBadge type={getLinkType(resourceValue)} />}
                                                {filename && <span className="text-xs text-gray-500 font-mono bg-gray-100 px-1.5 py-0.5 rounded truncate max-w-[150px]" title={resourceValue}>{filename}</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="relative flex-1">
                                                <Input
                                                    value={resourceValue}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setForm(prev => {
                                                            const newResources = prev.resources.filter(r => r.label !== req.label);
                                                            if (val) {
                                                                newResources.push({ label: req.label, url: val, type: req.type });
                                                            }
                                                            return { ...prev, resources: newResources };
                                                        });
                                                    }}
                                                    placeholder={`Link to ${req.label}...`}
                                                    className="pl-9"
                                                />
                                                {/* Icon Mapping */}
                                                {req.type === 'video' ? <Video className="w-4 h-4 absolute left-3 top-3 text-gray-400" /> :
                                                    req.type === 'image' ? <ImageIcon className="w-4 h-4 absolute left-3 top-3 text-gray-400" /> :
                                                        (req.type === 'pdf' || req.type === 'doc') ? <FileText className="w-4 h-4 absolute left-3 top-3 text-gray-400" /> :
                                                            req.type === 'presentation' ? <Presentation className="w-4 h-4 absolute left-3 top-3 text-amber-500" /> :
                                                                <LinkIcon className="w-4 h-4 absolute left-3 top-3 text-gray-400" />}
                                            </div>

                                            {/* Preview Button (Right of Input) */}
                                            {(req.type === 'pdf' || req.type === 'doc' || req.type === 'image' || req.type === 'presentation') && (
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            disabled={!resourceValue}
                                                            className={`h-10 w-10 ${!resourceValue ? 'text-gray-300' : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'}`}
                                                            title={`Preview ${req.label}`}
                                                        >
                                                            {req.type === 'image' ? <ImageIcon className="w-5 h-5" /> :
                                                                req.type === 'presentation' ? <Presentation className="w-5 h-5" /> :
                                                                    <FileText className="w-5 h-5" />}
                                                        </Button>
                                                    </DialogTrigger>
                                                    {resourceValue && (
                                                        <DialogContent className={`border-0 p-0 ${req.type === 'image' ? 'bg-transparent shadow-none sm:max-w-3xl flex items-center justify-center' : 'bg-white sm:max-w-4xl h-[80vh] overflow-hidden'}`}>
                                                            <DialogTitle className="sr-only">Preview {req.label}</DialogTitle>

                                                            {req.type === 'pdf' && (
                                                                <div className="w-full h-full overflow-y-auto">
                                                                    <PDFPreview url={resourceValue} />
                                                                </div>
                                                            )}

                                                            {req.type === 'doc' && (
                                                                <div className="relative w-full h-full">
                                                                    <iframe
                                                                        src={getDocViewerUrl(resourceValue)}
                                                                        className="w-full h-full"
                                                                        frameBorder="0"
                                                                        referrerPolicy="no-referrer"
                                                                    />
                                                                    <div className="absolute bottom-2 right-2 text-[10px] text-gray-500 bg-white/80 px-2 rounded pointer-events-none">
                                                                        Requires public link
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {req.type === 'presentation' && (
                                                                <div className="relative w-full h-full bg-black">
                                                                    <iframe
                                                                        src={getEmbedUrl(resourceValue, req.type)}
                                                                        className="w-full h-full"
                                                                        frameBorder="0"
                                                                        allowFullScreen
                                                                        referrerPolicy="no-referrer"
                                                                    />
                                                                </div>
                                                            )}

                                                            {req.type === 'image' && (
                                                                <div className="w-full h-full flex items-center justify-center">
                                                                    {isEmbeddable(resourceValue) ? (
                                                                        <div className="relative w-full h-full bg-black">
                                                                            <iframe
                                                                                src={getEmbedUrl(resourceValue, 'image')}
                                                                                className="w-full h-full"
                                                                                frameBorder="0"
                                                                                allowFullScreen
                                                                                referrerPolicy="no-referrer"
                                                                            />
                                                                        </div>
                                                                    ) : (
                                                                        /* eslint-disable-next-line @next/next/no-img-element */
                                                                        <img
                                                                            src={resourceValue}
                                                                            alt="Preview"
                                                                            className="max-h-[85vh] max-w-full rounded-lg shadow-2xl"
                                                                        />
                                                                    )}
                                                                </div>
                                                            )}
                                                        </DialogContent>
                                                    )}
                                                </Dialog>
                                            )}
                                        </div>
                                    </div>

                                );
                            })}
                        </div>
                    </section>

                    {/* Additional Materials */}
                    {config.includeMaterials && (
                        <section className="space-y-3">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <span className="w-1 h-6 bg-yellow-500 rounded-full inline-block"></span>
                                {config.labels?.materials || 'Additional Materials'}
                            </h3>
                            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                                {additionalMaterials.map((mat, idx) => (
                                    <div key={idx} className="flex gap-2 items-end">
                                        <div className="flex-1">
                                            <Input
                                                value={mat.label}
                                                onChange={(e) => handleMaterialChange(idx, 'label', e.target.value)}
                                                placeholder="Label (e.g. Report)"
                                                className="bg-white"
                                            />
                                        </div>
                                        <div className="flex-[2]">
                                            <Input
                                                value={mat.url}
                                                onChange={(e) => handleMaterialChange(idx, 'url', e.target.value)}
                                                placeholder="URL"
                                                className="bg-white"
                                            />
                                        </div>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeMaterial(idx)} className="text-gray-400 hover:text-red-500">
                                            ✕
                                        </Button>
                                    </div>
                                ))}
                                <Button type="button" variant="outline" size="sm" onClick={addMaterial} className="w-full border-dashed text-gray-500 hover:text-gray-800 hover:border-gray-400 hover:bg-white">
                                    + Add Item
                                </Button>
                            </div>
                        </section>
                    )}
                </div>



            </div>

            {/* Footer Actions */}
            <div className="p-6 bg-gray-50 border-t flex justify-between items-center">
                <div className="text-xs text-gray-400">
                    * Required fields
                </div>
                <Button type="submit" size="lg" disabled={submitting} className="px-8 shadow-lg shadow-indigo-100 font-bold bg-indigo-600 hover:bg-indigo-700 text-white">
                    {submitting ? 'Saving Project...' : (existingSubmission ? 'Update Project' : 'Submit Project')}
                </Button>
            </div>
        </form>
    );
}
