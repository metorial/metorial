import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageVolunteers = SlateTool.create(spec, {
  name: 'Manage Volunteers',
  key: 'manage_volunteers',
  description: `Add, remove, or update volunteers for an event instance. Assign role IDs to volunteers when updating. Also supports listing current volunteers and available roles for an event.`,
  instructions: [
    'Volunteer roles are tied to event series — adding/removing a role on one instance affects all instances in the series.',
    'When updating a volunteer, the provided role IDs replace all existing role assignments.'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'add', 'remove', 'update']).describe('The action to perform'),
      instanceId: z.string().describe('Event instance ID'),
      personId: z.string().optional().describe('Person ID (required for add, remove, update)'),
      roleIds: z
        .array(z.string())
        .optional()
        .describe('Role IDs to assign (required for update action, replaces existing roles)')
    })
  )
  .output(
    z.object({
      volunteers: z.array(z.any()).optional().describe('List of volunteers (for list action)'),
      success: z
        .boolean()
        .optional()
        .describe('Whether the operation succeeded (for add/remove/update)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.action === 'list') {
      let volunteers = await client.listVolunteers(ctx.input.instanceId);
      let volunteersArray = Array.isArray(volunteers) ? volunteers : [];
      return {
        output: { volunteers: volunteersArray },
        message: `Found **${volunteersArray.length}** volunteers for event instance (ID: ${ctx.input.instanceId}).`
      };
    }

    if (!ctx.input.personId) {
      throw new Error('personId is required for add, remove, and update actions');
    }

    let result: unknown;
    let actionLabel: string;

    switch (ctx.input.action) {
      case 'add':
        result = await client.addVolunteer(ctx.input.instanceId, ctx.input.personId);
        actionLabel = 'Added';
        break;
      case 'remove':
        result = await client.removeVolunteer(ctx.input.instanceId, ctx.input.personId);
        actionLabel = 'Removed';
        break;
      case 'update':
        if (!ctx.input.roleIds) {
          throw new Error('roleIds is required for the update action');
        }
        result = await client.updateVolunteer(
          ctx.input.instanceId,
          ctx.input.personId,
          ctx.input.roleIds
        );
        actionLabel = 'Updated roles for';
        break;
    }

    return {
      output: { success: result === true || result === 'true' },
      message: `${actionLabel!} volunteer (person ID: ${ctx.input.personId}) for event instance (ID: ${ctx.input.instanceId}).`
    };
  })
  .build();
