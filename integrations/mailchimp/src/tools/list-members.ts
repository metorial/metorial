import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { MailchimpClient } from '../lib/client';
import { spec } from '../spec';

export let listMembersTool = SlateTool.create(spec, {
  name: 'List Members',
  key: 'list_members',
  description: `Retrieve members (contacts) from an audience. Supports filtering by status and pagination. Returns email, status, merge fields, tags count, and activity stats.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      listId: z.string().describe('Audience ID to list members from'),
      count: z
        .number()
        .optional()
        .describe('Number of members to return (default 100, max 1000)'),
      offset: z.number().optional().describe('Number of members to skip'),
      status: z
        .enum(['subscribed', 'unsubscribed', 'cleaned', 'pending', 'transactional'])
        .optional()
        .describe('Filter by subscription status'),
      sinceLastChanged: z
        .string()
        .optional()
        .describe('Filter members changed since this ISO 8601 date')
    })
  )
  .output(
    z.object({
      members: z.array(
        z.object({
          subscriberHash: z.string(),
          emailAddress: z.string(),
          fullName: z.string(),
          status: z.string(),
          mergeFields: z.record(z.string(), z.any()).optional(),
          tagsCount: z.number(),
          lastChanged: z.string().optional(),
          vip: z.boolean()
        })
      ),
      totalItems: z.number(),
      listId: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailchimpClient({
      token: ctx.auth.token,
      serverPrefix: ctx.auth.serverPrefix
    });

    let result = await client.getMembers(ctx.input.listId, {
      count: ctx.input.count,
      offset: ctx.input.offset,
      status: ctx.input.status,
      sinceLastChanged: ctx.input.sinceLastChanged
    });

    let members = (result.members ?? []).map((m: any) => ({
      subscriberHash: m.id,
      emailAddress: m.email_address,
      fullName: m.full_name ?? '',
      status: m.status,
      mergeFields: m.merge_fields,
      tagsCount: m.tags_count ?? 0,
      lastChanged: m.last_changed,
      vip: m.vip ?? false
    }));

    return {
      output: {
        members,
        totalItems: result.total_items ?? 0,
        listId: ctx.input.listId
      },
      message: `Found **${members.length}** member(s) out of ${result.total_items ?? 0} total in audience ${ctx.input.listId}.`
    };
  })
  .build();
