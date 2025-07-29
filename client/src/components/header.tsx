import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, Download, Wand2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface HeaderProps {
  onExport: () => void;
  currentPrototype: string | null;
}

export function Header({ onExport, currentPrototype }: HeaderProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const { toast } = useToast();

  const { data: health } = useQuery({
    queryKey: ['/api/health'],
    refetchInterval: 30000, // Check every 30 seconds
  });

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      // In a real implementation, you'd send this to the backend securely
      localStorage.setItem('openai_api_key', apiKey);
      toast({
        title: "API Key Saved",
        description: "Your OpenAI API key has been saved locally.",
      });
      setIsSettingsOpen(false);
      setApiKey('');
    }
  };

  const isApiConnected = (health as any)?.openaiConfigured || localStorage.getItem('openai_api_key');

  return (
    <header className="bg-surface border-b border-slate-700 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center">
          <Wand2 className="text-white w-4 h-4" />
        </div>
        <h1 className="text-xl font-semibold text-slate-50">Likable</h1>
      </div>
      
      <div className="flex items-center space-x-4">
        {/* API Key Status */}
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isApiConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-sm text-slate-400">
            {isApiConnected ? 'API Connected' : 'API Not Configured'}
          </span>
        </div>
        
        {/* Export Button */}
        <Button 
          onClick={onExport}
          disabled={!currentPrototype}
          className="bg-primary hover:bg-blue-600"
        >
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
        
        {/* Settings */}
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-200">
              <Settings className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-surface border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-slate-50">Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key" className="text-slate-200">OpenAI API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-slate-200"
                />
                <p className="text-xs text-slate-400">
                  Your API key is stored locally and used to generate prototypes.
                </p>
              </div>
              <Button onClick={handleSaveApiKey} className="w-full bg-primary hover:bg-blue-600">
                Save API Key
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </header>
  );
}
