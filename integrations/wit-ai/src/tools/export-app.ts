import { createApiServiceError, getFileUrlTool, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

// Reissue short-lived export links conservatively instead of promising a provider expiry.
const refreshIntervalMs = 60_000;
const nextRefreshAt = () => new Date(Date.now() + refreshIntervalMs).toISOString();

export let exportApp = SlateTool.create(spec, {
  name: 'Export App',
  key: 'export_app',
  description:
    'Export the current Wit.ai app configuration as a downloadable ZIP file containing its intents, entities, traits, utterances, and settings.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      downloadUri: z
        .string()
        .describe('Provider URL for downloading the exported app ZIP; use promptly'),
      filename: z.string().describe('Export file name'),
      mimeType: z.string().describe('Export file MIME type')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, apiVersion: ctx.config.apiVersion });
    let downloadUri = await client.getExportUri();
    await ctx.addAttachment({
      type: 'url',
      url: downloadUri,
      filename: 'wit-app-export.zip',
      mimeType: 'application/zip',
      refreshReference: { kind: 'app-export' },
      refreshAt: nextRefreshAt()
    });
    return {
      output: { downloadUri, filename: 'wit-app-export.zip', mimeType: 'application/zip' },
      message: 'The app export is ready to download.'
    };
  })
  .build();

export let getFileUrl = getFileUrlTool(spec, async ctx => {
  if (!z.object({ kind: z.literal('app-export') }).safeParse(ctx.input.reference).success) {
    throw createApiServiceError('The app export reference is invalid. Request a new export.');
  }
  let client = new Client({ token: ctx.auth.token, apiVersion: ctx.config.apiVersion });
  return { url: await client.getExportUri(), expiresAt: nextRefreshAt() };
});
