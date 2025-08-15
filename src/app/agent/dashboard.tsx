"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { createDeviceAction, logoutAction } from "@/lib/actions";
import { User } from "@/lib/auth";
import PasswordChangeModal from "@/components/password-change-modal";

interface Device {
  id: string;
  username: string;
  password: string;
  status: "pending" | "active";
  createdAt: number;
}

interface AgentDashboardProps {
  user: User;
  devices: Device[];
}

export default function AgentDashboard({
  user,
  devices: initialDevices,
}: AgentDashboardProps) {
  const [devices, setDevices] = useState(initialDevices);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string>("");
  const [newDevice, setNewDevice] = useState<{
    username: string;
    password: string;
  } | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  async function handleCreateDevice() {
    setIsCreating(true);
    setError("");
    setNewDevice(null);

    const result = await createDeviceAction();

    if (result?.error) {
      setError(result.error);
    } else if (result?.device) {
      setNewDevice({
        username: result.device.username,
        password: result.device.password,
      });
      // Refresh the page to get updated devices list
      window.location.reload();
    }

    setIsCreating(false);
  }

  async function handleLogout() {
    await logoutAction();
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Firma Ekranı
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Hoşgeldiniz, {user.username}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowPasswordModal(true)}
                variant="outline"
              >
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
          {/* Create Device Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Yeni Cihaz Hesabı Oluştur</CardTitle>
              <CardDescription>
                Yeni bir cihaz oluşturun. Cihaz onay bekleyen olarak başlar ve bir yönetici tarafından onaylanacaktır.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-4">
                  {error}
                </div>
              )}

              {newDevice && (
                <div className="bg-green-50 border border-green-200 p-4 rounded-md mb-4">
                  <h4 className="font-medium text-green-800 mb-2">
                    Cihaz Başarıyla Oluşturuldu!
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Kullanıcı Adı:</span>{" "}
                      <span className="font-mono bg-white px-2 py-1 rounded border">
                        {newDevice.username}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Şifre:</span>{" "}
                      <span className="font-mono bg-white px-2 py-1 rounded border">
                        {newDevice.password}
                      </span>
                    </div>
                  </div>
                  <p className="text-green-700 text-xs mt-2">
                    ⚠️ Lütfen şifreleri kaydedin.
                  </p>
                </div>
              )}

              <Button onClick={handleCreateDevice} disabled={isCreating}>
                {isCreating ? "Oluşturuluyor..." : "Cihaz Hesabı Oluştur"}
              </Button>
            </CardContent>
          </Card>

          {/* Devices List */}
          <Card>
            <CardHeader>
              <CardTitle>Cihazlarınız</CardTitle>
              <CardDescription>
                Kayıtlı cihazlarınızı yönetin. Onay bekleyen cihazlar yönetici onayı gerektirir.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {devices.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Henüz cihaz kaydı yapılmadı.</p>
                  <p className="text-sm">
                    Yukarıdaki butonu kullanarak ilk cihazınızı oluşturun.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cihaz Kullanıcı Adı</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead>Oluşturulma Tarihi</TableHead>
                        <TableHead>Şifre</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {devices.map((device) => (
                        <TableRow key={device.id}>
                          <TableCell className="font-mono text-sm">
                            {device.username}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                device.status === "active"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {device.status === 'active' ? 'Aktif' : 'Onay Bekliyor'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {formatDate(device.createdAt)}
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                              {device.password}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Password Change Modal */}
      <PasswordChangeModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </div>
  );
}
