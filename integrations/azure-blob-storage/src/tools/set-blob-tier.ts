import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let setBlobTier = SlateTool.create(spec, {
  name: 'Set Blob Access Tier',
  key: 'set_blob_tier',
  description: `Change the access tier of a block blob. Tiers control storage costs and access performance: Hot (frequent access), Cool (infrequent, 30-day minimum), Cold (rare access), or Archive (offline, requires rehydration).`,
  constraints: [
    'Only block blobs support tiering - append and page blobs do not.',
    'Moving to Archive tier makes the blob offline; it must be rehydrated before reading.',
    'Early deletion fees may apply when moving from Cool or Cold tiers before the minimum retention period.'
  ]
})
  .input(
    z.object({
      containerName: z.string().describe('Name of the container'),
      blobName: z.string().describe('Full name/path of the blob'),
      accessTier: z.enum(['Hot', 'Cool', 'Cold', 'Archive']).describe('Target access tier')
    })
  )
  .output(
    z.object({
      containerName: z.string().describe('Container the blob belongs to'),
      blobName: z.string().describe('Name of the blob'),
      accessTier: z.string().describe('New access tier'),
      success: z.boolean().describe('Whether the tier change succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      accountName: ctx.config.storageAccountName,
      token: ctx.auth.token
    });

    await client.setBlobTier(
      ctx.input.containerName,
      ctx.input.blobName,
      ctx.input.accessTier
    );

    return {
      output: {
        containerName: ctx.input.containerName,
        blobName: ctx.input.blobName,
        accessTier: ctx.input.accessTier,
        success: true
      },
      message: `Access tier for blob **${ctx.input.blobName}** changed to **${ctx.input.accessTier}**.`
    };
  })
  .build();
