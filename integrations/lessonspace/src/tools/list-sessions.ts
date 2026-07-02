import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let sessionProfileSchema = z.object({
  userId: z.number().describe('Lessonspace user ID.'),
  name: z.string().nullable().describe('User display name.'),
  email: z.string().describe('User email.'),
  role: z.string().describe('User role: teacher, student, or admin.')
});

let sessionSchema = z.object({
  sessionId: z.number().describe('Internal session ID.'),
  sessionUuid: z.string().describe('Session UUID.'),
  name: z.string().nullable().describe('Session display name.'),
  startTime: z.string().describe('ISO 8601 timestamp of when the session started.'),
  endTime: z
    .string()
    .nullable()
    .describe('ISO 8601 timestamp of when the session ended, or null if in progress.'),
  profiles: z.array(sessionProfileSchema).describe('Participants in the session.'),
  billableSeconds: z.number().describe('Duration in seconds billed for this session.'),
  tags: z.string().describe('Tags associated with the session.'),
  summary: z.string().nullable().describe('AI-generated lesson summary, if available.'),
  playbackUrl: z.string().nullable().describe('URL to access the session recording playback.'),
  recordingAvailable: z
    .boolean()
    .describe('Whether a recording is available for the session.'),
  spaceName: z
    .string()
    .nullable()
    .optional()
    .describe('Name of the space this session belongs to.'),
  spaceId: z.string().optional().describe('UUID of the space this session belongs to.')
});

export let listSessions = SlateTool.create(spec, {
  name: 'List Sessions',
  key: 'list_sessions',
  description: `Retrieves a paginated list of sessions for the organisation. Supports extensive filtering by time range, duration, user, space, tags, and search terms. Use this to find sessions, check session history, or monitor active sessions.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      search: z
        .string()
        .optional()
        .describe(
          'Search term. If a UUID, filters by exact match. Otherwise, partial case-insensitive match on name.'
        ),
      page: z.number().optional().describe('Page number for pagination.'),
      includeSingleUser: z
        .boolean()
        .optional()
        .describe('Include sessions with only one participant.'),
      durationMin: z.number().optional().describe('Minimum session duration in seconds.'),
      durationMax: z.number().optional().describe('Maximum session duration in seconds.'),
      startTimeAfter: z
        .string()
        .optional()
        .describe('Filter sessions starting after this ISO 8601 timestamp.'),
      startTimeBefore: z
        .string()
        .optional()
        .describe('Filter sessions starting before this ISO 8601 timestamp.'),
      endTimeAfter: z
        .string()
        .optional()
        .describe('Filter sessions ending after this ISO 8601 timestamp.'),
      endTimeBefore: z
        .string()
        .optional()
        .describe('Filter sessions ending before this ISO 8601 timestamp.'),
      spaceUuid: z.string().optional().describe('Filter by space UUID.'),
      launchId: z
        .string()
        .optional()
        .describe('Filter by the space ID used in the Launch endpoint.'),
      inProgressOnly: z
        .boolean()
        .optional()
        .describe('Only return sessions that are currently in progress.'),
      userExternalId: z
        .string()
        .optional()
        .describe('Filter by external user ID provided via the Launch endpoint.'),
      userName: z
        .string()
        .optional()
        .describe('Filter by user name (partial, case-insensitive).')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of sessions matching the filters.'),
      sessions: z.array(sessionSchema).describe('List of sessions.'),
      hasMore: z.boolean().describe('Whether more pages of results are available.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organisationId: ctx.config.organisationId
    });

    let result = await client.listSessions({
      search: ctx.input.search,
      page: ctx.input.page,
      includeSingleUser: ctx.input.includeSingleUser,
      durationMin: ctx.input.durationMin,
      durationMax: ctx.input.durationMax,
      startTimeAfter: ctx.input.startTimeAfter,
      startTimeBefore: ctx.input.startTimeBefore,
      endTimeAfter: ctx.input.endTimeAfter,
      endTimeBefore: ctx.input.endTimeBefore,
      space: ctx.input.spaceUuid,
      launchId: ctx.input.launchId,
      inProgressOnly: ctx.input.inProgressOnly,
      userExternalId: ctx.input.userExternalId,
      userName: ctx.input.userName
    });

    let sessions = result.results.map(s => ({
      sessionId: s.id,
      sessionUuid: s.uuid,
      name: s.name,
      startTime: s.startTime,
      endTime: s.endTime,
      profiles: s.profiles.map(p => ({
        userId: p.user,
        name: p.name,
        email: p.email,
        role: p.role
      })),
      billableSeconds: s.billableSeconds,
      tags: s.tags,
      summary: s.summary,
      playbackUrl: s.playbackUrl,
      recordingAvailable: s.recordingAvailable,
      spaceName: s.space?.name,
      spaceId: s.space?.id
    }));

    return {
      output: {
        totalCount: result.count,
        sessions,
        hasMore: result.next !== null
      },
      message: `Found **${result.count}** sessions. Showing ${sessions.length} on this page.`
    };
  })
  .build();
