import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let callPartySchema = z.object({
  partyId: z.string().describe('Party ID within the telephony session'),
  direction: z.string().optional().describe('Call direction (Inbound or Outbound)'),
  from: z
    .object({
      phoneNumber: z.string().optional(),
      name: z.string().optional(),
      extensionId: z.string().optional()
    })
    .optional()
    .describe('Originating party info'),
  to: z
    .object({
      phoneNumber: z.string().optional(),
      name: z.string().optional(),
      extensionId: z.string().optional()
    })
    .optional()
    .describe('Destination party info'),
  status: z
    .object({
      code: z.string().optional(),
      reason: z.string().optional()
    })
    .optional()
    .describe('Current party status'),
  muted: z.boolean().optional().describe('Whether the party is muted'),
  standAlone: z.boolean().optional().describe('Whether the party is standalone')
});

let outputSchema = z.object({
  success: z.boolean().describe('Whether the action completed successfully'),
  action: z
    .enum(['hold', 'unhold', 'transfer', 'forward'])
    .describe('The action that was performed'),
  telephonySessionId: z.string().describe('Telephony session ID'),
  partyId: z.string().describe('Party ID'),
  party: callPartySchema.optional().describe('Updated party information returned by the API')
});

export let manageCall = SlateTool.create(spec, {
  name: 'Manage Call',
  key: 'manage_call',
  description: `Manage an active call via RingCentral's Call Control API. Supports placing a call on hold, resuming a held call, transferring a call to another number, or forwarding a call to another number.`,
  instructions: [
    'Use "hold" to place the specified party on hold.',
    'Use "unhold" to resume a held call.',
    'Use "transfer" to transfer the call to another phone number. Requires targetNumber.',
    'Use "forward" to forward the call to another phone number. Requires targetNumber.',
    'The telephonySessionId and partyId can be obtained from the active calls list.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['hold', 'unhold', 'transfer', 'forward'])
        .describe('The call control action to perform'),
      telephonySessionId: z.string().describe('Telephony session ID of the active call'),
      partyId: z.string().describe('Party ID within the telephony session'),
      targetNumber: z
        .string()
        .optional()
        .describe(
          'Target phone number for transfer or forward actions (required when action is "transfer" or "forward")'
        )
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let { action, telephonySessionId, partyId, targetNumber } = ctx.input;

    if ((action === 'transfer' || action === 'forward') && !targetNumber) {
      throw new Error(`targetNumber is required when action is "${action}".`);
    }

    let result: any;

    if (action === 'hold') {
      result = await client.holdCall(telephonySessionId, partyId);
    } else if (action === 'unhold') {
      result = await client.unholdCall(telephonySessionId, partyId);
    } else if (action === 'transfer') {
      result = await client.transferCall(telephonySessionId, partyId, targetNumber!);
    } else if (action === 'forward') {
      result = await client.forwardCall(telephonySessionId, partyId, targetNumber!);
    }

    let party = result
      ? {
          partyId: result.id || partyId,
          direction: result.direction,
          from: result.from
            ? {
                phoneNumber: result.from.phoneNumber,
                name: result.from.name,
                extensionId: result.from.extensionId
              }
            : undefined,
          to: result.to
            ? {
                phoneNumber: result.to.phoneNumber,
                name: result.to.name,
                extensionId: result.to.extensionId
              }
            : undefined,
          status: result.status
            ? {
                code: result.status.code,
                reason: result.status.reason
              }
            : undefined,
          muted: result.muted,
          standAlone: result.standAlone
        }
      : undefined;

    let actionLabels: Record<string, string> = {
      hold: 'placed on hold',
      unhold: 'resumed',
      transfer: `transferred to ${targetNumber}`,
      forward: `forwarded to ${targetNumber}`
    };

    return {
      output: {
        success: true,
        action,
        telephonySessionId,
        partyId,
        party
      },
      message: `Call **${telephonySessionId}** (party ${partyId}) ${actionLabels[action]}.`
    };
  })
  .build();
