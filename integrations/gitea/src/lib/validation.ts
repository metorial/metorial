import { createApiServiceError } from 'slates';
import { z } from 'zod';

export const normalizeBaseUrl = (value: string): string => {
  try {
    const url = new URL(value.trim());
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      throw createApiServiceError(
        'Provide an HTTP(S) Gitea instance URL without credentials, query parameters, or a fragment.'
      );
    const path = url.pathname.replace(/\/+$/, '').replace(/\/api\/v1$/, '');
    return `${url.origin}${path}`;
  } catch {
    throw createApiServiceError(
      'Provide a valid HTTP(S) Gitea instance URL, including its installation subpath.'
    );
  }
};

export const encodeFilePath = (path: string) => {
  if (
    !path ||
    path.startsWith('/') ||
    path.split('/').some(segment => !segment || segment === '.' || segment === '..') ||
    /[\\\0]/.test(path)
  )
    throw createApiServiceError(
      'Provide a repository-relative file path without empty or traversal segments.'
    );
  return path.split('/').map(encodeURIComponent).join('/');
};

export const validateBase64 = (value: string) => {
  const normalized = value.replace(/\s/g, '');
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(normalized))
    throw createApiServiceError('Provide valid base64-encoded content.');
  return normalized;
};

// Retain JSON Schema number fields while validating the API's integral values.
export const integerInput = (minimum: number) =>
  z.number().min(minimum).refine(Number.isSafeInteger, {
    message: 'Provide a whole number within the safe integer range.'
  });
