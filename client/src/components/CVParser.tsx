import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/contexts/ToastContext";
import { DocumentTextIcon, CalendarIcon, CheckIcon, XMarkIcon, MapIcon, AcademicCapIcon, PencilIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { BuildingOfficeIcon, BriefcaseIcon, TrashIcon } from '@heroicons/react/24/outline';
import { format } from "@/utils/dateFnsCompat";

interface ParsedEducation {
  id: number;
  university: string;
  degree: string;
  major: string;
  startDate: string | null;
  endDate: string | null;
  graduationDate?: string | null;
  gpa?: string | null;
  honors?: string | null;
  isVerified: boolean;
}

interface ParsedWorkExperience {
  id: number;
  organization: string;
  position: string;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  description?: string | null;
  responsibilities?: string[] | null;
  achievements?: string[] | null;
  isVerified: boolean;
}

interface CVParserData {
  hasParsedData: boolean;
  education: ParsedEducation[];
  workExperience: ParsedWorkExperience[];
}

export function CVParser() {
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [parseForCredentialing, setParseForCredentialing] = useState(false);
  const [isParsingLoading, setIsParsingLoading] = useState(false);
  const [isCaqhStarting, setIsCaqhStarting] = useState(false);
  const [editingEducation, setEditingEducation] = useState<ParsedEducation | null>(null);
  const [editingWork, setEditingWork] = useState<ParsedWorkExperience | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  console.log('CVParser component rendered');

  // Fetch parsed CV data
  const { data: cvData, isLoading, error } = useQuery<CVParserData>({
    queryKey: ["cv-parser-data"],
    queryFn: async () => {
      console.log("Fetching CV parser data...");
      const response = await fetch("/api/cv-parser/data", {
        credentials: "include",
      });
      console.log("CV parser data response:", response.status, response.statusText);
      if (!response.ok) {
        if (response.status === 401) {
          console.warn("Authentication issue with CV parser - returning default data");
          // Return default empty data for auth issues
          return {
            hasParsedData: false,
            education: [],
            workExperience: []
          };
        }
        const errorData = await response.json();
        console.error("CV parser data fetch failed:", errorData);
        throw new Error(errorData.message || "Failed to fetch CV data");
      }
      const data = await response.json();
      console.log("CV parser data received:", data);
      return data;
    },
    retry: false,
    refetchOnWindowFocus: false,
    enabled: true // Always try to fetch
  });

  // Parse CV mutation
  const parseCV = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("cv", file);
      
      const response = await fetch("/api/cv-parser/parse", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to parse CV");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "CV parsed successfully for credentialing",
      });
      queryClient.invalidateQueries({ queryKey: ["cv-parser-data"] });
      setCvFile(null);
      setParseForCredentialing(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update education mutation
  const updateEducation = useMutation({
    mutationFn: async (data: ParsedEducation) => {
      const response = await fetch(`/api/cv-parser/education/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to update education entry");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Education entry updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["cv-parser-data"] });
      setEditingEducation(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update work experience mutation
  const updateWorkExperience = useMutation({
    mutationFn: async (data: ParsedWorkExperience) => {
      const response = await fetch(`/api/cv-parser/work-experience/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to update work experience entry");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Work experience entry updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["cv-parser-data"] });
      setEditingWork(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleParseCV = async () => {
    if (!cvFile || !parseForCredentialing) {
      toast({
        title: "Error",
        description: "Please select a CV file and check the credentialing parse option",
        variant: "destructive",
      });
      return;
    }

    setIsParsingLoading(true);
    try {
      await parseCV.mutateAsync(cvFile);
    } finally {
      setIsParsingLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Present";
    try {
      return format(new Date(dateStr), "MMM yyyy");
    } catch {
      return dateStr;
    }
  };

  const EducationEditDialog = ({ education }: { education: ParsedEducation }) => (
    <Dialog open={editingEducation?.id === education.id} onOpenChange={() => setEditingEducation(null)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Education Entry</DialogTitle>
          <DialogDescription>Update the education information extracted from your CV</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="university">University</Label>
              <Input
                id="university"
                value={editingEducation?.university || ""}
                onChange={(e) => setEditingEducation(prev => prev ? { ...prev, university: e.target.value } : null)}
              />
            </div>
            <div>
              <Label htmlFor="degree">Degree</Label>
              <Input
                id="degree"
                value={editingEducation?.degree || ""}
                onChange={(e) => setEditingEducation(prev => prev ? { ...prev, degree: e.target.value } : null)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="major">Major</Label>
            <Input
              id="major"
              value={editingEducation?.major || ""}
              onChange={(e) => setEditingEducation(prev => prev ? { ...prev, major: e.target.value } : null)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={editingEducation?.startDate?.split('T')[0] || ""}
                onChange={(e) => setEditingEducation(prev => prev ? { ...prev, startDate: e.target.value } : null)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={editingEducation?.endDate?.split('T')[0] || ""}
                onChange={(e) => setEditingEducation(prev => prev ? { ...prev, endDate: e.target.value } : null)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="gpa">GPA (Optional)</Label>
              <Input
                id="gpa"
                value={editingEducation?.gpa || ""}
                onChange={(e) => setEditingEducation(prev => prev ? { ...prev, gpa: e.target.value } : null)}
              />
            </div>
            <div>
              <Label htmlFor="honors">Honors (Optional)</Label>
              <Input
                id="honors"
                value={editingEducation?.honors || ""}
                onChange={(e) => setEditingEducation(prev => prev ? { ...prev, honors: e.target.value } : null)}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setEditingEducation(null)}>Cancel</Button>
            <Button onClick={() => editingEducation && updateEducation.mutate(editingEducation)}>
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  const WorkEditDialog = ({ work }: { work: ParsedWorkExperience }) => (
    <Dialog open={editingWork?.id === work.id} onOpenChange={() => setEditingWork(null)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Work Experience</DialogTitle>
          <DialogDescription>Update the work experience information extracted from your CV</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="organization">Organization</Label>
              <Input
                id="organization"
                value={editingWork?.organization || ""}
                onChange={(e) => setEditingWork(prev => prev ? { ...prev, organization: e.target.value } : null)}
              />
            </div>
            <div>
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                value={editingWork?.position || ""}
                onChange={(e) => setEditingWork(prev => prev ? { ...prev, position: e.target.value } : null)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={editingWork?.location || ""}
              onChange={(e) => setEditingWork(prev => prev ? { ...prev, location: e.target.value } : null)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={editingWork?.startDate?.split('T')[0] || ""}
                onChange={(e) => setEditingWork(prev => prev ? { ...prev, startDate: e.target.value } : null)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={editingWork?.endDate?.split('T')[0] || ""}
                onChange={(e) => setEditingWork(prev => prev ? { ...prev, endDate: e.target.value } : null)}
                disabled={editingWork?.isCurrent}
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isCurrent"
              checked={editingWork?.isCurrent || false}
              onCheckedChange={(checked) => 
                setEditingWork(prev => prev ? { ...prev, isCurrent: !!checked, endDate: checked ? null : prev.endDate } : null)
              }
            />
            <Label htmlFor="isCurrent">This is my current position</Label>
          </div>
          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={editingWork?.description || ""}
              onChange={(e) => setEditingWork(prev => prev ? { ...prev, description: e.target.value } : null)}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setEditingWork(null)}>Cancel</Button>
            <Button onClick={() => editingWork && updateWorkExperience.mutate(editingWork)}>
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading CV data...</div>;
  }

  if (error && !error.message.includes("Not authenticated")) {
    console.error("CV Parser error:", error);
    return (
      <Alert>
        <AlertDescription>
          Error loading CV parser: {error.message}. Please refresh the page or try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* CV Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DocumentTextIcon className="h-5 w-5" />
            CV Parser for Credentialing
          </CardTitle>
          <CardDescription>
            Upload your CV and enable parsing to extract education and work experience data for credentialing purposes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cv-file">Upload CV</Label>
            <Input
              id="cv-file"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setCvFile(e.target.files?.[0] || null)}
            />
            <p className="text-sm text-muted-foreground">
              Supported formats: PDF, DOC, DOCX (max 10MB)
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="parse-credentialing"
              checked={parseForCredentialing}
              onCheckedChange={setParseForCredentialing} />
            <Label htmlFor="parse-credentialing" className="text-sm font-medium">
              Parse for Credentialing
            </Label>
          </div>

          {parseForCredentialing && (
            <Alert>
              <AlertDescription>
                When enabled, your CV will be processed using AI to extract education and work experience data.
                This data will be stored in your profile and can be edited for accuracy.
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleParseCV}
            disabled={!cvFile || !parseForCredentialing || isParsingLoading}
            className="w-full"
          >
            {isParsingLoading ? "Parsing CV..." : "Parse CV for Credentialing"}
          </Button>
        </CardContent>
      </Card>

      {/* Parsed Data Display */}
      {cvData?.hasParsedData && (
        <div className="space-y-6">
          {/* Experiment CTA: Create CAQH profile */}
          {import.meta.env.VITE_EXPERIMENT_CAQH_AUTOFILL === 'true' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckIcon className="h-5 w-5" />
                  Register for CAQH (Experiment)
                </CardTitle>
                <CardDescription>
                  Opens a secure Browserbase session to help you register for CAQH. We'll automatically fill your registration form with information from your CV.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={async () => {
                    setIsCaqhStarting(true);
                    
                    // Open tab IMMEDIATELY (synchronously) to avoid popup blocker
                    // We'll navigate it to the Live View URL once we get the response
                    const newTab = window.open('about:blank', '_blank');
                    
                    try {
                      // Send CV data to backend for autofill
                      const res = await fetch('/api/experiments/caqh/start', {
                        method: 'POST',
                        credentials: 'include',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          cvData: {
                            education: cvData?.education || [],
                            workExperience: cvData?.workExperience || [],
                          },
                        }),
                      });
                      
                      if (!res.ok) {
                        // Close the blank tab since we failed
                        newTab?.close();
                        const error = await res.json();
                        const errorMsg = error.details ? `${error.error}: ${error.details}` : (error.error || 'Failed to start CAQH session');
                        throw new Error(errorMsg);
                      }
                      
                      const data = await res.json();
                      
                      if (data.liveViewUrl && newTab) {
                        // Navigate the already-open tab to the Live View URL
                        newTab.location.href = data.liveViewUrl;
                        
                        // Show success message with instructions
                        toast({
                          title: "CAQH Session Started",
                          description: "A new tab has opened with the CAQH login page. Please log in with your credentials. The form will be auto-filled after you log in.",
                        });
                      } else if (!newTab) {
                        toast({
                          title: "Popup Blocked",
                          description: "Please allow popups for this site and try again.",
                          variant: "destructive",
                        });
                      }
                    } catch (e: any) {
                      // Make sure to close the blank tab on error
                      newTab?.close();
                      console.error('CAQH start failed', e);
                      toast({
                        title: "Error",
                        description: e.message || "Failed to start CAQH autofill session",
                        variant: "destructive",
                      });
                    } finally {
                      setIsCaqhStarting(false);
                    }
                  }}
                  disabled={isCaqhStarting || !cvData?.hasParsedData}
                >
                  {isCaqhStarting ? 'Starting...' : 'Start CAQH Autofill'}
                </Button>
                {!cvData?.hasParsedData && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Please parse a CV first to enable CAQH autofill
                  </p>
                )}
              </CardContent>
            </Card>
          )}
          {/* Education Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AcademicCapIcon className="h-5 w-5" />
                Education Experience
              </CardTitle>
              <CardDescription>
                Educational qualifications extracted from your CV. Click edit to modify any information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cvData.education.length === 0 ? (
                <p className="text-muted-foreground">No education data found in your CV.</p>
              ) : (
                <div className="space-y-4">
                  {cvData.education.map((edu) => (
                    <div key={edu.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{edu.university}</h4>
                            {edu.isVerified && <Badge variant="secondary" className="text-xs">Verified</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {edu.degree} in {edu.major}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              {formatDate(edu.startDate)} - {formatDate(edu.endDate)}
                            </div>
                            {edu.gpa && <span>GPA: {edu.gpa}</span>}
                            {edu.honors && <span>Honors: {edu.honors}</span>}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingEducation(edu)}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                      </div>
                      <EducationEditDialog education={edu} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Work Experience Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BriefcaseIcon className="h-5 w-5" />
                Work Experience 
              </CardTitle>
              <CardDescription>
                Professional experience extracted from your CV. Click edit to modify any information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cvData.workExperience.length === 0 ? (
                <p className="text-muted-foreground">No work experience data found in your CV.</p>
              ) : (
                <div className="space-y-4">
                  {cvData.workExperience.map((work) => (
                    <div key={work.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{work.position}</h4>
                            {work.isVerified && <Badge variant="secondary" className="text-xs">Verified</Badge>}
                            {work.isCurrent && <Badge variant="outline" className="text-xs">Current</Badge>}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <BuildingOfficeIcon className="h-3 w-3" />
                            {work.organization}
                          </div>
                          {work.location && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPinIcon className="h-3 w-3" />
                              {work.location}
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <CalendarIcon className="h-3 w-3" />
                            {formatDate(work.startDate)} - {work.isCurrent ? "Present" : formatDate(work.endDate)}
                          </div>
                          {work.description && (
                            <p className="text-sm text-muted-foreground mt-2">{work.description}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingWork(work)}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                      </div>
                      <WorkEditDialog work={work} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}