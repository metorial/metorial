import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listGroups = SlateTool.create(spec, {
  name: 'List Groups',
  key: 'list_groups',
  description: `List JumpCloud user groups or system groups. Groups are the primary mechanism for organizing resources and controlling access to systems, applications, RADIUS servers, and directories.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      groupType: z.enum(['user', 'system']).describe('Type of groups to list'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of groups to return (1-100, default 100)'),
      skip: z.number().min(0).optional().describe('Number of groups to skip for pagination'),
      filter: z.string().optional().describe('Filter expression, e.g. "name:$eq:Engineering"'),
      sort: z.string().optional().describe('Sort field')
    })
  )
  .output(
    z.object({
      groups: z
        .array(
          z.object({
            groupId: z.string().describe('Group ID'),
            name: z.string().describe('Group name'),
            description: z.string().optional().describe('Group description'),
            type: z.string().optional().describe('Group type'),
            membershipMethod: z
              .string()
              .optional()
              .describe('Membership method (e.g. STATIC, DYNAMIC_AUTOMATED)')
          })
        )
        .describe('List of groups')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId
    });

    let groups: any[];
    if (ctx.input.groupType === 'user') {
      groups = await client.listUserGroups({
        limit: ctx.input.limit,
        skip: ctx.input.skip,
        filter: ctx.input.filter,
        sort: ctx.input.sort
      });
    } else {
      groups = await client.listSystemGroups({
        limit: ctx.input.limit,
        skip: ctx.input.skip,
        filter: ctx.input.filter,
        sort: ctx.input.sort
      });
    }

    let mapped = groups.map(g => ({
      groupId: g.id,
      name: g.name,
      description: g.description,
      type: g.type,
      membershipMethod: g.membershipMethod
    }));

    return {
      output: {
        groups: mapped
      },
      message: `Found **${mapped.length}** ${ctx.input.groupType} groups.`
    };
  })
  .build();
