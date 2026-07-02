import { SlateTool } from 'slates';
import { z } from 'zod';
import { PostalyticsClient } from '../lib/client';
import { spec } from '../spec';

export let createLoginLink = SlateTool.create(spec, {
  name: 'Create Login Link',
  key: 'create_login_link',
  description: `Generate an authenticated auto-login link that redirects users into the Postalytics UI or Express Windows. Useful for multi-tenant or embedded scenarios where users need seamless access to the Postalytics dashboard, template builder, campaign wizard, or contact import screen.`,
  instructions: [
    'Provide the target URL path (e.g. "dashboard", "template-create", "contact-import") to control where the user lands.',
    'Optionally provide a resourceId to target a specific resource (e.g. a template or campaign ID).',
    'The returned link is short-lived and should be used immediately.'
  ],
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      targetUrl: z
        .string()
        .describe(
          'Target URL path within Postalytics (e.g. "dashboard", "template-create", "contact-import", "campaign-create")'
        ),
      resourceId: z
        .string()
        .optional()
        .describe('Optional resource ID to target a specific template, campaign, etc.')
    })
  )
  .output(
    z.object({
      loginLink: z.string().describe('Authenticated auto-login URL'),
      raw: z.record(z.string(), z.unknown()).describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PostalyticsClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let result = await client.createLoginLink({
      apiKey: ctx.auth.token,
      url: ctx.input.targetUrl,
      resourceId: ctx.input.resourceId
    });

    return {
      output: {
        loginLink: (result.login_link || result.loginLink || '') as string,
        raw: result
      },
      message: `Login link generated for **${ctx.input.targetUrl}**${ctx.input.resourceId ? ` (resource: ${ctx.input.resourceId})` : ''}.`
    };
  })
  .build();
