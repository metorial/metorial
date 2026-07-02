import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listGroups = SlateTool.create(spec, {
  name: 'List Groups',
  key: 'list_groups',
  description: `Retrieve user groups in a CommCare project. Groups organize mobile workers for case sharing, reporting, and access control.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Maximum number of results to return (default: 20)'),
      offset: z.number().optional().describe('Number of results to skip for pagination')
    })
  )
  .output(
    z.object({
      groups: z.array(
        z.object({
          groupId: z.string(),
          groupName: z.string(),
          caseSharing: z.boolean(),
          reporting: z.boolean(),
          userIds: z.array(z.string()),
          domain: z.string(),
          metadata: z.record(z.string(), z.any())
        })
      ),
      totalCount: z.number(),
      hasMore: z.boolean(),
      limit: z.number(),
      offset: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      domain: ctx.config.domain,
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let result = await client.listGroups({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let groups = result.objects.map(g => ({
      groupId: g.id,
      groupName: g.name,
      caseSharing: g.case_sharing,
      reporting: g.reporting,
      userIds: g.users,
      domain: g.domain,
      metadata: g.metadata
    }));

    return {
      output: {
        groups,
        totalCount: result.meta.total_count,
        hasMore: result.meta.next !== null,
        limit: result.meta.limit,
        offset: result.meta.offset
      },
      message: `Found **${result.meta.total_count}** groups. Returned ${groups.length} results.`
    };
  })
  .build();
