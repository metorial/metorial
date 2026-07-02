import { SlateTool } from 'slates';
import { z } from 'zod';
import { MezmoClient } from '../lib/client';
import { spec } from '../spec';

let archiveOutputSchema = z.object({
  integration: z.string().describe('Storage provider (e.g., "s3", "ibm", "gcs")'),
  bucket: z.string().describe('Storage bucket name'),
  endpoint: z.string().optional().describe('Storage endpoint URL'),
  projectId: z.string().optional().describe('GCS project ID')
});

export let getArchiveConfig = SlateTool.create(spec, {
  name: 'Get Archive Config',
  key: 'get_archive_config',
  description: `Retrieve the current archiving configuration. Archiving sends logs to long-term cold storage (e.g., Amazon S3, IBM Cloud Object Storage, Google Cloud Storage). Only one archiving configuration can exist at a time.`,
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(archiveOutputSchema)
  .handleInvocation(async ctx => {
    let client = new MezmoClient({ token: ctx.auth.token });
    let result = await client.getArchiveConfig();

    return {
      output: {
        integration: result.integration || '',
        bucket: result.bucket || '',
        endpoint: result.endpoint,
        projectId: result.projectid
      },
      message: `Archive configured with **${result.integration}** provider, bucket: **${result.bucket}**.`
    };
  })
  .build();

export let configureArchiving = SlateTool.create(spec, {
  name: 'Configure Archiving',
  key: 'configure_archiving',
  description: `Create or update the archiving configuration for long-term log storage. Supports Amazon S3, IBM Cloud Object Storage, and Google Cloud Storage. Only one archiving configuration may exist at a time; calling this will overwrite any existing configuration.`,
  instructions: [
    'For Amazon S3: provide integration="s3", bucket, and AWS credentials (accesskey, secretkey).',
    'For IBM COS: provide integration="ibm", bucket, endpoint, and IBM credentials.',
    'For GCS: provide integration="gcs", bucket, and projectId.'
  ],
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      integration: z.string().describe('Storage provider type (e.g., "s3", "ibm", "gcs")'),
      bucket: z.string().describe('Target storage bucket name'),
      endpoint: z.string().optional().describe('Storage endpoint URL'),
      accessKey: z.string().optional().describe('AWS access key (for S3)'),
      secretKey: z.string().optional().describe('AWS secret key (for S3)'),
      resourceInstanceId: z.string().optional().describe('IBM resource instance ID'),
      projectId: z.string().optional().describe('GCS project ID'),
      accountName: z.string().optional().describe('Storage account name'),
      accountKey: z.string().optional().describe('Storage account key')
    })
  )
  .output(archiveOutputSchema)
  .handleInvocation(async ctx => {
    let client = new MezmoClient({ token: ctx.auth.token });

    let params = {
      integration: ctx.input.integration,
      bucket: ctx.input.bucket,
      endpoint: ctx.input.endpoint,
      accesskey: ctx.input.accessKey,
      secretkey: ctx.input.secretKey,
      resourceinstanceid: ctx.input.resourceInstanceId,
      projectid: ctx.input.projectId,
      accountname: ctx.input.accountName,
      accountkey: ctx.input.accountKey
    };

    let result: Awaited<ReturnType<typeof client.createArchiveConfig>>;
    try {
      await client.getArchiveConfig();
      result = await client.updateArchiveConfig(params);
    } catch {
      result = await client.createArchiveConfig(params);
    }

    return {
      output: {
        integration: result.integration || '',
        bucket: result.bucket || '',
        endpoint: result.endpoint,
        projectId: result.projectid
      },
      message: `Archiving configured with **${result.integration}** provider, bucket: **${result.bucket}**.`
    };
  })
  .build();

export let deleteArchiveConfig = SlateTool.create(spec, {
  name: 'Delete Archive Config',
  key: 'delete_archive_config',
  description: `Remove the archiving configuration. Logs will no longer be sent to cold storage.`,
  tags: { readOnly: false, destructive: true }
})
  .input(z.object({}))
  .output(
    z.object({
      deleted: z
        .boolean()
        .describe('Whether the archive configuration was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MezmoClient({ token: ctx.auth.token });
    await client.deleteArchiveConfig();

    return {
      output: { deleted: true },
      message: 'Archive configuration has been **deleted**.'
    };
  })
  .build();
