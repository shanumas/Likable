import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Monitor, Tablet, Smartphone, RotateCcw, Code, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PreviewPanelProps {
  htmlContent: string | null;
  onViewCode: () => void;
  isGenerating: boolean;
}

type DeviceSize = 'desktop' | 'tablet' | 'mobile';

export function PreviewPanel({ htmlContent, onViewCode, isGenerating }: PreviewPanelProps) {
  const [deviceSize, setDeviceSize] = useState<DeviceSize>('desktop');
  const [refreshKey, setRefreshKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const getDeviceClass = () => {
    switch (deviceSize) {
      case 'mobile': return 'max-w-sm mx-auto';
      case 'tablet': return 'max-w-2xl mx-auto';
      default: return 'w-full';
    }
  };

  const getDeviceIcon = (size: DeviceSize) => {
    switch (size) {
      case 'mobile': return Smartphone;
      case 'tablet': return Tablet;
      default: return Monitor;
    }
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  useEffect(() => {
    if (htmlContent && iframeRef.current) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      
      if (doc) {
        doc.open();
        doc.write(htmlContent);
        doc.close();
      }
    }
  }, [htmlContent, refreshKey]);

  const defaultContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Preview</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-50 flex items-center justify-center min-h-screen">
        <div class="text-center p-8">
            <div class="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg class="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                </svg>
            </div>
            <h2 class="text-2xl font-bold text-gray-900 mb-4">Ready to Create</h2>
            <p class="text-gray-600 max-w-md mx-auto">
                Start a conversation with the AI assistant to generate your first prototype. 
                Describe what you want to build and watch it come to life here!
            </p>
        </div>
    </body>
    </html>
  `;

  return (
    <div className="hidden lg:flex lg:w-3/5 flex-col bg-slate-900">
      {/* Preview Header */}
      <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-slate-50">Live Preview</h2>
          <div className="flex items-center space-x-1 bg-slate-800 rounded-lg p-1">
            {(['desktop', 'tablet', 'mobile'] as DeviceSize[]).map((size) => {
              const Icon = getDeviceIcon(size);
              return (
                <Button
                  key={size}
                  variant={deviceSize === size ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setDeviceSize(size)}
                  className={cn(
                    "w-8 h-8 p-0",
                    deviceSize === size 
                      ? "bg-primary hover:bg-blue-600" 
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                  )}
                  title={`${size.charAt(0).toUpperCase() + size.slice(1)} View`}
                >
                  <Icon className="w-4 h-4" />
                </Button>
              );
            })}
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Refresh Preview */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            className="text-slate-400 hover:text-slate-200"
            title="Refresh Preview"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          
          {/* View Code */}
          <Button
            onClick={onViewCode}
            disabled={!htmlContent}
            variant="secondary"
            className="bg-slate-700 hover:bg-slate-600"
          >
            <Code className="w-4 h-4 mr-2" />
            View Code
          </Button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 p-6 overflow-auto">
        {/* Preview Frame */}
        <div className={cn("bg-white rounded-xl shadow-2xl h-full min-h-[600px] overflow-hidden transition-all duration-300", getDeviceClass())}>
          <iframe
            ref={iframeRef}
            className="w-full h-full"
            title="Prototype Preview"
            sandbox="allow-scripts allow-same-origin"
            srcDoc={htmlContent || defaultContent}
          />
        </div>
      </div>

      {/* Preview Status Bar */}
      <div className="px-6 py-3 border-t border-slate-700 flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={cn("w-2 h-2 rounded-full", htmlContent ? "bg-green-500" : "bg-slate-500")} />
            <span className="text-slate-400">
              {htmlContent ? 'Preview Active' : 'No Content'}
            </span>
          </div>
          {htmlContent && (
            <span className="text-slate-500">Ready for interaction</span>
          )}
        </div>
        <div className="flex items-center space-x-2 text-slate-500">
          <Eye className="w-3 h-3" />
          <span>Live Preview</span>
        </div>
      </div>
    </div>
  );
}
