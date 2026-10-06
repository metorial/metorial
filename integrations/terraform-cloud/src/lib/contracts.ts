import { createApiServiceError } from 'slates';
import { z } from 'zod';

const identifier = z.object({ id: z.string().min(1), type: z.string().min(1) });
const resourceSchema = identifier.extend({
  attributes: z.record(z.string(), z.unknown()),
  relationships: z
    .record(
      z.string(),
      z.object({
        data: z.union([identifier, z.array(identifier), z.null()]).optional(),
        links: z.record(z.string(), z.unknown()).optional(),
        meta: z.record(z.string(), z.unknown()).optional()
      })
    )
    .optional()
});
export type Resource = z.infer<typeof resourceSchema>;
export const parseResource = (value: unknown, type: string): Resource => {
  const result = resourceSchema.safeParse(value);
  if (!result.success || result.data.type !== type)
    throw createApiServiceError(
      'HCP Terraform returned an invalid resource response. Check the requested resource and retry.'
    );
  return result.data;
};
export const relationshipId = (resource: Resource, key: string) => {
  const value = resource.relationships?.[key]?.data;
  return value && !Array.isArray(value) ? value.id : '';
};
export const text = (value: unknown, fallback = '') => {
  if (value == null) return fallback;
  if (typeof value !== 'string')
    throw createApiServiceError('HCP Terraform returned an invalid text attribute.');
  return value;
};
export const flag = (value: unknown, fallback = false) => {
  if (value == null) return fallback;
  if (typeof value !== 'boolean')
    throw createApiServiceError('HCP Terraform returned an invalid boolean attribute.');
  return value;
};
export const sensitivity = (value: unknown) => {
  if (typeof value !== 'boolean')
    throw createApiServiceError(
      'HCP Terraform omitted the sensitivity classification. Retry the read; no value was exposed.'
    );
  return value;
};
export const number = (value: unknown, fallback = 0) => {
  if (value == null) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw createApiServiceError('HCP Terraform returned an invalid numeric attribute.');
  return value;
};
export const record = (value: unknown): Record<string, unknown> => {
  if (value == null) return {};
  const result = z.record(z.string(), z.unknown()).safeParse(value);
  if (!result.success)
    throw createApiServiceError('HCP Terraform returned an invalid object attribute.');
  return result.data;
};
export const pathSegment = (value: string) => {
  if (
    !value.trim() ||
    value === '.' ||
    value === '..' ||
    /[\s/\\?#]/.test(value) ||
    [...value].some(
      character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
    )
  )
    throw createApiServiceError(
      'Provide a valid HCP Terraform resource ID or organization/workspace name.'
    );
  try {
    return encodeURIComponent(value);
  } catch {
    throw createApiServiceError(
      'Provide a valid UTF-8 resource ID or organization/workspace name.'
    );
  }
};
export const normalizeBaseUrl = (value = 'https://app.terraform.io/api/v2') => {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw createApiServiceError(
      'Provide the HTTPS API URL of your HCP Terraform region or Terraform Enterprise installation.'
    );
  }
  if (
    parsed.protocol !== 'https:' ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    parsed.pathname.replace(/\/$/, '') !== '/api/v2'
  )
    throw createApiServiceError(
      'The Terraform API URL must use HTTPS, end in /api/v2 and contain no credentials, query or fragment.'
    );
  return `${parsed.origin}/api/v2`;
};
export const organizationNameSchema = z
  .string()
  .optional()
  .describe(
    'Organization name from list_organizations. Overrides the optional configured organization; required for organization-scoped operations when no default is configured.'
  );
export const paginationQuery = (params?: { pageNumber?: number; pageSize?: number }) => {
  const page = params?.pageNumber ?? 1;
  const size = params?.pageSize ?? 20;
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    !Number.isSafeInteger(size) ||
    size < 1 ||
    size > 100
  )
    throw createApiServiceError(
      'Use positive integral pageNumber and pageSize values; pageSize must be at most 100.'
    );
  return new URLSearchParams({ 'page[number]': String(page), 'page[size]': String(size) });
};
export const requireUpdate = (attributes: Record<string, unknown>) => {
  if (!Object.values(attributes).some(value => value !== undefined))
    throw createApiServiceError('Provide at least one field to update.');
};
export const requireName = (value: string | undefined) => {
  if (value !== undefined && !value.trim())
    throw createApiServiceError('Provide a non-empty resource name or key.');
};
export const validateDocument = (
  value: unknown,
  expectedType: string,
  many: boolean,
  expectedId?: string
) => {
  const body = record(value);
  if (body.errors !== undefined || !Object.hasOwn(body, 'data'))
    throw createApiServiceError(
      'HCP Terraform returned an error or invalid success document.'
    );
  if (many) {
    if (!Array.isArray(body.data))
      throw createApiServiceError('HCP Terraform returned an invalid collection response.');
    body.data = body.data.map(item => parseResource(item, expectedType));
  } else {
    const resource = parseResource(body.data, expectedType);
    if (expectedId && resource.id !== expectedId)
      throw createApiServiceError(
        'HCP Terraform returned a different resource ID. Inspect the requested resource before retrying.'
      );
    body.data = resource;
  }
  if (body.included !== undefined) {
    if (!Array.isArray(body.included))
      throw createApiServiceError('HCP Terraform returned invalid included resources.');
    body.included = body.included.map(item => {
      const data = record(item);
      return parseResource(data, text(data.type));
    });
  }
  return body;
};
