'use client';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Check, Info, AlertTriangle } from 'lucide-react';

export default function FeedbackModal({ isOpen, onClose, type = 'error', title, message }) {

    const config = {
        error: {
            icon: X,
            bgColor: 'bg-red-400',
            iconColor: 'text-white',
            buttonColor: 'bg-red-500 hover:bg-red-600',
            defaultTitle: 'Error'
        },
        success: {
            icon: Check,
            bgColor: 'bg-green-400',
            iconColor: 'text-white',
            buttonColor: 'bg-green-500 hover:bg-green-600',
            defaultTitle: 'Success'
        },
        warning: {
            icon: AlertTriangle,
            bgColor: 'bg-yellow-400',
            iconColor: 'text-white',
            buttonColor: 'bg-yellow-500 hover:bg-yellow-600',
            defaultTitle: 'Warning'
        },
        info: {
            icon: Info,
            bgColor: 'bg-blue-400',
            iconColor: 'text-white',
            buttonColor: 'bg-blue-500 hover:bg-blue-600',
            defaultTitle: 'Info Alert'
        }
    };

    const style = config[type] || config.error;
    const Icon = style.icon;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-none shadow-xl">
                <div className="flex flex-col items-center text-center bg-white rounded-lg">
                    {/* Top Section with large colored circle/icon */}
                    {/* We mimic the design: a large colored circle at the top-left or corner, but here let's center it or make it huge as per the "nice" design often implies a big icon */}

                    {/* Design interpretation: The image shows a large circle clipping the top left or just a large icon. 
                        Let's go with a centered clean modern look first: Big animated icon. 
                    */}
                    <div className={`w-full h-32 ${style.bgColor} flex items-center justify-center overflow-visible relative`}>
                        {/* 
                            We try to load the 3D character image. 
                            If it fails (not generated yet), we fall back to the icon.
                        */}
                        <img
                            src={`/characters/feedback_${type}.png`}
                            alt={`${type} character`}
                            className="w-32 h-32 object-contain animate-float drop-shadow-2xl absolute -bottom-6 z-10 transition-opacity duration-300"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextSibling.style.display = 'flex';
                            }}
                        />
                        <div className="bg-white/20 p-4 rounded-full backdrop-blur-sm animate-float hidden">
                            <Icon className={`w-16 h-16 ${style.iconColor}`} strokeWidth={3} />
                        </div>
                        {/* Fallback rendering logic: The img onError hides itself and shows the sibling div. 
                             But initially we need the div to be hidden if we assume image exists, 
                             OR we can use state. State is cleaner. Let's use state.
                         */}
                    </div>

                    <div className="p-6 w-full">
                        <DialogTitle className="text-2xl font-bold text-gray-800 mb-2">
                            {title || style.defaultTitle}
                        </DialogTitle>
                        <p className="text-gray-500 mb-6 leading-relaxed">
                            {message}
                        </p>

                        <Button
                            onClick={onClose}
                            className={`w-full ${style.buttonColor} text-white font-bold py-6 text-lg rounded-md transition-all shadow-md hover:shadow-lg`}
                        >
                            CLOSE
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
