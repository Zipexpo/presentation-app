'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PresentationSettingsDialog({ topic, open, onOpenChange, onUpdate }) {
    const [loading, setLoading] = useState(false);
    const [config, setConfig] = useState({
        durationPerProject: topic.presentationConfig?.durationPerProject || 10,
        questionDuration: topic.presentationConfig?.questionDuration || 5,
        breakDuration: topic.presentationConfig?.breakDuration || 2,
        defaultResource: topic.presentationConfig?.defaultResource || 'presentation',
        feedbackVisibility: topic.presentationConfig?.feedbackVisibility || { teacher: true, student: true, guest: true }
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setConfig(prev => ({
            ...prev,
            [name]: name === 'defaultResource' ? value : (parseInt(value) || 0)
        }));
    };

    const handleVisibilityChange = (role) => {
        setConfig(prev => ({
            ...prev,
            feedbackVisibility: {
                ...prev.feedbackVisibility,
                [role]: !prev.feedbackVisibility?.[role]
            }
        }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            // We need to preserve other topic fields, so we do a partial update if the API supports it,
            // or we send the whole thing. The current API might expect the whole object or just fields.
            // Let's assume the standard PUT /api/teacher/topics/[id] updates provided fields.

            const res = await fetch(`/api/teacher/topics/${topic._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    presentationConfig: {
                        ...topic.presentationConfig,
                        ...config
                    }
                })
            });

            if (res.ok) {
                const updatedTopic = await res.json();
                if (onUpdate) onUpdate(updatedTopic);
                onOpenChange(false);
            } else {
                alert('Failed to update settings');
            }
        } catch (err) {
            console.error(err);
            alert('Error updating settings');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-slate-900 text-white border-slate-700">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        Presentation Settings
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Adjust timer durations for the session. Changes apply immediately.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="durationPerProject" className="text-right col-span-2 text-slate-300">
                            Presentation (min)
                        </Label>
                        <Input
                            id="durationPerProject"
                            name="durationPerProject"
                            type="number"
                            value={config.durationPerProject}
                            onChange={handleChange}
                            className="col-span-2 bg-slate-800 border-slate-600 text-white"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="questionDuration" className="text-right col-span-2 text-slate-300">
                            Q&A Duration (min)
                        </Label>
                        <Input
                            id="questionDuration"
                            name="questionDuration"
                            type="number"
                            value={config.questionDuration}
                            onChange={handleChange}
                            className="col-span-2 bg-slate-800 border-slate-600 text-white"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="breakDuration" className="text-right col-span-2 text-slate-300">
                            Break Duration (min)
                        </Label>
                        <Input
                            id="breakDuration"
                            name="breakDuration"
                            type="number"
                            value={config.breakDuration}
                            onChange={handleChange}
                            className="col-span-2 bg-slate-800 border-slate-600 text-white"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="defaultResource" className="text-right col-span-2 text-slate-300">
                            Default Resource
                        </Label>
                        <select
                            id="defaultResource"
                            name="defaultResource"
                            value={config.defaultResource}
                            onChange={handleChange}
                            className="col-span-2 bg-slate-800 border-slate-600 text-white h-10 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                        >
                            <option value="presentation">Presentation Slide</option>
                            <option value="video">Video</option>
                        </select>
                    </div>

                    <div className="border-t border-slate-700 pt-4 mt-2">
                        <h4 className="text-sm font-bold text-slate-300 mb-3">Identity Visibility</h4>
                        <div className="space-y-3">
                            {['teacher', 'student', 'guest'].map(role => (
                                <div key={role} className="flex items-center justify-between px-2">
                                    <Label htmlFor={`show-${role}`} className="capitalize text-slate-400 cursor-pointer">Show {role} Name</Label>
                                    <input
                                        id={`show-${role}`}
                                        type="checkbox"
                                        checked={config.feedbackVisibility?.[role] ?? true}
                                        onChange={() => handleVisibilityChange(role)}
                                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900 accent-blue-600"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-white">Cancel</Button>
                    <Button onClick={handleSave} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                        {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
