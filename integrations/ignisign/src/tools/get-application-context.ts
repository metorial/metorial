import { SlateTool } from 'slates';
import { z } from 'zod';
import { IgnisignClient } from '../lib/client';
import { spec } from '../spec';

export let getApplicationContext = SlateTool.create(spec, {
  name: 'Get Application Context',
  key: 'get_application_context',
  description: `Retrieve the complete application context including configuration, settings, available signature profiles, signer profiles, and environment details. Useful for understanding the application setup.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      appId: z.string().describe('Application ID'),
      appName: z.string().optional().describe('Application name'),
      status: z.string().optional().describe('Application status'),
      appType: z.string().optional().describe('Application type'),
      context: z.any().describe('Full application context')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IgnisignClient({
      token: ctx.auth.token,
      appId: ctx.config.appId,
      appEnv: ctx.config.appEnv
    });

    let result = await client.getApplicationContext();

    return {
      output: {
        appId: result.appId || ctx.config.appId,
        appName: result.appName || result.name,
        status: result.status,
        appType: result.appType,
        context: result
      },
      message: `Retrieved application context for **${ctx.config.appId}** (${ctx.config.appEnv}).`
    };
  })
  .build();
