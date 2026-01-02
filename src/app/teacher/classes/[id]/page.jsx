'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import Link from 'next/link';
import Papa from 'papaparse';

export default function ClassDetailPage() {
    const params = useParams();
    const [classData, setClassData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(0); // 0 to 100
    const [resendingId, setResendingId] = useState(null);

    // UI State
    const [notification, setNotification] = useState(null); // { type: 'success'|'error', message: '' }
    const [confirmDialog, setConfirmDialog] = useState({ open: false, student: null });

    // CSV State
    const [csvFile, setCsvFile] = useState(null);
    const [encoding, setEncoding] = useState('auto'); // Default to auto
    const [importResult, setImportResult] = useState(null);

    useEffect(() => {
        fetchClassData();
    }, [params.id]);

    const fetchClassData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/teacher/classes/${params.id}`);
            const data = await res.json();
            if (res.ok) {
                setClassData(data);
            }
        } catch (error) {
            console.error('Failed to fetch class', error);
            setNotification({ type: 'error', message: 'Failed to fetch class details.' });
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setCsvFile(e.target.files[0]);
        }
    };

    const handleImport = async () => {
        if (!csvFile) return;
        setImporting(true);
        setImportProgress(10); // Start
        setImportResult(null);

        Papa.parse(csvFile, {
            header: false,
            skipEmptyLines: true,
            encoding: "UTF-8",
            complete: async (results) => {
                setImportProgress(30); // Parsed
                const lines = results.data;

                if (!lines || lines.length === 0) {
                    setImportResult({ error: 'No data found in CSV' });
                    setImporting(false);
                    return;
                }

                const startIndex =
                    lines[0][2]?.toLowerCase().includes('email') ? 1 : 0;

                const students = [];

                for (let i = startIndex; i < lines.length; i++) {
                    const cols = lines[i];
                    if (cols.length >= 3) {
                        students.push({
                            studentId: cols[0]?.trim(),
                            name: cols[1]?.trim(),
                            email: cols[2]?.trim(),
                            birthday: cols[3]?.trim() || null,
                        });
                    }
                }

                if (students.length === 0) {
                    setImportResult({ error: 'No valid students found in CSV' });
                    setImporting(false);
                    return;
                }

                setImportProgress(50); // Parsed & Ready to send

                // Chunking to prevent Serverless Timeout (10s)
                const PREFERRED_BATCH_SIZE = 5;
                const chunks = [];
                for (let i = 0; i < students.length; i += PREFERRED_BATCH_SIZE) {
                    chunks.push(students.slice(i, i + PREFERRED_BATCH_SIZE));
                }

                let totalAdded = 0;
                let totalErrors = [];
                let failedBatches = 0;

                for (let i = 0; i < chunks.length; i++) {
                    const chunk = chunks[i];
                    try {
                        const res = await fetch(`/api/teacher/classes/${params.id}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ students: chunk }),
                        });

                        const data = await res.json();
                        if (data.success) {
                            totalAdded += data.addedCount || 0;
                            if (data.errors) {
                                totalErrors = [...totalErrors, ...data.errors];
                            }
                        } else {
                            // If batch fails entirely, add a generic error for these students
                            failedBatches++;
                            totalErrors.push({ error: `Batch ${i + 1} failed: ${data.error || 'Unknown error'}` });
                        }
                    } catch (err) {
                        failedBatches++;
                        totalErrors.push({ error: `Network error on batch ${i + 1}: ${err.message}` });
                    }

                    // Update progress: 50% start + (50% * percentage done)
                    const percentComplete = 50 + Math.round(((i + 1) / chunks.length) * 50);
                    setImportProgress(percentComplete);
                }

                setImportResult({
                    success: failedBatches < chunks.length, // Considered success if at least some worked? Or standard: true if no fatal errors?
                    // Let's say: success if we added people or tried and got mostly warnings.
                    // If everything failed, it's false.
                    addedCount: totalAdded,
                    errors: totalErrors
                });

                if (totalAdded > 0) {
                    fetchClassData();
                    setCsvFile(null);
                    setNotification({
                        type: 'success',
                        message: `Process complete: Imported ${totalAdded} students. ${totalErrors.length > 0 ? `(${totalErrors.length} warnings)` : ''}`
                    });
                } else if (totalErrors.length > 0) {
                    setNotification({ type: 'error', message: 'Import failed for all students.' });
                }

                setImportProgress(100);
                setImporting(false);
                setTimeout(() => setImportProgress(0), 3000);
            },
            error: (error) => {
                setImportResult({ error: 'Failed to parse CSV: ' + error.message });
                setImporting(false);
                setNotification({ type: 'error', message: 'CSV Parse Error: ' + error.message });
            },
        });
    };

    const handleResendEmail = (student) => {
        setConfirmDialog({ open: true, student });
    };

    const confirmResend = async () => {
        const student = confirmDialog.student;
        if (!student) return;

        setConfirmDialog({ open: false, student: null });
        setResendingId(student._id);

        try {
            const res = await fetch('/api/teacher/users/resend-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: student._id, classId: params.id })
            });
            const data = await res.json();
            if (res.ok) {
                setNotification({ type: 'success', message: `Email sent successfully to ${student.name}!` });
                fetchClassData(); // Refresh component
            } else {
                setNotification({ type: 'error', message: data.error || 'Failed to send email' });
            }
        } catch (error) {
            console.error(error);
            setNotification({ type: 'error', message: 'Error sending email. Please try again.' });
        } finally {
            setResendingId(null);
            setTimeout(() => setNotification((prev) => prev?.type === 'success' ? null : prev), 5000);
        }
    };

    const downloadTemplate = () => {
        const csvContent = "\uFEFFStudent ID,Name,Email,Birthday(DD/MM/YYYY)\nID001,John Doe,john@school.edu,25/12/2000\nID002,Jane Smith,jane@school.edu,";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "class_import_template.csv";
        a.click();
    };

    if (loading) return <div className="p-6">Loading...</div>;
    if (!classData) return <div className="p-6">Class not found</div>;

    return (
        <div className="container mx-auto p-6 max-w-5xl">
            <div className="mb-6 flex gap-4 items-center">
                <Link href="/teacher/classes" className="text-blue-500 hover:underline">← Back to Classes</Link>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
                <h1 className="text-3xl font-bold mb-2">{classData.name}</h1>
                <p className="text-gray-500">Manage students and settings.</p>
            </div>

            {notification && (
                <div className="mb-6">
                    <Alert variant={notification.type === 'error' ? 'destructive' : 'default'} className={notification.type === 'success' ? 'border-green-500 text-green-700 bg-green-50' : ''}>
                        {notification.type === 'success' && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle mr-2"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
                        )}
                        <AlertTitle>{notification.type === 'success' ? 'Success' : 'Error'}</AlertTitle>
                        <AlertDescription>{notification.message}</AlertDescription>
                    </Alert>
                </div>
            )}

            <div className="grid gap-8 md:grid-cols-3">
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Students ({classData.students?.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {classData.students && classData.students.length > 0 ? (
                                <div className="border rounded-md overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 text-gray-700">
                                            <tr>
                                                <th className="p-3 border-b">ID</th>
                                                <th className="p-3 border-b">Name</th>
                                                <th className="p-3 border-b">Email</th>
                                                <th className="p-3 border-b">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {classData.students.map(s => (
                                                <tr key={s._id} className="border-b last:border-0 hover:bg-gray-50 group">
                                                    <td className="p-3 font-mono text-gray-600">{s.studentId || '-'}</td>
                                                    <td className="p-3 font-medium">{s.name}</td>
                                                    <td className="p-3 text-gray-500">
                                                        <div className="flex items-center gap-2">
                                                            {s.email}
                                                            {s.accountCreationEmailSent ? (
                                                                <span title="Email sent" className="text-green-500">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle-2"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
                                                                </span>
                                                            ) : (
                                                                <span title="Email not sent" className="text-amber-500">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-circle"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <Button
                                                            variant="outline"
                                                            size="xs"
                                                            className="h-7 text-xs"
                                                            onClick={() => handleResendEmail(s)}
                                                            disabled={resendingId === s._id}
                                                        >
                                                            {resendingId === s._id ? 'Sending...' : 'Resend Email'}
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-gray-500 italic">No students in this class yet.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Import Students</CardTitle>
                            <CardDescription>Bulk add students via CSV.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Select CSV File</Label>
                                <Input type="file" accept=".csv" onChange={handleFileChange} />
                            </div>

                            {importing && (
                                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                                    <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${importProgress}%` }}></div>
                                </div>
                            )}

                            <Button className="w-full" onClick={handleImport} disabled={!csvFile || importing}>
                                {importing ? `Importing... ${importProgress}%` : 'Upload & Import'}
                            </Button>

                            {importResult && (
                                <div className={`mt-2 p-3 text-sm rounded ${importResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                    {importResult.success ? (
                                        <>
                                            <p className="font-bold">Success!</p>
                                            <p>Added {importResult.addedCount} students.</p>
                                            {importResult.errors?.length > 0 && (
                                                <div className="mt-2 text-xs">
                                                    <p className="font-semibold">Warnings:</p>
                                                    <ul className="list-disc pl-4">
                                                        {importResult.errors.map((e, i) => (
                                                            <li key={i}>{e.error} ({e.student.email})</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <p>{importResult.error}</p>
                                    )}
                                </div>
                            )}

                            <Button variant="outline" size="sm" className="w-full" onClick={downloadTemplate}>
                                Download Template
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Confirmation Dialog */}
            <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Resend Credientials</DialogTitle>
                        <DialogDescription>
                            This will <strong>reset the password</strong> for <strong>{confirmDialog.student?.name}</strong> and send them a new welcome email.
                            <br /><br />
                            Are you sure you want to proceed?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmDialog({ open: false, student: null })}>Cancel</Button>
                        <Button onClick={confirmResend}>Yes, Resend Email</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
