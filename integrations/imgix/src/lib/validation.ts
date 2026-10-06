import { createApiServiceError } from 'slates';
export function validateId(value: string): string {
  if (!/^[A-Za-z0-9_-]{1,200}$/.test(value))
    throw createApiServiceError('Use an exact resource ID returned by the discovery tool.', {
      parent: {}
    });
  return value;
}
export function hasControl(value: string): boolean {
  return Array.from(value).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127);
}
export function rawPath(value: string): string {
  const path = value.startsWith('/') ? value.slice(1) : value;
  if (
    !path ||
    path.length > 4096 ||
    hasControl(path) ||
    path.includes('\\') ||
    path.split('/').some(part => part === '.' || part === '..' || !part)
  )
    throw createApiServiceError(
      'Use a nonempty exact unencoded origin path without traversal or control characters.',
      { parent: {} }
    );
  return path;
}
export function encodePart(value: string): string {
  try {
    return encodeURIComponent(value);
  } catch {
    throw createApiServiceError('Use valid Unicode text in paths and parameters.', {
      parent: {}
    });
  }
}
export function apiPath(value: string): string {
  return rawPath(value).split('/').map(encodePart).join('/');
}
export function validDomain(value: string): string {
  const domain = value.toLowerCase();
  if (
    domain.length > 253 ||
    !domain.includes('.') ||
    domain.split('.').some(part => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(part)) ||
    /^\d+(?:\.\d+){3}$/.test(domain) ||
    domain.endsWith('.localhost') ||
    domain.endsWith('.local')
  )
    throw createApiServiceError(
      'Use a DNS source domain without a scheme, port, path, credentials, or query.',
      { parent: {} }
    );
  return domain;
}
export function publicUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw createApiServiceError('Use a valid absolute HTTP or HTTPS URL.', { parent: {} });
  }
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.hash ||
    hasControl(value)
  )
    throw createApiServiceError(
      'Use an HTTP or HTTPS URL without credentials, fragments, or control characters.',
      { parent: {} }
    );
  validDomain(url.hostname);
  return url;
}
export function validateSort(value: string | undefined, fields: readonly string[]): void {
  if (value?.split(',').some(field => !fields.includes(field.replace(/^-/, ''))))
    throw createApiServiceError('Use a documented sort field for this resource.', {
      parent: {}
    });
}
