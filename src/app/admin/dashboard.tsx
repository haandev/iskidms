'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { deleteDeviceAction, deleteAgentAction, logoutAction, createDeviceForAgentAction } from '@/lib/actions';
import { User } from '@/lib/auth';
import PasswordChangeModal from '@/components/password-change-modal';
import CreateAgentModal from '@/components/create-agent-modal';
import ChangeAgentPasswordModal from '@/components/change-agent-password-modal';
import TransferDeviceModal from '@/components/transfer-device-modal';
import CSVImportModal from '@/components/csv-import-modal';
import DeviceApprovalModal from '@/components/device-approval-modal';

export interface Device {
  id: string;
  username: string;
  password: string;
  status: 'pending' | 'active';
  createdAt: number;
  agentName: string;
}

export interface Agent {
  id: string;
  username: string;
  role: string;
  createdAt: number;
  deviceCount: number;
}

export interface AdminDashboardProps {
  user: User;
  pendingDevices: Device[];
  allDevices: Device[];
  allAgents: Agent[];
}

export default function AdminDashboard({ user, pendingDevices: initialPendingDevices, allDevices: initialAllDevices, allAgents: initialAllAgents }: AdminDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [showCSVImportModal, setShowCSVImportModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedDeviceForApproval, setSelectedDeviceForApproval] = useState<{id: string; username: string; password: string; agentName: string} | null>(null);
  const [deviceFilter, setDeviceFilter] = useState<string>('');
  const [selectedAgent, setSelectedAgent] = useState<string>('');

  // Initialize active tab from URL params
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') as 'pending' | 'all' | 'agents' | 'unowned';
    if (tabFromUrl && ['pending', 'all', 'agents', 'unowned'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // Function to update both state and URL
  const updateActiveTab = (tab: 'pending' | 'all' | 'agents' | 'unowned') => {
    setActiveTab(tab);
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('tab', tab);
    router.push(`/admin?${newParams.toString()}`, { scroll: false });
  };

  // Helper function to reload page while preserving current tab
  const reloadWithCurrentTab = () => {
    const currentParams = new URLSearchParams(window.location.search);
    currentParams.set('tab', activeTab);
    window.location.href = `/admin?${currentParams.toString()}`;
  };

  function handleApproveDevice(device: {id: string; username: string; password: string; agentName: string}) {
    setSelectedDeviceForApproval(device);
    setShowApprovalModal(true);
  }

  function handleApprovalSuccess() {
    // Refresh the page to get updated data while preserving tab
    reloadWithCurrentTab();
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
    // Refresh the page to get updated data while preserving tab
    reloadWithCurrentTab();
  }

  async function handleCSVImportSuccess() {
    // Refresh the page to get updated data with new unowned devices while preserving tab
    reloadWithCurrentTab();
  }

  function handleChangeAgentPassword(agent: {id: string; username: string}) {
    setSelectedAgentForPasswordChange(agent);
    setShowChangeAgentPasswordModal(true);
  }

  function handleChangeAgentPasswordSuccess() {
    // Refresh the page to get updated data while preserving tab
    reloadWithCurrentTab();
  }

  async function handleCreateDeviceForAgent(agentId: string, agentName: string) {
    setLoadingAgent(agentId);
    setError('');

    const formData = new FormData();
    formData.append('agentId', agentId);
    formData.append('agentName', agentName);

    const result = await createDeviceForAgentAction(formData);

    if (result?.error) {
      setError(result.error);
    } else if (result?.success) {
      // Refresh the page to show the new device while preserving tab
      reloadWithCurrentTab();
    }
    
    setLoadingAgent(null);
  }

  function handleTransferDevice(device: {id: string; username: string; agentName: string}) {
    setSelectedDeviceForTransfer(device);
    setShowTransferDeviceModal(true);
  }

  function handleTransferDeviceSuccess() {
    // Refresh the page to get updated data while preserving tab
    reloadWithCurrentTab();
  }

  function handleAgentDevicesClick(agentName: string) {
    setSelectedAgent(agentName);
    updateActiveTab('all');
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
      (!device.agentName && selectedAgent === 'Atanmamış');
    
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
  const unownedDevices = allDevices.filter(device => !device.agentName);

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
              <h1 className="text-3xl font-bold text-gray-900">Yönetici Ekranı</h1>
              <p className="mt-1 text-sm text-gray-500">Hoşgeldiniz, {user.username}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowPasswordModal(true)} variant="outline">
                Şifre Değiştir
              </Button>
              <Button onClick={handleLogout} variant="outline">
                Çıkış Yap
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
                    <p className="text-sm font-medium text-gray-600">Onay Bekleyen</p>
                    <p className="text-2xl font-bold text-orange-600">{pendingDevices.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Onaylı</p>
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
                    <p className="text-sm font-medium text-gray-600">Tümü</p>
                    <p className="text-2xl font-bold text-blue-600">{allDevices.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Firmalar</p>
                    <p className="text-2xl font-bold text-purple-600">{allAgents.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Atanmamış</p>
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
                  onClick={() => updateActiveTab('pending')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'pending'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Onay Bekleyen ({filteredPendingDevices.length})
                </button>
                <button
                  onClick={() => updateActiveTab('all')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'all'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Tümü ({filteredDevices.length})
                </button>
                <button
                  onClick={() => updateActiveTab('agents')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'agents'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Firmalar ({allAgents.length})
                </button>
                <button
                  onClick={() => updateActiveTab('unowned')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'unowned'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Atanmamış ({unownedDevices.length})
                </button>
              </nav>
            </div>
          </div>

          {/* Filter Bar - Show for device tabs */}
          {(activeTab === 'pending' || activeTab === 'all') && (
            <div className="mb-6 flex gap-4 items-center">
              <div className="flex-1">
                <Input
                  placeholder="Cihaz adı veya firma arama..."
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
                <CardTitle>Onay Bekleyen</CardTitle>
                <CardDescription>
                  Onay Bekleyen cihazları görüntüleyin ve onaylayın.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredPendingDevices.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {pendingDevices.length === 0 ? (
                      <p>
                        Onay Bekleyen cihaz bulunamadı.
                      </p>
                    ) : (
                      <p>
                        Arama kriterlerinize göre cihaz bulunamadı.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Firma</TableHead>
                          <TableHead>Cihaz Kullanıcı Adı</TableHead>
                          <TableHead>Oluşturulma Tarihi</TableHead>
                          <TableHead>İşlemler</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPendingDevices.map((device) => (
                          <TableRow key={device.id}>
                            <TableCell className="font-medium">
                              {device.agentName || 'Atanmamış'}
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
                                  onClick={() => handleApproveDevice({
                                    id: device.id,
                                    username: device.username,
                                    password: device.password,
                                    agentName: device.agentName || 'Atanmamış'
                                  })}
                                >
                                  Onayla
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteDevice(device.id)}
                                  disabled={loadingDevice === device.id}
                                >
                                  {loadingDevice === device.id ? 'Siliniyor...' : 'Sil'}
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
                <CardTitle>Tümü</CardTitle>
                <CardDescription>
                  Tümünü görüntüleyin ve kimlik bilgilerini görüntüleyin.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredDevices.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {allDevices.length === 0 ? (
                      <p>Sistemde cihaz bulunamadı.</p>
                    ) : (
                      <p>Arama kriterlerinize göre cihaz bulunamadı.</p>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Firma</TableHead>
                          <TableHead>Cihaz Kullanıcı Adı</TableHead>
                          <TableHead>Şifre</TableHead>
                          <TableHead>Durum</TableHead>
                          <TableHead>Oluşturulma Tarihi</TableHead>
                          <TableHead>İşlemler</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDevices.map((device) => (
                          <TableRow key={device.id}>
                            <TableCell className="font-medium">
                              {device.agentName || 'Atanmamış'}
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
                                {device.status === 'active' ? 'Aktif' : 'Onay Bekliyor'}
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
                                  Sahiplik Atama
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteDevice(device.id)}
                                  disabled={loadingDevice === device.id}
                                >
                                  {loadingDevice === device.id ? 'Siliniyor...' : 'Sil'}
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
                    <CardTitle>Firma Yönetimi</CardTitle>
                    <CardDescription>
                      Firmalari yönetin ve erişimlerini düzenleyin.
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowCreateAgentModal(true)}>
                    Firma Oluştur
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {allAgents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>
                      Firma bulunamadı.
                    </p>
                    <p className="text-sm">
                      Firma oluşturmak için yukarıdaki butona tıklayın.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Kullanıcı Adı</TableHead>
                          <TableHead>Cihazlar</TableHead>
                          <TableHead>Oluşturulma Tarihi</TableHead>
                          <TableHead>İşlemler</TableHead>
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
                              {agent.deviceCount > 0 ? (
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="h-auto p-0 text-blue-600 hover:text-blue-800"
                                  onClick={() => handleAgentDevicesClick(agent.username)}
                                >
                                  {agent.deviceCount} cihaz
                                </Button>
                              ) : (
                                <span className="text-gray-500 text-sm">Cihaz yok</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-gray-500">
                              {formatDate(agent.createdAt)}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleCreateDeviceForAgent(agent.id, agent.username)}
                                  disabled={loadingAgent === agent.id}
                                >
                                  {loadingAgent === agent.id ? 'Oluşturuluyor...' : 'Cihaz Hesabı Oluştur'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleChangeAgentPassword({id: agent.id, username: agent.username})}
                                  disabled={loadingAgent === agent.id}
                                >
                                  Şifre Değiştir
                                </Button>
                                {agent.id !== user.id && (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDeleteAgent(agent.id)}
                                    disabled={loadingAgent === agent.id}
                                  >
                                    {loadingAgent === agent.id ? 'Siliniyor...' : 'Sil'}
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
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Atanmamış</CardTitle>
                    <CardDescription>
Herhangi bir firmae atanmamış cihazlar                   </CardDescription>
                  </div>
                  <Button onClick={() => setShowCSVImportModal(true)}>
                    CSV İçe Aktar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {unownedDevices.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>
                      Atanmamış cihaz bulunamadı.
                    </p>
                    <p className="text-sm">
                      Tümü firmalere atanmıştır.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Firma</TableHead>
                          <TableHead>Cihaz Kullanıcı Adı</TableHead>
                          <TableHead>Cihaz Şifresi</TableHead>
                          <TableHead>Durum</TableHead>
                          <TableHead>Oluşturulma Tarihi</TableHead>
                          <TableHead>İşlemler</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {unownedDevices.map((device) => (
                          <TableRow key={device.id}>
                            <TableCell className="font-medium">
                              Atanmamış
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {device.username}
                            </TableCell>
                            <TableCell className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                              {device.password}
                            </TableCell>
                            <TableCell>
                              <Badge variant={device.status === 'active' ? 'default' : 'secondary'}>
                                {device.status === 'active' ? 'Aktif' : 'Onay Bekliyor'}
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
                                      onClick={() => handleApproveDevice({
                                        id: device.id,
                                        username: device.username,
                                        password: device.password,
                                        agentName: device.agentName || 'Atanmamış'
                                      })}
                                    >
                                      Onayla
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleDeleteDevice(device.id)}
                                      disabled={loadingDevice === device.id}
                                    >
                                      {loadingDevice === device.id ? 'Siliniyor...' : 'Sil'}
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
                                  Sahiplik Atama
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

      {/* CSV Import Modal */}
      <CSVImportModal 
        isOpen={showCSVImportModal}
        onClose={() => setShowCSVImportModal(false)}
        onSuccess={handleCSVImportSuccess}
      />

      {/* Device Approval Modal */}
      <DeviceApprovalModal 
        isOpen={showApprovalModal}
        onClose={() => {
          setShowApprovalModal(false);
          setSelectedDeviceForApproval(null);
        }}
        onSuccess={handleApprovalSuccess}
        device={selectedDeviceForApproval}
      />
    </div>
  );
}
