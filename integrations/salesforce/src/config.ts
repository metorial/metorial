import { configV2 } from 'slates';
import { z } from 'zod';
import { salesforceServiceError } from './lib/errors';

export let salesforceEnvironmentSchema = z.enum(['production', 'sandbox', 'custom']);

export type SalesforceEnvironment = z.infer<typeof salesforceEnvironmentSchema>;

export type SalesforceConfig = {
  apiVersion: string;
  environment: SalesforceEnvironment;
  customDomain?: string;
};

let isSalesforceEnvironment = (value: unknown): value is SalesforceEnvironment =>
  salesforceEnvironmentSchema.safeParse(value).success;

export let normalizeSalesforceCustomDomain = (customDomain: string) => {
  let raw = customDomain.trim().toLowerCase();

  if (!raw) {
    throw salesforceServiceError(
      'Salesforce customDomain is required when environment is custom.'
    );
  }

  let host: string;
  try {
    host = raw.includes('://') ? new URL(raw).hostname : raw.split('/')[0]!;
  } catch {
    throw salesforceServiceError(`Invalid Salesforce customDomain: ${customDomain}`);
  }

  host = host.replace(/\.$/, '');

  if (!host || !/^[a-z0-9.-]+$/.test(host)) {
    throw salesforceServiceError(`Invalid Salesforce customDomain: ${customDomain}`);
  }

  if (host.endsWith('.my')) {
    return `${host}.salesforce.com`;
  }

  if (!host.includes('.')) {
    return `${host}.my.salesforce.com`;
  }

  return host;
};

export let normalizeSalesforceConfig = (
  value: Partial<SalesforceConfig> & Record<string, any>
): SalesforceConfig => {
  let environment = isSalesforceEnvironment(value.environment)
    ? value.environment
    : 'production';

  let config: SalesforceConfig = {
    apiVersion: typeof value.apiVersion === 'string' ? value.apiVersion : 'v62.0',
    environment
  };

  if (environment === 'custom') {
    if (typeof value.customDomain !== 'string') {
      throw salesforceServiceError(
        'Salesforce customDomain is required when environment is custom.'
      );
    }

    config.customDomain = normalizeSalesforceCustomDomain(value.customDomain);
  }

  return config;
};

export let config = configV2({
  fields: {
    environment: {
      schema: salesforceEnvironmentSchema
        .default('production')
        .describe('Salesforce OAuth environment to use for authorization and token refresh'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    customDomain: {
      schema: z
        .string()
        .optional()
        .describe(
          'Custom Salesforce My Domain for custom OAuth environments. Accepts a bare prefix, *.my value, full host, or URL.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    apiVersion: {
      schema: z
        .string()
        .default('v62.0')
        .describe('Salesforce REST API version to use (e.g., v62.0)'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
})
  .getDefaultConfig(() => normalizeSalesforceConfig({}))
  .onConfigChanged(({ newConfig }) => ({
    config: normalizeSalesforceConfig(newConfig)
  }));
