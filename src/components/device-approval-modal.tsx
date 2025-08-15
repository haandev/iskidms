'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { approveDeviceAction } from '@/lib/actions';
import { Copy, Check } from 'lucide-react';

interface DeviceApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  device: {
    id: string;
    username: string;
    password: string;
    agentName: string;
  } | null;
}

export default function DeviceApprovalModal({ isOpen, onClose, onSuccess, device }: DeviceApprovalModalProps) {
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<'username' | 'password' | null>(null);

  async function handleConfirmApproval() {
    if (!device) return;

    setIsLoading(true);
    setError('');
    setSuccess('');

    const result = await approveDeviceAction(device.id);

    if (result?.error) {
      setError(result.error);
    } else if (result?.success) {
      setSuccess('Device approved successfully!');
      // Close modal and refresh data after a short delay
      setTimeout(() => {
        onClose();
        onSuccess();
        setSuccess('');
      }, 1500);
    }
    
    setIsLoading(false);
  }

  async function copyToClipboard(text: string, field: 'username' | 'password') {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      // Reset the copied state after 2 seconds
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  }

  function handleClose() {
    setError('');
    setSuccess('');
    setCopiedField(null);
    onClose();
  }

  if (!isOpen || !device) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="max-w-md w-full mx-4">
        <Card>
          <CardHeader>
            <CardTitle>Approve Device</CardTitle>
            <CardDescription>
              Review device credentials for <strong>{device.agentName}</strong> before approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
                  {error}
                </div>
              )}
              
              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative">
                  {success}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="deviceUsername">Device Username</Label>
                <div className="flex gap-2">
                  <Input
                    id="deviceUsername"
                    value={device.username}
                    readOnly
                    className="font-mono bg-gray-50"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(device.username, 'username')}
                    className="px-3"
                    disabled={isLoading}
                  >
                    {copiedField === 'username' ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="devicePassword">Device Password</Label>
                <div className="flex gap-2">
                  <Input
                    id="devicePassword"
                    value={device.password}
                    readOnly
                    className="font-mono bg-gray-50"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(device.password, 'password')}
                    className="px-3"
                    disabled={isLoading}
                  >
                    {copiedField === 'password' ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm text-blue-800">
                <strong>Note:</strong> Once approved, this device will be activated and ready for use by the agent.
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleConfirmApproval}
                  className="flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? 'Approving...' : 'Confirm Approval'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
