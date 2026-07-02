import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateApplication = SlateTool.create(spec, {
  name: 'Update Application',
  key: 'update_application',
  description: `Update an existing consumer application's name, UID, rate limit, or metadata. Provide the application ID or UID to identify which application to update.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      applicationId: z.string().describe('Application ID or UID to update'),
      name: z.string().describe('Updated display name for the application'),
      uid: z.string().optional().describe('Updated custom UID for the application'),
      rateLimit: z.number().optional().describe('Updated rate limit'),
      throttleRate: z
        .number()
        .optional()
        .describe('Updated maximum messages per second for this application'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Updated key-value metadata')
    })
  )
  .output(
    z.object({
      applicationId: z.string().describe('Svix application ID'),
      name: z.string().describe('Updated name'),
      uid: z.string().optional().describe('Updated UID'),
      throttleRate: z.number().optional().describe('Updated message throttle rate'),
      updatedAt: z.string().describe('When the application was updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region || 'us'
    });

    ctx.progress('Updating application...');
    let app = await client.updateApplication(ctx.input.applicationId, {
      name: ctx.input.name,
      uid: ctx.input.uid,
      rateLimit: ctx.input.rateLimit,
      throttleRate: ctx.input.throttleRate,
      metadata: ctx.input.metadata
    });

    return {
      output: {
        applicationId: app.id,
        name: app.name,
        uid: app.uid ?? undefined,
        throttleRate: app.throttleRate ?? undefined,
        updatedAt: app.updatedAt
      },
      message: `Updated application **${app.name}** (\`${app.id}\`).`
    };
  })
  .build();
