import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { fullStoryServiceError } from '../lib/errors';
import { spec } from '../spec';

export let listSessions = SlateTool.create(spec, {
  name: 'List Sessions',
  key: 'list_sessions',
  description: `Retrieve a list of recorded sessions for a user. Lookup by uid or email address. Returns session replay URLs that can be embedded in support tools or other applications.`,
  instructions: [
    'Provide either uid or email (at least one is required).',
    'If both are provided, FullStory returns the union of results.',
    'Pagination is not currently supported by FullStory for this endpoint.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      uid: z.string().optional().describe("Your application's user ID"),
      email: z.string().optional().describe("User's email address"),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of sessions to return (default: 20)')
    })
  )
  .output(
    z.object({
      sessions: z.array(
        z.object({
          userId: z.string().describe('FullStory user ID'),
          sessionId: z.string().describe('Session ID'),
          createdTime: z.string().describe('When the session was created (ISO 8601)'),
          replayUrl: z.string().describe('URL to replay this session in FullStory')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.uid && !ctx.input.email) {
      throw fullStoryServiceError('Provide uid or email to list FullStory sessions.');
    }

    let client = new Client({ token: ctx.auth.token });

    let sessions = await client.listSessions({
      uid: ctx.input.uid,
      email: ctx.input.email,
      limit: ctx.input.limit
    });

    let mapped = sessions.map(s => {
      let [userId = ''] = s.sessionId.split(':');

      return {
        userId,
        sessionId: s.sessionId,
        createdTime: s.createdTime,
        replayUrl: s.fsUrl
      };
    });

    return {
      output: {
        sessions: mapped
      },
      message: `Found **${mapped.length}** sessions.`
    };
  })
  .build();
