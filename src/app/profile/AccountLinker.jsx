'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Check, Link as LinkIcon, Loader2, Globe } from 'lucide-react';

export default function AccountLinker({ linkedProviders }) {
    const [linkingGoogle, setLinkingGoogle] = useState(false);
    const [linkingAzure, setLinkingAzure] = useState(false);

    const hasGoogle = linkedProviders.includes('google');
    const hasAzure = linkedProviders.includes('azure-ad');

    const handleLinkGoogle = async () => {
        setLinkingGoogle(true);
        // callbackUrl ensures we return right back to the profile page after the OAuth flow complete
        await signIn('google', { callbackUrl: '/profile?linked=google' }); 
    };

    const handleLinkAzure = async () => {
        setLinkingAzure(true);
        await signIn('azure-ad', { callbackUrl: '/profile?linked=microsoft' });
    };

    return (
        <div className="space-y-4">
            
            {/* Google Provider Link Card */}
            <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 font-bold text-xl text-blue-500">
                        G
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-800">Google Account</h3>
                        <p className="text-sm text-slate-500">Sign in using Google Secure OAuth.</p>
                    </div>
                </div>
                <div>
                    {hasGoogle ? (
                        <div className="flex items-center gap-2 text-emerald-600 font-semibold px-4 py-2 bg-emerald-50 rounded-lg border border-emerald-100">
                            <Check className="w-5 h-5" /> Linked
                        </div>
                    ) : (
                        <Button 
                            onClick={handleLinkGoogle} 
                            disabled={linkingGoogle || linkingAzure}
                            variant="outline" 
                            className="bg-white border-slate-300 hover:bg-slate-50 text-slate-700 shadow-sm"
                        >
                            {linkingGoogle ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LinkIcon className="w-4 h-4 mr-2" />}
                            Connect Google
                        </Button>
                    )}
                </div>
            </div>

            {/* Microsoft Provider Link Card */}
            <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">
                         <span className="text-[#00a4ef] font-bold text-xl leading-none">M</span>
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-800">Microsoft Account</h3>
                        <p className="text-sm text-slate-500">Sign in using Azure Active Directory.</p>
                    </div>
                </div>
                <div>
                    {hasAzure ? (
                        <div className="flex items-center gap-2 text-emerald-600 font-semibold px-4 py-2 bg-emerald-50 rounded-lg border border-emerald-100">
                            <Check className="w-5 h-5" /> Linked
                        </div>
                    ) : (
                        <Button 
                            onClick={handleLinkAzure} 
                            disabled={linkingGoogle || linkingAzure}
                            variant="outline" 
                            className="bg-white border-slate-300 hover:bg-slate-50 text-slate-700 shadow-sm"
                        >
                            {linkingAzure ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LinkIcon className="w-4 h-4 mr-2" />}
                            Connect Microsoft
                        </Button>
                    )}
                </div>
            </div>

        </div>
    );
}
