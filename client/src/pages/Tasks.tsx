import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "@/utils/dateFnsCompat";
import SessionNotes from "@/components/SessionNotes";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PlusIcon, CheckIcon, DocumentTextIcon, CreditCardIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import { EnvelopeIcon, CogIcon } from '@heroicons/react/24/outline';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/contexts/ToastContext";
import EmailComposer from "@/components/EmailComposer";
import { isArrayResponse } from "@/types/api";
// import TaskCategoriesManager from "@/components/TaskCategoriesManager";
// import TaskAutomationSettings from "@/components/settings/TaskAutomationSettings"; // File not found

interface Client {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
  color: string;
  isDefault: boolean;
}

interface Task {
  id: number;
  title: string;
  type: string;
  status: string;
  patientId: number;
  dueDate: string | null;
  createdAt: string | null;
  completedAt: string | null;
  isAutomated?: boolean; // Added isAutomated property
  categoryId?: number | null;
  category?: Category;
}

interface TaskWithClient extends Task {
  client?: {
    id: number;
    name: string;
    email: string;
  };
  session?: {
    id: number;
    date: string;
    notes?: string | null;
    duration?: number;
    status?: string;
    type?: string;
    userId?: number;
    patientId?: number;
    createdAt?: string;
  };
}

export default function Tasks() {
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [emailComposerOpen, setEmailComposerOpen] = useState(false);
  const [sessionNotesOpen, setSessionNotesOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithClient | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: tasksData, isLoading } = useQuery<TaskWithClient[]>({
    queryKey: ["/api/tasks"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/tasks", {
          credentials: "include",
        });
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Not authenticated");
          }
          throw new Error("Failed to fetch tasks");
        }
        const data = await response.json();
        // Handle paginated response format
        const tasks = data.data ? data.data : (Array.isArray(data) ? data : []);
        return Array.isArray(tasks) ? tasks : [];
      } catch (error) {
        console.error('Tasks fetch error:', error);
        return []; // Always return empty array on error to prevent production crashes
      }
    }
  });

  // Ensure tasks is always an array
  const tasks = Array.isArray(tasksData) ? tasksData : [];

  const { data: clientsData } = useQuery<Client[]>({
    queryKey: ["/api/patients"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/patients", {
          credentials: "include",
        });
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Not authenticated");
          }
          throw new Error("Failed to fetch patients");
        }
        const data = await response.json();
        // Handle HIPAA response format
        const patients = data.success ? data.data : data;
        return Array.isArray(patients) ? patients : [];
      } catch (error) {
        console.error('Tasks clients fetch error:', error);
        return []; // Always return empty array on error to prevent production crashes
      }
    }
  });

  // Ensure clients is always an array
  const clients = Array.isArray(clientsData) ? clientsData : [];

  const { data: categoriesData } = useQuery<Category[]>({
    queryKey: ['/api/task-categories'],
  });

  // Ensure categories is always an array
  const categories = isArrayResponse<Category>(categoriesData) ? categoriesData : [];

  const form = useForm({
    defaultValues: {
      title: "",
      patientId: "",
      type: "custom",
      status: "pending",
      dueDate: "",
      categoryId: ""
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (values: any) => {
      const formData = {
        title: values.title,
        patientId: values.patientId ? parseInt(values.patientId) : null,
        type: values.type,
        status: values.status,
        dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : null,
        isAutomated: false, //Added isAutomated property to the formData
        categoryId: values.categoryId && values.categoryId !== "none" ? parseInt(values.categoryId) : null, // Added categoryId
      };

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Task created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed", completedAt: new Date().toISOString() }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Success",
        description: "Task marked as completed",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getTaskTypeLabel = (type: string) => {
    switch (type) {
      case 'session_note':
        return 'Session Note';
      case 'intake_docs':
        return 'Send Intake Docs';
      case 'invoice':
        return 'Create Invoice';
      default:
        return type;
    }
  };

  const handleIntakeDocsTask = (task: TaskWithClient) => {
    if (task.client) {
      setSelectedTask(task);
      setEmailComposerOpen(true);
    } else {
      toast({
        title: "Cannot open email composer",
        description: "Client information is missing",
        variant: "destructive",
      });
    }
  };

  const handleEmailComposerComplete = () => {
    if (selectedTask) {
      completeTaskMutation.mutate(selectedTask.id);
    }
  };

  const handleSessionNoteTask = (task: TaskWithClient) => {
    if (task.session) {
      setSelectedTask(task);
      setSessionNotesOpen(true);
    } else {
      toast({
        title: "Cannot open session notes",
        description: "Session information is missing",
        variant: "destructive",
      });
    }
  };

  const handleSessionNotesClose = () => {
    setSessionNotesOpen(false);
    setSelectedTask(null);
  };
  
  const handleInvoiceTask = (task: TaskWithClient) => {
    if (task.session) {
      // Navigate to the payment page for this session
      window.location.href = `/payments?sessionId=${task.session.id}`;
    } else {
      toast({
        title: "Cannot process invoice",
        description: "Session information is missing",
        variant: "destructive",
      });
    }
  };

  const onSubmit = (data: any) => {
    const formData = {
      title: data.title,
      patientId: parseInt(data.patientId),
      type: data.type,
      status: data.status,
      dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
      isAutomated: false, //Added isAutomated property to the formData
      categoryId: data.categoryId && data.categoryId !== "none" ? parseInt(data.categoryId) : null, // Added categoryId
    };

    createTaskMutation.mutate(formData);
  };

  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false);
  const [automationSettingsOpen, setAutomationSettingsOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-primary">Tasks</h1>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="session_note">Session Notes</SelectItem>
                <SelectItem value="intake_docs">Intake Documents</SelectItem>
                <SelectItem value="invoice">Invoices</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by client" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                <SelectItem value="all">All Clients</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id.toString()}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setManageCategoriesOpen(true)}
              title="Manage Task Categories"
            >
              <CogIcon className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setAutomationSettingsOpen(true)}
              title="Configure Task Automation"
            >
              <AdjustmentsHorizontalIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} required />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="patientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        required
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a client" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id.toString()}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        required
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="session_note">Session Note</SelectItem>
                          <SelectItem value="intake_docs">Intake Documents</SelectItem>
                          <SelectItem value="invoice">Create Invoice</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} required />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value || "pending"}
                        required
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No Category</SelectItem>
                          {categories.map((category) => (
                            <SelectItem 
                              key={category.id} 
                              value={category.id.toString()}
                            >
                              <div className="flex items-center gap-2">
                                <div 
                                  className="h-3 w-3 rounded-full" 
                                  style={{ backgroundColor: category.color }}
                                />
                                {category.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">
                  Create Task
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/3">Task</TableHead>
                <TableHead className="w-24">Type</TableHead>
                <TableHead className="w-32">Client</TableHead>
                <TableHead className="w-24">Due Date</TableHead>
                <TableHead className="w-24">Created</TableHead>
                <TableHead className="w-20">Status</TableHead>
                <TableHead className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks
                .filter((task) =>
                  (statusFilter === "all" || task.status === statusFilter) &&
                  (typeFilter === "all" || task.type === typeFilter) &&
                  (clientFilter === "all" || (task.patientId && task.patientId.toString() === clientFilter))
                )
                .length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No tasks found
                  </TableCell>
                </TableRow>
              ) : (
                tasks
                  .filter((task) =>
                    (statusFilter === "all" || task.status === statusFilter) &&
                    (typeFilter === "all" || task.type === typeFilter) &&
                    (clientFilter === "all" || (task.patientId && task.patientId.toString() === clientFilter))
                  )
                  .sort((a, b) =>
                    new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
                  )
                  .map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>
                        <div className="flex items-center"> {/* Added flex and items-center */}
                          {task.category && (
                            <div 
                              className="h-3 w-3 rounded-full mr-2" 
                              style={{ backgroundColor: task.category.color }}
                              title={task.category.name}
                            />
                          )}
                          <span className="font-medium">{task.title}</span>
                          {task.isAutomated && (
                            <span className="ml-2 text-yellow-500" title="Automated task">⚡</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="whitespace-nowrap px-3">
                          {getTaskTypeLabel(task.type)}
                        </Badge>
                      </TableCell>
                      <TableCell>{task.client?.name || 'Unknown Client'}</TableCell>
                      <TableCell>{task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : 'N/A'}</TableCell>
                      <TableCell>{task.createdAt ? format(new Date(task.createdAt), 'MMM d, yyyy') : 'N/A'}</TableCell>
                      <TableCell>
                        <Badge
                          variant={task.status === 'completed' ? 'default' : 'outline'}
                        >
                          {task.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {task.status !== 'completed' && (
                          <div className="flex flex-col gap-1">
                            {task.type === 'intake_docs' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleIntakeDocsTask(task)}
                                className="w-full justify-start"
                              >
                                <EnvelopeIcon className="h-4 w-4 mr-1" />
                                Email
                              </Button>
                            )}
                            {task.type === 'session_note' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSessionNoteTask(task)}
                                className="w-full justify-start"
                              >
                                <DocumentTextIcon className="h-4 w-4 mr-1" />
                                View Note
                              </Button>
                            )}
                            {task.type === 'invoice' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleInvoiceTask(task)}
                                className="w-full justify-start"
                              >
                                <CreditCardIcon className="h-4 w-4 mr-1" />
                                Process Payment
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => completeTaskMutation.mutate(task.id)}
                              className="w-full justify-start"
                            >
                              <CheckIcon className="h-4 w-4 mr-1" />
                              Complete
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
      {/* Email Composer for Intake Document Tasks */}
      {selectedTask && selectedTask.client && (
        <EmailComposer
          open={emailComposerOpen}
          onOpenChange={setEmailComposerOpen}
          client={selectedTask.client}
          session={selectedTask.session}
          onComplete={handleEmailComposerComplete}
        />
      )}
      
      {/* Session Notes Component */}
      {selectedTask && selectedTask.session && selectedTask.client && (
        <SessionNotes
          open={sessionNotesOpen}
          onClose={handleSessionNotesClose}
          session={{
            id: selectedTask.session.id,
            date: selectedTask.session.date,
            notes: selectedTask.session.notes || null,
            duration: selectedTask.session.duration || 0,
            status: selectedTask.session.status || 'scheduled',
            type: selectedTask.session.type || 'individual',
            userId: selectedTask.session.userId || 0,
            patientId: selectedTask.client.id,
            createdAt: selectedTask.session.createdAt || new Date().toISOString(),
            isPaid: false,
            paymentId: null,
            client: {
              name: selectedTask.client.name
            }
          }}
        />
      )}
      
      {/* Task Categories Manager Dialog */}
      <Dialog open={manageCategoriesOpen} onOpenChange={setManageCategoriesOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Manage Task Categories</DialogTitle>
          </DialogHeader>
          {/* <TaskCategoriesManager 
            onCategoriesChange={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/task-categories'] });
              queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
            }}
          /> */}
          <div className="p-4">
            <p className="text-muted-foreground">Task categories management will be available soon.</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Automation Settings Dialog */}
      <Dialog open={automationSettingsOpen} onOpenChange={setAutomationSettingsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Task Automation Settings</DialogTitle>
          </DialogHeader>
          {/* <TaskAutomationSettings /> */}
        </DialogContent>
      </Dialog>
    </div>
  );
}