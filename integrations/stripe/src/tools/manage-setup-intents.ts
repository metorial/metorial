import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { StripeClient } from '../lib/client';
import { stripeServiceError } from '../lib/errors';
import { spec } from '../spec';

let mapSetupIntent = (setupIntent: any) => ({
  setupIntentId: setupIntent.id,
  status: setupIntent.status,
  customerId: setupIntent.customer ?? null,
  paymentMethodId: setupIntent.payment_method ?? null,
  clientSecret: setupIntent.client_secret ?? null,
  usage: setupIntent.usage,
  cancellationReason: setupIntent.cancellation_reason ?? null,
  created: setupIntent.created
});

export let manageSetupIntents = SlateTool.create(spec, {
  name: 'Manage Setup Intents',
  key: 'manage_setup_intents',
  description:
    'Create, retrieve, confirm, cancel, or list Stripe SetupIntents for saving payment methods for future use.',
  instructions: [
    'Use SetupIntents to collect authorization for future off-session or on-session payments.',
    'Use confirm with a paymentMethodId when the customer has selected a payment method.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'confirm', 'cancel', 'list'])
        .describe('Operation to perform'),
      setupIntentId: z
        .string()
        .optional()
        .describe('SetupIntent ID (required for get, confirm, cancel)'),
      customerId: z
        .string()
        .optional()
        .describe('Customer ID to associate with the SetupIntent'),
      paymentMethodId: z
        .string()
        .optional()
        .describe('PaymentMethod ID to attach or confirm with'),
      description: z.string().optional().describe('Description of the SetupIntent'),
      usage: z
        .enum(['on_session', 'off_session'])
        .optional()
        .describe('How the saved payment method is expected to be used'),
      paymentMethodTypes: z
        .array(z.string())
        .optional()
        .describe('Payment method types, for example ["card"]'),
      automaticPaymentMethods: z
        .boolean()
        .optional()
        .describe('Enable Stripe automatic payment method selection'),
      confirm: z.boolean().optional().describe('Confirm immediately during create'),
      returnUrl: z
        .string()
        .optional()
        .describe('Return URL for redirect-based payment method confirmation'),
      cancellationReason: z
        .enum(['abandoned', 'requested_by_customer', 'duplicate'])
        .optional()
        .describe('Reason for cancellation'),
      metadata: z.record(z.string(), z.string()).optional().describe('Key-value metadata'),
      limit: z.number().optional().describe('Max results (for list)'),
      startingAfter: z.string().optional().describe('Cursor for pagination')
    })
  )
  .output(
    z.object({
      setupIntentId: z.string().optional().describe('SetupIntent ID'),
      status: z.string().optional().describe('SetupIntent status'),
      customerId: z.string().optional().nullable().describe('Associated customer ID'),
      paymentMethodId: z
        .string()
        .optional()
        .nullable()
        .describe('Associated PaymentMethod ID'),
      clientSecret: z.string().optional().nullable().describe('Client secret'),
      usage: z.string().optional().describe('SetupIntent usage'),
      cancellationReason: z.string().optional().nullable().describe('Cancellation reason'),
      created: z.number().optional().describe('Creation timestamp'),
      setupIntents: z
        .array(
          z.object({
            setupIntentId: z.string(),
            status: z.string(),
            customerId: z.string().nullable(),
            paymentMethodId: z.string().nullable(),
            usage: z.string().optional(),
            created: z.number()
          })
        )
        .optional()
        .describe('List of SetupIntents'),
      hasMore: z.boolean().optional().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StripeClient({
      token: ctx.auth.token,
      stripeAccountId: ctx.config.stripeAccountId
    });

    let { action } = ctx.input;

    if (action === 'create') {
      let params: Record<string, any> = {};
      if (ctx.input.customerId) params.customer = ctx.input.customerId;
      if (ctx.input.paymentMethodId) params.payment_method = ctx.input.paymentMethodId;
      if (ctx.input.description) params.description = ctx.input.description;
      if (ctx.input.usage) params.usage = ctx.input.usage;
      if (ctx.input.paymentMethodTypes)
        params.payment_method_types = ctx.input.paymentMethodTypes;
      if (ctx.input.automaticPaymentMethods !== undefined) {
        params.automatic_payment_methods = { enabled: ctx.input.automaticPaymentMethods };
      }
      if (ctx.input.confirm !== undefined) params.confirm = ctx.input.confirm;
      if (ctx.input.returnUrl) params.return_url = ctx.input.returnUrl;
      if (ctx.input.metadata) params.metadata = ctx.input.metadata;

      let setupIntent = await client.createSetupIntent(params);
      return {
        output: mapSetupIntent(setupIntent),
        message: `Created SetupIntent **${setupIntent.id}** — status: ${setupIntent.status}`
      };
    }

    if (action === 'get') {
      if (!ctx.input.setupIntentId)
        throw stripeServiceError('setupIntentId is required for get action');
      let setupIntent = await client.getSetupIntent(ctx.input.setupIntentId);
      return {
        output: mapSetupIntent(setupIntent),
        message: `SetupIntent **${setupIntent.id}** — status: ${setupIntent.status}`
      };
    }

    if (action === 'confirm') {
      if (!ctx.input.setupIntentId)
        throw stripeServiceError('setupIntentId is required for confirm action');
      let params: Record<string, any> = {};
      if (ctx.input.paymentMethodId) params.payment_method = ctx.input.paymentMethodId;
      if (ctx.input.returnUrl) params.return_url = ctx.input.returnUrl;

      let setupIntent = await client.confirmSetupIntent(ctx.input.setupIntentId, params);
      return {
        output: mapSetupIntent(setupIntent),
        message: `Confirmed SetupIntent **${setupIntent.id}** — status: ${setupIntent.status}`
      };
    }

    if (action === 'cancel') {
      if (!ctx.input.setupIntentId)
        throw stripeServiceError('setupIntentId is required for cancel action');
      let params: Record<string, any> = {};
      if (ctx.input.cancellationReason) {
        params.cancellation_reason = ctx.input.cancellationReason;
      }

      let setupIntent = await client.cancelSetupIntent(ctx.input.setupIntentId, params);
      return {
        output: mapSetupIntent(setupIntent),
        message: `Canceled SetupIntent **${setupIntent.id}**`
      };
    }

    let params: Record<string, any> = {};
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.startingAfter) params.starting_after = ctx.input.startingAfter;
    if (ctx.input.customerId) params.customer = ctx.input.customerId;
    if (ctx.input.paymentMethodId) params.payment_method = ctx.input.paymentMethodId;

    let result = await client.listSetupIntents(params);
    return {
      output: {
        setupIntents: result.data.map((setupIntent: any) => mapSetupIntent(setupIntent)),
        hasMore: result.has_more
      },
      message: `Found **${result.data.length}** SetupIntent(s)${result.has_more ? ' (more available)' : ''}`
    };
  })
  .build();
