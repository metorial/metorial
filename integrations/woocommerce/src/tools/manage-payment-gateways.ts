import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let gatewaySchema = z.object({
  gatewayId: z.string(),
  title: z.string(),
  description: z.string(),
  enabled: z.boolean(),
  order: z.number(),
  methodTitle: z.string(),
  methodDescription: z.string()
});

export let managePaymentGateways = SlateTool.create(spec, {
  name: 'Manage Payment Gateways',
  key: 'manage_payment_gateways',
  description: `List all payment gateways or update a gateway's settings, including enabling/disabling gateways and changing their title and description.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'get', 'update']).describe('Operation to perform'),
      gatewayId: z.string().optional().describe('Gateway ID (required for get/update)'),
      enabled: z.boolean().optional().describe('Enable or disable the gateway'),
      title: z.string().optional().describe('Gateway display title'),
      description: z.string().optional().describe('Gateway description shown to customers'),
      order: z.number().optional().describe('Display order')
    })
  )
  .output(
    z.object({
      gateways: z.array(gatewaySchema).optional(),
      gateway: gatewaySchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action } = ctx.input;

    if (action === 'list') {
      let gateways = await client.listPaymentGateways();
      let mapped = gateways.map((g: any) => mapGateway(g));
      return {
        output: { gateways: mapped },
        message: `Found **${mapped.length}** payment gateways.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.gatewayId) throw new Error('gatewayId is required');
      let gateway = await client.getPaymentGateway(ctx.input.gatewayId);
      return {
        output: { gateway: mapGateway(gateway) },
        message: `Retrieved gateway **"${gateway.title}"** (${gateway.id}).`
      };
    }

    if (action === 'update') {
      if (!ctx.input.gatewayId) throw new Error('gatewayId is required');

      let data: Record<string, any> = {};
      if (ctx.input.enabled !== undefined) data.enabled = ctx.input.enabled;
      if (ctx.input.title) data.title = ctx.input.title;
      if (ctx.input.description) data.description = ctx.input.description;
      if (ctx.input.order !== undefined) data.order = ctx.input.order;

      let gateway = await client.updatePaymentGateway(ctx.input.gatewayId, data);
      return {
        output: { gateway: mapGateway(gateway) },
        message: `Updated gateway **"${gateway.title}"** (enabled: ${gateway.enabled}).`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();

let mapGateway = (g: any) => ({
  gatewayId: g.id || '',
  title: g.title || '',
  description: g.description || '',
  enabled: g.enabled || false,
  order: g.order || 0,
  methodTitle: g.method_title || '',
  methodDescription: g.method_description || ''
});
