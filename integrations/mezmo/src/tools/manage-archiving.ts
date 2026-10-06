import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { isMissing, MezmoClient } from '../lib/client';
import { spec } from '../spec';

let archiveOutputSchema = z.object({
  integration: z.string().min(1).describe('Provider storage integration identifier'),
  bucket: z.string().min(1).describe('Storage bucket name'),
  endpoint: z.string().optional().describe('Storage endpoint URL'),
  projectId: z.string().optional().describe('GCS project ID')
});

export let getArchiveConfig = SlateTool.create(spec, {
  name: 'Get Archive Config',
  key: 'get_archive_config',
  description: `Retrieve the current archiving configuration. Archiving sends logs to long-term cold storage. Only one archiving configuration can exist at a time.`,
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(archiveOutputSchema)
  .handleInvocation(async ctx => {
    let client = new MezmoClient({ token: ctx.auth.token });
    let result = await client.getArchiveConfig();
    if (!result)
      throw createApiServiceError('No archiving configuration exists for this account.');

    return {
      output: {
        integration: result.integration,
        bucket: result.bucket,
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
  description: `Create or update the archiving configuration for long-term log storage. Only one archiving configuration may exist at a time; calling this will overwrite any existing configuration.`,
  instructions: [
    'Use the provider integration identifier and storage credentials documented for your account. This changes the account-wide destination and can send retained logs to that storage.'
  ],
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      integration: z.string().min(1).describe('Provider storage integration identifier'),
      bucket: z.string().min(1).describe('Target storage bucket name'),
      endpoint: z.string().optional().describe('Storage endpoint URL'),
      apiKey: z.string().optional().describe('Cloud Object Storage API key'),
      space: z.string().optional().describe('Provider storage space'),
      authUrl: z.string().optional().describe('Storage authentication URL'),
      username: z.string().optional().describe('Storage authentication username'),
      password: z.string().optional().describe('Storage authentication password'),
      tenantName: z.string().optional().describe('Storage tenant name'),
      expires: z.string().optional().describe('Provider credential expiry value'),
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
      apikey: ctx.input.apiKey,
      space: ctx.input.space,
      authurl: ctx.input.authUrl,
      username: ctx.input.username,
      password: ctx.input.password,
      tenantname: ctx.input.tenantName,
      expires: ctx.input.expires,
      accesskey: ctx.input.accessKey,
      secretkey: ctx.input.secretKey,
      resourceinstanceid: ctx.input.resourceInstanceId,
      projectid: ctx.input.projectId,
      accountname: ctx.input.accountName,
      accountkey: ctx.input.accountKey
    };

    let existing: Awaited<ReturnType<typeof client.getArchiveConfig>>;
    try {
      existing = await client.getArchiveConfig();
    } catch (error) {
      if (!isMissing(error)) throw error;
      existing = null;
    }
    const result = existing
      ? await client.updateArchiveConfig(params)
      : await client.createArchiveConfig(params);

    return {
      output: {
        integration: result.integration,
        bucket: result.bucket,
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
