import { createApiServiceError, SlateTool } from 'slates';
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
        .describe(
          'Autocomplete search with at least 3 characters; returns at most 50 contacts and ignores pagination and sorting'
        ),
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
      projectId: ctx.auth.projectId,
      region: ctx.auth.region
    });

    if (ctx.input.searchTerm && ctx.input.searchTerm.length < 3) {
      throw createApiServiceError('Use at least 3 characters to search contacts.');
    }

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
