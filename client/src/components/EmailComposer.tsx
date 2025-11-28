import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/contexts/ToastContext";
import { CheckCircleIcon, PaperClipIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { ClipboardIcon } from '@heroicons/react/24/outline';
interface Template {
  id: number;
  type: string;
  title: string;
  content: string;
}

interface Client {
  id: number;
  name: string;
  email: string;
}

interface Session {
  id: number;
  date: string;
}

interface EmailComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  session?: Session;
  onComplete?: () => void;
}

export default function EmailComposer({
  open,
  onOpenChange,
  client,
  session,
  onComplete
}: EmailComposerProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // Fetch document templates when component mounts
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch('/api/document-templates/types/intake-docs');
        if (response.ok) {
          const data = await response.json();
          setTemplates(data);
          // Select all templates by default
          setSelectedTemplates(data.map((t: Template) => t.id));
        } else {
          console.error('Failed to fetch templates');
        }
      } catch (error) {
        console.error('Error fetching templates:', error);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchTemplates();
      // Set default subject and body
      const sessionDate = session?.date 
        ? new Date(session.date).toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
          })
        : 'your upcoming session';
      
      setSubject(`Documents for your first session on ${sessionDate}`);
      setEmailBody(
`Dear ${client.name},

I'm looking forward to our first session on ${sessionDate}. To prepare, please complete the attached intake documents before our appointment.

These documents are important for establishing our professional relationship and helping me understand your needs better. Please take your time to read them carefully and complete all required fields.

If you have any questions about these forms or need assistance, please don't hesitate to reach out.

Looking forward to our work together,
[Your Name]
`);
    }
  }, [open, client, session]);

  const handleTemplateToggle = (templateId: number) => {
    setSelectedTemplates(prev => {
      if (prev.includes(templateId)) {
        return prev.filter(id => id !== templateId);
      } else {
        return [...prev, templateId];
      }
    });
  };

  const copyToClipboard = async () => {
    // Format email with subject for clipboard
    const emailContent = `Subject: ${subject}\n\n${emailBody}`;
    
    try {
      await navigator.clipboard.writeText(emailContent);
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: "Email content has been copied to your clipboard"
      });
      
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Could not copy to clipboard. Please try again.",
        variant: "destructive"
      });
    }
  };

  const openEmailClient = () => {
    const selectedTemplateNames = templates
      .filter(t => selectedTemplates.includes(t.id))
      .map(t => t.title)
      .join(", ");
      
    const mailtoLink = `mailto:${client.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody + "\n\nAttachments: " + selectedTemplateNames)}`;
    window.open(mailtoLink, '_blank');
  };

  const handleComplete = () => {
    onComplete?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Send Intake Documents</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="email-to">To</Label>
            <Input id="email-to" value={client.email} readOnly />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-subject">Subject</Label>
            <Input 
              id="email-subject" 
              value={subject} 
              onChange={(e) => setSubject(e.target.value)} 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-body">Email Body</Label>
            <Textarea 
              id="email-body" 
              rows={8} 
              value={emailBody} 
              onChange={(e) => setEmailBody(e.target.value)} 
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-base font-medium">Attachments</Label>
            
            {loading ? (
              <div className="py-2">Loading document templates...</div>
            ) : templates.length === 0 ? (
              <div className="text-muted-foreground py-2">No document templates available</div>
            ) : (
              <div className="space-y-2">
                {templates.map((template) => (
                  <Card key={template.id} className="overflow-hidden">
                    <CardHeader className="py-2 px-4 border-b bg-muted/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Checkbox 
                            id={`template-${template.id}`}
                            checked={selectedTemplates.includes(template.id)}
                            onCheckedChange={() => handleTemplateToggle(template.id)}
                          />
                          <CardTitle className="text-sm font-medium">{template.title}</CardTitle>
                        </div>
                        <PaperClipIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex justify-between items-center">
          <div className="flex gap-3">
            <Button 
              type="button" 
              onClick={copyToClipboard}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              {copied ? <CheckCircleIcon className="h-4 w-4" /> : <ClipboardIcon className="h-4 w-4" />}
              Copy
            </Button>
            <Button 
              type="button" 
              onClick={openEmailClient}
              size="sm"
              className="gap-2"
            >
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
              Open Email Client
            </Button>
          </div>
          <div className="flex gap-2">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleComplete}>Mark Task Complete</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}