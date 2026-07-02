import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageDestinations = SlateTool.create(spec, {
  name: 'Manage Destinations',
  key: 'manage_destinations',
  description: `Create, list, update, or delete cloud storage destinations for automatic collection result uploads. Supports Amazon S3, Google Cloud Storage, Microsoft Azure Blob Storage, Alibaba Cloud OSS, and S3-compatible storage.`,
  instructions: [
    'Use action "list" to see all configured destinations.',
    'Use action "create" to add a new destination with storage credentials.',
    'Use action "update" to modify an existing destination.',
    'Use action "delete" to remove a destination.',
    'A connectivity test is run on creation and when credentials are updated.'
  ],
  constraints: ['Maximum 50 destinations per account.']
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Action to perform.'),
      destinationId: z
        .string()
        .optional()
        .describe('Destination ID. Required for update and delete actions.'),

      // List params
      searchTerm: z.string().optional().describe('Filter destinations by name (list action).'),
      page: z.number().optional().describe('Page number (list action, 10 per page).'),
      sortBy: z.enum(['type', 'name']).optional().describe('Sort field (list action).'),
      sortDirection: z
        .enum(['ascending', 'descending'])
        .optional()
        .describe('Sort direction (list action).'),

      // Create/Update fields
      name: z.string().optional().describe('Destination name (create/update).'),
      enabled: z
        .boolean()
        .optional()
        .describe('Whether the destination is enabled (create/update).'),
      storageType: z
        .enum(['s3', 'gcs', 'azure', 'oss', 's3_compatible'])
        .optional()
        .describe('Cloud storage type (create).'),

      // S3
      s3AccessKeyId: z.string().optional().describe('AWS access key ID (S3/S3-compatible).'),
      s3SecretAccessKey: z
        .string()
        .optional()
        .describe('AWS secret access key (S3/S3-compatible).'),
      s3BucketName: z.string().optional().describe('S3 bucket name.'),
      s3PathPrefix: z
        .string()
        .optional()
        .describe(
          'S3 path prefix. Supports tokens: %COLLECTION_ID%, %COLLECTION_NAME%, %RESULT_SET_ID%, %DATE%.'
        ),

      // GCS
      gcsAccessKey: z.string().optional().describe('GCS HMAC access key.'),
      gcsSecretKey: z.string().optional().describe('GCS HMAC secret key.'),
      gcsBucketName: z.string().optional().describe('GCS bucket name.'),
      gcsPathPrefix: z.string().optional().describe('GCS path prefix.'),

      // Azure
      azureAccountName: z.string().optional().describe('Azure storage account name.'),
      azureAccountKey: z.string().optional().describe('Azure storage account key.'),
      azureContainerName: z.string().optional().describe('Azure blob container name.'),
      azurePathPrefix: z.string().optional().describe('Azure path prefix.'),

      // Alibaba OSS
      ossAccessKey: z.string().optional().describe('Alibaba OSS access key.'),
      ossSecretKey: z.string().optional().describe('Alibaba OSS secret key.'),
      ossBucketName: z.string().optional().describe('Alibaba OSS bucket name.'),
      ossRegionId: z.string().optional().describe('Alibaba OSS region ID.'),
      ossPathPrefix: z.string().optional().describe('Alibaba OSS path prefix.')
    })
  )
  .output(
    z.object({
      destination: z.any().optional().describe('Destination details (create/update).'),
      destinations: z.array(z.any()).optional().describe('Array of destinations (list).'),
      message: z.string().optional().describe('Confirmation message.'),
      requestInfo: z.any().optional().describe('Request metadata.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let params: Record<string, any> = {};
      if (ctx.input.searchTerm) params.search_term = ctx.input.searchTerm;
      if (ctx.input.page) params.page = ctx.input.page;
      if (ctx.input.sortBy) params.sort_by = ctx.input.sortBy;
      if (ctx.input.sortDirection) params.sort_direction = ctx.input.sortDirection;

      let data = await client.listDestinations(params);
      let count = data.destinations?.length ?? 0;

      return {
        output: {
          destinations: data.destinations ?? [],
          requestInfo: data.request_info
        },
        message: `Found **${count}** destinations.`
      };
    }

    if (ctx.input.action === 'create') {
      let body: Record<string, any> = {};
      if (ctx.input.name) body.name = ctx.input.name;
      if (ctx.input.enabled !== undefined) body.enabled = ctx.input.enabled;
      if (ctx.input.storageType) body.type = ctx.input.storageType;

      // S3
      if (ctx.input.s3AccessKeyId) body.s3_access_key_id = ctx.input.s3AccessKeyId;
      if (ctx.input.s3SecretAccessKey) body.s3_secret_access_key = ctx.input.s3SecretAccessKey;
      if (ctx.input.s3BucketName) body.s3_bucket_name = ctx.input.s3BucketName;
      if (ctx.input.s3PathPrefix) body.s3_path_prefix = ctx.input.s3PathPrefix;

      // GCS
      if (ctx.input.gcsAccessKey) body.gcs_access_key = ctx.input.gcsAccessKey;
      if (ctx.input.gcsSecretKey) body.gcs_secret_key = ctx.input.gcsSecretKey;
      if (ctx.input.gcsBucketName) body.gcs_bucket_name = ctx.input.gcsBucketName;
      if (ctx.input.gcsPathPrefix) body.gcs_path_prefix = ctx.input.gcsPathPrefix;

      // Azure
      if (ctx.input.azureAccountName) body.azure_account_name = ctx.input.azureAccountName;
      if (ctx.input.azureAccountKey) body.azure_account_key = ctx.input.azureAccountKey;
      if (ctx.input.azureContainerName)
        body.azure_container_name = ctx.input.azureContainerName;
      if (ctx.input.azurePathPrefix) body.azure_path_prefix = ctx.input.azurePathPrefix;

      // Alibaba OSS
      if (ctx.input.ossAccessKey) body.oss_access_key = ctx.input.ossAccessKey;
      if (ctx.input.ossSecretKey) body.oss_secret_key = ctx.input.ossSecretKey;
      if (ctx.input.ossBucketName) body.oss_bucket_name = ctx.input.ossBucketName;
      if (ctx.input.ossRegionId) body.oss_region_id = ctx.input.ossRegionId;
      if (ctx.input.ossPathPrefix) body.oss_path_prefix = ctx.input.ossPathPrefix;

      let data = await client.createDestination(body);
      return {
        output: {
          destination: data.destination,
          requestInfo: data.request_info
        },
        message: `Created destination **${data.destination?.name ?? ctx.input.name}** (type: ${ctx.input.storageType}).`
      };
    }

    if (ctx.input.action === 'update') {
      let body: Record<string, any> = {};
      if (ctx.input.name) body.name = ctx.input.name;
      if (ctx.input.enabled !== undefined) body.enabled = ctx.input.enabled;

      if (ctx.input.s3AccessKeyId) body.s3_access_key_id = ctx.input.s3AccessKeyId;
      if (ctx.input.s3SecretAccessKey) body.s3_secret_access_key = ctx.input.s3SecretAccessKey;
      if (ctx.input.s3BucketName) body.s3_bucket_name = ctx.input.s3BucketName;
      if (ctx.input.s3PathPrefix) body.s3_path_prefix = ctx.input.s3PathPrefix;

      if (ctx.input.gcsAccessKey) body.gcs_access_key = ctx.input.gcsAccessKey;
      if (ctx.input.gcsSecretKey) body.gcs_secret_key = ctx.input.gcsSecretKey;
      if (ctx.input.gcsBucketName) body.gcs_bucket_name = ctx.input.gcsBucketName;
      if (ctx.input.gcsPathPrefix) body.gcs_path_prefix = ctx.input.gcsPathPrefix;

      if (ctx.input.azureAccountName) body.azure_account_name = ctx.input.azureAccountName;
      if (ctx.input.azureAccountKey) body.azure_account_key = ctx.input.azureAccountKey;
      if (ctx.input.azureContainerName)
        body.azure_container_name = ctx.input.azureContainerName;
      if (ctx.input.azurePathPrefix) body.azure_path_prefix = ctx.input.azurePathPrefix;

      if (ctx.input.ossAccessKey) body.oss_access_key = ctx.input.ossAccessKey;
      if (ctx.input.ossSecretKey) body.oss_secret_key = ctx.input.ossSecretKey;
      if (ctx.input.ossBucketName) body.oss_bucket_name = ctx.input.ossBucketName;
      if (ctx.input.ossRegionId) body.oss_region_id = ctx.input.ossRegionId;
      if (ctx.input.ossPathPrefix) body.oss_path_prefix = ctx.input.ossPathPrefix;

      let data = await client.updateDestination(ctx.input.destinationId!, body);
      return {
        output: {
          destination: data.destination,
          requestInfo: data.request_info
        },
        message: `Updated destination **${ctx.input.destinationId}**.`
      };
    }

    // delete
    let data = await client.deleteDestination(ctx.input.destinationId!);
    return {
      output: {
        message: data.request_info?.message,
        requestInfo: data.request_info
      },
      message: `Deleted destination **${ctx.input.destinationId}**.`
    };
  })
  .build();
