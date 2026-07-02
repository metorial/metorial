import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sessionStatusChange = SlateTrigger.create(spec, {
  name: 'Session Status Change',
  key: 'session_status_change',
  description:
    'Detects when browser sessions change status (complete, error, or time out). Polls for sessions that have transitioned to a terminal state since the last check.'
})
  .input(
    z.object({
      sessionId: z.string().describe('Session identifier'),
      status: z
        .enum(['PENDING', 'RUNNING', 'COMPLETED', 'ERROR', 'TIMED_OUT'])
        .describe('Current session status'),
      region: z.string().describe('Session region'),
      createdAt: z.string().describe('Creation timestamp'),
      startedAt: z.string().describe('Start timestamp'),
      endedAt: z.string().nullable().describe('End timestamp'),
      proxyBytes: z.number().describe('Bytes consumed via proxy'),
      contextId: z.string().nullable().describe('Linked context ID'),
      userMetadata: z.record(z.string(), z.string()).nullable().describe('Custom metadata')
    })
  )
  .output(
    z.object({
      sessionId: z.string().describe('Session identifier'),
      status: z.string().describe('Current session status'),
      region: z.string().describe('Session region'),
      createdAt: z.string().describe('Creation timestamp'),
      startedAt: z.string().describe('Start timestamp'),
      endedAt: z.string().nullable().describe('End timestamp'),
      proxyBytes: z.number().describe('Bytes consumed via proxy'),
      contextId: z.string().nullable().describe('Linked context ID'),
      userMetadata: z.record(z.string(), z.string()).nullable().describe('Custom metadata')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let knownSessions: Record<string, string> =
        (ctx.state as Record<string, string> | null) || {};
      let inputs: Array<{
        sessionId: string;
        status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'ERROR' | 'TIMED_OUT';
        region: string;
        createdAt: string;
        startedAt: string;
        endedAt: string | null;
        proxyBytes: number;
        contextId: string | null;
        userMetadata: Record<string, string> | null;
      }> = [];

      let updatedKnown: Record<string, string> = { ...knownSessions };

      // Check all terminal statuses for new completions
      for (let status of ['COMPLETED', 'ERROR', 'TIMED_OUT'] as const) {
        let sessions = await client.listSessions({ status });

        for (let session of sessions) {
          if (!knownSessions[session.sessionId]) {
            inputs.push({
              sessionId: session.sessionId,
              status: session.status,
              region: session.region,
              createdAt: session.createdAt,
              startedAt: session.startedAt,
              endedAt: session.endedAt,
              proxyBytes: session.proxyBytes,
              contextId: session.contextId,
              userMetadata: session.userMetadata
            });
            updatedKnown[session.sessionId] = session.status;
          }
        }
      }

      // Limit known sessions to prevent unbounded growth (keep last 500)
      let knownKeys = Object.keys(updatedKnown);
      if (knownKeys.length > 500) {
        let trimmed: Record<string, string> = {};
        for (let key of knownKeys.slice(-500)) {
          trimmed[key] = updatedKnown[key]!;
        }
        updatedKnown = trimmed;
      }

      return {
        inputs,
        updatedState: updatedKnown
      };
    },

    handleEvent: async ctx => {
      let statusType = ctx.input.status.toLowerCase();
      return {
        type: `session.${statusType}`,
        id: `${ctx.input.sessionId}_${ctx.input.status}`,
        output: {
          sessionId: ctx.input.sessionId,
          status: ctx.input.status,
          region: ctx.input.region,
          createdAt: ctx.input.createdAt,
          startedAt: ctx.input.startedAt,
          endedAt: ctx.input.endedAt,
          proxyBytes: ctx.input.proxyBytes,
          contextId: ctx.input.contextId,
          userMetadata: ctx.input.userMetadata
        }
      };
    }
  })
  .build();
