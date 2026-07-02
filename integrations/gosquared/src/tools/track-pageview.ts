import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoSquaredClient } from '../lib/client';
import { spec } from '../spec';

export let trackPageview = SlateTool.create(spec, {
  name: 'Track Pageview',
  key: 'track_pageview',
  description: `Track a pageview in GoSquared server-side. Useful for recording page visits from non-browser environments or server-rendered pages.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      pageTitle: z.string().optional().describe('Title of the page visited'),
      pageUrl: z.string().optional().describe('URL of the page visited'),
      personId: z
        .string()
        .optional()
        .describe(
          'Person ID to associate the pageview with (use "email:user@example.com" format)'
        ),
      visitorId: z
        .string()
        .optional()
        .describe('Anonymous visitor ID to associate the pageview with')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the pageview was tracked successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoSquaredClient({
      token: ctx.auth.token,
      siteToken: ctx.config.siteToken
    });

    await client.trackPageview({
      title: ctx.input.pageTitle,
      url: ctx.input.pageUrl,
      personId: ctx.input.personId,
      visitorId: ctx.input.visitorId
    });

    return {
      output: { success: true },
      message: `Successfully tracked pageview${ctx.input.pageUrl ? ` for **${ctx.input.pageUrl}**` : ''}.`
    };
  })
  .build();
