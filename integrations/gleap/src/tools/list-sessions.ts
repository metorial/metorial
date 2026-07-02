import { SlateTool } from 'slates';
import { z } from 'zod';
import { GleapClient } from '../lib/client';
import { spec } from '../spec';

export let listSessions = SlateTool.create(spec, {
  name: 'List Sessions',
  key: 'list_sessions',
  description: `Retrieve sessions (contacts/users) from Gleap. Supports pagination, sorting, and search by name/email.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      searchTerm: z
        .string()
        .optional()
        .describe('Search for sessions by name, email, or other fields'),
      limit: z.number().optional().describe('Maximum number of sessions to return'),
      skip: z.number().optional().describe('Number of sessions to skip for pagination'),
      sort: z.string().optional().describe('Sort field, prefix with - for descending')
    })
  )
  .output(
    z.object({
      sessions: z.array(z.record(z.string(), z.any())).describe('List of session objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GleapClient({
      token: ctx.auth.token,
      projectId: ctx.auth.projectId
    });

    let sessions: any;
    if (ctx.input.searchTerm) {
      sessions = await client.searchSessions({
        searchTerm: ctx.input.searchTerm,
        limit: ctx.input.limit,
        skip: ctx.input.skip
      });
    } else {
      sessions = await client.listSessions({
        limit: ctx.input.limit,
        skip: ctx.input.skip,
        sort: ctx.input.sort
      });
    }

    let sessionList = Array.isArray(sessions)
      ? sessions
      : sessions.sessions || sessions.data || [];

    return {
      output: { sessions: sessionList },
      message: `Retrieved **${sessionList.length}** sessions.`
    };
  })
  .build();
