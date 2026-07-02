import { SlateTool } from 'slates';
import { z } from 'zod';
import { StreamtimeClient } from '../lib/client';
import { spec } from '../spec';

export let listRoles = SlateTool.create(spec, {
  name: 'List Roles',
  key: 'list_roles',
  description: `Retrieve all roles defined in the Streamtime organisation (e.g., Designer, Account Manager, Project Manager). Roles have associated billable rates and can be assigned to job items.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeArchived: z.boolean().optional().describe('Include archived roles in the results')
    })
  )
  .output(
    z.object({
      roles: z.array(z.record(z.string(), z.any())).describe('Array of role objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StreamtimeClient({ token: ctx.auth.token });

    let params: Record<string, any> = {};
    if (ctx.input.includeArchived) {
      params.include_archived = true;
    }

    let roles = await client.listRoles(params);

    return {
      output: {
        roles: Array.isArray(roles) ? roles : []
      },
      message: `Found **${Array.isArray(roles) ? roles.length : 0}** role(s).`
    };
  })
  .build();
