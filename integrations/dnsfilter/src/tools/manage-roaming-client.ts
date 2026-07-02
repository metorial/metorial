import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageRoamingClient = SlateTool.create(spec, {
  name: 'Manage Roaming Client',
  key: 'manage_roaming_client',
  description: `Get, update, or delete a roaming client (agent). Use this to view agent details, reassign policies/sites, update tags, configure auto-update settings, or remove a deployed agent.
- **get**: Retrieve full details for an agent.
- **update**: Modify agent settings (policy, site, tags, auto-update, release channel).
- **delete**: Remove an agent deployment.`
})
  .input(
    z.object({
      action: z.enum(['get', 'update', 'delete']).describe('Operation to perform'),
      roamingClientId: z.string().describe('Roaming client (agent) ID'),
      policyId: z.string().optional().describe('Policy ID to assign (for update)'),
      siteId: z.string().optional().describe('Site/network ID to assign (for update)'),
      autoUpdate: z
        .boolean()
        .optional()
        .describe('Enable or disable auto-update (for update)'),
      attributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional attributes to update')
    })
  )
  .output(
    z.object({
      roamingClient: z
        .record(z.string(), z.any())
        .optional()
        .describe('Roaming client details'),
      deleted: z.boolean().optional().describe('Whether the client was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { action, roamingClientId } = ctx.input;

    if (action === 'get') {
      let roamingClient = await client.getRoamingClient(roamingClientId);
      return {
        output: { roamingClient },
        message: `Retrieved roaming client **${roamingClient.hostname ?? roamingClientId}**.`
      };
    }

    if (action === 'delete') {
      await client.deleteRoamingClient(roamingClientId);
      return {
        output: { deleted: true },
        message: `Deleted roaming client **${roamingClientId}**.`
      };
    }

    let params: Record<string, any> = {};
    if (ctx.input.policyId) params.policy_id = ctx.input.policyId;
    if (ctx.input.siteId) params.site_id = ctx.input.siteId;
    if (ctx.input.autoUpdate !== undefined) params.auto_update = ctx.input.autoUpdate;
    if (ctx.input.attributes) Object.assign(params, ctx.input.attributes);

    let roamingClient = await client.updateRoamingClient(roamingClientId, params);
    return {
      output: { roamingClient },
      message: `Updated roaming client **${roamingClient.hostname ?? roamingClientId}**.`
    };
  })
  .build();
