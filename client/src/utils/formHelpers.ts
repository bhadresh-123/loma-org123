/**
 * Form Helper Utilities
 * 
 * Safe coercion functions to handle null/undefined values from database
 * and prevent React controlled component warnings.
 */

/**
 * Safely converts a value to a string, handling null/undefined
 * @param value - The value to convert
 * @returns Empty string if value is null/undefined, otherwise the string value
 */
export function safeString(value: string | null | undefined): string {
  return value ?? '';
}

/**
 * Safely converts a value to a number with a fallback default
 * @param value - The value to convert
 * @param defaultValue - The default value if conversion fails (default: 0)
 * @returns The numeric value or the default
 */
export function safeNumber(value: number | null | undefined, defaultValue: number = 0): number {
  if (value === null || value === undefined) {
    return defaultValue;
  }
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

/**
 * Safely converts a value to a boolean with a fallback default
 * @param value - The value to convert
 * @param defaultValue - The default value if null/undefined (default: false)
 * @returns The boolean value or the default
 */
export function safeBoolean(value: boolean | null | undefined, defaultValue: boolean = false): boolean {
  return value ?? defaultValue;
}

/**
 * Safely converts a value to an array, handling null/undefined
 * @param value - The value to convert
 * @returns Empty array if value is null/undefined, otherwise the array value
 */
export function safeArray<T>(value: T[] | null | undefined): T[] {
  return value ?? [];
}

/**
 * Safely converts a value to a specific type or returns undefined
 * Useful for optional fields where we want to preserve undefined semantics
 * @param value - The value to convert
 * @returns undefined if value is null/undefined, otherwise the value
 */
export function safeOptional<T>(value: T | null | undefined): T | undefined {
  return value === null ? undefined : value;
}

