import { Label } from '@/components/ui/label';
import PresetManager from '@/components/teacher/PresetManager';
import SurveyEditor from '@/components/teacher/SurveyEditor';
import { useState } from 'react';
import FeedbackModal from '@/components/ui/FeedbackModal';

export default function EvaluationEditor({
    title = "Scoring Method",
    questions = [],
    onChange,
    className = ""
}) {
    const [feedback, setFeedback] = useState({ isOpen: false, type: 'info', title: '', message: '' });

    return (
        <div className={className}>
            <FeedbackModal
                isOpen={feedback.isOpen}
                type={feedback.type}
                title={feedback.title}
                message={feedback.message}
                onClose={() => setFeedback({ ...feedback, isOpen: false })}
            />

            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                    <Label className="font-medium text-slate-800">{title}</Label>
                    <PresetManager
                        type="survey"
                        currentConfig={questions}
                        onSave={() => setFeedback({ isOpen: true, type: 'success', title: 'Saved', message: 'Preset saved successfully.' })}
                        onLoad={(data) => {
                            onChange(data);
                            setFeedback({ isOpen: true, type: 'success', title: 'Loaded', message: 'Preset loaded successfully.' });
                        }}
                    />
                </div>
            </div>

            <SurveyEditor
                questions={questions}
                onChange={onChange}
            />
        </div>
    );
}
