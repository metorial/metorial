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
      available: z
        .boolean()
        .optional()
        .describe('Whether the support team is currently available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, websiteId: ctx.config.websiteId });
    let result = await client.getWebsiteAvailability();

    return {
      output: {
        available: result?.available
      },
      message: `Website availability: **${result?.available ? 'Online' : 'Offline'}**.`
    };
  })
  .build();
