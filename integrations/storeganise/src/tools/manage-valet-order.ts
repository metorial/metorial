import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageValetOrderTool = SlateTool.create(spec, {
  name: 'Manage Valet Order',
  key: 'manage_valet_order',
  description: `Retrieve or update valet storage orders. Get order details with job steps, update order data, or advance a step in the valet order workflow (e.g. mark a step as completed).`,
  instructions: [
    'Set action to "get" to retrieve a valet order with its job steps.',
    'Set action to "update" to modify valet order fields.',
    'Set action to "complete_step" to mark a specific step in the workflow as completed.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['get', 'update', 'complete_step']).describe('Action to perform'),
      orderId: z.string().describe('The valet order ID'),
      include: z
        .string()
        .optional()
        .describe(
          'Comma-separated related data (e.g. "job,customFields") - used with get action'
        ),
      updateFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Fields to update on the valet order - used with update action'),
      stepId: z
        .string()
        .optional()
        .describe('Step ID to complete - required for complete_step action')
    })
  )
  .output(
    z.object({
      valetOrder: z.record(z.string(), z.any()).describe('Valet order details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let { action, orderId } = ctx.input;

    if (action === 'update') {
      let valetOrder = await client.updateValetOrder(orderId, ctx.input.updateFields || {});
      return {
        output: { valetOrder },
        message: `Updated valet order **${orderId}**.`
      };
    }

    if (action === 'complete_step') {
      let valetOrder = await client.updateValetOrderStep(orderId, ctx.input.stepId!, {
        state: 'completed'
      });
      return {
        output: { valetOrder },
        message: `Completed step **${ctx.input.stepId}** on valet order ${orderId}.`
      };
    }

    let valetOrder = await client.getValetOrder(
      orderId,
      ctx.input.include || 'job,customFields'
    );
    return {
      output: { valetOrder },
      message: `Retrieved valet order **${orderId}**.`
    };
  })
  .build();
