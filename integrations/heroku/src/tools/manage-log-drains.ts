import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { herokuServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageLogDrains = SlateTool.create(spec, {
  name: 'Manage Log Drains',
  key: 'manage_log_drains',
  description: `List, add, or remove log drains for a Heroku app. Log drains forward application logs to external services like Papertrail, Datadog, or custom syslog endpoints.`
})
  .input(
    z.object({
      appIdOrName: z.string().describe('App name or unique identifier'),
      action: z.enum(['list', 'add', 'remove']).describe('Operation to perform'),
      url: z
        .string()
        .optional()
        .describe(
          'Log drain URL (required for "add", e.g., "syslog+tls://logs.example.com:1234")'
        ),
      drainIdOrUrl: z.string().optional().describe('Drain ID or URL (required for "remove")')
    })
  )
  .output(
    z.object({
      logDrains: z
        .array(
          z.object({
            drainId: z.string().describe('Unique identifier of the log drain'),
            url: z.string().describe('URL where logs are forwarded'),
            drainToken: z.string().describe('Token for identifying the drain'),
            createdAt: z.string().describe('When the drain was created')
          })
        )
        .optional(),
      removed: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { appIdOrName, action } = ctx.input;

    let mapDrain = (d: any) => ({
      drainId: d.drainId,
      url: d.url,
      drainToken: d.token,
      createdAt: d.createdAt
    });

    if (action === 'list') {
      let drains = await client.listLogDrains(appIdOrName);
      return {
        output: { logDrains: drains.map(mapDrain) },
        message: `Found **${drains.length}** log drain(s) for app **${appIdOrName}**.`
      };
    }

    if (action === 'add') {
      if (!ctx.input.url) throw herokuServiceError('url is required for "add" action.');
      let drain = await client.addLogDrain(appIdOrName, ctx.input.url);
      return {
        output: { logDrains: [mapDrain(drain)] },
        message: `Added log drain to **${drain.url}** for app **${appIdOrName}**.`
      };
    }

    // remove
    if (!ctx.input.drainIdOrUrl)
      throw herokuServiceError('drainIdOrUrl is required for "remove" action.');
    await client.removeLogDrain(appIdOrName, ctx.input.drainIdOrUrl);
    return {
      output: { removed: true },
      message: `Removed log drain from app **${appIdOrName}**.`
    };
  })
  .build();
