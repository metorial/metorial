import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { PayPalClient } from '../lib/client';
import { paypalServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageDispute = SlateTool.create(spec, {
  name: 'Manage Dispute',
  key: 'manage_dispute',
  description: `Manage PayPal customer disputes (chargebacks, claims, inquiries). List disputes, get details, accept claims, provide evidence, or escalate to PayPal.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'acceptClaim', 'provideEvidence', 'escalate'])
        .describe('Action to perform'),
      disputeId: z
        .string()
        .optional()
        .describe('Dispute ID (required for get/accept/evidence/escalate)'),
      startTime: z
        .string()
        .optional()
        .describe('Filter disputes from this ISO 8601 time (for list)'),
      disputeState: z
        .string()
        .optional()
        .describe(
          'Filter by state: REQUIRED_ACTION, UNDER_REVIEW, RESOLVED, OTHER (for list)'
        ),
      transactionId: z
        .string()
        .optional()
        .describe('Filter by disputed transaction ID (for list)'),
      pageSize: z.number().optional().describe('Number of results per page'),
      note: z.string().optional().describe('Note for accept/escalate actions'),
      acceptClaimReason: z
        .string()
        .optional()
        .describe(
          'Reason for accepting: DID_NOT_SHIP, TOO_TIME_CONSUMING, LOST_IN_MAIL, NOT_RELEVANT (for acceptClaim)'
        ),
      evidenceType: z
        .string()
        .optional()
        .describe('Evidence type for provideEvidence (e.g. PROOF_OF_FULFILLMENT)'),
      evidenceNotes: z.string().optional().describe('Notes accompanying the evidence')
    })
  )
  .output(
    z.object({
      disputeId: z.string().optional().describe('Dispute ID'),
      status: z.string().optional().describe('Dispute status'),
      reason: z.string().optional().describe('Dispute reason'),
      disputeAmount: z.string().optional().describe('Disputed amount'),
      currencyCode: z.string().optional().describe('Currency code'),
      createTime: z.string().optional().describe('Dispute creation time'),
      disputes: z
        .array(
          z.object({
            disputeId: z.string().describe('Dispute ID'),
            status: z.string().describe('Status'),
            reason: z.string().optional().describe('Reason'),
            disputeAmount: z.string().optional().describe('Amount'),
            currencyCode: z.string().optional().describe('Currency'),
            createTime: z.string().optional().describe('Created at')
          })
        )
        .optional()
        .describe('List of disputes'),
      dispute: z.any().optional().describe('Full dispute details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PayPalClient({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      clientSecret: ctx.auth.clientSecret,
      environment: ctx.auth.environment
    });

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.listDisputes({
          startTime: ctx.input.startTime,
          disputeState: ctx.input.disputeState,
          pageSize: ctx.input.pageSize,
          disputedTransactionId: ctx.input.transactionId
        });
        let items = (result.items || []) as any[];
        return {
          output: {
            disputes: items.map((d: any) => ({
              disputeId: d.dispute_id,
              status: d.status,
              reason: d.reason,
              disputeAmount: d.dispute_amount?.value,
              currencyCode: d.dispute_amount?.currency_code,
              createTime: d.create_time
            }))
          },
          message: `Found ${items.length} dispute(s).`
        };
      }
      case 'get': {
        if (!ctx.input.disputeId)
          throw paypalServiceError('disputeId is required for get action');
        let dispute = await client.getDispute(ctx.input.disputeId);
        return {
          output: {
            disputeId: dispute.dispute_id,
            status: dispute.status,
            reason: dispute.reason,
            disputeAmount: dispute.dispute_amount?.value,
            currencyCode: dispute.dispute_amount?.currency_code,
            createTime: dispute.create_time,
            dispute
          },
          message: `Dispute \`${dispute.dispute_id}\` is **${dispute.status}** (${dispute.reason}). Amount: ${dispute.dispute_amount?.currency_code} ${dispute.dispute_amount?.value}.`
        };
      }
      case 'acceptClaim': {
        if (!ctx.input.disputeId)
          throw paypalServiceError('disputeId is required for acceptClaim action');
        await client.acceptDisputeClaim(ctx.input.disputeId, {
          note: ctx.input.note,
          acceptClaimReason: ctx.input.acceptClaimReason
        });
        return {
          output: {
            disputeId: ctx.input.disputeId,
            status: 'RESOLVED'
          },
          message: `Accepted claim for dispute \`${ctx.input.disputeId}\`.`
        };
      }
      case 'provideEvidence': {
        if (!ctx.input.disputeId)
          throw paypalServiceError('disputeId is required for provideEvidence action');
        await client.provideDisputeEvidence(ctx.input.disputeId, {
          evidences: [
            {
              evidence_type: ctx.input.evidenceType || 'OTHER',
              notes: ctx.input.evidenceNotes || ctx.input.note
            }
          ]
        });
        return {
          output: {
            disputeId: ctx.input.disputeId,
            status: 'UNDER_REVIEW'
          },
          message: `Evidence provided for dispute \`${ctx.input.disputeId}\`.`
        };
      }
      case 'escalate': {
        if (!ctx.input.disputeId)
          throw paypalServiceError('disputeId is required for escalate action');
        await client.escalateDispute(
          ctx.input.disputeId,
          ctx.input.note || 'Escalated by integration'
        );
        return {
          output: {
            disputeId: ctx.input.disputeId,
            status: 'UNDER_REVIEW'
          },
          message: `Dispute \`${ctx.input.disputeId}\` escalated to PayPal.`
        };
      }
    }
  })
  .build();
