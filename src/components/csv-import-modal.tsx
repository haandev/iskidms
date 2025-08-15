'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { importDevicesFromCSVAction } from '@/lib/actions';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CSVImportModal({ isOpen, onClose, onSuccess }: CSVImportModalProps) {
  const [csvData, setCsvData] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!csvData.trim()) return;

    setIsLoading(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('csvData', csvData.trim());

    const result = await importDevicesFromCSVAction(formData);

    if (result?.error) {
      setError(result.error);
    } else if (result?.success) {
      setSuccess(result.success);
      // Close modal and refresh data after a short delay
      setTimeout(() => {
        onClose();
        onSuccess();
        setSuccess('');
        setCsvData('');
      }, 2000);
    }
    
    setIsLoading(false);
  }

  function handleClose() {
    setCsvData('');
    setError('');
    setSuccess('');
    onClose();
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setCsvData(content);
      };
      reader.readAsText(file);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="max-w-2xl w-full mx-4">
        <Card>
          <CardHeader>
            <CardTitle> Hesapları CSV dosyasından içe aktar</CardTitle>
            <CardDescription>
              Bir CSV dosyasından toplu olarak cihaz hesapları ekleyin. Tümü onaylı ve sahipsiz olarak eklenecektir.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
                  <pre className="whitespace-pre-wrap text-sm">{error}</pre>
                </div>
              )}
              
              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative">
                  {success}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="csvFile">CSV'yi dosyadan yükle</Label>
                <input
                  id="csvFile"
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="csvData">CSV Yapıştır</Label>
                <Textarea
                  id="csvData"
                  value={csvData}
                  onChange={(e) => setCsvData(e.target.value)}
                  placeholder="device1_username,device1_password&#10;device2_username,device2_password&#10;device3_username,device3_password"
                  className="min-h-40 font-mono text-sm"
                  required
                  disabled={isLoading}
                />
                <p className="text-sm text-gray-600">
                  Format: Her satır birer tane <code>username,password</code> içermelidir
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm text-blue-800">
                <strong>Format rehberi:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Satırlar: <code>device_username,device_password</code></li>
                  <li>Başlık gerekmemektedir</li>
                  <li>Boş satırlar es geçilir</li>
                  <li>Tümü <strong>sahipsiz</strong> ve <strong>onaylı</strong></li> eklenecektir
                  <li>Daha sonra sahiplik ataması yapabilirsiniz</li>
                </ul>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded text-sm text-yellow-800">
                <strong>Örneğin:</strong>
                <pre className="mt-1 font-mono text-xs">
camera_001,SecurePass123
sensor_002,MyPassword456
device_003,RandomKey789
                </pre>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isLoading || !csvData.trim()}
                >
                  {isLoading ? 'İçe aktarılıyor...' : 'İçe aktar'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  İptal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
