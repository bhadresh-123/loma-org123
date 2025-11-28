import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from "@/lib/utils";

interface PasswordRequirement {
  label: string;
  met: boolean;
}

interface PasswordRequirementsProps {
  password: string;
  className?: string;
  role?: 'business_owner' | 'admin' | 'therapist' | 'contractor_1099';
}

export function PasswordRequirements({ password, className, role }: PasswordRequirementsProps) {
  // Determine minimum length based on role (HIPAA 1.4.4 compliance)
  const minLength = role === 'business_owner' || role === 'admin' ? 14 : 12;
  const requiresSpecialChar = role === 'business_owner' || role === 'admin';
  
  const requirements: PasswordRequirement[] = [
    {
      label: `At least ${minLength} characters${role === 'business_owner' || role === 'admin' ? ' (admin requirement)' : ''}`,
      met: password.length >= minLength,
    },
    {
      label: "Contains lowercase letter",
      met: /[a-z]/.test(password),
    },
    {
      label: "Contains uppercase letter",
      met: /[A-Z]/.test(password),
    },
    {
      label: "Contains number",
      met: /\d/.test(password),
    },
  ];
  
  // Add special character requirement for admin roles
  if (requiresSpecialChar) {
    requirements.push({
      label: "Contains special character (!@#$%^&*()_+-=[]{}|;:,.<>?)",
      met: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password),
    });
  }

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-medium text-muted-foreground">Password requirements:</p>
      <div className="space-y-1">
        {requirements.map((requirement, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            {requirement.met ? (
              <CheckIcon className="h-4 w-4 text-green-600" />
            ) : (
              <XMarkIcon className="h-4 w-4 text-red-500" />
            )}
            <span
              className={cn(
                "transition-colors",
                requirement.met ? "text-green-600" : "text-muted-foreground"
              )}
            >
              {requirement.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}