import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sessionStatusChange = SlateTrigger.create(spec, {
  name: 'Session Status Change',
  key: 'session_status_change',
  description:
    'Triggers when browser sessions are created, completed, or change status. Polls the session history for new or updated sessions.'
})
  .input(
    z.object({
      sessionId: z.string().describe('ID of the session'),
      status: z.string().describe('Current status of the session'),
      tags: z.array(z.string()).describe('Session tags'),
      duration: z.number().describe('Session duration in seconds'),
      creditsUsed: z.number().describe('Credits consumed by the session'),
      createdAt: z.string().describe('ISO timestamp when the session was created')
    })
  )
  .output(
    z.object({
      sessionId: z.string().describe('ID of the session'),
      status: z.string().describe('Current status of the session'),
      tags: z.array(z.string()).describe('Session tags'),
      duration: z.number().describe('Session duration in seconds'),
      creditsUsed: z.number().describe('Credits consumed by the session'),
      createdAt: z.string().describe('ISO timestamp when the session was created')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let lastPollTime = ctx.state?.lastPollTime as string | undefined;

      let params: Record<string, unknown> = {
        page: 1,
        limit: 50,
        sort_by: 'created_at',
        sort_order: 'desc'
      };

      if (lastPollTime) {
        params.created_from = lastPollTime;
      }

      let result = await client.listSessions(params as any);
      let sessions = result.sessions ?? [];

      let now = new Date().toISOString();

      return {
        inputs: sessions.map(s => ({
          sessionId: s.id,
          status: s.status,
          tags: s.tags ?? [],
          duration: s.duration ?? 0,
          creditsUsed: s.used_credits ?? 0,
          createdAt: s.created_at ?? ''
        })),
        updatedState: {
          lastPollTime: sessions.length > 0 ? now : (lastPollTime ?? now)
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `session.${ctx.input.status}`,
        id: `${ctx.input.sessionId}-${ctx.input.status}`,
        output: {
          sessionId: ctx.input.sessionId,
          status: ctx.input.status,
          tags: ctx.input.tags,
          duration: ctx.input.duration,
          creditsUsed: ctx.input.creditsUsed,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
