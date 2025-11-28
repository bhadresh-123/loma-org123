import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { NoteFormat } from '../types/note-format';

export interface UserNoteSettings {
  defaultNoteFormat: NoteFormat;
  sessionDuration: number;
  timeZone: string;
}

export const useNoteSettings = () => {
  const queryClient = useQueryClient();

  const {
    data: noteSettings,
    isLoading,
    error
  } = useQuery<UserNoteSettings>({
    queryKey: ['note-settings'],
    queryFn: async () => {
      const res = await fetch('/api/note-settings');
      if (!res.ok) {
        throw new Error('Failed to fetch note settings');
      }
      return res.json();
    },
  });

  const updateMutation = useMutation<UserNoteSettings, Error, Partial<UserNoteSettings>>({
    mutationFn: async (updates) => {
      const res = await fetch('/api/note-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        throw new Error('Failed to update note settings');
      }
      return res.json();
    },
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData(['note-settings'], updatedSettings);
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  return {
    noteSettings,
    isLoading,
    error,
    updateNoteSettings: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
};