import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPolls = SlateTool.create(spec, {
  name: 'List Polls',
  key: 'list_polls',
  description: `List polls and proposals, optionally filtered by group or discussion. Returns a summary of each poll including type, title, status, and voter counts.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      groupId: z.number().optional().describe('Filter polls by group ID'),
      discussionId: z.number().optional().describe('Filter polls by discussion ID')
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
        .describe('List of polls')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.listPolls({
      groupId: ctx.input.groupId,
      discussionId: ctx.input.discussionId
    });

    let polls = (result.polls || []).map((p: any) => ({
      pollId: p.id,
      pollKey: p.key,
      title: p.title,
      pollType: p.poll_type,
      groupId: p.group_id,
      authorId: p.author_id,
      closingAt: p.closing_at,
      closedAt: p.closed_at,
      createdAt: p.created_at,
      votersCount: p.voters_count
    }));

    return {
      output: { polls },
      message: `Found **${polls.length}** poll(s).`
    };
  })
  .build();
