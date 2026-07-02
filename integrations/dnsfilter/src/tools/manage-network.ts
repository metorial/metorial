import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageNetwork = SlateTool.create(spec, {
  name: 'Manage Network',
  key: 'manage_network',
  description: `Create, update, or delete a network (site) in DNSFilter. Networks represent physical or logical sites whose DNS traffic is filtered.
- **Create**: provide a name and optional settings (policy, IP addresses).
- **Update**: provide networkId and fields to change.
- **Delete**: provide networkId and set action to "delete".`
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      networkId: z.string().optional().describe('Network ID (required for update/delete)'),
      name: z.string().optional().describe('Network name'),
      policyId: z.string().optional().describe('Policy ID to assign to the network'),
      organizationId: z.string().optional().describe('Organization ID (for create)'),
      attributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional network attributes')
    })
  )
  .output(
    z.object({
      network: z
        .record(z.string(), z.any())
        .optional()
        .describe('Network details (for create/update)'),
      deleted: z.boolean().optional().describe('Whether the network was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { action, networkId } = ctx.input;

    if (action === 'delete') {
      if (!networkId) throw new Error('networkId is required for delete');
      await client.deleteNetwork(networkId);
      return {
        output: { deleted: true },
        message: `Deleted network **${networkId}**.`
      };
    }

    let params: Record<string, any> = {};
    if (ctx.input.name) params.name = ctx.input.name;
    if (ctx.input.policyId) params.policy_id = ctx.input.policyId;
    if (ctx.input.organizationId) params.organization_id = ctx.input.organizationId;
    if (ctx.input.attributes) Object.assign(params, ctx.input.attributes);

    if (action === 'create') {
      let network = await client.createNetwork(params);
      return {
        output: { network },
        message: `Created network **${network.name ?? 'new network'}**.`
      };
    }

    if (!networkId) throw new Error('networkId is required for update');
    let network = await client.updateNetwork(networkId, params);
    return {
      output: { network },
      message: `Updated network **${network.name ?? networkId}**.`
    };
  })
  .build();
