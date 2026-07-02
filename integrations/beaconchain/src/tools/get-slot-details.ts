import { SlateTool } from 'slates';
import { z } from 'zod';
import { BeaconchainClient } from '../lib/client';
import { spec } from '../spec';

export let getSlotDetails = SlateTool.create(spec, {
  name: 'Get Slot Details',
  key: 'get_slot_details',
  description: `Retrieve detailed information about a specific consensus layer slot, including proposer, attestation count, execution payload, and more.
Optionally include sync committee duties, attestation duties, withdrawals, and deposits for the slot.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      slot: z.number().describe('Slot number to look up'),
      includeSyncCommitteeDuties: z
        .boolean()
        .optional()
        .describe('Include sync committee duties and rewards for this slot'),
      includeAttestationDuties: z
        .boolean()
        .optional()
        .describe('Include attestation duties and rewards for this slot'),
      includeWithdrawals: z
        .boolean()
        .optional()
        .describe('Include withdrawals processed in this slot'),
      includeDeposits: z
        .boolean()
        .optional()
        .describe('Include deposits processed in this slot')
    })
  )
  .output(
    z.object({
      slotOverview: z
        .any()
        .describe('Slot overview with proposer, status, execution payload, etc.'),
      syncCommitteeDuties: z.any().optional().describe('Sync committee duties for the slot'),
      attestationDuties: z.any().optional().describe('Attestation duties for the slot'),
      withdrawals: z.any().optional().describe('Withdrawals processed in the slot'),
      deposits: z.any().optional().describe('Deposits processed in the slot')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BeaconchainClient({
      token: ctx.auth.token,
      chain: ctx.config.chain
    });

    let slotOverview = await client.getSlotOverview(ctx.input.slot);
    let result: Record<string, any> = { slotOverview };

    if (ctx.input.includeSyncCommitteeDuties) {
      result.syncCommitteeDuties = await client.getSlotSyncCommitteeDuties(ctx.input.slot);
    }

    if (ctx.input.includeAttestationDuties) {
      result.attestationDuties = await client.getSlotAttestationDuties(ctx.input.slot);
    }

    if (ctx.input.includeWithdrawals) {
      result.withdrawals = await client.getSlotWithdrawals(ctx.input.slot);
    }

    if (ctx.input.includeDeposits) {
      result.deposits = await client.getSlotDeposits(ctx.input.slot);
    }

    return {
      output: result as any,
      message: `Retrieved details for slot **${ctx.input.slot}** on ${ctx.config.chain}.`
    };
  })
  .build();
