import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listRoles = SlateTool.create(spec, {
  name: 'List Roles',
  key: 'list_roles',
  description: `List roles defined in your Klipfolio account. Optionally include user counts, users, and permissions for each role.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      clientId: z.string().optional().describe('Filter roles by client ID'),
      includeDetails: z
        .boolean()
        .optional()
        .describe('Include users, num_users, and permissions'),
      limit: z.number().optional().describe('Maximum number of results (max 100)'),
      offset: z.number().optional().describe('Index of first result to return')
    })
  )
  .output(
    z.object({
      roles: z.array(
        z.object({
          roleId: z.string().optional(),
          name: z.string().optional(),
          description: z.string().optional()
        })
      ),
      total: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listRoles({
      clientId: ctx.input.clientId,
      full: ctx.input.includeDetails,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let roles = (result?.data || []).map((role: any) => ({
      roleId: role.id,
      name: role.name,
      description: role.description
    }));

    return {
      output: {
        roles,
        total: result?.meta?.total
      },
      message: `Found **${roles.length}** role(s)${result?.meta?.total ? ` out of ${result.meta.total} total` : ''}.`
    };
  })
  .build();
