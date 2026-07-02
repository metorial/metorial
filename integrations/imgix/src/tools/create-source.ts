import { SlateTool } from 'slates';
import { z } from 'zod';
import { ImgixClient } from '../lib/client';
import { spec } from '../spec';

export let createSource = SlateTool.create(spec, {
  name: 'Create Source',
  key: 'create_source',
  description: `Create and deploy a new Imgix source. A source defines the origin storage backend from which Imgix fetches images. Supports Amazon S3, Google Cloud Storage, Microsoft Azure, Web Folder, Web Proxy, and S3-compatible storage (DigitalOcean, Cloudflare R2, Wasabi). The source will be automatically deployed after creation.`,
  instructions: [
    'At minimum you must provide a name, deployment type, and at least one imgix subdomain.',
    'For S3 sources, provide s3AccessKey, s3SecretKey, and s3Bucket in the deployment object.',
    'For Azure sources, provide azureAccountName, azureContainerName, and azureSasToken.',
    'For GCS sources, provide gcsBucket and gcsAccessKey/gcsSecretKey.',
    'For Web Folder sources, provide webfolderBaseUrl.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Display name for the source'),
      deployment: z
        .object({
          type: z
            .enum(['s3', 'gcs', 'azure', 'webfolder', 'webproxy', 's3_compatible'])
            .describe('Type of storage backend'),
          imgixSubdomains: z
            .array(z.string())
            .describe('At least one Imgix subdomain to assign'),
          s3AccessKey: z
            .string()
            .optional()
            .describe('S3 access key (for s3 and s3_compatible types)'),
          s3SecretKey: z
            .string()
            .optional()
            .describe('S3 secret key (for s3 and s3_compatible types)'),
          s3Bucket: z
            .string()
            .optional()
            .describe('S3 bucket name (for s3 and s3_compatible types)'),
          s3Prefix: z.string().optional().describe('S3 key prefix / path prefix'),
          gcsBucket: z.string().optional().describe('GCS bucket name'),
          gcsAccessKey: z.string().optional().describe('GCS HMAC access key'),
          gcsSecretKey: z.string().optional().describe('GCS HMAC secret key'),
          azureAccountName: z.string().optional().describe('Azure storage account name'),
          azureContainerName: z.string().optional().describe('Azure blob container name'),
          azureSasToken: z.string().optional().describe('Azure SAS token for access'),
          webfolderBaseUrl: z.string().optional().describe('Base URL for Web Folder sources'),
          webfolderUsername: z
            .string()
            .optional()
            .describe('Basic auth username for Web Folder'),
          webfolderPassword: z
            .string()
            .optional()
            .describe('Basic auth password for Web Folder'),
          customDomains: z
            .array(z.string())
            .optional()
            .describe('Custom domains to assign to this source')
        })
        .describe('Deployment configuration specifying the storage backend and credentials'),
      enabled: z
        .boolean()
        .optional()
        .describe('Whether the source should be enabled (defaults to true)'),
      secureUrlEnabled: z
        .boolean()
        .optional()
        .describe('Whether to enable secure/signed URLs'),
      cacheTtlBehavior: z
        .enum(['respect_origin', 'override_origin', 'enforce_minimum'])
        .optional()
        .describe('Cache TTL behavior'),
      cacheTtlValue: z.number().optional().describe('Cache TTL value in seconds'),
      defaultParams: z
        .record(z.string(), z.string())
        .optional()
        .describe('Default rendering parameters applied to all requests')
    })
  )
  .output(
    z.object({
      sourceId: z.string().describe('ID of the created source'),
      name: z.string().describe('Name of the created source'),
      deploymentStatus: z.string().describe('Deployment status after creation'),
      enabled: z.boolean().describe('Whether the source is enabled'),
      imgixSubdomains: z.array(z.string()).optional().describe('Assigned Imgix subdomains')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ImgixClient(ctx.auth.token);

    let deployment: Record<string, any> = {
      type: ctx.input.deployment.type,
      imgix_subdomains: ctx.input.deployment.imgixSubdomains
    };

    if (ctx.input.deployment.s3AccessKey)
      deployment.s3_access_key = ctx.input.deployment.s3AccessKey;
    if (ctx.input.deployment.s3SecretKey)
      deployment.s3_secret_key = ctx.input.deployment.s3SecretKey;
    if (ctx.input.deployment.s3Bucket) deployment.s3_bucket = ctx.input.deployment.s3Bucket;
    if (ctx.input.deployment.s3Prefix) deployment.s3_prefix = ctx.input.deployment.s3Prefix;
    if (ctx.input.deployment.gcsBucket) deployment.gcs_bucket = ctx.input.deployment.gcsBucket;
    if (ctx.input.deployment.gcsAccessKey)
      deployment.gcs_access_key = ctx.input.deployment.gcsAccessKey;
    if (ctx.input.deployment.gcsSecretKey)
      deployment.gcs_secret_key = ctx.input.deployment.gcsSecretKey;
    if (ctx.input.deployment.azureAccountName)
      deployment.azure_account_name = ctx.input.deployment.azureAccountName;
    if (ctx.input.deployment.azureContainerName)
      deployment.azure_container_name = ctx.input.deployment.azureContainerName;
    if (ctx.input.deployment.azureSasToken)
      deployment.azure_sas_token = ctx.input.deployment.azureSasToken;
    if (ctx.input.deployment.webfolderBaseUrl)
      deployment.webfolder_base_url = ctx.input.deployment.webfolderBaseUrl;
    if (ctx.input.deployment.webfolderUsername)
      deployment.webfolder_username = ctx.input.deployment.webfolderUsername;
    if (ctx.input.deployment.webfolderPassword)
      deployment.webfolder_password = ctx.input.deployment.webfolderPassword;
    if (ctx.input.deployment.customDomains)
      deployment.custom_domains = ctx.input.deployment.customDomains;

    let attributes: Record<string, any> = {
      name: ctx.input.name,
      deployment
    };

    if (ctx.input.enabled !== undefined) attributes.enabled = ctx.input.enabled;
    if (ctx.input.secureUrlEnabled !== undefined)
      attributes.secure_url_enabled = ctx.input.secureUrlEnabled;
    if (ctx.input.cacheTtlBehavior) attributes.cache_ttl_behavior = ctx.input.cacheTtlBehavior;
    if (ctx.input.cacheTtlValue !== undefined)
      attributes.cache_ttl_value = ctx.input.cacheTtlValue;
    if (ctx.input.defaultParams) attributes.default_params = ctx.input.defaultParams;

    let result = await client.createSource(attributes);
    let s = result.data;

    return {
      output: {
        sourceId: s.id,
        name: s.attributes?.name ?? ctx.input.name,
        deploymentStatus: s.attributes?.deployment_status ?? 'deploying',
        enabled: s.attributes?.enabled ?? true,
        imgixSubdomains:
          s.attributes?.deployment?.imgix_subdomains ?? ctx.input.deployment.imgixSubdomains
      },
      message: `Created source **${ctx.input.name}** (${s.id}). Deployment status: ${s.attributes?.deployment_status ?? 'deploying'}.`
    };
  })
  .build();
