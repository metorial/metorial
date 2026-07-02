import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updatePass = SlateTool.create(spec, {
  name: 'Update Pass',
  key: 'update_pass',
  description: `Update an existing pass's placeholder values and/or status. By default, PassSlot automatically sends push notifications to Apple Wallet when values change. You can also trigger a manual push notification.`,
  instructions: [
    'Provide values to update placeholder fields, and/or status to change the pass status.',
    'Valid status values: "valid", "invalid", "redeemed", "unpaid", "locked", "incomplete".',
    'Set sendPush to true to manually trigger a push notification (only needed if automatic push is disabled).'
  ]
})
  .input(
    z.object({
      passTypeIdentifier: z
        .string()
        .describe('Pass type identifier (e.g., "pass.example.id1")'),
      serialNumber: z.string().describe('Unique serial number of the pass'),
      values: z
        .record(z.string(), z.string())
        .optional()
        .describe('Placeholder values to update (e.g., { "balance": "$50.00" })'),
      status: z
        .enum(['valid', 'invalid', 'redeemed', 'unpaid', 'locked', 'incomplete'])
        .optional()
        .describe('New pass status'),
      sendPush: z
        .boolean()
        .optional()
        .describe('Manually trigger a push notification to Apple Wallet')
    })
  )
  .output(
    z.object({
      serialNumber: z.string().describe('Serial number of the updated pass'),
      passTypeIdentifier: z.string().describe('Pass type identifier'),
      updatedValues: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated placeholder values'),
      updatedStatus: z.string().optional().describe('Updated pass status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { passTypeIdentifier, serialNumber } = ctx.input;
    let updatedValues: Record<string, any> | undefined;
    let updatedStatus: string | undefined;

    if (ctx.input.values) {
      updatedValues = await client.updatePassValues(
        passTypeIdentifier,
        serialNumber,
        ctx.input.values
      );
    }

    if (ctx.input.status) {
      let statusResult = await client.updatePassStatus(
        passTypeIdentifier,
        serialNumber,
        ctx.input.status
      );
      updatedStatus = statusResult.status;
    }

    if (ctx.input.sendPush) {
      await client.pushPass(passTypeIdentifier, serialNumber);
    }

    let parts: string[] = [];
    if (updatedValues) parts.push('values');
    if (updatedStatus) parts.push(`status to "${updatedStatus}"`);
    if (ctx.input.sendPush) parts.push('push notification sent');

    return {
      output: {
        serialNumber,
        passTypeIdentifier,
        updatedValues,
        updatedStatus
      },
      message: `Updated pass **${serialNumber}**: ${parts.join(', ')}.`
    };
  })
  .build();
