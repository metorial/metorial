import { SlateTool } from 'slates';
import { z } from 'zod';
import { CuttlyClient } from '../lib/client';
import { spec } from '../spec';

export let removeMobileRedirect = SlateTool.create(spec, {
  name: 'Remove Mobile Redirect',
  key: 'remove_mobile_redirect',
  description:
    'Remove an operating-system-specific redirect from an existing Cutt.ly API-created short link. The selected platform will use the normal link destination again.',
  constraints: ['You can only edit API-created links that you own.'],
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      shortLink: z.string().describe('The shortened URL to edit'),
      platform: z
        .enum(['android', 'ios', 'windowsMobile', 'redirect'])
        .describe(
          'Redirect to remove. Use redirect for the alternative destination for other devices.'
        )
    })
  )
  .output(
    z.object({
      shortLink: z.string(),
      platform: z.string(),
      statusMessage: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new CuttlyClient({
      apiKey: ctx.auth.token,
      apiType: ctx.config.apiType
    });
    await client.editLink({ shortLink: ctx.input.shortLink, mobile: ctx.input.platform });
    return {
      output: {
        shortLink: ctx.input.shortLink,
        platform: ctx.input.platform,
        statusMessage: 'Mobile redirect removed'
      },
      message: `Removed the ${ctx.input.platform} redirect from **${ctx.input.shortLink}**`
    };
  })
  .build();
