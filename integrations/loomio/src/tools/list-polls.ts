import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { groupIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listPolls = SlateTool.create(spec, {
  name: 'List Polls',
  key: 'list_polls',
  description: `List polls and proposals in a group. Call list_groups to discover group IDs. Supply groupId or a discussionId whose group can be resolved. Discussion filtering applies after group pagination; advance offset to check later pages. Returns a summary of each poll including type, title, status, and voter counts.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      groupId: groupIdSchema.optional(),
      discussionId: z
        .number()
        .optional()
        .describe(
          'Filter a group page to this discussion. When groupId is omitted, resolve it from the discussion.'
        ),
      status: z
        .enum(['active', 'closed', 'all'])
        .optional()
        .describe('Filter by status. Default: active.'),
      limit: z.number().int().min(1).optional().describe('Page size. Default: 50.'),
      offset: z.number().int().min(0).optional().describe('Offset for pagination. Default: 0.')
    })
  )
  .output(
    z.object({
      polls: z
        .array(
          z.object({
            pollId: z.number().describe('ID of the poll'),
            pollKey: z.string().describe('Key of the poll'),
            title: z.string().describe('Title of the poll'),
            pollType: z.string().describe('Type of the poll'),
            groupId: z.number().optional().describe('ID of the group'),
            authorId: z.number().optional().describe('ID of the author'),
            closingAt: z.string().optional().describe('ISO 8601 closing time'),
            closedAt: z.string().optional().describe('ISO 8601 closed timestamp'),
            createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
            votersCount: z.number().optional().describe('Number of voters')
          })
        )
        .describe('List of polls'),
      total: z
        .number()
        .optional()
        .describe('Total records before pagination, when supplied by Loomio')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.listPolls({
      groupId: ctx.input.groupId,
      discussionId: ctx.input.discussionId,
      status: ctx.input.status,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let polls = result.polls.map(p => ({
      pollId: p.id,
      pollKey: p.key,
      title: p.title,
      pollType: p.poll_type,
      groupId: p.group_id ?? undefined,
      authorId: p.author_id ?? undefined,
      closingAt: p.closing_at ?? undefined,
      closedAt: p.closed_at ?? undefined,
      createdAt: p.created_at ?? undefined,
      votersCount: p.voters_count ?? undefined
    }));

    return {
      output: { polls, total: result.meta?.total },
      message: `Found **${polls.length}** poll(s).`
    };
  })
  .build();
