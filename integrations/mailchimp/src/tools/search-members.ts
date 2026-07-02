import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { MailchimpClient } from '../lib/client';
import { spec } from '../spec';

export let searchMembersTool = SlateTool.create(spec, {
  name: 'Search Members',
  key: 'search_members',
  description: `Search for members (contacts) across all audiences or within a specific audience. Searches by email address, name, and other profile data. Returns matching members with their audience and subscription info.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query (email address, name, or other profile data)'),
      listId: z
        .string()
        .optional()
        .describe('Audience ID to search within (omit to search all audiences)')
    })
  )
  .output(
    z.object({
      exactMatches: z.array(
        z.object({
          subscriberHash: z.string(),
          emailAddress: z.string(),
          fullName: z.string(),
          status: z.string(),
          listId: z.string(),
          listName: z.string().optional()
        })
      ),
      fullSearchMatches: z.array(
        z.object({
          subscriberHash: z.string(),
          emailAddress: z.string(),
          fullName: z.string(),
          status: z.string(),
          listId: z.string(),
          listName: z.string().optional()
        })
      ),
      totalExactMatches: z.number(),
      totalFullSearchMatches: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailchimpClient({
      token: ctx.auth.token,
      serverPrefix: ctx.auth.serverPrefix
    });

    let result = await client.searchMembers(ctx.input.query, ctx.input.listId);

    let mapMembers = (members: any[]) =>
      members.map((m: any) => ({
        subscriberHash: m.id,
        emailAddress: m.email_address,
        fullName: m.full_name ?? '',
        status: m.status,
        listId: m.list_id,
        listName: m.list_name
      }));

    let exactMatches = mapMembers(result.exact_matches?.members ?? []);
    let fullSearchMatches = mapMembers(result.full_search?.members ?? []);

    let totalExact = result.exact_matches?.total_items ?? 0;
    let totalFull = result.full_search?.total_items ?? 0;

    return {
      output: {
        exactMatches,
        fullSearchMatches,
        totalExactMatches: totalExact,
        totalFullSearchMatches: totalFull
      },
      message: `Found **${totalExact}** exact match(es) and **${totalFull}** full-text match(es) for "${ctx.input.query}".`
    };
  })
  .build();
