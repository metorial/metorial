import { SlateTool } from 'slates';
import { z } from 'zod';
import { BraintreeGraphQLClient } from '../lib/client';
import { CREATE_CLIENT_TOKEN } from '../lib/graphql-queries';
import { spec } from '../spec';

export let createClientToken = SlateTool.create(spec, {
  name: 'Create Client Token',
  key: 'create_client_token',
  description: `Generates a Braintree client token for initializing client-side Braintree SDKs. Use this when an app needs to tokenize payment methods before vaulting or charging them server-side.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      customerId: z
        .string()
        .optional()
        .describe(
          'Existing customer ID to allow the customer to vault and manage payment methods.'
        ),
      merchantAccountId: z
        .string()
        .optional()
        .describe('Merchant account ID used to create the client token.'),
      version: z
        .number()
        .int()
        .min(1)
        .max(3)
        .optional()
        .describe('Client token version. Defaults to Braintree version 2.'),
      domains: z
        .array(z.string())
        .optional()
        .describe('Allowed domains for services that require domain restrictions.'),
      failOnDuplicatePaymentMethodForCustomer: z
        .boolean()
        .optional()
        .describe(
          'When true, prevents storing the same payment method more than once for the customer.'
        ),
      paymentMethodId: z
        .string()
        .optional()
        .describe('Preferred payment method ID for View/Edit Funding Instrument flows.')
    })
  )
  .output(
    z.object({
      clientToken: z.string().describe('Base64 encoded client token for Braintree SDKs'),
      tokenLength: z.number().describe('Length of the returned token')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BraintreeGraphQLClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let clientToken: Record<string, any> = {};
    if (ctx.input.customerId) clientToken.customerId = ctx.input.customerId;
    if (ctx.input.merchantAccountId)
      clientToken.merchantAccountId = ctx.input.merchantAccountId;
    if (ctx.input.version !== undefined) clientToken.version = ctx.input.version;
    if (ctx.input.domains) clientToken.domains = ctx.input.domains;
    if (ctx.input.failOnDuplicatePaymentMethodForCustomer !== undefined) {
      clientToken.failOnDuplicatePaymentMethodForCustomer =
        ctx.input.failOnDuplicatePaymentMethodForCustomer;
    }
    if (ctx.input.paymentMethodId) clientToken.paymentMethodId = ctx.input.paymentMethodId;

    let result = await client.query(
      CREATE_CLIENT_TOKEN,
      { input: { clientToken } },
      'create client token'
    );
    let token = result.createClientToken.clientToken;

    return {
      output: {
        clientToken: token,
        tokenLength: token.length
      },
      message: `Created Braintree client token (${token.length} characters)`
    };
  })
  .build();
