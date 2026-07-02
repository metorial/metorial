import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSession = SlateTool.create(spec, {
  name: 'Get Session Details',
  key: 'get_session',
  description: `Retrieve detailed information about a specific browser session including its status, duration, configuration, credits used, and associated tags.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sessionId: z.string().describe('ID of the session to retrieve')
    })
  )
  .output(
    z.object({
      sessionId: z.string(),
      teamId: z.string(),
      status: z.string(),
      duration: z.number(),
      creditsUsed: z.number(),
      proxyBytes: z.number(),
      tokens: z.number(),
      steps: z.number(),
      tags: z.array(z.string()),
      createdAt: z.string(),
      configuration: z.record(z.string(), z.unknown()).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getSession(ctx.input.sessionId);

    return {
      output: {
        sessionId: result.session_id,
        teamId: result.team_id,
        status: result.status,
        duration: result.duration ?? 0,
        creditsUsed: result.credits_used ?? 0,
        proxyBytes: result.proxy_bytes ?? 0,
        tokens: result.tokens ?? 0,
        steps: result.steps ?? 0,
        tags: result.tags ?? [],
        createdAt: result.created_at ?? '',
        configuration: result.configuration
      },
      message: `Session **${result.session_id}** is **${result.status}** (duration: ${result.duration ?? 0}s, credits: ${result.credits_used ?? 0}).`
    };
  })
  .build();
