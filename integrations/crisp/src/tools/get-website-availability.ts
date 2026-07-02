import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getWebsiteAvailability = SlateTool.create(spec, {
  name: 'Get Website Availability',
  key: 'get_website_availability',
  description: `Check the current online/offline availability status of the Crisp website (workspace). Returns whether the support team is currently available.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      status: z
        .enum(['online', 'away', 'offline'])
        .optional()
        .describe('Crisp availability status for the website'),
      available: z
        .boolean()
        .optional()
        .describe('Whether the support team is currently online'),
      since: z.number().optional().describe('Timestamp since the availability status changed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteId: ctx.config.websiteId,
      tier: ctx.auth.tier
    });
    let result = await client.getWebsiteAvailability();

    return {
      output: {
        status: result?.status,
        available: result?.status === 'online',
        since: result?.since
      },
      message: `Website availability: **${result?.status ?? 'unknown'}**.`
    };
  })
  .build();
