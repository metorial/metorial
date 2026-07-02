import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { StripeClient } from '../lib/client';
import { stripeServiceError } from '../lib/errors';
import { spec } from '../spec';

export let createBillingPortalSession = SlateTool.create(spec, {
  name: 'Create Billing Portal Session',
  key: 'create_billing_portal_session',
  description:
    'Create a short-lived Stripe-hosted Billing Portal session so a customer can manage subscriptions, invoices, and payment methods.',
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      customerId: z.string().optional().describe('Customer ID for the portal session'),
      returnUrl: z
        .string()
        .optional()
        .describe('URL to return customers to when they leave the portal'),
      configurationId: z
        .string()
        .optional()
        .describe('Billing portal configuration ID; omit to use the default configuration'),
      locale: z
        .string()
        .optional()
        .describe('IETF language tag or auto for the portal locale'),
      onBehalfOf: z
        .string()
        .optional()
        .describe('Connected account whose branding and resources should appear')
    })
  )
  .output(
    z.object({
      sessionId: z.string().optional().describe('Billing portal session ID'),
      url: z.string().optional().describe('Short-lived customer portal URL'),
      customerId: z.string().optional().describe('Customer ID'),
      returnUrl: z.string().optional().nullable().describe('Return URL'),
      configurationId: z.string().optional().nullable().describe('Portal configuration ID'),
      created: z.number().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.customerId) {
      throw stripeServiceError('customerId is required for create_billing_portal_session');
    }

    let client = new StripeClient({
      token: ctx.auth.token,
      stripeAccountId: ctx.config.stripeAccountId
    });

    let params: Record<string, any> = {
      customer: ctx.input.customerId
    };
    if (ctx.input.returnUrl) params.return_url = ctx.input.returnUrl;
    if (ctx.input.configurationId) params.configuration = ctx.input.configurationId;
    if (ctx.input.locale) params.locale = ctx.input.locale;
    if (ctx.input.onBehalfOf) params.on_behalf_of = ctx.input.onBehalfOf;

    let session = await client.createBillingPortalSession(params);
    return {
      output: {
        sessionId: session.id,
        url: session.url,
        customerId: session.customer,
        returnUrl: session.return_url ?? null,
        configurationId: session.configuration ?? null,
        created: session.created
      },
      message: `Created billing portal session **${session.id}**\n\nPortal URL: ${session.url}`
    };
  })
  .build();
