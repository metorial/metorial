import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConnectClient } from '../lib/connect-client';
import { spec } from '../spec';

export let sandboxAdvanceOrder = SlateTool.create(spec, {
  name: 'Sandbox: Advance Order',
  key: 'sandbox_advance_order',
  description: `Simulate order lifecycle progression in the sandbox/development environment. Creates a test shopper, assigns a batch, and advances the order status. Each call to advance moves the batch through its status progression.

**Delivery progression:** acknowledged → picking → verifying_replacements → checkout → receipt_sanity_check → delivering → completed

**Pickup progression:** acknowledged → picking → verifying_replacements → checkout → receipt_sanity_check → bags_check → staged

Only available in the **development** environment.`,
  instructions: [
    'First create an order using the Create Order tool, then use this to simulate its lifecycle.',
    'Call this tool multiple times to advance through each status step.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      orderId: z.string().describe('Order ID to advance in the sandbox'),
      batchId: z
        .string()
        .optional()
        .describe(
          'Existing batch ID (if previously created). Omit to create a new shopper and batch.'
        )
    })
  )
  .output(
    z.object({
      shopperId: z
        .string()
        .optional()
        .describe('Test shopper ID (only returned when creating a new batch)'),
      batchId: z.string().describe('Batch ID for subsequent advance calls'),
      status: z.string().describe('New batch status after advancing')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConnectClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let batchId = ctx.input.batchId;
    let shopperId: string | undefined;

    if (!batchId) {
      let shopperResult = await client.createSandboxShopper();
      shopperId = shopperResult.shopperId;

      let batchResult = await client.createSandboxBatch(ctx.input.orderId, shopperId);
      batchId = batchResult.batchId;
    }

    let advanceResult = await client.advanceSandboxBatch(batchId);

    return {
      output: {
        shopperId,
        batchId,
        status: advanceResult.status
      },
      message: `Order **${ctx.input.orderId}** advanced to status: **${advanceResult.status}**.\n\n- Batch ID: \`${batchId}\`${shopperId ? `\n- Shopper ID: \`${shopperId}\`` : ''}`
    };
  })
  .build();
