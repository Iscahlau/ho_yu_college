/**
 * Naming utility for consistent resource naming across the stack
 */

const STACK_NAME = 'ho-yu-college-scratch-platform';

/**
 * Build standardized name and ID for AWS resources
 * @param resourceName - The name of the resource (e.g., 'frontend-bucket', 'students-table')
 * @returns Formatted resource name: `${stack_name}-${resource_name}`
 */
export function buildNameAndId(resourceName: string): string {
  return `${STACK_NAME}-${resourceName}`;
}

/**
 * Get the stack name
 */
export function getStackName(): string {
  return STACK_NAME;
}
