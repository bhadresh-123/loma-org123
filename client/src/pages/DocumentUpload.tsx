import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUpTrayIcon, ArrowPathIcon, CheckCircleIcon, DocumentIcon } from '@heroicons/react/24/outline';
import { useClients } from "@/hooks/use-clients";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Document, DocumentTemplate } from "@/types/schema";
import { useToast } from "@/contexts/ToastContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

type DocumentCategory = {
  id: string;
  title: string;
  description: string;
};

const DEFAULT_CATEGORIES: DocumentCategory[] = [
  {
    id: "informed_consent",
    title: "Informed Consent",
    description: "Client acknowledgment and agreement to therapy terms and conditions"
  },
  {
    id: "privacy_policy",
    title: "Privacy Policy",
    description: "Details about how client information is collected, used, and protected"
  },
  {
    id: "hipaa_notice",
    title: "HIPAA Notice",
    description: "Authorization for use and disclosure of protected health information"
  },
  {
    id: "intake_form",
    title: "Intake Form",
    description: "Initial assessment and client background information"
  },
  {
    id: "telehealth_consent",
    title: "Telehealth Consent",
    description: "Consent for virtual therapy sessions and associated procedures"
  }
];

export default function DocumentUpload() {
  const { clients } = useClients();
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({});
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  const [downloadingDocId, setDownloadingDocId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch documents and templates
  const { data: documents = [], isLoading: isLoadingDocuments } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
    queryFn: async () => {
      const response = await fetch("/api/documents", {
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      // Ensure we return an array (handle both old and new response formats)
      return Array.isArray(data) ? data : (data.data || []);
    },
    onError: (error) => {
      console.error("Error fetching documents:", error);
    }
  });

  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery<DocumentTemplate[]>({
    queryKey: ["/api/document-templates/types/intake-docs"],
    queryFn: async () => {
      console.log("Fetching document templates from API...");
      const response = await fetch("/api/document-templates/types/intake-docs", {
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log("Templates received:", data);
      return data;
    },
    staleTime: 0, // Don't cache, always fetch fresh
    cacheTime: 0, // Don't cache at all
    onError: (error) => {
      console.error("Error fetching document templates:", error);
    }
  });

  // Handle template selection
  const useTemplateMutation = useMutation({
    mutationFn: async ({ type, title, content, templateId, patientId }: { type: string; title: string; content: string; templateId: number; patientId: number }) => {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          type,
          title,
          content,
          templateId,
          patientId
        }),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setTemplateDialogOpen(false);
      toast({
        title: "Success",
        description: "Template applied successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to apply template",
        variant: "destructive",
      });
    },
  });

  // Handle file upload
  const uploadMutation = useMutation({
    mutationFn: async ({ file, type, patientId }: { file: File; type: string; patientId: number }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      formData.append("title", file.name);
      formData.append("patientId", patientId.toString());

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload document",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, documentType: string) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFiles(prev => ({
        ...prev,
        [documentType]: file
      }));
    }
  };

  const handleUseTemplate = (template: DocumentTemplate) => {
    // Get the first client for now - you may want to add proper client selection
    const firstClient = clients[0];
    if (!firstClient) {
      toast({
        title: "Error",
        description: "No client selected",
        variant: "destructive",
      });
      return;
    }

    useTemplateMutation.mutateAsync({
      type: currentCategory!,
      title: template.title,
      content: template.content,
      templateId: template.id,
      patientId: firstClient.id
    });
  };

  const handleUpload = async (documentType: string) => {
    const file = selectedFiles[documentType];
    const firstClient = clients[0];

    if (!file || !firstClient) {
      toast({
        title: "Error",
        description: !file ? "No file selected" : "No client selected",
        variant: "destructive",
      });
      return;
    }

    await uploadMutation.mutateAsync({ 
      file, 
      type: documentType,
      patientId: firstClient.id
    });

    setSelectedFiles(prev => ({
      ...prev,
      [documentType]: null
    }));
  };

  const getDocumentStatus = (documentType: string) => {
    return documents.find(doc => doc.type === documentType);
  };

  const handleOpenTemplateDialog = (categoryId: string) => {
    setCurrentCategory(categoryId);
    setTemplateDialogOpen(true);
  };

  const handlePdfDownload = async (documentId: number, title: string) => {
    try {
      setDownloadingDocId(documentId);
      
      // Use fetch to check response before attempting download
      const response = await fetch(`/api/documents/${documentId}/pdf`, {
        credentials: "include"
      });

      // Check if request was successful
      if (!response.ok) {
        const contentType = response.headers.get('Content-Type');
        let errorMessage = 'Failed to download document';
        
        // Try to get error details from response
        if (contentType?.includes('application/json')) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch {
            // If JSON parsing fails, use status text
            errorMessage = response.statusText || errorMessage;
          }
        }
        
        // Show appropriate error based on status code
        if (response.status === 401) {
          toast({
            title: "Authentication Required",
            description: "Please log in to download this document.",
            variant: "destructive"
          });
        } else if (response.status === 404) {
          toast({
            title: "Document Not Found",
            description: "The requested document could not be found.",
            variant: "destructive"
          });
        } else if (response.status === 403) {
          toast({
            title: "Access Denied",
            description: "You don't have permission to download this document.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Download Failed",
            description: errorMessage,
            variant: "destructive"
          });
        }
        
        console.error('Download failed:', {
          status: response.status,
          statusText: response.statusText,
          documentId,
          errorMessage
        });
        
        return;
      }

      // Verify it's actually a PDF
      const contentType = response.headers.get('Content-Type');
      if (!contentType?.includes('application/pdf')) {
        toast({
          title: "Invalid File Type",
          description: "The server did not return a valid PDF file.",
          variant: "destructive"
        });
        console.error('Invalid content type:', contentType);
        return;
      }

      // Get the PDF blob and create download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Download Started",
        description: `Downloading ${title}.pdf`,
        variant: "default"
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred while downloading the document.",
        variant: "destructive"
      });
    } finally {
      setDownloadingDocId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-primary">Required Intake Documents</h1>
      </div>

      <div className="grid gap-6">
        {DEFAULT_CATEGORIES.map(category => {
          const uploadedDoc = getDocumentStatus(category.id);
          const selectedFile = selectedFiles[category.id];

          return (
            <Card key={category.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {category.title}
                  {uploadedDoc && (
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {category.description}
                </p>

                {uploadedDoc ? (
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DocumentIcon className="h-5 w-5" />
                        <span className="text-sm font-medium">{uploadedDoc.title}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(`/api/documents/${uploadedDoc.id}`, '_blank')}
                        >
                          View Online
                        </Button>
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => handlePdfDownload(uploadedDoc.id, uploadedDoc.title)}
                          disabled={downloadingDocId === uploadedDoc.id}
                        >
                          {downloadingDocId === uploadedDoc.id ? (
                            <>
                              <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                              Downloading...
                            </>
                          ) : (
                            'Download PDF'
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`file-${category.id}`} className="mb-2 block">Upload File</Label>
                      <div className="flex gap-2">
                        <Input
                          id={`file-${category.id}`}
                          type="file"
                          onChange={(e) => handleFileChange(e, category.id)}
                        />
                        <Button 
                          onClick={() => handleUpload(category.id)} 
                          disabled={!selectedFiles[category.id] || uploadMutation.isPending}
                        >
                          {uploadMutation.isPending ? (
                            <ArrowPathIcon className="h-4 w-4 animate-spin" />
                          ) : (
                            <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                          )}
                          Upload
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="mb-2 block">Or Use Template</Label>
                      <Button 
                        variant="outline" 
                        onClick={() => handleOpenTemplateDialog(category.id)}
                        disabled={isLoadingTemplates || clients.length === 0}
                      >
                        {isLoadingTemplates ? (
                          <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        ) : clients.length === 0 ? (
                          "No Clients - Create a Client First"
                        ) : (
                          "Select Template"
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Template</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px] mt-4">
            <div className="space-y-4">
              {templates.length > 0 ? (
                (() => {
                  console.log("Templates:", templates);
                  console.log("Current category:", currentCategory);
                  const filteredTemplates = templates.filter(template => template.type === currentCategory);
                  console.log("Filtered templates:", filteredTemplates);
                  return filteredTemplates;
                })()
                  .map(template => (
                    <div key={template.id} className="p-4 border rounded-lg hover:bg-muted">
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium">{template.title}</h3>
                        <Button onClick={() => handleUseTemplate(template)}>
                          Use Template
                        </Button>
                      </div>
                      <Separator className="my-2" />
                      <pre className="whitespace-pre-wrap text-sm text-muted-foreground mt-2 max-h-32 overflow-y-auto border rounded p-2">
                        {template.content}
                      </pre>
                    </div>
                  ))
              ) : clients.length === 0 ? (
                <div className="text-center p-4">
                  <p className="text-muted-foreground">Please create a client before using templates</p>
                </div>
              ) : (
                <div className="text-center p-4">
                  <p className="text-muted-foreground">No templates available for this document type</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}