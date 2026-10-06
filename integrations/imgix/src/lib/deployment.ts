import { createApiServiceError, pickDefined } from 'slates';
import { z } from 'zod';
import { deploymentTypes } from './schemas';
import { hasControl, publicUrl, validDomain } from './validation';
export const deploymentInput = z.object({
  type: deploymentTypes,
  imgixSubdomains: z.array(z.string().min(1)).min(1),
  customDomains: z.array(z.string()).optional(),
  s3AccessKey: z.string().optional(),
  s3SecretKey: z.string().optional(),
  s3Bucket: z.string().optional(),
  s3Prefix: z.string().optional(),
  gcsBucket: z.string().optional(),
  gcsAccessKey: z.string().optional(),
  gcsSecretKey: z.string().optional(),
  azureAccountName: z.string().optional(),
  azureContainerName: z.string().optional(),
  azureSasToken: z.string().optional(),
  azureServiceType: z
    .enum(['blob', 'file'])
    .optional()
    .describe('Azure storage type; defaults to blob for the legacy Azure fields.'),
  webfolderBaseUrl: z.string().optional(),
  webfolderUsername: z.string().optional(),
  webfolderPassword: z.string().optional(),
  endpointUrl: z.string().optional().describe('Required S3-compatible API endpoint URL.'),
  region: z.string().optional().describe('Required S3-compatible storage region.'),
  storageProvider: z
    .enum(['DigitalOcean', 'Linode', 'Wasabi'])
    .optional()
    .describe('Required documented S3-compatible storage provider.'),
  additionalSettings: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      'Complete additional documented deployment settings to retain during explicit replacement. Cannot override named fields, contain credentials, or include read-only fields.'
    )
});
export const sourceSettings = {
  secureUrlEnabled: z.boolean().optional(),
  cacheTtlBehavior: z
    .enum(['respect_origin', 'override_origin', 'enforce_minimum'])
    .optional(),
  cacheTtlValue: z.number().int().min(1800).max(31536000).optional(),
  cacheTtlError: z.number().int().min(1).max(31536000).optional(),
  defaultParams: z.record(z.string(), z.string()).optional(),
  imageError: z.string().optional(),
  imageMissing: z.string().optional()
};
type Settings = {
  secureUrlEnabled?: boolean;
  cacheTtlBehavior?: string;
  cacheTtlValue?: number;
  cacheTtlError?: number;
  defaultParams?: Record<string, string>;
  imageError?: string;
  imageMissing?: string;
};
export function settings(input: Settings) {
  if (input.imageError !== undefined) publicUrl(input.imageError);
  if (input.imageMissing !== undefined) publicUrl(input.imageMissing);
  return pickDefined({
    secure_url_enabled: input.secureUrlEnabled,
    cache_ttl_behavior: input.cacheTtlBehavior,
    cache_ttl_value: input.cacheTtlValue,
    cache_ttl_error: input.cacheTtlError,
    default_params: input.defaultParams,
    image_error: input.imageError,
    image_missing: input.imageMissing
  });
}
export function buildDeployment(
  input: z.infer<typeof deploymentInput>
): Record<string, unknown> {
  const fail = (message: string): never => {
    throw createApiServiceError(message, { parent: {} });
  };
  for (const subdomain of input.imgixSubdomains)
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(subdomain))
      fail('imgixSubdomains must contain bare valid subdomain labels, without .imgix.net.');
  input.customDomains?.forEach(validDomain);
  const required = (...fields: (keyof typeof input)[]) => {
    for (const field of fields)
      if (typeof input[field] !== 'string' || !input[field])
        fail(`The selected storage type requires ${field}.`);
  };
  const typed: Record<string, unknown> = {
    type: input.type,
    imgix_subdomains: input.imgixSubdomains,
    ...pickDefined({ custom_domains: input.customDomains })
  };
  const provided = (...fields: (keyof typeof input)[]) =>
    fields.some(field => input[field] !== undefined);
  if (input.type === 's3') {
    required('s3AccessKey', 's3SecretKey', 's3Bucket');
    Object.assign(
      typed,
      pickDefined({
        s3_access_key: input.s3AccessKey,
        s3_secret_key: input.s3SecretKey,
        s3_bucket: input.s3Bucket,
        s3_prefix: input.s3Prefix
      })
    );
  }
  if (input.type === 's3_compatible') {
    required(
      's3AccessKey',
      's3SecretKey',
      's3Bucket',
      'endpointUrl',
      'region',
      'storageProvider'
    );
    publicUrl(input.endpointUrl ?? '');
    if (input.s3Prefix !== undefined)
      fail('s3Prefix is not documented for S3-compatible deployments.');
    Object.assign(typed, {
      access_key_id: input.s3AccessKey,
      secret_key: input.s3SecretKey,
      bucket_name: input.s3Bucket,
      endpoint_url: input.endpointUrl,
      region: input.region,
      storage_provider: input.storageProvider
    });
  }
  if (input.type === 'gcs') {
    required('gcsBucket', 'gcsAccessKey', 'gcsSecretKey');
    Object.assign(typed, {
      gcs_bucket: input.gcsBucket,
      gcs_access_key: input.gcsAccessKey,
      gcs_secret_key: input.gcsSecretKey
    });
  }
  if (input.type === 'azure') {
    required('azureAccountName', 'azureContainerName', 'azureSasToken');
    Object.assign(typed, {
      azure_account: input.azureAccountName,
      azure_bucket: input.azureContainerName,
      azure_sas_string: input.azureSasToken,
      azure_service_type: input.azureServiceType ?? 'blob'
    });
  }
  if (input.type === 'webfolder') {
    required('webfolderBaseUrl');
    publicUrl(input.webfolderBaseUrl ?? '');
    typed.webfolder_base_url = input.webfolderBaseUrl;
  }
  if (['webfolder', 'webproxy'].includes(input.type)) {
    for (const value of [input.webfolderUsername, input.webfolderPassword])
      if (value !== undefined && (value.includes(':') || hasControl(value)))
        fail('Origin Basic credentials cannot contain colons or control characters.');
    if ((input.webfolderUsername === undefined) !== (input.webfolderPassword === undefined))
      fail('Origin username and password must be supplied together.');
    Object.assign(
      typed,
      pickDefined({ username: input.webfolderUsername, password: input.webfolderPassword })
    );
  }
  if (
    !['s3', 's3_compatible'].includes(input.type) &&
    provided('s3AccessKey', 's3SecretKey', 's3Bucket', 's3Prefix')
  )
    fail('S3 fields apply only to the selected S3 storage type.');
  if (input.type !== 's3_compatible' && provided('endpointUrl', 'region', 'storageProvider'))
    fail('S3-compatible fields apply only to that storage type.');
  if (input.type !== 'gcs' && provided('gcsBucket', 'gcsAccessKey', 'gcsSecretKey'))
    fail('GCS fields apply only to GCS.');
  if (
    input.type !== 'azure' &&
    provided('azureAccountName', 'azureContainerName', 'azureSasToken', 'azureServiceType')
  )
    fail('Azure fields apply only to Azure.');
  if (input.type !== 'webfolder' && provided('webfolderBaseUrl'))
    fail('webfolderBaseUrl applies only to Web Folder.');
  if (
    !['webfolder', 'webproxy'].includes(input.type) &&
    provided('webfolderUsername', 'webfolderPassword')
  )
    fail('Origin Basic fields apply only to Web Folder or Web Proxy.');
  const extra = z
    .object({
      annotation: z.string().optional(),
      crossdomain_xml_enabled: z.boolean().optional(),
      image_error_append_qs: z.boolean().optional(),
      image_missing_append_qs: z.boolean().optional(),
      'robots.txt': z.enum(['origin', 'allow-all', 'disallow-all']).optional(),
      gcs_prefix: z.string().optional(),
      azure_prefix: z.string().optional()
    })
    .strict()
    .safeParse(input.additionalSettings ?? {});
  if (!extra.success)
    throw createApiServiceError(
      'additionalSettings contains an unsupported, credential, read-only, or named setting.',
      { parent: {} }
    );
  if (
    (input.type !== 'gcs' && extra.data.gcs_prefix !== undefined) ||
    (input.type !== 'azure' && extra.data.azure_prefix !== undefined) ||
    (input.type === 'webproxy' && extra.data['robots.txt'] === 'origin')
  )
    fail('Additional settings conflict with the selected storage type.');
  return { ...typed, ...extra.data };
}

export function deploymentCredentials(
  input: z.infer<typeof deploymentInput>,
  includeIdentifiers = true
): string[] {
  return [
    includeIdentifiers ? input.s3AccessKey : undefined,
    input.s3SecretKey,
    includeIdentifiers ? input.gcsAccessKey : undefined,
    input.gcsSecretKey,
    input.azureSasToken,
    includeIdentifiers ? input.webfolderUsername : undefined,
    input.webfolderPassword
  ].filter((value): value is string => typeof value === 'string' && value.length > 0);
}
