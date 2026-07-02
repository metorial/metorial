import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { PayPalClient } from '../lib/client';
import { spec } from '../spec';

export let managePayment = SlateTool.create(spec, {
  name: 'Manage Payment',
  key: 'manage_payment',
  description: `Manage payment authorizations, captures, and refunds. Capture an authorization, void an authorization, refund a captured payment, or view details of authorizations/captures/refunds.`,
  instructions: [
    'Use action **captureAuthorization** to capture funds from an authorized payment.',
    'Use action **voidAuthorization** to void an authorization that has not been captured.',
    'Use action **refundCapture** to refund a captured payment (full or partial).',
    'Use action **getAuthorization**, **getCapture**, or **getRefund** to view details.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'captureAuthorization',
          'voidAuthorization',
          'refundCapture',
          'getAuthorization',
          'getCapture',
          'getRefund'
        ])
        .describe('Action to perform'),
      resourceId: z
        .string()
        .describe('Authorization ID, Capture ID, or Refund ID depending on the action'),
      currencyCode: z
        .string()
        .optional()
        .describe('Currency code for partial capture/refund (e.g. USD)'),
      amount: z
        .string()
        .optional()
        .describe('Amount for partial capture/refund as a string (e.g. "50.00")'),
      finalCapture: z
        .boolean()
        .optional()
        .describe('Whether this is the final capture for the authorization'),
      noteToPayer: z.string().optional().describe('Note to the payer for refunds'),
      invoiceId: z
        .string()
        .optional()
        .describe('Invoice ID to associate with the capture or refund')
    })
  )
  .output(
    z.object({
      resourceId: z.string().describe('ID of the resource'),
      status: z.string().optional().describe('Status of the resource'),
      currencyCode: z.string().optional().describe('Currency code'),
      amount: z.string().optional().describe('Amount'),
      createTime: z.string().optional().describe('Creation timestamp'),
      resource: z.any().optional().describe('Full resource details from PayPal')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PayPalClient({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      clientSecret: ctx.auth.clientSecret,
      environment: ctx.auth.environment
    });

    let result: Record<string, any>;
    let action = ctx.input.action;

    switch (action) {
      case 'captureAuthorization': {
        let captureParams: Record<string, any> = {};
        if (ctx.input.amount && ctx.input.currencyCode) {
          captureParams.amount = {
            currency_code: ctx.input.currencyCode,
            value: ctx.input.amount
          };
        }
        if (ctx.input.finalCapture !== undefined)
          captureParams.finalCapture = ctx.input.finalCapture;
        if (ctx.input.invoiceId) captureParams.invoiceId = ctx.input.invoiceId;
        if (ctx.input.noteToPayer) captureParams.noteToPayer = ctx.input.noteToPayer;

        result = await client.captureAuthorization(ctx.input.resourceId, captureParams);
        return {
          output: {
            resourceId: result.id,
            status: result.status,
            currencyCode: result.amount?.currency_code,
            amount: result.amount?.value,
            createTime: result.create_time,
            resource: result
          },
          message: `Captured authorization \`${ctx.input.resourceId}\`. Capture ID: \`${result.id}\`, status: **${result.status}**.`
        };
      }
      case 'voidAuthorization': {
        await client.voidAuthorization(ctx.input.resourceId);
        return {
          output: {
            resourceId: ctx.input.resourceId,
            status: 'VOIDED'
          },
          message: `Voided authorization \`${ctx.input.resourceId}\`.`
        };
      }
      case 'refundCapture': {
        let refundParams: Record<string, any> = {};
        if (ctx.input.amount && ctx.input.currencyCode) {
          refundParams.amount = {
            currency_code: ctx.input.currencyCode,
            value: ctx.input.amount
          };
        }
        if (ctx.input.invoiceId) refundParams.invoiceId = ctx.input.invoiceId;
        if (ctx.input.noteToPayer) refundParams.noteToPayer = ctx.input.noteToPayer;

        result = await client.refundCapture(ctx.input.resourceId, refundParams);
        return {
          output: {
            resourceId: result.id,
            status: result.status,
            currencyCode: result.amount?.currency_code,
            amount: result.amount?.value,
            createTime: result.create_time,
            resource: result
          },
          message: `Refunded capture \`${ctx.input.resourceId}\`. Refund ID: \`${result.id}\`, status: **${result.status}**.`
        };
      }
      case 'getAuthorization': {
        result = await client.getAuthorization(ctx.input.resourceId);
        return {
          output: {
            resourceId: result.id,
            status: result.status,
            currencyCode: result.amount?.currency_code,
            amount: result.amount?.value,
            createTime: result.create_time,
            resource: result
          },
          message: `Authorization \`${result.id}\` is **${result.status}** for ${result.amount?.currency_code} ${result.amount?.value}.`
        };
      }
      case 'getCapture': {
        result = await client.getCapture(ctx.input.resourceId);
        return {
          output: {
            resourceId: result.id,
            status: result.status,
            currencyCode: result.amount?.currency_code,
            amount: result.amount?.value,
            createTime: result.create_time,
            resource: result
          },
          message: `Capture \`${result.id}\` is **${result.status}** for ${result.amount?.currency_code} ${result.amount?.value}.`
        };
      }
      case 'getRefund': {
        result = await client.getRefund(ctx.input.resourceId);
        return {
          output: {
            resourceId: result.id,
            status: result.status,
            currencyCode: result.amount?.currency_code,
            amount: result.amount?.value,
            createTime: result.create_time,
            resource: result
          },
          message: `Refund \`${result.id}\` is **${result.status}** for ${result.amount?.currency_code} ${result.amount?.value}.`
        };
      }
    }
  })
  .build();
