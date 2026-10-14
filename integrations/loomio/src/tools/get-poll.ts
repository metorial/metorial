import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPoll = SlateTool.create(spec, {
  name: 'Get Poll',
  key: 'get_poll',
  description: `Retrieve details of a specific poll or proposal by its ID or key. Returns the poll configuration, options, vote counts, and current status.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      pollId: z
        .union([z.string(), z.number()])
        .describe('ID (integer) or key (string) of the poll to retrieve')
    })
  )
  .output(
    z.object({
      pollId: z.number().describe('ID of the poll'),
      pollKey: z.string().describe('Key of the poll'),
      title: z.string().describe('Title of the poll'),
      pollType: z.string().describe('Type of the poll'),
      options: z.array(z.string()).optional().describe('Poll option names'),
      details: z.string().optional().describe('Description of the poll'),
      detailsFormat: z.string().optional().describe('Format of the details'),
      groupId: z.number().optional().describe('ID of the group'),
      discussionId: z.number().optional().describe('ID of the associated discussion'),
      authorId: z.number().optional().describe('ID of the poll author'),
      closingAt: z.string().optional().describe('ISO 8601 closing time'),
      closedAt: z.string().optional().describe('ISO 8601 time the poll was closed'),
      createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
      anonymous: z.boolean().optional().describe('Whether votes are anonymous'),
      votersCount: z.number().optional().describe('Number of voters'),
      undecidedCount: z.number().optional().describe('Number of undecided voters')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let poll = await client.getPoll(ctx.input.pollId);

    return {
      output: {
        pollId: poll.id,
        pollKey: poll.key,
        title: poll.title,
        pollType: poll.poll_type,
        options: poll.poll_option_names ?? undefined,
        details: poll.details ?? undefined,
        detailsFormat: poll.details_format ?? undefined,
        groupId: poll.group_id ?? undefined,
        discussionId: poll.discussion_id ?? undefined,
        authorId: poll.author_id ?? undefined,
        closingAt: poll.closing_at ?? undefined,
        closedAt: poll.closed_at ?? undefined,
        createdAt: poll.created_at ?? undefined,
        anonymous: poll.anonymous ?? undefined,
        votersCount: poll.voters_count ?? undefined,
        undecidedCount: poll.undecided_voters_count ?? poll.undecided_count ?? undefined
      },
      message: `Retrieved ${poll.poll_type} poll **"${poll.title}"** (ID: ${poll.id}).`
    };
  })
  .build();
