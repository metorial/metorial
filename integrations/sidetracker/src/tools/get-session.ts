import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSession = SlateTool.create(spec, {
  name: 'Get Session',
  key: 'get_session',
  description: `Retrieve detailed information about a visitor session, including metadata, visits, and notes. Provides a comprehensive view of a single session's tracking data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sessionId: z.string().describe('Unique session ID of the visitor session to retrieve'),
      includeVisits: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to include visit history for this session'),
      includeNotes: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to include notes attached to this session')
    })
  )
  .output(
    z.object({
      session: z
        .record(z.string(), z.unknown())
        .describe('Session data including metadata, sales status, revenue, and visitor info'),
      visits: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Visit history for this session (if requested)'),
      notes: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Notes attached to this session (if requested)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { sessionId, includeVisits, includeNotes } = ctx.input;

    let session = await client.getSession(sessionId);
    let visits: Record<string, unknown>[] | undefined;
    let notes: Record<string, unknown>[] | undefined;

    if (includeVisits) {
      let visitsResult = await client.getSessionVisits(sessionId);
      visits = visitsResult.results;
    }

    if (includeNotes) {
      let notesResult = await client.getSessionNotes(sessionId);
      notes = notesResult;
    }

    return {
      output: {
        session,
        visits,
        notes
      },
      message: `Retrieved session \`${sessionId}\`${includeVisits ? ` with ${visits?.length ?? 0} visits` : ''}${includeNotes ? ` and ${notes?.length ?? 0} notes` : ''}.`
    };
  })
  .build();
