import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Copy, Download, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  htmlContent: string | null;
}

export function CodeModal({ isOpen, onClose, htmlContent }: CodeModalProps) {
  const [activeTab, setActiveTab] = useState('preview');
  const { toast } = useToast();

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "Copied to clipboard",
        description: "Code has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard. Please copy manually.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    if (!htmlContent) return;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prototype.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Download started",
      description: "Your prototype has been downloaded as an HTML file.",
    });
  };

  const extractCSSFromHTML = (html: string): string => {
    const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    return styleMatch ? styleMatch[1].trim() : '';
  };

  const extractJSFromHTML = (html: string): string => {
    const scriptMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
    if (!scriptMatches) return '';
    
    return scriptMatches
      .map(script => script.replace(/<script[^>]*>|<\/script>/gi, ''))
      .filter(content => content.trim() && !content.includes('cdn.'))
      .join('\n\n');
  };

  const cleanHTML = (html: string): string => {
    // Remove style and script tags for HTML-only view
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .trim();
  };

  if (!htmlContent) return null;

  const cssContent = extractCSSFromHTML(htmlContent);
  const jsContent = extractJSFromHTML(htmlContent);
  const htmlOnly = cleanHTML(htmlContent);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[80vh] bg-surface border-slate-700 flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <DialogTitle className="text-slate-50">Generated Code</DialogTitle>
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => handleCopy(htmlContent)}
              variant="secondary"
              className="bg-slate-700 hover:bg-slate-600"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy All
            </Button>
            <Button
              onClick={handleDownload}
              className="bg-primary hover:bg-blue-600"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800">
            <TabsTrigger value="preview" className="data-[state=active]:bg-slate-700">
              Preview
            </TabsTrigger>
            <TabsTrigger value="html" className="data-[state=active]:bg-slate-700">
              HTML {htmlOnly && <Badge variant="secondary" className="ml-1 text-xs">✓</Badge>}
            </TabsTrigger>
            <TabsTrigger value="css" className="data-[state=active]:bg-slate-700">
              CSS {cssContent && <Badge variant="secondary" className="ml-1 text-xs">✓</Badge>}
            </TabsTrigger>
            <TabsTrigger value="js" className="data-[state=active]:bg-slate-700">
              JS {jsContent && <Badge variant="secondary" className="ml-1 text-xs">✓</Badge>}
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 relative mt-4">
            <TabsContent value="preview" className="absolute inset-0 m-0 p-0">
              <div className="bg-white rounded-lg h-full overflow-auto">
                <iframe
                  srcDoc={htmlContent}
                  className="w-full h-full"
                  title="Code Preview"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            </TabsContent>

            <TabsContent value="html" className="absolute inset-0 m-0 p-0">
              <div className="relative h-full">
                <Button
                  onClick={() => handleCopy(htmlContent)}
                  size="sm"
                  variant="secondary"
                  className="absolute top-2 right-2 z-10 bg-slate-700 hover:bg-slate-600"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </Button>
                <div className="bg-slate-900 rounded-lg h-full overflow-auto">
                  <pre className="p-4 text-sm font-mono text-slate-300 whitespace-pre-wrap break-words m-0">
{htmlContent}
                  </pre>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="css" className="absolute inset-0 m-0 p-0">
              <div className="relative h-full">
                {cssContent ? (
                  <>
                    <Button
                      onClick={() => handleCopy(cssContent)}
                      size="sm"
                      variant="secondary"
                      className="absolute top-2 right-2 z-10 bg-slate-700 hover:bg-slate-600"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                    <div className="bg-slate-900 rounded-lg h-full overflow-auto">
                      <pre className="p-4 text-sm font-mono text-slate-300 whitespace-pre-wrap break-words m-0">
{cssContent}
                      </pre>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full bg-slate-900 rounded-lg">
                    <p className="text-slate-400">No separate CSS found. Styles are included in HTML.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="js" className="absolute inset-0 m-0 p-0">
              <div className="relative h-full">
                {jsContent ? (
                  <>
                    <Button
                      onClick={() => handleCopy(jsContent)}
                      size="sm"
                      variant="secondary"
                      className="absolute top-2 right-2 z-10 bg-slate-700 hover:bg-slate-600"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                    <div className="bg-slate-900 rounded-lg h-full overflow-auto">
                      <pre className="p-4 text-sm font-mono text-slate-300 whitespace-pre-wrap break-words m-0">
{jsContent}
                      </pre>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full bg-slate-900 rounded-lg">
                    <p className="text-slate-400">No JavaScript found in this prototype.</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
