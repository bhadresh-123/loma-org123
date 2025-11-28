import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PlusIcon, DocumentTextIcon, ClockIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { TrashIcon } from '@heroicons/react/24/outline';
import { useToast } from "@/contexts/ToastContext";

interface PsychologicalAssessment {
  id: number;
  name: string;
  abbreviation: string;
  category: string;
  description: string;
  ageRange?: string;
  administrationTime?: string;
  domains: string[];
}

interface SessionAssessment {
  id: number;
  sessionId: number;
  assessmentId: number;
  status: string;
  results?: string;
  recommendations?: string;
  createdAt: string;
  completedAt?: string;
  assessment: PsychologicalAssessment;
}

interface SessionAssessmentsProps {
  sessionId: number;
  sessionType: string;
}

export default function SessionAssessments({ sessionId, sessionType }: SessionAssessmentsProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>("");
  const [editingAssessment, setEditingAssessment] = useState<SessionAssessment | null>(null);
  const [results, setResults] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [status, setStatus] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch session assessments
  const { data: sessionAssessments = [], isLoading: loadingSessionAssessments } = useQuery({
    queryKey: ["session-assessments", sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/assessments/session/${sessionId}`);
      if (!response.ok) throw new Error("Failed to fetch session assessments");
      return response.json();
    },
  });

  // Fetch all available assessments
  const { data: allAssessments = [] } = useQuery({
    queryKey: ["psychological-assessments"],
    queryFn: async () => {
      const response = await fetch("/api/assessments");
      if (!response.ok) throw new Error("Failed to fetch assessments");
      return response.json();
    },
  });

  // Fetch assessment categories
  const { data: categories = [] } = useQuery({
    queryKey: ["assessment-categories"],
    queryFn: async () => {
      const response = await fetch("/api/assessments/categories");
      if (!response.ok) throw new Error("Failed to fetch categories");
      return response.json();
    },
  });

  // Add assessment to session
  const addAssessmentMutation = useMutation({
    mutationFn: async (assessmentId: string) => {
      const response = await fetch(`/api/assessments/session/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId: parseInt(assessmentId) }),
      });
      if (!response.ok) throw new Error("Failed to add assessment");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session-assessments", sessionId] });
      setIsAddDialogOpen(false);
      setSelectedCategory("");
      setSelectedAssessmentId("");
      toast({
        title: "Assessment Added",
        description: "Assessment has been added to the session successfully.",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add assessment",
        variant: "destructive",
      });
    },
  });

  // Update session assessment
  const updateAssessmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await fetch(`/api/assessments/session-assessment/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update assessment");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session-assessments", sessionId] });
      setEditingAssessment(null);
      setResults("");
      setRecommendations("");
      setStatus("");
      toast({
        title: "Assessment Updated",
        description: "Assessment has been updated successfully.",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update assessment",
        variant: "destructive",
      });
    },
  });

  // Remove assessment from session
  const removeAssessmentMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/assessments/session-assessment/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to remove assessment");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session-assessments", sessionId] });
      toast({
        title: "Assessment Removed",
        description: "Assessment has been removed from the session.",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove assessment",
        variant: "destructive",
      });
    },
  });

  const filteredAssessments = selectedCategory
    ? allAssessments.filter((a: PsychologicalAssessment) => a.category === selectedCategory)
    : allAssessments;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case "in_progress":
        return <ClockIcon className="h-4 w-4 text-yellow-500" />;
      case "cancelled":
        return <XCircleIcon className="h-4 w-4 text-red-500" />;
      default:
        return <DocumentTextIcon className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  const handleEditAssessment = (assessment: SessionAssessment) => {
    setEditingAssessment(assessment);
    setResults(assessment.results || "");
    setRecommendations(assessment.recommendations || "");
    setStatus(assessment.status);
  };

  const handleUpdateAssessment = () => {
    if (!editingAssessment) return;

    updateAssessmentMutation.mutate({
      id: editingAssessment.id,
      data: { results, recommendations, status },
    });
  };

  // Show assessment management for all sessions, but emphasize for assessment type
  const showAssessments = sessionType === "assessment" || sessionAssessments.length > 0;

  if (!showAssessments && sessionType !== "assessment") {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {sessionType === "assessment" ? "Assessment Details" : "Session Assessments"}
        </h3>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Assessment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Psychological Assessment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select assessment category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category: string) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedCategory && (
                <div>
                  <Label>Assessment</Label>
                  <Select value={selectedAssessmentId} onValueChange={setSelectedAssessmentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select specific assessment" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredAssessments.map((assessment: PsychologicalAssessment) => (
                        <SelectItem key={assessment.id} value={assessment.id.toString()}>
                          <div>
                            <div className="font-medium">{assessment.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {assessment.abbreviation} • {assessment.administrationTime}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {selectedAssessmentId && (
                <div className="bg-muted p-4 rounded-lg">
                  {(() => {
                    const assessment = allAssessments.find(
                      (a: PsychologicalAssessment) => a.id.toString() === selectedAssessmentId
                    );
                    if (!assessment) return null;
                    return (
                      <div>
                        <h4 className="font-medium">{assessment.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {assessment.description}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {assessment.domains.map((domain: string, index: number) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {domain}
                            </Badge>
                          ))}
                        </div>
                        {assessment.ageRange && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Age Range: {assessment.ageRange}
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => addAssessmentMutation.mutate(selectedAssessmentId)}
                  disabled={!selectedAssessmentId || addAssessmentMutation.isPending}
                >
                  {addAssessmentMutation.isPending ? "Adding..." : "Add Assessment"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loadingSessionAssessments ? (
        <div className="text-center py-4">Loading assessments...</div>
      ) : sessionAssessments.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              {sessionType === "assessment"
                ? "No assessments added yet. Add assessments to document what was administered during this session."
                : "No assessments have been added to this session."}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessionAssessments.map((sessionAssessment: SessionAssessment) => (
            <Card key={sessionAssessment.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {sessionAssessment.assessment.name}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {sessionAssessment.assessment.abbreviation}
                      </Badge>
                      <Badge className={`text-xs ${getStatusColor(sessionAssessment.status)}`}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(sessionAssessment.status)}
                          {sessionAssessment.status.replace("_", " ")}
                        </span>
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditAssessment(sessionAssessment)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeAssessmentMutation.mutate(sessionAssessment.id)}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {sessionAssessment.assessment.description}
                    </p>
                    {sessionAssessment.assessment.administrationTime && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Administration Time: {sessionAssessment.assessment.administrationTime}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {sessionAssessment.assessment.domains.map((domain: string, index: number) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {domain}
                      </Badge>
                    ))}
                  </div>

                  {sessionAssessment.results && (
                    <div>
                      <Label className="text-sm font-medium">Results</Label>
                      <p className="text-sm mt-1 p-2 bg-muted rounded">
                        {sessionAssessment.results}
                      </p>
                    </div>
                  )}

                  {sessionAssessment.recommendations && (
                    <div>
                      <Label className="text-sm font-medium">Recommendations</Label>
                      <p className="text-sm mt-1 p-2 bg-muted rounded">
                        {sessionAssessment.recommendations}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Assessment Dialog */}
      <Dialog open={!!editingAssessment} onOpenChange={() => setEditingAssessment(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Edit Assessment: {editingAssessment?.assessment.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Results</Label>
              <Textarea
                value={results}
                onChange={(e) => setResults(e.target.value)}
                placeholder="Enter assessment results, scores, or findings..."
                rows={4}
              />
            </div>
            
            <div>
              <Label>Recommendations</Label>
              <Textarea
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
                placeholder="Enter recommendations based on assessment results..."
                rows={4}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setEditingAssessment(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateAssessment}
                disabled={updateAssessmentMutation.isPending}
              >
                {updateAssessmentMutation.isPending ? "Updating..." : "Update Assessment"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}