'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { approveDeviceAction, deleteDeviceAction, logoutAction } from '@/lib/actions';
import { User } from '@/lib/auth';

interface Device {
  id: string;
  username: string;
  password: string;
  status: 'pending' | 'active';
  createdAt: number;
  agentName: string;
}

interface AdminDashboardProps {
  user: User;
  pendingDevices: Device[];
  allDevices: Device[];
}

export default function AdminDashboard({ user, pendingDevices: initialPendingDevices, allDevices: initialAllDevices }: AdminDashboardProps) {
  const [pendingDevices, setPendingDevices] = useState(initialPendingDevices);
  const [allDevices, setAllDevices] = useState(initialAllDevices);
  const [loadingDevice, setLoadingDevice] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');

  async function handleApproveDevice(deviceId: string) {
    setLoadingDevice(deviceId);
    setError('');
    
    const result = await approveDeviceAction(deviceId);
    
    if (result?.error) {
      setError(result.error);
    } else {
      // Refresh the page to get updated data
      window.location.reload();
    }
    
    setLoadingDevice(null);
  }

  async function handleDeleteDevice(deviceId: string) {
    if (!confirm('Are you sure you want to delete this device? This action cannot be undone.')) {
      return;
    }
    
    setLoadingDevice(deviceId);
    setError('');
    
    const result = await deleteDeviceAction(deviceId);
    
    if (result?.error) {
      setError(result.error);
    } else {
      // Refresh the page to get updated data
      window.location.reload();
    }
    
    setLoadingDevice(null);
  }

  async function handleLogout() {
    await logoutAction();
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500">Welcome, {user.username}</p>
            </div>
            <Button onClick={handleLogout} variant="outline">
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending Approval</p>
                    <p className="text-2xl font-bold text-orange-600">{pendingDevices.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Devices</p>
                    <p className="text-2xl font-bold text-green-600">
                      {allDevices.filter(d => d.status === 'active').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Devices</p>
                    <p className="text-2xl font-bold text-blue-600">{allDevices.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-6">
              {error}
            </div>
          )}

          {/* Tab Navigation */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'pending'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Pending Approval ({pendingDevices.length})
                </button>
                <button
                  onClick={() => setActiveTab('all')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'all'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  All Devices ({allDevices.length})
                </button>
              </nav>
            </div>
          </div>

          {/* Content based on active tab */}
          {activeTab === 'pending' && (
            <Card>
              <CardHeader>
                <CardTitle>Pending Device Approvals</CardTitle>
                <CardDescription>
                  Review and approve or delete devices waiting for approval.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingDevices.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No devices pending approval.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Agent</TableHead>
                          <TableHead>Device Username</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingDevices.map((device) => (
                          <TableRow key={device.id}>
                            <TableCell className="font-medium">
                              {device.agentName}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {device.username}
                            </TableCell>
                            <TableCell className="text-sm text-gray-500">
                              {formatDate(device.createdAt)}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleApproveDevice(device.id)}
                                  disabled={loadingDevice === device.id}
                                >
                                  {loadingDevice === device.id ? 'Approving...' : 'Approve'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteDevice(device.id)}
                                  disabled={loadingDevice === device.id}
                                >
                                  {loadingDevice === device.id ? 'Deleting...' : 'Delete'}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'all' && (
            <Card>
              <CardHeader>
                <CardTitle>All Devices</CardTitle>
                <CardDescription>
                  View all devices in the system with their credentials.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {allDevices.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No devices in the system.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Agent</TableHead>
                          <TableHead>Device Username</TableHead>
                          <TableHead>Password</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allDevices.map((device) => (
                          <TableRow key={device.id}>
                            <TableCell className="font-medium">
                              {device.agentName}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {device.username}
                            </TableCell>
                            <TableCell className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                              {device.password}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={device.status === 'active' ? 'default' : 'secondary'}
                              >
                                {device.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-gray-500">
                              {formatDate(device.createdAt)}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteDevice(device.id)}
                                disabled={loadingDevice === device.id}
                              >
                                {loadingDevice === device.id ? 'Deleting...' : 'Delete'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
