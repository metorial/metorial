import { fabricValidationError } from './errors';

let splitPath = (value: string) => value.split('/').filter(Boolean);

export let encodePathSegment = (value: string) => encodeURIComponent(value);

export let encodeOneLakePath = (value: string) =>
  splitPath(value).map(encodePathSegment).join('/');

export let validateOneLakePath = (path: string, fieldName = 'path') => {
  let value = path.trim();

  if (!value) {
    throw fabricValidationError(`${fieldName} cannot be empty.`);
  }

  if (value.includes('\\') || value.includes('\0')) {
    throw fabricValidationError(`${fieldName} cannot contain backslashes or null bytes.`);
  }

  if (value.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(value)) {
    throw fabricValidationError(`${fieldName} must be a relative OneLake path.`);
  }

  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    decoded = value;
  }

  let segments = decoded.split('/');
  if (segments.some(segment => segment === '.' || segment === '..')) {
    throw fabricValidationError(`${fieldName} cannot contain path traversal segments.`);
  }

  return value.replace(/^\/+/, '');
};

export let validateOptionalOneLakePath = (path?: string) => {
  if (path === undefined || path.trim() === '') return undefined;
  return validateOneLakePath(path);
};

export let resolveWorkspaceReference = (input: {
  workspaceId?: string;
  workspace?: string;
}) => {
  let value = input.workspaceId?.trim() || input.workspace?.trim();
  if (!value) {
    throw fabricValidationError('Provide workspaceId or workspace.');
  }
  return value;
};

export let resolveItemReference = (input: { itemId?: string; item?: string }) => {
  let value = input.itemId?.trim() || input.item?.trim();
  if (!value) {
    throw fabricValidationError('Provide itemId or item.');
  }
  return value;
};
