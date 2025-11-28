import { format } from "@/utils/dateFnsCompat";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Task as TaskSchema } from "@/types/schema";
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TasksWidgetProps {
  tasks: TaskSchema[];
  isLoading: boolean;
}

// Extended Task interface for the widget
interface TaskWithRelations extends TaskSchema {
  client?: {
    id: number;
    name: string;
    email?: string;
  } | null;
  session?: {
    id: number;
    date: string;
    type: string;
    duration: number;
  } | null;
}

export default function TasksWidget({ tasks, isLoading }: TasksWidgetProps) {
  // Ensure tasks is always an array and handle type safety
  const tasksArray = Array.isArray(tasks) ? tasks : [];
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!Array.isArray(tasks)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <ExclamationCircleIcon className="h-4 w-4" />
            <AlertDescription>
              Error loading tasks: Invalid data format received
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const oldestTasks = tasksArray
    .filter((task): task is TaskWithRelations => {
      return task && typeof task.id === 'number' && typeof task.title === 'string';
    })
    .sort((a, b) => {
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return aDate - bDate;
    })
    .slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {oldestTasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell className="font-medium">
                  <span className="block truncate font-medium">
                    {task.title}
                    {task.isAutomated && (
                      <span className="ml-2 text-yellow-500" title="Automated task">⚡</span>
                    )}
                  </span>
                  <div className="text-xs text-muted-foreground mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {task.type === 'session_note' ? 'Session Note' : 'Send Intake Docs'}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>{task.client?.name || 'No client'}</TableCell>
                <TableCell>
                  {task.createdAt ? format(task.createdAt, 'MMM d') : 'No date'}
                </TableCell>
              </TableRow>
            ))}
            {oldestTasks.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  No pending tasks
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}