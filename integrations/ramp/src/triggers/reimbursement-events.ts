import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let reimbursementEvents = SlateTrigger.create(spec, {
  name: 'Reimbursement Events',
  key: 'reimbursement_events',
  description:
    'Polls for new and updated Ramp reimbursements. Detects new reimbursements and state changes since the last poll.'
})
  .input(
    z.object({
      reimbursementId: z.string().describe('Unique ID of the reimbursement'),
      reimbursement: z.any().describe('Full reimbursement object from Ramp')
    })
  )
  .output(
    z.object({
      reimbursementId: z.string().describe('Unique ID of the reimbursement'),
      userId: z.string().optional().describe('User ID of the employee'),
      userFullName: z.string().optional().describe('Full name of the employee'),
      userEmail: z.string().optional().describe('Email of the employee'),
      amount: z.number().optional().describe('Reimbursement amount'),
      currency: z.string().optional().describe('Currency code'),
      merchantName: z.string().optional().describe('Merchant name'),
      state: z.string().optional().describe('Reimbursement state'),
      direction: z
        .string()
        .optional()
        .describe('Direction (BUSINESS_TO_USER or USER_TO_BUSINESS)'),
      type: z.string().optional().describe('Reimbursement type'),
      createdAt: z.string().optional().describe('Creation timestamp (ISO 8601)'),
      approvedAt: z.string().optional().describe('Approval timestamp (ISO 8601)'),
      paidAt: z.string().optional().describe('Payment timestamp (ISO 8601)'),
      entityId: z.string().optional().describe('Business entity ID')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },
    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        environment: ctx.config.environment
      });

      let result = await client.listReimbursements({
        pageSize: 100
      });

      let knownIds: Record<string, string> = ctx.state?.knownIds || {};
      let newInputs: Array<{ reimbursementId: string; reimbursement: any }> = [];

      for (let reimb of result.data) {
        let stateKey = `${reimb.id}:${reimb.state || ''}`;
        if (knownIds[reimb.id] !== stateKey) {
          knownIds[reimb.id] = stateKey;
          newInputs.push({ reimbursementId: reimb.id, reimbursement: reimb });
        }
      }

      return {
        inputs: newInputs,
        updatedState: {
          knownIds
        }
      };
    },
    handleEvent: async ctx => {
      let r = ctx.input.reimbursement;

      return {
        type: `reimbursement.${(r.state || 'updated').toLowerCase()}`,
        id: `${ctx.input.reimbursementId}:${r.state || ''}`,
        output: {
          reimbursementId: r.id,
          userId: r.user_id,
          userFullName: r.user_full_name,
          userEmail: r.user_email,
          amount: r.amount,
          currency: r.currency,
          merchantName: r.merchant_name,
          state: r.state,
          direction: r.direction,
          type: r.type,
          createdAt: r.created_at,
          approvedAt: r.approved_at,
          paidAt: r.paid_at,
          entityId: r.entity_id
        }
      };
    }
  })
  .build();
