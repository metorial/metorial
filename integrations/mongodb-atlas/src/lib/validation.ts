import { atlasServiceError } from './errors';

export let failValidation = (message: string): never => {
  throw atlasServiceError(message);
};

export let resolveProjectId = (inputProjectId?: string, configProjectId?: string): string => {
  let projectId = inputProjectId || configProjectId;
  if (!projectId) {
    failValidation('projectId is required. Provide it in input or config.');
  }

  return projectId as string;
};

export let requireString = (
  value: string | undefined | null,
  fieldName: string,
  context?: string
): string => {
  if (!value) {
    failValidation(
      context ? `${fieldName} is required ${context}.` : `${fieldName} is required.`
    );
  }

  return value as string;
};

export let requireNonEmptyArray = <T>(
  value: T[] | undefined | null,
  fieldName: string,
  context?: string
): T[] => {
  if (!value || value.length === 0) {
    failValidation(
      context ? `${fieldName} is required ${context}.` : `${fieldName} is required.`
    );
  }

  return value as T[];
};

export let invalidAction = (action: never): never => {
  throw atlasServiceError(`Unknown action: ${String(action)}`);
};
