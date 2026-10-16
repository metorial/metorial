import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Retrieve the connected ntfy username, role, account limits, usage statistics, and reserved topics. Anonymous connections return the server-provided anonymous identity and limits.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      username: z
        .string()
        .describe('Username returned by the server; anonymous access uses *'),
      role: z.string().optional().describe('Account role returned by the server'),
      tier: z
        .object({ code: z.string().optional(), name: z.string().optional() })
        .optional()
        .describe('Account tier, when assigned'),
      limits: z
        .record(z.string(), z.union([z.string(), z.number()]))
        .optional()
        .describe('Server-provided account or visitor limits'),
      stats: z
        .record(z.string(), z.number())
        .optional()
        .describe('Current usage and remaining quotas'),
      reservations: z
        .array(z.object({ topic: z.string(), everyone: z.string() }))
        .optional()
        .describe('Reserved topics and their anonymous-access permissions')
    })
  )
  .handleInvocation(async ctx => {
    let account = await new Client({
      serverUrl: ctx.config.serverUrl,
      auth: ctx.auth
    }).getAccount();
    return {
      output: account,
      message: `Connected to ntfy as **${account.username}**.`
    };
  })
  .build();
