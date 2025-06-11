'use client';

import { useState, useEffect } from 'react';
import { DomainTable } from '@/components/admin/DomainTable';
import { AddDomainForm } from '@/components/admin/AddDomainForm';

export default function DomainManagementPage() {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDomains = async () => {
      try {
        const response = await fetch('/api/admin/domains');
        const data = await response.json();
        setDomains(data);
      } catch (error) {
        console.error('Failed to fetch domains:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDomains();
  }, []);

  const handleAddDomain = async (domainData) => {
    try {
      const response = await fetch('/api/admin/domains', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(domainData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add domain');
      }
      
      const newDomain = await response.json();
      setDomains([...domains, newDomain]);
    } catch (error) {
      console.error('Error adding domain:', error);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Allowed Domains Management</h1>
      
      <div className="grid gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Add New Domain</h2>
          <AddDomainForm onSubmit={handleAddDomain} />
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Allowed Domains</h2>
          <DomainTable domains={domains} loading={loading} />
        </div>
      </div>
    </div>
  );
}