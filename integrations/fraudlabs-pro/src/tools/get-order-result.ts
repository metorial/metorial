import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { parseProviderOutput } from '../lib/response';
import { spec } from '../spec';

let outputSchema = z.object({
  raw: z
    .record(z.string(), z.unknown())
    .describe('Complete provider response, excluding credentials'),
  fraudlabsproId: z.string().describe('FraudLabs Pro transaction ID'),
  fraudScore: z.number().describe('Fraud risk score from 0 (low risk) to 100 (high risk)'),
  fraudStatus: z.string().describe('Transaction status: APPROVE, REJECT, or REVIEW'),
  userOrderId: z
    .string()
    .optional()
    .describe('Your order ID if it was provided during screening'),
  triggeredRules: z.array(z.any()).optional().describe('List of fraud rules triggered'),
  ipGeolocation: z
    .record(z.string(), z.any())
    .optional()
    .describe('IP geolocation and proxy detection details'),
  billingAddress: z
    .record(z.string(), z.any())
    .optional()
    .describe('Billing address validation results'),
  shippingAddress: z
    .record(z.string(), z.any())
    .optional()
    .describe('Shipping address validation results'),
  emailAddress: z
    .record(z.string(), z.any())
    .optional()
    .describe('Email address validation results'),
  phoneNumber: z
    .record(z.string(), z.any())
    .optional()
    .describe('Phone number validation results'),
  creditCard: z
    .record(z.string(), z.any())
    .optional()
    .describe('Credit card validation results'),
  username: z
    .record(z.string(), z.any())
    .optional()
    .describe('Username risk assessment results'),
  remainingCredits: z.number().optional().describe('Remaining API credits in your account'),
  apiVersion: z.string().optional().describe('Fraud analysis engine version'),
  device: z
    .record(z.string(), z.any())
    .optional()
    .describe('Device fingerprint validation results')
});

export let getOrderResult = SlateTool.create(spec, {
  name: 'Get Order Result',
  key: 'get_order_result',
  description: `Retrieves the full fraud screening result for a previously screened transaction. Look up by FraudLabs Pro transaction ID or by your own order ID. Returns the complete fraud analysis including score, status, and all validation details.`,
  constraints: ['This API is only available on paid plans.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      transactionId: z.string().describe('FraudLabs Pro transaction ID or your own order ID'),
      idType: z
        .enum(['FLP_ID', 'ORDER_ID'])
        .optional()
        .describe('Type of ID provided. Defaults to FLP_ID if not specified.')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    ctx.info('Retrieving order result...');

    let result = await client.getOrderResult({
      transactionId: ctx.input.transactionId,
      idType: ctx.input.idType
    });

    let output = parseProviderOutput(
      outputSchema,
      {
        raw: result,
        fraudlabsproId: result.fraudlabspro_id,
        fraudScore: result.fraudlabspro_score,
        fraudStatus: result.fraudlabspro_status,
        userOrderId: result.user_order_id ?? undefined,
        triggeredRules: result.fraudlabspro_rules ?? undefined,
        ipGeolocation: result.ip_geolocation ?? undefined,
        billingAddress: result.billing_address ?? undefined,
        shippingAddress: result.shipping_address ?? undefined,
        emailAddress: result.email_address ?? undefined,
        phoneNumber: result.phone_number ?? undefined,
        creditCard: result.credit_card ?? undefined,
        username: result.username ?? undefined,
        remainingCredits: result.remaining_credits,
        apiVersion: result.api_version,
        device: result.device ?? undefined
      },
      'order result'
    );

    let statusEmoji =
      output.fraudStatus === 'APPROVE' ? '✅' : output.fraudStatus === 'REJECT' ? '❌' : '⚠️';

    return {
      output,
      message: `${statusEmoji} Transaction \`${output.fraudlabsproId}\` — **Score: ${output.fraudScore}/100**, Status: **${output.fraudStatus}**.`
    };
  })
  .build();
