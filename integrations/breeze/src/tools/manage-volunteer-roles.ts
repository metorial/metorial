import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageVolunteerRoles = SlateTool.create(spec, {
  name: 'Manage Volunteer Roles',
  key: 'manage_volunteer_roles',
  description: `List, create, or remove volunteer roles for an event instance. Roles define the positions that volunteers can fill. Each role has a name and an optional quantity requirement.`,
  instructions: [
    'Roles are tied to the event series — adding or removing a role on one instance affects all instances in the series.'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'remove']).describe('The action to perform'),
      instanceId: z.string().describe('Event instance ID'),
      name: z.string().optional().describe('Name of the role (required for create)'),
      quantity: z
        .number()
        .optional()
        .describe('Number of volunteers needed for this role (for create)'),
      roleId: z.string().optional().describe('Role ID (required for remove)'),
      showQuantity: z.boolean().optional().describe('Include quantity info when listing roles')
    })
  )
  .output(
    z.object({
      roles: z.array(z.any()).optional().describe('List of volunteer roles (for list action)'),
      role: z.any().optional().describe('The created role (for create action)'),
      success: z
        .boolean()
        .optional()
        .describe('Whether the operation succeeded (for remove action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    switch (ctx.input.action) {
      case 'list': {
        let roles = await client.listVolunteerRoles(
          ctx.input.instanceId,
          ctx.input.showQuantity
        );
        let rolesArray = Array.isArray(roles) ? roles : [];
        return {
          output: { roles: rolesArray },
          message: `Found **${rolesArray.length}** volunteer roles for event instance (ID: ${ctx.input.instanceId}).`
        };
      }
      case 'create': {
        if (!ctx.input.name) throw new Error('name is required to create a role');
        let role = await client.addVolunteerRole(
          ctx.input.instanceId,
          ctx.input.name,
          ctx.input.quantity
        );
        return {
          output: { role },
          message: `Created volunteer role **${ctx.input.name}** for event instance (ID: ${ctx.input.instanceId}).`
        };
      }
      case 'remove': {
        if (!ctx.input.roleId) throw new Error('roleId is required to remove a role');
        let result = await client.removeVolunteerRole(ctx.input.instanceId, ctx.input.roleId);
        return {
          output: { success: result === true || result === 'true' },
          message: `Removed volunteer role (ID: ${ctx.input.roleId}) from event instance (ID: ${ctx.input.instanceId}).`
        };
      }
    }
  })
  .build();
