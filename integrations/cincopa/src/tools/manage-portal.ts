import { SlateTool } from 'slates';
import { z } from 'zod';
import { CincopaClient } from '../lib/client';
import { spec } from '../spec';

export let managePortal = SlateTool.create(spec, {
  name: 'Manage Portal',
  key: 'manage_portal',
  description: `List, create, update, deactivate, or remove Cincopa portals. Portals are customizable landing pages, video hubs, or share pages. Use "list" to view all portals, "create" to make a new one, "update" to modify settings, "deactivate" to disable, or "remove" to permanently delete a portal.`,
  instructions: [
    'Use action "list" to get all portals.',
    'Use action "create" with a name to create a new portal.',
    'Use action "update" with a portalId and the fields to change.',
    'Use action "deactivate" or "remove" with a portalId.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'update', 'deactivate', 'remove'])
        .describe('Action to perform'),
      portalId: z
        .string()
        .optional()
        .describe('Portal ID (required for update, deactivate, remove)'),
      name: z.string().optional().describe('Portal name (for create or update)'),
      description: z.string().optional().describe('Portal description (for create or update)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      portals: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of portal objects (for list action)'),
      portalId: z.string().optional().describe('Created or updated portal ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CincopaClient({ token: ctx.auth.token });
    let { action } = ctx.input;

    if (action === 'list') {
      let data = await client.listPortals();
      let portals = data?.portals || data?.items || [];
      return {
        output: { success: true, portals },
        message: `Found **${portals.length}** portals.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name) {
        throw new Error('name is required for create action');
      }
      let data = await client.createPortal({
        name: ctx.input.name,
        description: ctx.input.description
      });
      return {
        output: {
          success: data.success === true,
          portalId: data.portal_id || data.id
        },
        message: `Portal **${ctx.input.name}** created.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.portalId) {
        throw new Error('portalId is required for update action');
      }
      let data = await client.updatePortal({
        portalId: ctx.input.portalId,
        name: ctx.input.name,
        description: ctx.input.description
      });
      return {
        output: { success: data.success === true, portalId: ctx.input.portalId },
        message: `Portal \`${ctx.input.portalId}\` updated.`
      };
    }

    if (action === 'deactivate') {
      if (!ctx.input.portalId) {
        throw new Error('portalId is required for deactivate action');
      }
      let data = await client.deactivatePortal(ctx.input.portalId);
      return {
        output: { success: data.success === true },
        message: `Portal \`${ctx.input.portalId}\` deactivated.`
      };
    }

    if (action === 'remove') {
      if (!ctx.input.portalId) {
        throw new Error('portalId is required for remove action');
      }
      let data = await client.deletePortal(ctx.input.portalId);
      return {
        output: { success: data.success === true },
        message: `Portal \`${ctx.input.portalId}\` permanently removed.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
