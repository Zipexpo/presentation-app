'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import Papa from 'papaparse';

export default function ClassDetailPage() {
    const params = useParams();
    const [classData, setClassData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);

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
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setCsvFile(e.target.files[0]);
        }
    };



    // ... imports

    const handleImport = async () => {
        if (!csvFile) return;
        setImporting(true);
        setImportResult(null);

        Papa.parse(csvFile, {
            header: false,
            skipEmptyLines: true,
            encoding: "UTF-8", // ← force UTF-8
            complete: async (results) => {
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
                            name: cols[1]?.trim(),   // ✅ Vietnamese preserved
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

                try {
                    const res = await fetch(`/api/teacher/classes/${params.id}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ students }),
                    });
                    const data = await res.json();
                    setImportResult(data);
                    if (data.success) {
                        fetchClassData();
                        setCsvFile(null);
                    }
                } catch (err) {
                    setImportResult({ error: err.message });
                } finally {
                    setImporting(false);
                }
            },
            error: (error) => {
                setImportResult({ error: 'Failed to parse CSV: ' + error.message });
                setImporting(false);
            },
        });
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
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {classData.students.map(s => (
                                                <tr key={s._id} className="border-b last:border-0 hover:bg-gray-50">
                                                    <td className="p-3 font-mono text-gray-600">{s.studentId || '-'}</td>
                                                    <td className="p-3 font-medium">{s.name}</td>
                                                    <td className="p-3 text-gray-500">{s.email}</td>
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



                            <Button className="w-full" onClick={handleImport} disabled={!csvFile || importing}>
                                {importing ? 'Importing...' : 'Upload & Import'}
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
        </div>
    );
}
