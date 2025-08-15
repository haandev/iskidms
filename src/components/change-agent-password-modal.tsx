'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { changeAgentPasswordAction } from '@/lib/actions';

interface ChangeAgentPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  agent: {
    id: string;
    username: string;
  } | null;
}

export default function ChangeAgentPasswordModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  agent 
}: ChangeAgentPasswordModalProps) {
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    if (!agent) return;
    
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    // Add the agent ID to the form data
    formData.append('agentId', agent.id);
    
    const result = await changeAgentPasswordAction(formData);
    
    if (result?.error) {
      setError(result.error);
    } else if (result?.success) {
      setSuccess(result.success);
      // Clear form
      const form = document.getElementById('change-agent-password-form') as HTMLFormElement;
      form?.reset();
      // Close modal and refresh data after a short delay
      setTimeout(() => {
        onClose();
        onSuccess();
        setSuccess('');
      }, 2000);
    }
    
    setIsLoading(false);
  }

  if (!isOpen || !agent) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="max-w-md w-full mx-4">
        <Card>
          <CardHeader>
            <CardTitle>Change Agent Password</CardTitle>
            <CardDescription>
              Change password for agent: <strong>{agent.username}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form id="change-agent-password-form" action={handleSubmit} className="space-y-4">
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
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  required
                  disabled={isLoading}
                  placeholder="Enter new password (min 6 characters)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  disabled={isLoading}
                  placeholder="Confirm new password"
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded text-sm text-yellow-800">
                <strong>Note:</strong> The agent will be logged out and will need to log in again with the new password.
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? 'Değiştiriliyor...' : 'Şifre Değiştir'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
