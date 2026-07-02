import { SlateTool } from 'slates';
import { z } from 'zod';
import { addWebsite } from '../lib/admin';
import { spec } from '../spec';

export let addWebsiteTool = SlateTool.create(spec, {
  name: 'Add Website',
  key: 'add_website',
  description: `Add a new website to your Simple Analytics dashboard for tracking. You can specify a timezone, visibility, and an optional label. Requires both API key and User-Id authentication, and a Business or Enterprise plan.`,
  constraints: [
    'Requires a Business or Enterprise plan. Using this endpoint on a lower plan will trigger an automatic upgrade.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      hostname: z
        .string()
        .describe('The domain name of the website to add (e.g. "example.com").'),
      timezone: z
        .string()
        .optional()
        .describe(
          'IANA timezone identifier for the website (e.g. "Europe/Amsterdam"). Defaults to UTC.'
        ),
      isPublic: z
        .boolean()
        .optional()
        .describe('Whether analytics data should be publicly accessible.'),
      label: z.string().optional().describe('Custom label for organizing the website.')
    })
  )
  .output(
    z.object({
      hostname: z.string().describe('Hostname of the newly added website'),
      isPublic: z.boolean().optional().describe('Whether the website analytics are public'),
      timezone: z.string().optional().describe('Configured timezone'),
      label: z.string().optional().describe('Assigned label')
    })
  )
  .handleInvocation(async ctx => {
    let data = await addWebsite(
      { token: ctx.auth.token, userId: ctx.auth.userId },
      {
        hostname: ctx.input.hostname,
        timezone: ctx.input.timezone,
        isPublic: ctx.input.isPublic,
        label: ctx.input.label
      }
    );

    return {
      output: {
        hostname: data.hostname ?? ctx.input.hostname,
        isPublic: data.public ?? data.isPublic,
        timezone: data.timezone,
        label: data.label
      },
      message: `Successfully added **${ctx.input.hostname}** to your Simple Analytics dashboard.`
    };
  })
  .build();
