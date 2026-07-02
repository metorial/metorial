import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getApplication = SlateTool.create(spec, {
  name: 'Get Application',
  key: 'get_application',
  description: `Retrieve details of a specific consumer application by ID or UID. Returns the application's name, metadata, rate limit, and timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      applicationId: z.string().describe('Application ID or UID')
    })
  )
  .output(
    z.object({
      applicationId: z.string().describe('Svix application ID'),
      name: z.string().describe('Name of the application'),
      uid: z.string().optional().describe('Custom UID of the application'),
      rateLimit: z.number().optional().describe('Rate limit for the application'),
      throttleRate: z.number().optional().describe('Message throttle rate'),
      metadata: z.record(z.string(), z.string()).describe('Application metadata'),
      createdAt: z.string().describe('When the application was created'),
      updatedAt: z.string().describe('When the application was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region || 'us'
    });

    ctx.progress('Fetching application...');
    let app = await client.getApplication(ctx.input.applicationId);

    return {
      output: {
        applicationId: app.id,
        name: app.name,
        uid: app.uid ?? undefined,
        rateLimit: app.rateLimit ?? undefined,
        throttleRate: app.throttleRate ?? undefined,
        metadata: app.metadata || {},
        createdAt: app.createdAt,
        updatedAt: app.updatedAt
      },
      message: `Application **${app.name}**${app.uid ? ` (uid: ${app.uid})` : ''}.`
    };
  })
  .build();
