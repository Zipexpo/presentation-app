'use client';
import { Video, Presentation, Link as LinkIcon, Palette, FileText, MonitorPlay, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const PDFPreview = dynamic(() => import('./PDFPreview'), { ssr: false });

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription, DialogHeader } from '@/components/ui/dialog';
import MemberSearchDialog from './MemberSearchDialog';

const getEmbedUrl = (input) => {
    if (!input) return '';

    let url = input;

    // Handle iframe HTML snippets - extract src
    if (input.trim().startsWith('<')) {
        const srcMatch = input.match(/src="([^"]+)"/);
        if (srcMatch && srcMatch[1]) {
            url = srcMatch[1];
        }
    }

    try {
        const urlObj = new URL(url);

        // Google Slides
        if (urlObj.hostname.includes('docs.google.com') && urlObj.pathname.includes('/presentation/')) {
            return url.replace(/\/edit.*$/, '/embed?start=false&loop=false&delayms=3000');
        }

        // Canva
        if (urlObj.hostname.includes('canva.com') && urlObj.pathname.includes('/view')) {
            // User requested to strip everything after /view and force ?embed
            return url.replace(/\/view.*$/, '/view?embed');
        }

        // Figma
        if (urlObj.hostname.includes('figma.com') && (urlObj.pathname.includes('/proto/') || urlObj.pathname.includes('/design/'))) {
            return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`;
        }

        // Microsoft PowerPoint / OneDrive
        if (urlObj.hostname.includes('onedrive.live.com') || urlObj.hostname.includes('powerpoint.office.com') || urlObj.hostname.includes('sharepoint.com')) {
            if (urlObj.searchParams.get('action') !== 'embedview') {
                if (url.includes('?')) return `${url}&action=embedview`;
                return `${url}?action=embedview`;
            }
        }

        // Prezi
        if (urlObj.hostname.includes('prezi.com') && urlObj.pathname.includes('/p/')) {
            if (!url.includes('/embed')) return `${url.split('?')[0]}/embed`;
        }

        // Pitch
        if (urlObj.hostname.includes('pitch.com')) {
            if (!url.includes('/embed')) return url.replace('pitch.com/', 'pitch.com/embed/');
        }

        // YouTube
        if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
            let videoId = '';
            if (urlObj.hostname.includes('youtu.be')) {
                videoId = urlObj.pathname.slice(1);
            } else if (urlObj.searchParams.get('v')) {
                videoId = urlObj.searchParams.get('v');
            }
            if (videoId) return `https://www.youtube.com/embed/${videoId}`;
        }

        // Vimeo
        if (urlObj.hostname.includes('vimeo.com')) {
            const videoId = urlObj.pathname.split('/').pop();
            if (videoId && !isNaN(videoId)) {
                return `https://player.vimeo.com/video/${videoId}`;
            }
        }

        return url;
    } catch (e) {
        return url;
    }
};

const getLinkType = (url) => {
    if (!url) return null;
    try {
        const hostname = new URL(url).hostname;
        // Prioritize specific types
        if (hostname.includes('docs.google.com') && hostname.includes('/presentation/')) return 'Google Slides';
        if (hostname.includes('drive.google.com') || hostname.includes('docs.google.com')) return 'Google Drive'; // Fallback for other google docs

        if (hostname.includes('canva.com')) return 'Canva';
        if (hostname.includes('figma.com')) return 'Figma';

        // Microsoft
        if (hostname.includes('powerpoint.office.com')) return 'PowerPoint';
        if (hostname.includes('onedrive.live.com') || hostname.includes('sharepoint.com')) return 'OneDrive';

        if (hostname.includes('prezi.com')) return 'Prezi';
        if (hostname.includes('pitch.com')) return 'Pitch';
        if (hostname.includes('youtube') || hostname.includes('youtu.be')) return 'YouTube';
        if (hostname.includes('vimeo.com')) return 'Vimeo';

        if (hostname.includes('github.com')) return 'GitHub';
        if (hostname.includes('gitlab.com')) return 'GitLab';

        return 'Link';
    } catch { return 'Link'; }
};

const LinkBadge = ({ url }) => {
    const type = getLinkType(url);
    if (!type) return null;

    let icon = <LinkIcon className="w-3 h-3" />;
    let colorClass = "bg-gray-100 text-gray-800 border-gray-200"; // Default

    switch (type) {
        case 'Google Slides':
            icon = <img src="/logo%20icon/google_slides.svg" alt="Google Slides" className="w-3 h-3" />;
            colorClass = "bg-orange-100 text-orange-800 border-orange-200";
            break;
        case 'Canva':
            icon = <img src="/logo%20icon/canva.svg" alt="Canva" className="w-3 h-3" />;
            colorClass = "bg-blue-100 text-blue-800 border-blue-200";
            break;
        case 'Figma':
            icon = <img src="/logo%20icon/figma.svg" alt="Figma" className="w-3 h-3" />;
            colorClass = "bg-purple-100 text-purple-800 border-purple-200";
            break;
        case 'PowerPoint':
            icon = <img src="/logo%20icon/powerpoint.svg" alt="PowerPoint" className="w-3 h-3" />;
            colorClass = "bg-red-100 text-red-800 border-red-200";
            break;
        case 'YouTube':
            icon = <img src="/logo%20icon/youtube.svg" alt="YouTube" className="w-3 h-3" />;
            colorClass = "bg-red-50 text-red-600 border-red-200";
            break;
        case 'Vimeo':
            icon = <img src="/logo%20icon/vimeo.svg" alt="Vimeo" className="w-3 h-3" />;
            colorClass = "bg-sky-100 text-sky-800 border-sky-200";
            break;
        case 'Google Drive':
            icon = <img src="/logo%20icon/google_drive.svg" alt="Drive" className="w-3 h-3" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block' }} />;
            // Fallback if image fails (using Lucide HardDrive would require import, let's just stick to reliable generic or try-catch logic? React onError)
            // Actually, simpler: Use distinct colors.
            colorClass = "bg-green-100 text-green-800 border-green-200";
            break;
        case 'OneDrive':
            icon = <img src="/logo%20icon/onedrive.svg" alt="OneDrive" className="w-3 h-3" />;
            colorClass = "bg-blue-100 text-blue-800 border-blue-200";
            break;
        case 'GitHub':
            icon = <img src="/logo%20icon/github.svg" alt="GitHub" className="w-3 h-3" />;
            colorClass = "bg-gray-100 text-gray-900 border-gray-200";
            break;
        case 'GitLab':
            icon = <img src="/logo%20icon/gitlab.svg" alt="GitLab" className="w-3 h-3" />;
            colorClass = "bg-orange-100 text-orange-800 border-orange-200";
            break;
        case 'Prezi':
            icon = <img src="/logo%20icon/prezi.svg" alt="Prezi" className="w-3 h-3" />;
            colorClass = "bg-indigo-100 text-indigo-800 border-indigo-200";
            break;
        case 'Pitch':
            icon = <img src="/logo%20icon/pitch.svg" alt="Pitch" className="w-3 h-3" />;
            colorClass = "bg-indigo-100 text-indigo-800 border-indigo-200";
            break;
    }

    return (
        <Badge variant="outline" className={`ml-2 gap-1.5 px-2 py-0.5 h-6 font-normal ${colorClass}`}>
            {icon}
            {type}
        </Badge>
    );
};

export default function TopicSubmissionForm({ topicId, topicConfig, existingSubmission }) {
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
    const [error, setError] = useState('');
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
        setError('');

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
            setError(err.message);
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
        setMembers([...members, memberData]);
    };

    return (
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-white rounded-xl shadow-xl overflow-hidden border border-gray-100 my-8">

            {/* Hero / Thumbnail Section */}
            <div className="relative h-48 sm:h-64 bg-gray-100 group">
                {!showCoverUrlInput && form.thumbnailUrl ? (
                    <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={form.thumbnailUrl} alt="Cover" className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
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
                                <span className="text-sm font-medium opacity-70">Add Cover Image</span>
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
                            <span className="whitespace-nowrap">Group</span>
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
                            <MemberSearchDialog onAddMember={addMemberFromDialog} topicId={topicId} />
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
                            <div>
                                <Label htmlFor="presentationLink" className="mb-1.5 block text-gray-600">Presentation Slides</Label>
                                <div className="flex gap-2 items-center">
                                    <div className="relative flex-1">
                                        <Input
                                            id="presentationLink" name="presentationLink"
                                            value={form.presentationLink} onChange={handleChange}
                                            placeholder="https://docs.google.com/presentation/..."
                                            className="pl-9"
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
                                                    <iframe src={getEmbedUrl(form.presentationLink)} className="w-full h-full absolute inset-0" frameBorder="0" allowFullScreen title="Preview" />
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
                                <div className="mt-1 h-6">
                                    {form.presentationLink && getLinkType(form.presentationLink) && <LinkBadge type={getLinkType(form.presentationLink)} />}
                                </div>
                            </div>

                            {/* Video */}
                            <div>
                                <Label htmlFor="videoLink" className="mb-1.5 block text-gray-600">Demo Video</Label>
                                <div className="flex gap-2 items-center">
                                    <div className="relative flex-1">
                                        <Input
                                            id="videoLink" name="videoLink"
                                            value={form.videoLink} onChange={handleChange}
                                            placeholder="https://youtube.com/..."
                                            className="pl-9"
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
                                                    <iframe src={getEmbedUrl(form.videoLink)} className="w-full h-full absolute inset-0" frameBorder="0" allowFullScreen title="Preview" />
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    )}
                                </div>
                                <div className="mt-1 h-6 flex items-center gap-2">
                                    {form.videoLink && getLinkType(form.videoLink) && <LinkBadge type={getLinkType(form.videoLink)} />}
                                    {videoTitle && <span className="text-xs text-gray-500 truncate max-w-[200px]">{videoTitle}</span>}
                                </div>
                            </div>

                            {/* Source Code */}
                            {config.includeSourceCode && (
                                <div className="space-y-2">
                                    <Label htmlFor="sourceCodeLink">Source Code (GitHub/GitLab)</Label>
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
                                    <div className="mt-1 h-6">
                                        {form.sourceCodeLink && getLinkType(form.sourceCodeLink) && (
                                            <LinkBadge type={getLinkType(form.sourceCodeLink)} />
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Dynamic Resource Inputs */}
                            {topicConfig?.resourceRequirements?.map((req, idx) => {
                                const resourceValue = form.resources.find(r => r.label === req.label)?.url || '';
                                return (
                                    <div key={idx} className="space-y-2">
                                        <Label>{req.label} {req.type !== 'url' && <span className="text-xs text-gray-400">({req.type})</span>}</Label>
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
                                                            <LinkIcon className="w-4 h-4 absolute left-3 top-3 text-gray-400" />}
                                            </div>

                                            {/* Preview Button (Right of Input) */}
                                            {(req.type === 'pdf' || req.type === 'doc' || req.type === 'image') && (
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            disabled={!resourceValue}
                                                            className={`h-10 w-10 ${!resourceValue ? 'text-gray-300' : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'}`}
                                                            title={req.type === 'image' ? 'Preview Image' : req.type === 'pdf' ? 'Preview PDF' : 'Preview Doc'}
                                                        >
                                                            {req.type === 'image' ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
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
                                                                    />
                                                                    <div className="absolute bottom-2 right-2 text-[10px] text-gray-500 bg-white/80 px-2 rounded pointer-events-none">
                                                                        Requires public link
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {req.type === 'image' && (
                                                                /* eslint-disable-next-line @next/next/no-img-element */
                                                                <img
                                                                    src={resourceValue}
                                                                    alt="Preview"
                                                                    className="max-h-[85vh] max-w-full rounded-lg shadow-2xl"
                                                                />
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
                                Additional Materials
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

                {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

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
