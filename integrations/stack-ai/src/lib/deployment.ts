import { createApiServiceError } from 'slates';
import { z } from 'zod';

export const deploymentUrlInput = z
  .url()
  .optional()
  .describe('Deployed workflow API URL copied from Export View > API in Stack AI');

export const orgIdInput = z
  .string()
  .min(1)
  .optional()
  .describe(
    'Organization ID from the deployed workflow API URL. Omit when a deployment URL was supplied while connecting.'
  );

export const parseDeploymentUrl = (value: string) => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw createApiServiceError(
      'Provide a valid deployed workflow API URL from Export View > API.'
    );
  }
  const match = /^\/inference\/v0\/run\/([^/]+)\/([^/]+)\/?$/.exec(url.pathname);
  if (
    url.protocol !== 'https:' ||
    !['api.stack-ai.com', 'stack-inference.com'].includes(url.hostname) ||
    url.port ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !match
  ) {
    throw createApiServiceError(
      'Copy the HTTPS workflow API URL from Export View > API, without credentials, query parameters, or fragments.'
    );
  }
  try {
    const orgId = decodeURIComponent(match[1] ?? '');
    const flowId = decodeURIComponent(match[2] ?? '');
    if (!orgId.trim() || !flowId.trim() || /[/<>]/.test(orgId + flowId)) {
      throw createApiServiceError(
        'Replace the organization and flow placeholders with the values from your deployed workflow API URL.'
      );
    }
    return { orgId, flowId, inferenceBaseUrl: url.origin };
  } catch (error) {
    if (error instanceof URIError) {
      throw createApiServiceError(
        'The deployed workflow API URL contains an invalid encoded identifier.'
      );
    }
    throw error;
  }
};
