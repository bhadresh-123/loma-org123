```typescript
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface DBAToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function DBAToggle({ checked, onCheckedChange }: DBAToggleProps) {
  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="dba-mode"
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
      <Label htmlFor="dba-mode">Include DBA/Fictitious Name Filing</Label>
    </div>
  );
}
```
