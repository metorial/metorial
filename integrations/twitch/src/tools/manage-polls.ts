import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwitchClient } from '../lib/client';
import { spec } from '../spec';

export let managePolls = SlateTool.create(spec, {
  name: 'Manage Polls',
  key: 'manage_polls',
  description: `Create, end, or view polls on a channel. Create polls with custom choices and optional Channel Points voting. End polls early to show final results or archive them.`,
  instructions: [
    'To **create** a poll, provide title, choices (2-5 options), and duration in seconds.',
    'To **end** a poll early, provide the pollId and set endStatus to "TERMINATED" (show results) or "ARCHIVED" (discard).',
    'To **get** existing polls, set action to "get".'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      broadcasterId: z.string().describe('Broadcaster user ID'),
      action: z.enum(['create', 'end', 'get']).describe('Action to perform'),
      title: z.string().optional().describe('Poll title (for create)'),
      choices: z
        .array(z.string())
        .optional()
        .describe('Poll choices as an array of strings (2-5 items, for create)'),
      durationSeconds: z
        .number()
        .optional()
        .describe('Poll duration in seconds (15-1800, for create)'),
      channelPointsVotingEnabled: z
        .boolean()
        .optional()
        .describe('Enable Channel Points voting (for create)'),
      channelPointsPerVote: z
        .number()
        .optional()
        .describe('Channel Points cost per additional vote (for create)'),
      pollId: z.string().optional().describe('Poll ID (for end action)'),
      endStatus: z
        .enum(['TERMINATED', 'ARCHIVED'])
        .optional()
        .describe('How to end the poll (TERMINATED=show results, ARCHIVED=discard)'),
      maxResults: z.number().optional().describe('Max polls to return (for get)'),
      cursor: z.string().optional().describe('Pagination cursor (for get)')
    })
  )
  .output(
    z.object({
      poll: z
        .object({
          pollId: z.string(),
          title: z.string(),
          choices: z.array(
            z.object({
              choiceId: z.string(),
              title: z.string(),
              votes: z.number(),
              channelPointsVotes: z.number()
            })
          ),
          status: z.string(),
          durationSeconds: z.number(),
          startedAt: z.string(),
          endedAt: z.string().optional()
        })
        .optional(),
      polls: z
        .array(
          z.object({
            pollId: z.string(),
            title: z.string(),
            status: z.string(),
            startedAt: z.string()
          })
        )
        .optional(),
      cursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwitchClient(ctx.auth.token, ctx.auth.clientId);

    if (ctx.input.action === 'create') {
      if (!ctx.input.title || !ctx.input.choices || !ctx.input.durationSeconds) {
        throw new Error('title, choices, and durationSeconds are required to create a poll');
      }

      let poll = await client.createPoll(ctx.input.broadcasterId, {
        title: ctx.input.title,
        choices: ctx.input.choices,
        duration: ctx.input.durationSeconds,
        channelPointsVotingEnabled: ctx.input.channelPointsVotingEnabled,
        channelPointsPerVote: ctx.input.channelPointsPerVote
      });

      return {
        output: {
          poll: {
            pollId: poll.id,
            title: poll.title,
            choices: poll.choices.map(c => ({
              choiceId: c.id,
              title: c.title,
              votes: c.votes,
              channelPointsVotes: c.channel_points_votes
            })),
            status: poll.status,
            durationSeconds: poll.duration,
            startedAt: poll.started_at,
            endedAt: poll.ended_at
          }
        },
        message: `Created poll: **${poll.title}** with ${poll.choices.length} choices for ${poll.duration}s`
      };
    }

    if (ctx.input.action === 'end') {
      if (!ctx.input.pollId || !ctx.input.endStatus) {
        throw new Error('pollId and endStatus are required to end a poll');
      }

      let poll = await client.endPoll(
        ctx.input.broadcasterId,
        ctx.input.pollId,
        ctx.input.endStatus
      );

      return {
        output: {
          poll: {
            pollId: poll.id,
            title: poll.title,
            choices: poll.choices.map(c => ({
              choiceId: c.id,
              title: c.title,
              votes: c.votes,
              channelPointsVotes: c.channel_points_votes
            })),
            status: poll.status,
            durationSeconds: poll.duration,
            startedAt: poll.started_at,
            endedAt: poll.ended_at
          }
        },
        message: `Ended poll: **${poll.title}** (${ctx.input.endStatus})`
      };
    }

    // get
    let result = await client.getPolls(ctx.input.broadcasterId, {
      pollIds: ctx.input.pollId ? [ctx.input.pollId] : undefined,
      first: ctx.input.maxResults,
      after: ctx.input.cursor
    });

    let polls = result.polls.map(p => ({
      pollId: p.id,
      title: p.title,
      status: p.status,
      startedAt: p.started_at
    }));

    return {
      output: { polls, cursor: result.cursor },
      message: polls.length === 0 ? 'No polls found' : `Found **${polls.length}** polls`
    };
  })
  .build();
