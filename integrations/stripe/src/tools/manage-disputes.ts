import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { StripeClient } from '../lib/client';
import { stripeServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageDisputes = SlateTool.create(spec, {
  name: 'Manage Disputes',
  key: 'manage_disputes',
  description: `Retrieve, list, update, or close disputes (chargebacks). Submit evidence to fight a dispute or accept it by closing. Disputes arise when a customer questions a charge with their bank.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['get', 'update', 'close', 'list']).describe('Operation to perform'),
      disputeId: z.string().optional().describe('Dispute ID (required for get/update/close)'),
      evidence: z
        .object({
          customerName: z.string().optional().describe('Customer name'),
          customerEmailAddress: z.string().optional().describe('Customer email'),
          productDescription: z
            .string()
            .optional()
            .describe('Description of the product/service'),
          uncategorizedText: z.string().optional().describe('Any other evidence or context'),
          serviceDate: z.string().optional().describe('Date service was provided'),
          shippingTrackingNumber: z.string().optional().describe('Shipping tracking number'),
          shippingCarrier: z.string().optional().describe('Shipping carrier name')
        })
        .optional()
        .describe('Evidence to submit for the dispute'),
      submitEvidence: z
        .boolean()
        .optional()
        .describe('If true, submit the evidence and close the dispute for review'),
      metadata: z.record(z.string(), z.string()).optional().describe('Key-value metadata'),
      limit: z.number().optional().describe('Max results (for list)'),
      startingAfter: z.string().optional().describe('Cursor for pagination')
    })
  )
  .output(
    z.object({
      disputeId: z.string().optional().describe('Dispute ID'),
      chargeId: z.string().optional().describe('Associated charge ID'),
      amount: z.number().optional().describe('Disputed amount'),
      currency: z.string().optional().describe('Currency code'),
      status: z
        .string()
        .optional()
        .describe(
          'Dispute status (warning_needs_response, warning_under_review, warning_closed, needs_response, under_review, won, lost)'
        ),
      reason: z.string().optional().describe('Dispute reason'),
      created: z.number().optional().describe('Creation timestamp'),
      disputes: z
        .array(
          z.object({
            disputeId: z.string(),
            chargeId: z.string(),
            amount: z.number(),
            currency: z.string(),
            status: z.string(),
            reason: z.string(),
            created: z.number()
          })
        )
        .optional()
        .describe('List of disputes'),
      hasMore: z.boolean().optional().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StripeClient({
      token: ctx.auth.token,
      stripeAccountId: ctx.config.stripeAccountId
    });

    let { action } = ctx.input;

    let mapDispute = (d: any) => ({
      disputeId: d.id,
      chargeId: d.charge,
      amount: d.amount,
      currency: d.currency,
      status: d.status,
      reason: d.reason,
      created: d.created
    });

    if (action === 'get') {
      if (!ctx.input.disputeId)
        throw stripeServiceError('disputeId is required for get action');
      let dispute = await client.getDispute(ctx.input.disputeId);
      return {
        output: mapDispute(dispute),
        message: `Dispute **${dispute.id}**: ${dispute.amount} ${dispute.currency.toUpperCase()} — status: ${dispute.status}, reason: ${dispute.reason}`
      };
    }

    if (action === 'update') {
      if (!ctx.input.disputeId)
        throw stripeServiceError('disputeId is required for update action');
      let params: Record<string, any> = {};

      if (ctx.input.evidence) {
        params.evidence = {};
        if (ctx.input.evidence.customerName)
          params.evidence.customer_name = ctx.input.evidence.customerName;
        if (ctx.input.evidence.customerEmailAddress)
          params.evidence.customer_email_address = ctx.input.evidence.customerEmailAddress;
        if (ctx.input.evidence.productDescription)
          params.evidence.product_description = ctx.input.evidence.productDescription;
        if (ctx.input.evidence.uncategorizedText)
          params.evidence.uncategorized_text = ctx.input.evidence.uncategorizedText;
        if (ctx.input.evidence.serviceDate)
          params.evidence.service_date = ctx.input.evidence.serviceDate;
        if (ctx.input.evidence.shippingTrackingNumber)
          params.evidence.shipping_tracking_number = ctx.input.evidence.shippingTrackingNumber;
        if (ctx.input.evidence.shippingCarrier)
          params.evidence.shipping_carrier = ctx.input.evidence.shippingCarrier;
      }

      if (ctx.input.submitEvidence) params.submit = true;
      if (ctx.input.metadata) params.metadata = ctx.input.metadata;

      let dispute = await client.updateDispute(ctx.input.disputeId, params);
      return {
        output: mapDispute(dispute),
        message: `Updated dispute **${dispute.id}**${ctx.input.submitEvidence ? ' and submitted evidence' : ''} — status: ${dispute.status}`
      };
    }

    if (action === 'close') {
      if (!ctx.input.disputeId)
        throw stripeServiceError('disputeId is required for close action');
      let dispute = await client.closeDispute(ctx.input.disputeId);
      return {
        output: mapDispute(dispute),
        message: `Closed dispute **${dispute.id}** (accepted the dispute)`
      };
    }

    // list
    let params: Record<string, any> = {};
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.startingAfter) params.starting_after = ctx.input.startingAfter;

    let result = await client.listDisputes(params);
    return {
      output: {
        disputes: result.data.map(mapDispute),
        hasMore: result.has_more
      },
      message: `Found **${result.data.length}** dispute(s)${result.has_more ? ' (more available)' : ''}`
    };
  })
  .build();
