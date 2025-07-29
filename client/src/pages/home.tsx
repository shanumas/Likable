import { useState } from 'react';
import { Header } from '@/components/header';
import { ChatPanel } from '@/components/chat-panel';
import { PreviewPanel } from '@/components/preview-panel';
import { CodeModal } from '@/components/code-modal';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { useChat } from '@/hooks/use-chat';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(false);
  const { toast } = useToast();

  const {
    messages,
    isLoading,
    isSending,
    isGenerating,
    sendMessage,
    generateCode,
    createNewConversation,
    currentPrototype,
    error,
  } = useChat();

  const handleExport = () => {
    if (!currentPrototype) {
      toast({
        title: "No prototype to export",
        description: "Generate a prototype first before exporting.",
        variant: "destructive",
      });
      return;
    }

    const blob = new Blob([currentPrototype], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'likable-prototype.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: "Your prototype has been downloaded as an HTML file.",
    });
  };

  const handleSendMessage = async (message: string) => {
    try {
      await sendMessage(message);
    } catch (error) {
      toast({
        title: "Failed to send message",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateCode = async (prompt: string) => {
    try {
      await generateCode(prompt);
    } catch (error) {
      toast({
        title: "Failed to generate code",
        description: "Please check your API key and try again.",
        variant: "destructive",
      });
    }
  };

  const handleClearChat = () => {
    createNewConversation();
    toast({
      title: "Conversation cleared",
      description: "Started a new conversation.",
    });
  };

  return (
    <div className="h-screen flex flex-col bg-background text-slate-50 font-sans overflow-hidden">
      <Header onExport={handleExport} currentPrototype={currentPrototype} />
      
      <div className="flex-1 flex overflow-hidden">
        <ChatPanel
          messages={messages}
          isLoading={isLoading}
          isSending={isSending}
          isGenerating={isGenerating}
          onSendMessage={handleSendMessage}
          onGenerateCode={handleGenerateCode}
          onClearChat={handleClearChat}
          error={error}
        />
        
        <PreviewPanel
          htmlContent={currentPrototype}
          onViewCode={() => setIsCodeModalOpen(true)}
          isGenerating={isGenerating}
        />
      </div>

      {/* Mobile Preview Toggle */}
      <div className="lg:hidden fixed bottom-4 right-4">
        <Button
          onClick={() => setIsMobilePreviewOpen(true)}
          className="w-14 h-14 rounded-full bg-primary hover:bg-blue-600 shadow-lg"
        >
          <Eye className="w-6 h-6" />
        </Button>
      </div>

      {/* Mobile Preview Modal */}
      {isMobilePreviewOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-xl shadow-2xl w-full max-w-sm max-h-[80vh] flex flex-col">
            <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-50">Preview</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobilePreviewOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ×
              </Button>
            </div>
            <div className="flex-1 p-4">
              <div className="bg-white rounded-lg h-full overflow-hidden">
                {currentPrototype ? (
                  <iframe
                    srcDoc={currentPrototype}
                    className="w-full h-full"
                    title="Mobile Preview"
                    sandbox="allow-scripts allow-same-origin"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    No prototype generated yet
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <CodeModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        htmlContent={currentPrototype}
      />
    </div>
  );
}
