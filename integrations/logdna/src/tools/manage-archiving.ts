import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let archiveOutputSchema = z.object({
  integration: z
    .string()
    .optional()
    .describe('Storage provider type (ibm, s3, azblob, gcs, dos, swift)'),
  bucket: z.string().optional().describe('Storage bucket name'),
  endpoint: z.string().optional().describe('Storage endpoint URL'),
  resourceInstanceId: z.string().optional().describe('IBM resource instance ID'),
  accountName: z.string().optional().describe('Azure account name'),
  projectId: z.string().optional().describe('GCS project ID'),
  space: z.string().optional().describe('DigitalOcean space name')
});

export let getArchiveConfig = SlateTool.create(spec, {
  name: 'Get Archive Configuration',
  key: 'get_archive_config',
  description: `Retrieve the current archiving configuration for long-term log storage. Only one archiving configuration may exist at a time.`,
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(archiveOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ serviceKey: ctx.auth.token });
    let a = await client.getArchiveConfig();

    return {
      output: {
        integration: a.integration,
        bucket: a.bucket,
        endpoint: a.endpoint,
        resourceInstanceId: a.resourceinstanceid,
        accountName: a.accountname,
        projectId: a.projectid,
        space: a.space
      },
      message: a.integration
        ? `Archive configured with **${a.integration}** integration.`
        : 'No archive configuration found.'
    };
  })
  .build();

export let saveArchiveConfig = SlateTool.create(spec, {
  name: 'Save Archive Configuration',
  key: 'save_archive_config',
  description: `Create or update the archiving configuration for long-term log storage. Supports IBM Cloud Object Storage, Amazon S3, Azure Blob Storage, Google Cloud Storage, DigitalOcean Spaces, and OpenStack Swift. Only one configuration may exist at a time; saving a new one replaces the existing configuration.`,
  instructions: [
    'Provide the "integration" field and the corresponding fields for your storage provider.',
    'For IBM: provide bucket, endpoint, ibmApiKey, resourceInstanceId.',
    'For S3: provide bucket, and optionally endpoint, s3AccessKey, s3SecretKey.',
    'For Azure Blob: provide accountName, accountKey.',
    'For GCS: provide bucket, projectId.',
    'For DigitalOcean Spaces: provide space, endpoint, accessKey, secretKey.',
    'For Swift: provide authUrl, username, password, tenantName.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      integration: z
        .enum(['ibm', 's3', 'azblob', 'gcs', 'dos', 'swift'])
        .describe('Storage provider type'),
      bucket: z.string().optional().describe('Bucket name (IBM, S3, GCS)'),
      endpoint: z.string().optional().describe('Endpoint URL (IBM, S3, DigitalOcean)'),
      ibmApiKey: z.string().optional().describe('IBM Cloud API key'),
      resourceInstanceId: z.string().optional().describe('IBM resource instance ID'),
      accountName: z.string().optional().describe('Azure storage account name'),
      accountKey: z.string().optional().describe('Azure storage account key'),
      projectId: z.string().optional().describe('GCS project ID'),
      space: z.string().optional().describe('DigitalOcean space name'),
      accessKey: z.string().optional().describe('S3 or DigitalOcean access key'),
      secretKey: z.string().optional().describe('S3 or DigitalOcean secret key'),
      authUrl: z.string().optional().describe('Swift auth URL'),
      username: z.string().optional().describe('Swift username'),
      password: z.string().optional().describe('Swift password'),
      tenantName: z.string().optional().describe('Swift tenant name'),
      expires: z.string().optional().describe('Swift token expiration')
    })
  )
  .output(archiveOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ serviceKey: ctx.auth.token });

    let archivePayload: any = {
      integration: ctx.input.integration
    };

    if (ctx.input.bucket) archivePayload.bucket = ctx.input.bucket;
    if (ctx.input.endpoint) archivePayload.endpoint = ctx.input.endpoint;
    if (ctx.input.ibmApiKey) archivePayload.apikey = ctx.input.ibmApiKey;
    if (ctx.input.resourceInstanceId)
      archivePayload.resourceinstanceid = ctx.input.resourceInstanceId;
    if (ctx.input.accountName) archivePayload.accountname = ctx.input.accountName;
    if (ctx.input.accountKey) archivePayload.accountkey = ctx.input.accountKey;
    if (ctx.input.projectId) archivePayload.projectid = ctx.input.projectId;
    if (ctx.input.space) archivePayload.space = ctx.input.space;
    if (ctx.input.accessKey) archivePayload.accesskey = ctx.input.accessKey;
    if (ctx.input.secretKey) archivePayload.secretkey = ctx.input.secretKey;
    if (ctx.input.authUrl) archivePayload.authurl = ctx.input.authUrl;
    if (ctx.input.username) archivePayload.username = ctx.input.username;
    if (ctx.input.password) archivePayload.password = ctx.input.password;
    if (ctx.input.tenantName) archivePayload.tenantname = ctx.input.tenantName;
    if (ctx.input.expires) archivePayload.expires = ctx.input.expires;

    // Try to update first; if that fails (no existing config), create
    let a: any;
    try {
      a = await client.updateArchiveConfig(archivePayload);
    } catch {
      a = await client.createArchiveConfig(archivePayload);
    }

    return {
      output: {
        integration: a.integration || ctx.input.integration,
        bucket: a.bucket,
        endpoint: a.endpoint,
        resourceInstanceId: a.resourceinstanceid,
        accountName: a.accountname,
        projectId: a.projectid,
        space: a.space
      },
      message: `Archive configuration saved with **${ctx.input.integration}** integration.`
    };
  })
  .build();

export let deleteArchiveConfig = SlateTool.create(spec, {
  name: 'Delete Archive Configuration',
  key: 'delete_archive_config',
  description: `Delete the current archiving configuration.`,
  tags: { destructive: true, readOnly: false }
})
  .input(z.object({}))
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the archive config was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ serviceKey: ctx.auth.token });
    await client.deleteArchiveConfig();

    return {
      output: { deleted: true },
      message: 'Archive configuration deleted.'
    };
  })
  .build();
