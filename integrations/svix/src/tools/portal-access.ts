import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPortalAccess = SlateTool.create(spec, {
  name: 'Get Portal Access',
  key: 'get_portal_access',
  description: `Generate a short-lived App Portal URL for a specific application. The portal lets your customers manage their endpoints, debug delivery, and inspect/replay past webhooks — all without needing a Svix account.`,
  instructions: [
    'The returned URL is single-use and short-lived. Generate a new one each time a user needs access.',
    'The URL and token are safe to pass to your frontend.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      applicationId: z
        .string()
        .describe('Application ID or UID to generate portal access for'),
      featureFlags: z
        .array(z.string())
        .optional()
        .describe('Feature flags to restrict which event types are visible in the portal')
    })
  )
  .output(
    z.object({
      portalUrl: z.string().describe('Short-lived URL for the App Portal'),
      portalToken: z
        .string()
        .describe('Short-lived token for API access scoped to this application')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region || 'us'
    });

    ctx.progress('Generating portal access...');
    let result = await client.getAppPortalAccess(ctx.input.applicationId, {
      featureFlags: ctx.input.featureFlags
    });

    return {
      output: {
        portalUrl: result.url,
        portalToken: result.token
      },
      message: `Generated App Portal URL for application \`${ctx.input.applicationId}\`. The URL is single-use and short-lived.`
    };
  })
  .build();
