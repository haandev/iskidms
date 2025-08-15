'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { approveDeviceAction, deleteDeviceAction, deleteAgentAction, logoutAction } from '@/lib/actions';
import { User } from '@/lib/auth';
import PasswordChangeModal from '@/components/password-change-modal';
import CreateAgentModal from '@/components/create-agent-modal';
import ChangeAgentPasswordModal from '@/components/change-agent-password-modal';
import TransferDeviceModal from '@/components/transfer-device-modal';

interface Device {
  id: string;
  username: string;
  password: string;
  status: 'pending' | 'active';
  createdAt: number;
  agentName: string;
}

interface Agent {
  id: string;
  username: string;
  role: string;
  createdAt: number;
  deviceCount: number;
}

interface AdminDashboardProps {
  user: User;
  pendingDevices: Device[];
  allDevices: Device[];
  allAgents: Agent[];
}

export default function AdminDashboard({ user, pendingDevices: initialPendingDevices, allDevices: initialAllDevices, allAgents: initialAllAgents }: AdminDashboardProps) {
  const [pendingDevices, setPendingDevices] = useState(initialPendingDevices);
  const [allDevices, setAllDevices] = useState(initialAllDevices);
  const [allAgents, setAllAgents] = useState(initialAllAgents);
  const [loadingDevice, setLoadingDevice] = useState<string | null>(null);
  const [loadingAgent, setLoadingAgent] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'agents' | 'unowned'>('pending');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCreateAgentModal, setShowCreateAgentModal] = useState(false);
  const [showChangeAgentPasswordModal, setShowChangeAgentPasswordModal] = useState(false);
  const [selectedAgentForPasswordChange, setSelectedAgentForPasswordChange] = useState<{id: string; username: string} | null>(null);
  const [showTransferDeviceModal, setShowTransferDeviceModal] = useState(false);
  const [selectedDeviceForTransfer, setSelectedDeviceForTransfer] = useState<{id: string; username: string; agentName: string} | null>(null);
  const [deviceFilter, setDeviceFilter] = useState<string>('');
  const [selectedAgent, setSelectedAgent] = useState<string>('');

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

  async function handleDeleteAgent(agentId: string) {
    if (!confirm('Are you sure you want to delete this agent? This will also delete all their devices. This action cannot be undone.')) {
      return;
    }
    
    setLoadingAgent(agentId);
    setError('');
    
    const result = await deleteAgentAction(agentId);
    
    if (result?.error) {
      setError(result.error);
    } else {
      // Refresh the page to get updated data
      window.location.reload();
    }
    
    setLoadingAgent(null);
  }

  async function handleCreateAgentSuccess() {
    // Refresh the page to get updated data
    window.location.reload();
  }

  function handleChangeAgentPassword(agent: {id: string; username: string}) {
    setSelectedAgentForPasswordChange(agent);
    setShowChangeAgentPasswordModal(true);
  }

  function handleChangeAgentPasswordSuccess() {
    // Refresh the page to get updated data
    window.location.reload();
  }

  function handleTransferDevice(device: {id: string; username: string; agentName: string}) {
    setSelectedDeviceForTransfer(device);
    setShowTransferDeviceModal(true);
  }

  function handleTransferDeviceSuccess() {
    // Refresh the page to get updated data
    window.location.reload();
  }

  function handleAgentDevicesClick(agentName: string) {
    setSelectedAgent(agentName);
    setActiveTab('all');
  }

  function clearFilters() {
    setDeviceFilter('');
    setSelectedAgent('');
  }

  async function handleLogout() {
    await logoutAction();
  }

  // Filter devices based on search and selected agent
  const filteredDevices = allDevices.filter(device => {
    const matchesSearch = deviceFilter === '' || 
      device.username.toLowerCase().includes(deviceFilter.toLowerCase()) ||
      (device.agentName && device.agentName.toLowerCase().includes(deviceFilter.toLowerCase())) ||
      (!device.agentName && 'unowned'.includes(deviceFilter.toLowerCase()));
    
    const matchesAgent = selectedAgent === '' || 
      device.agentName === selectedAgent ||
      (!device.agentName && selectedAgent === 'Unowned');
    
    return matchesSearch && matchesAgent;
  });

  // Filter pending devices based on search
  const filteredPendingDevices = pendingDevices.filter(device => {
    return deviceFilter === '' || 
      device.username.toLowerCase().includes(deviceFilter.toLowerCase()) ||
      (device.agentName && device.agentName.toLowerCase().includes(deviceFilter.toLowerCase())) ||
      (!device.agentName && 'unowned'.includes(deviceFilter.toLowerCase()));
  });

  // Filter unowned devices (both pending and approved)
  const unownedDevices = [...pendingDevices, ...allDevices].filter(device => !device.agentName);
  const filteredUnownedDevices = unownedDevices.filter(device => {
    return deviceFilter === '' || 
      device.username.toLowerCase().includes(deviceFilter.toLowerCase()) ||
      'unowned'.includes(deviceFilter.toLowerCase());
  });

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
            <div className="flex gap-2">
              <Button onClick={() => setShowPasswordModal(true)} variant="outline">
                Change Password
              </Button>
              <Button onClick={handleLogout} variant="outline">
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Agents</p>
                    <p className="text-2xl font-bold text-purple-600">{allAgents.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Unowned Devices</p>
                    <p className="text-2xl font-bold text-gray-600">{unownedDevices.length}</p>
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
                  Pending Approval ({filteredPendingDevices.length})
                </button>
                <button
                  onClick={() => setActiveTab('all')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'all'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  All Devices ({filteredDevices.length})
                </button>
                <button
                  onClick={() => setActiveTab('agents')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'agents'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Agents ({allAgents.length})
                </button>
                <button
                  onClick={() => setActiveTab('unowned')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'unowned'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Unowned ({filteredUnownedDevices.length})
                </button>
              </nav>
            </div>
          </div>

          {/* Filter Bar - Show for device tabs */}
          {(activeTab === 'pending' || activeTab === 'all' || activeTab === 'unowned') && (
            <div className="mb-6 flex gap-4 items-center">
              <div className="flex-1">
                <Input
                  placeholder="Search devices by name or agent..."
                  value={deviceFilter}
                  onChange={(e) => setDeviceFilter(e.target.value)}
                  className="max-w-md"
                />
              </div>
              {selectedAgent && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    Agent: {selectedAgent}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                  >
                    Clear Filter
                  </Button>
                </div>
              )}
              {(deviceFilter || selectedAgent) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                >
                  Clear All
                </Button>
              )}
            </div>
          )}

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
                {filteredPendingDevices.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {pendingDevices.length === 0 ? (
                      <p>No devices pending approval.</p>
                    ) : (
                      <p>No devices match your search criteria.</p>
                    )}
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
                        {filteredPendingDevices.map((device) => (
                          <TableRow key={device.id}>
                            <TableCell className="font-medium">
                              {device.agentName || 'Unowned'}
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
                {filteredDevices.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {allDevices.length === 0 ? (
                      <p>No devices in the system.</p>
                    ) : (
                      <p>No devices match your search criteria.</p>
                    )}
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
                        {filteredDevices.map((device) => (
                          <TableRow key={device.id}>
                            <TableCell className="font-medium">
                              {device.agentName || 'Unowned'}
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
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleTransferDevice({
                                    id: device.id,
                                    username: device.username,
                                    agentName: device.agentName
                                  })}
                                  disabled={loadingDevice === device.id}
                                >
                                  Transfer
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

          {activeTab === 'agents' && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Agents Management</CardTitle>
                    <CardDescription>
                      Manage system agents and their access.
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowCreateAgentModal(true)}>
                    Create Agent
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {allAgents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No agents in the system.</p>
                    <p className="text-sm">Create your first agent using the button above.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Username</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Devices</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allAgents.map((agent) => (
                          <TableRow key={agent.id}>
                            <TableCell className="font-medium">
                              {agent.username}
                              {agent.id === user.id && (
                                <span className="text-xs text-gray-500 ml-2">(You)</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="default">
                                {agent.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {agent.deviceCount > 0 ? (
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="h-auto p-0 text-blue-600 hover:text-blue-800"
                                  onClick={() => handleAgentDevicesClick(agent.username)}
                                >
                                  {agent.deviceCount} device{agent.deviceCount !== 1 ? 's' : ''}
                                </Button>
                              ) : (
                                <span className="text-gray-500 text-sm">0 devices</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-gray-500">
                              {formatDate(agent.createdAt)}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleChangeAgentPassword({id: agent.id, username: agent.username})}
                                  disabled={loadingAgent === agent.id}
                                >
                                  Change Password
                                </Button>
                                {agent.id !== user.id && (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDeleteAgent(agent.id)}
                                    disabled={loadingAgent === agent.id}
                                  >
                                    {loadingAgent === agent.id ? 'Deleting...' : 'Delete'}
                                  </Button>
                                )}
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

          {activeTab === 'unowned' && (
            <Card>
              <CardHeader>
                <CardTitle>Unowned Devices</CardTitle>
                <CardDescription>
                  Devices that currently have no assigned agent (both pending and approved).
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredUnownedDevices.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No unowned devices found.</p>
                    <p className="text-sm">All devices are currently assigned to agents.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Agent</TableHead>
                          <TableHead>Device Username</TableHead>
                          <TableHead>Device Password</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUnownedDevices.map((device) => (
                          <TableRow key={device.id}>
                            <TableCell className="font-medium">
                              Unowned
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {device.username}
                            </TableCell>
                            <TableCell className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                              {device.password}
                            </TableCell>
                            <TableCell>
                              <Badge variant={device.status === 'active' ? 'default' : 'secondary'}>
                                {device.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-gray-500">
                              {formatDate(device.createdAt)}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {device.status === 'pending' && (
                                  <>
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
                                  </>
                                )}
                                
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleTransferDevice({
                                    id: device.id,
                                    username: device.username,
                                    agentName: device.agentName
                                  })}
                                  disabled={loadingDevice === device.id}
                                >
                                  Assign Owner
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
        </div>
      </main>

      {/* Password Change Modal */}
      <PasswordChangeModal 
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />

      {/* Create Agent Modal */}
      <CreateAgentModal 
        isOpen={showCreateAgentModal}
        onClose={() => setShowCreateAgentModal(false)}
        onSuccess={handleCreateAgentSuccess}
      />

      {/* Change Agent Password Modal */}
      <ChangeAgentPasswordModal 
        isOpen={showChangeAgentPasswordModal}
        onClose={() => {
          setShowChangeAgentPasswordModal(false);
          setSelectedAgentForPasswordChange(null);
        }}
        onSuccess={handleChangeAgentPasswordSuccess}
        agent={selectedAgentForPasswordChange}
      />

      {/* Transfer Device Modal */}
      <TransferDeviceModal 
        isOpen={showTransferDeviceModal}
        onClose={() => {
          setShowTransferDeviceModal(false);
          setSelectedDeviceForTransfer(null);
        }}
        onSuccess={handleTransferDeviceSuccess}
        device={selectedDeviceForTransfer}
        agents={allAgents}
      />
    </div>
  );
}
