import { SlateTool } from 'slates';
import { z } from 'zod';
import { BraintreeRestClient } from '../lib/client';
import { buildXml, parseXml } from '../lib/xml';
import { spec } from '../spec';

let disputeOutputSchema = z.object({
  disputeId: z.string().describe('Dispute ID'),
  status: z.string().describe('Dispute status'),
  kind: z
    .string()
    .optional()
    .describe('Dispute kind (chargeback, pre_arbitration, retrieval)'),
  reason: z.string().optional().describe('Dispute reason'),
  reasonCode: z.string().optional().describe('Dispute reason code'),
  amount: z.string().optional().describe('Disputed amount'),
  currencyIsoCode: z.string().optional().describe('Currency code'),
  receivedDate: z.string().optional().nullable().describe('Date dispute was received'),
  replyByDate: z.string().optional().nullable().describe('Date by which to reply'),
  transactionId: z.string().optional().describe('Associated transaction ID'),
  merchantAccountId: z.string().optional().describe('Merchant account ID'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let findDispute = SlateTool.create(spec, {
  name: 'Find Dispute',
  key: 'find_dispute',
  description: `Retrieves details of a specific Braintree dispute by its ID, including status, reason, amount, and deadline information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      disputeId: z.string().describe('The dispute ID to look up')
    })
  )
  .output(disputeOutputSchema)
  .handleInvocation(async ctx => {
    let rest = new BraintreeRestClient({
      token: ctx.auth.token,
      merchantId: ctx.auth.merchantId,
      environment: ctx.config.environment
    });

    let xml = await rest.get(`/disputes/${ctx.input.disputeId}`);
    let parsed = parseXml(xml);
    let dispute = parsed.dispute || parsed;

    let output = mapDispute(dispute);

    return {
      output,
      message: `Dispute \`${ctx.input.disputeId}\` — **${output.status}** — ${output.reason || 'unknown reason'} — **${output.amount} ${output.currencyIsoCode || ''}**${output.replyByDate ? ` — reply by ${output.replyByDate}` : ''}`
    };
  })
  .build();

export let acceptDispute = SlateTool.create(spec, {
  name: 'Accept Dispute',
  key: 'accept_dispute',
  description: `Accepts a Braintree dispute, acknowledging the chargeback. Only disputes with status "open" can be accepted. This action is irreversible.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      disputeId: z.string().describe('The dispute ID to accept')
    })
  )
  .output(disputeOutputSchema)
  .handleInvocation(async ctx => {
    let rest = new BraintreeRestClient({
      token: ctx.auth.token,
      merchantId: ctx.auth.merchantId,
      environment: ctx.config.environment
    });

    let xml = await rest.put(`/disputes/${ctx.input.disputeId}/accept`, '');
    let parsed = parseXml(xml);
    let dispute = parsed.dispute || parsed;

    // If the response is empty (204), just return the accepted state
    let output = dispute.id
      ? mapDispute(dispute)
      : {
          disputeId: ctx.input.disputeId,
          status: 'accepted',
          kind: undefined,
          reason: undefined,
          reasonCode: undefined,
          amount: undefined,
          currencyIsoCode: undefined,
          receivedDate: undefined,
          replyByDate: undefined,
          transactionId: undefined,
          merchantAccountId: undefined,
          createdAt: undefined,
          updatedAt: undefined
        };

    return {
      output,
      message: `Dispute \`${ctx.input.disputeId}\` accepted`
    };
  })
  .build();

export let addDisputeEvidence = SlateTool.create(spec, {
  name: 'Add Dispute Evidence',
  key: 'add_dispute_evidence',
  description: `Adds text evidence to a Braintree dispute for contestation. Use this to provide supporting information when fighting a chargeback.`,
  instructions: [
    'You can add multiple pieces of evidence to a dispute.',
    'After adding all evidence, use the Finalize Dispute tool to submit the case.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      disputeId: z.string().describe('The dispute ID to add evidence to'),
      content: z.string().describe('Text evidence content'),
      category: z
        .string()
        .optional()
        .describe(
          'Evidence category (e.g. "GENERAL", "DEVICE_ID", "TRACKING_NUMBER", "CARRIER_NAME")'
        ),
      sequenceNumber: z.number().optional().describe('Sequence number for ordering evidence')
    })
  )
  .output(
    z.object({
      evidenceId: z.string().optional().describe('ID of the created evidence'),
      disputeId: z.string().describe('The dispute ID'),
      content: z.string().describe('The evidence content that was added')
    })
  )
  .handleInvocation(async ctx => {
    let rest = new BraintreeRestClient({
      token: ctx.auth.token,
      merchantId: ctx.auth.merchantId,
      environment: ctx.config.environment
    });

    let data: Record<string, any> = {
      comments: ctx.input.content
    };
    if (ctx.input.category) data.category = ctx.input.category;
    if (ctx.input.sequenceNumber !== undefined) data.sequenceNumber = ctx.input.sequenceNumber;

    let body = buildXml('text-evidence', data);
    let xml = await rest.post(`/disputes/${ctx.input.disputeId}/evidence`, body);
    let parsed = parseXml(xml);
    let evidence = parsed.evidence || parsed;

    return {
      output: {
        evidenceId: evidence.id,
        disputeId: ctx.input.disputeId,
        content: ctx.input.content
      },
      message: `Evidence added to dispute \`${ctx.input.disputeId}\``
    };
  })
  .build();

export let finalizeDispute = SlateTool.create(spec, {
  name: 'Finalize Dispute',
  key: 'finalize_dispute',
  description: `Finalizes a Braintree dispute submission, sending all added evidence to the payment processor. After finalization, no more evidence can be added.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      disputeId: z.string().describe('The dispute ID to finalize')
    })
  )
  .output(
    z.object({
      disputeId: z.string().describe('The finalized dispute ID'),
      finalized: z.boolean().describe('Whether finalization was successful')
    })
  )
  .handleInvocation(async ctx => {
    let rest = new BraintreeRestClient({
      token: ctx.auth.token,
      merchantId: ctx.auth.merchantId,
      environment: ctx.config.environment
    });

    await rest.put(`/disputes/${ctx.input.disputeId}/finalize`, '');

    return {
      output: {
        disputeId: ctx.input.disputeId,
        finalized: true
      },
      message: `Dispute \`${ctx.input.disputeId}\` finalized and submitted for review`
    };
  })
  .build();

let mapDispute = (dispute: any) => ({
  disputeId: dispute.id || '',
  status: dispute.status || '',
  kind: dispute.kind,
  reason: dispute.reason,
  reasonCode: dispute.reasonCode,
  amount: dispute.amountDisputed || dispute.amount,
  currencyIsoCode: dispute.currencyIsoCode,
  receivedDate: dispute.receivedDate,
  replyByDate: dispute.replyByDate,
  transactionId: dispute.transaction?.id || dispute.originalDisputeId,
  merchantAccountId: dispute.merchantAccountId,
  createdAt: dispute.createdAt,
  updatedAt: dispute.updatedAt
});
