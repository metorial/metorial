import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let refundLineItemSchema = z.object({
  lineItemId: z.string().optional(),
  quantity: z.number().optional(),
  productIdentifier: z.string().optional(),
  description: z.string().optional(),
  productTaxCode: z.string().optional(),
  unitPrice: z.number().optional(),
  discount: z.number().optional(),
  salesTax: z.number().optional()
});

export let newRefundTrigger = SlateTrigger.create(spec, {
  name: 'New Refund Transaction',
  key: 'new_refund',
  description:
    'Triggers when a new refund transaction is created in TaxJar. Polls for new refunds since the last check.'
})
  .input(
    z.object({
      transactionId: z.string().describe('Transaction ID of the refund'),
      refund: z.any().describe('Full refund data from TaxJar')
    })
  )
  .output(
    z.object({
      transactionId: z.string().describe('Unique refund transaction identifier'),
      transactionDate: z.string().optional().describe('Date of the refund'),
      transactionReferenceId: z.string().optional().describe('Original order transaction ID'),
      provider: z.string().optional().describe('Marketplace provider'),
      fromCountry: z.string().optional(),
      fromZip: z.string().optional(),
      fromState: z.string().optional(),
      fromCity: z.string().optional(),
      fromStreet: z.string().optional(),
      toCountry: z.string().optional(),
      toZip: z.string().optional(),
      toState: z.string().optional(),
      toCity: z.string().optional(),
      toStreet: z.string().optional(),
      amount: z.number().optional().describe('Total refund amount (negative)'),
      shipping: z.number().optional().describe('Shipping refund amount (negative)'),
      salesTax: z.number().optional().describe('Sales tax refunded (negative)'),
      lineItems: z.array(refundLineItemSchema).optional()
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        environment: ctx.config.environment,
        apiVersion: ctx.config.apiVersion
      });

      let now = new Date();
      let fromDate = ctx.state?.lastPolledDate
        ? (ctx.state.lastPolledDate as string)
        : new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;

      let toDate = now.toISOString().split('T')[0]!;

      let refundIds = await client.listRefunds({
        from_transaction_date: fromDate,
        to_transaction_date: toDate
      });

      let knownIds = (ctx.state?.knownRefundIds as string[] | undefined) ?? [];
      let knownSet = new Set(knownIds);
      let newRefundIds = refundIds.filter(id => !knownSet.has(id));

      let inputs: Array<{ transactionId: string; refund: any }> = [];

      for (let refundId of newRefundIds) {
        try {
          let refund = await client.showRefund(refundId);
          inputs.push({
            transactionId: refundId,
            refund
          });
        } catch (e) {
          ctx.warn(`Failed to fetch refund ${refundId}: ${e}`);
        }
      }

      let updatedKnownIds = [...knownIds, ...newRefundIds].slice(-1000);

      return {
        inputs,
        updatedState: {
          lastPolledDate: toDate,
          knownRefundIds: updatedKnownIds
        }
      };
    },

    handleEvent: async ctx => {
      let refund = ctx.input.refund;

      return {
        type: 'refund.created',
        id: ctx.input.transactionId,
        output: {
          transactionId: refund.transaction_id,
          transactionDate: refund.transaction_date,
          transactionReferenceId: refund.transaction_reference_id,
          provider: refund.provider,
          fromCountry: refund.from_country,
          fromZip: refund.from_zip,
          fromState: refund.from_state,
          fromCity: refund.from_city,
          fromStreet: refund.from_street,
          toCountry: refund.to_country,
          toZip: refund.to_zip,
          toState: refund.to_state,
          toCity: refund.to_city,
          toStreet: refund.to_street,
          amount: refund.amount,
          shipping: refund.shipping,
          salesTax: refund.sales_tax,
          lineItems: refund.line_items?.map((li: any) => ({
            lineItemId: li.id,
            quantity: li.quantity,
            productIdentifier: li.product_identifier,
            description: li.description,
            productTaxCode: li.product_tax_code,
            unitPrice: li.unit_price,
            discount: li.discount,
            salesTax: li.sales_tax
          }))
        }
      };
    }
  })
  .build();
