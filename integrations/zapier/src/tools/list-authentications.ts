import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAuthentications = SlateTool.create(spec, {
  name: 'List Authentications',
  key: 'list_authentications',
  description: `Retrieve the user's existing authentications (connected accounts) for a specific Zapier app. Each authentication represents a saved set of credentials used to access a service.
Use this to find authentication IDs required when creating Zap steps or testing actions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      appId: z.string().describe('App UUID from the /v2/apps endpoint'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of results to return (default: 10)'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      authentications: z.array(
        z.object({
          authenticationId: z.string().describe('Unique authentication identifier'),
          appId: z.string().describe('Associated app ID'),
          title: z
            .string()
            .describe('Authentication label (usually includes the account email/name)'),
          isExpired: z
            .boolean()
            .describe('Whether the authentication has expired and needs re-authorization')
        })
      ),
      totalCount: z.number().describe('Total number of authentications for this app')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.getAuthentications({
      app: ctx.input.appId,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let authentications = response.data.map(a => ({
      authenticationId: a.id,
      appId: String(a.app),
      title: a.title,
      isExpired: a.isExpired
    }));

    return {
      output: {
        authentications,
        totalCount: response.meta.count
      },
      message: `Found **${response.meta.count}** authentication(s) for app \`${ctx.input.appId}\`. ${authentications.filter(a => a.isExpired).length} expired.`
    };
  })
  .build();
