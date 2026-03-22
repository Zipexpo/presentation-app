import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ForbiddenPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-slate-50">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-red-100">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShieldAlert className="w-10 h-10 text-red-500" />
                </div>
                <h1 className="text-3xl font-bold text-slate-800 mb-2">403 - Forbidden</h1>
                <p className="text-slate-500 mb-8 leading-relaxed">
                    You do not have permission to access this page. This area is reserved for administrators only.
                </p>
                <Link href="/">
                    <Button className="w-full bg-slate-800 hover:bg-slate-900 text-white gap-2 py-6 rounded-xl">
                        <ArrowLeft className="w-4 h-4" /> Return to Home
                    </Button>
                </Link>
            </div>
        </div>
    );
}
