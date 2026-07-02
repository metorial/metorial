import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let publishApplication = SlateTool.create(spec, {
  name: 'Publish Application',
  key: 'publish_application',
  description: `Publish or unpublish a Budibase application. Publishing makes the app available to end-users; unpublishing takes it offline and reverts it to development-only.`,
  instructions: [
    'Use the appId of the development version (app_dev_*) when publishing or unpublishing.'
  ]
})
  .input(
    z.object({
      appId: z.string().describe('Application ID to publish or unpublish'),
      action: z
        .enum(['publish', 'unpublish'])
        .describe('Whether to publish or unpublish the application')
    })
  )
  .output(
    z.object({
      appId: z.string().describe('Application ID'),
      published: z.boolean().describe('Whether the application is now published')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    if (ctx.input.action === 'publish') {
      await client.publishApplication(ctx.input.appId);
      return {
        output: { appId: ctx.input.appId, published: true },
        message: `Published application **${ctx.input.appId}** successfully.`
      };
    }

    await client.unpublishApplication(ctx.input.appId);
    return {
      output: { appId: ctx.input.appId, published: false },
      message: `Unpublished application **${ctx.input.appId}**.`
    };
  })
  .build();
