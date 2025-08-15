'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { transferDeviceOwnershipAction, removeDeviceOwnershipAction } from '@/lib/actions';

interface TransferDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  device: {
    id: string;
    username: string;
    agentName: string;
  } | null;
  agents: Array<{
    id: string;
    username: string;
  }>;
}

export default function TransferDeviceModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  device,
  agents 
}: TransferDeviceModalProps) {
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Handle clicking outside to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSuggestions]);

    async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!device || !selectedAgentId) return;

    setIsLoading(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('deviceId', device.id);
    formData.append('newAgentId', selectedAgentId);

    const result = await transferDeviceOwnershipAction(formData);

    if (result?.error) {
      setError(result.error);
    } else if (result?.success) {
      setSuccess(result.success);
      // Close modal and refresh data after a short delay
      setTimeout(() => {
        onClose();
        onSuccess();
        setSuccess('');
        setSelectedAgentId('');
        setSearchTerm('');
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }, 2000);
    }
    
    setIsLoading(false);
  }

  async function handleRemoveOwnership() {
    if (!device) return;

    setIsLoading(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('deviceId', device.id);

    const result = await removeDeviceOwnershipAction(formData);

    if (result?.error) {
      setError(result.error);
    } else if (result?.success) {
      setSuccess(result.success);
      // Close modal and refresh data after a short delay
      setTimeout(() => {
        onClose();
        onSuccess();
        setSuccess('');
        setSelectedAgentId('');
        setSearchTerm('');
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }, 2000);
    }
    
    setIsLoading(false);
  }

  function handleClose() {
    setSelectedAgentId('');
    setSearchTerm('');
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    setError('');
    setSuccess('');
    onClose();
  }

  if (!isOpen || !device) return null;

  // Filter out the current agent from the list
  const availableAgents = agents.filter(agent => agent.username !== device.agentName);

  // Filter agents based on search term
  const filteredAgents = availableAgents.filter(agent =>
    agent.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Find selected agent for display
  const selectedAgent = availableAgents.find(agent => agent.id === selectedAgentId);

  function handleAgentSelect(agent: { id: string; username: string }) {
    setSelectedAgentId(agent.id);
    setSearchTerm(agent.username);
    setShowSuggestions(false);
  }

  function handleSearchChange(value: string) {
    setSearchTerm(value);
    setShowSuggestions(value.length > 0);
    setHighlightedIndex(-1);
    
    // Clear selection if search doesn't match selected agent
    if (selectedAgent && !selectedAgent.username.toLowerCase().includes(value.toLowerCase())) {
      setSelectedAgentId('');
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showSuggestions || filteredAgents.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredAgents.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredAgents.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredAgents.length) {
          handleAgentSelect(filteredAgents[highlightedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        break;
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="max-w-md w-full mx-4">
        <Card>
          <CardHeader>
            <CardTitle>Cihaz Sahipliğini Yönet</CardTitle>
            <CardDescription>
              <strong>{device.username}</strong> cihazını başka bir firma tarafından kullanılabilir hale getirin, ya da sahipliği tamamen kaldırın
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <Label htmlFor="newAgent">Sahiplik Atama</Label>
                {availableAgents.length === 0 ? (
                  <div className="text-gray-500 text-sm p-3 border rounded">
                    Başka bir firma yok
                  </div>
                ) : (
                  <div className="relative" ref={autocompleteRef}>
                    <Input
                      id="newAgent"
                      type="text"
                      value={searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      onFocus={() => setShowSuggestions(searchTerm.length > 0)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type agent name..."
                      className="w-full"
                      disabled={isLoading}
                      autoComplete="off"
                    />
                    
                    {/* Autocomplete suggestions */}
                    {showSuggestions && filteredAgents.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredAgents.map((agent, index) => (
                          <button
                            key={agent.id}
                            type="button"
                            className={`w-full text-left px-3 py-2 focus:outline-none first:rounded-t-md last:rounded-b-md ${
                              index === highlightedIndex 
                                ? 'bg-blue-100 text-blue-900' 
                                : 'hover:bg-gray-100'
                            }`}
                            onClick={() => handleAgentSelect(agent)}
                            disabled={isLoading}
                          >
                            <div className="font-medium">{agent.username}</div>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Show "no results" when searching but no matches */}
                    {showSuggestions && searchTerm.length > 0 && filteredAgents.length === 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
                        <div className="px-3 py-2 text-gray-500 text-sm">
                          "{searchTerm}" ile eşleşen firma bulunamadı
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded text-sm text-yellow-800">
                <strong>Not:</strong> Sahiplik atama yapıldıktan sonra cihaz seçilen firma tarafından kullanılabilir hale getirilecektir. Sahiplik kaldırıldıktan sonra cihaz atanmamış olarak işaretlenecektir. Cihaz durumu her iki durumda da değişmeyecektir.
              </div>

              <div className="flex flex-col gap-2 pt-4">
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isLoading || !selectedAgentId || availableAgents.length === 0}
                  >
                    {isLoading ? 'Transfer Ediliyor...' : 'Sahiplik Atama'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={isLoading}
                  >
                    İptal Et
                  </Button>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="flex-1 border-t border-gray-200"></div>
                  <span className="text-xs text-gray-500 px-2">OR</span>
                  <div className="flex-1 border-t border-gray-200"></div>
                </div>
                
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleRemoveOwnership}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? 'Siliyor...' : 'Sahiplik Kaldır (Atanmamış Olarak İşaretle)'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
