'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { changeAgentPasswordAction, getAgentById } from '@/lib/actions';

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
  const [agentDetails, setAgentDetails] = useState<{
    company_name: string;
    email: string;
    phone: string;
    issuer_person: string;
  } | null>(null);

  // Fetch agent details when modal opens
  useEffect(() => {
    const fetchAgentDetails = async () => {
      if (agent?.id && isOpen) {
        try {
          const details = await getAgentById(agent.id);
          if (details) {
            setAgentDetails({
              company_name: details.company_name,
              email: details.email,
              phone: details.phone,
              issuer_person: details.issuer_person
            });
          }
        } catch (error) {
          console.error('Error fetching agent details:', error);
        }
      }
    };

    if (isOpen) {
      fetchAgentDetails();
    } else {
      // Clear details when modal closes
      setAgentDetails(null);
      setError('');
      setSuccess('');
    }
  }, [agent?.id, isOpen]);

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
            <CardTitle>Şifre Değiştir</CardTitle>
            <CardDescription>
              Şifre değiştirmek istediğiniz agent: <strong>{agent.username}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="companyName">Firma Adı</Label>
              <Input 
                id="company_name" 
                name="company_name" 
                value={agentDetails?.company_name || ''} 
                disabled 
                readOnly
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                name="email" 
                value={agentDetails?.email || ''} 
                disabled 
                readOnly
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input 
                id="phone" 
                name="phone" 
                value={agentDetails?.phone || ''} 
                disabled 
                readOnly
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="issuerPerson">Yetkili Kişi</Label>
              <Input 
                id="issuer_person" 
                name="issuer_person" 
                value={agentDetails?.issuer_person || ''} 
                disabled 
                readOnly
              />
            </div>
            
            
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
                <Label htmlFor="newPassword">Yeni Şifre</Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  required
                  disabled={isLoading}
                  placeholder="Yeni şifre giriniz (en az 6 karakter)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Yeni Şifre Tekrar</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  disabled={isLoading}
                  placeholder="Yeni şifre tekrarını giriniz"
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded text-sm text-yellow-800">
                <strong>Not:</strong> Agent tekrar giriş yapmak için yeniden giriş yapması gerekecektir.
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
