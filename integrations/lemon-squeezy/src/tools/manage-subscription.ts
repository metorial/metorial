import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageSubscriptionTool = SlateTool.create(spec, {
  name: 'Manage Subscription',
  key: 'manage_subscription',
  description: `Retrieve, update, cancel, pause, unpause, or resume a subscription. Supports changing plans (variant), modifying billing anchors, and controlling trial periods. Use the **action** field to specify what to do.`,
  instructions: [
    'To cancel: set action to "cancel".',
    'To resume a cancelled subscription within the grace period: set action to "resume".',
    'To pause payment collection: set action to "pause" with an optional pauseMode ("void" or "free") and optional resumesAt date.',
    'To unpause: set action to "unpause".',
    'To change plan: set action to "update" and provide the new variantId.'
  ]
})
  .input(
    z.object({
      subscriptionId: z.string().describe('The subscription ID'),
      action: z
        .enum(['get', 'update', 'cancel', 'resume', 'pause', 'unpause'])
        .describe('The action to perform on the subscription'),
      variantId: z
        .string()
        .optional()
        .describe('New variant ID when changing plans (for "update" action)'),
      billingAnchor: z
        .number()
        .optional()
        .describe('Day of month (1-31) for payment collection (for "update" action)'),
      trialEndsAt: z
        .string()
        .optional()
        .describe('ISO 8601 date for trial end (for "update" action)'),
      invoiceImmediately: z
        .boolean()
        .optional()
        .describe('Charge immediately with prorated invoice (for "update" action)'),
      disableProrations: z
        .boolean()
        .optional()
        .describe('Skip proration; new price at next renewal (for "update" action)'),
      pauseMode: z
        .enum(['void', 'free'])
        .optional()
        .describe(
          'Pause mode: "void" stops charges, "free" gives free access (for "pause" action)'
        ),
      resumesAt: z
        .string()
        .optional()
        .describe(
          'ISO 8601 date to automatically resume a paused subscription (for "pause" action)'
        )
    })
  )
  .output(
    z.object({
      subscriptionId: z.string(),
      storeId: z.number(),
      customerId: z.number(),
      orderId: z.number(),
      productId: z.number(),
      variantId: z.number(),
      productName: z.string(),
      variantName: z.string(),
      userName: z.string(),
      userEmail: z.string(),
      status: z.string(),
      statusFormatted: z.string(),
      cardBrand: z.string().nullable(),
      renewsAt: z.string().nullable(),
      endsAt: z.string().nullable(),
      trialEndsAt: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { subscriptionId, action } = ctx.input;
    let response: any;

    if (action === 'get') {
      response = await client.getSubscription(subscriptionId);
    } else if (action === 'cancel') {
      response = await client.cancelSubscription(subscriptionId);
    } else if (action === 'resume') {
      response = await client.updateSubscription(subscriptionId, { cancelled: false });
    } else if (action === 'pause') {
      let pause: Record<string, unknown> = { mode: ctx.input.pauseMode || 'void' };
      if (ctx.input.resumesAt) pause.resumes_at = ctx.input.resumesAt;
      response = await client.updateSubscription(subscriptionId, { pause });
    } else if (action === 'unpause') {
      response = await client.updateSubscription(subscriptionId, { pause: null });
    } else {
      let attributes: Record<string, unknown> = {};
      if (ctx.input.variantId)
        attributes.variant_id = Number.parseInt(ctx.input.variantId, 10);
      if (ctx.input.billingAnchor !== undefined)
        attributes.billing_anchor = ctx.input.billingAnchor;
      if (ctx.input.trialEndsAt) attributes.trial_ends_at = ctx.input.trialEndsAt;
      if (ctx.input.invoiceImmediately !== undefined)
        attributes.invoice_immediately = ctx.input.invoiceImmediately;
      if (ctx.input.disableProrations !== undefined)
        attributes.disable_prorations = ctx.input.disableProrations;
      response = await client.updateSubscription(subscriptionId, attributes);
    }

    let sub = response.data;
    let attrs = sub.attributes;

    let output = {
      subscriptionId: sub.id,
      storeId: attrs.store_id,
      customerId: attrs.customer_id,
      orderId: attrs.order_id,
      productId: attrs.product_id,
      variantId: attrs.variant_id,
      productName: attrs.product_name,
      variantName: attrs.variant_name,
      userName: attrs.user_name,
      userEmail: attrs.user_email,
      status: attrs.status,
      statusFormatted: attrs.status_formatted,
      cardBrand: attrs.card_brand,
      renewsAt: attrs.renews_at,
      endsAt: attrs.ends_at,
      trialEndsAt: attrs.trial_ends_at,
      createdAt: attrs.created_at,
      updatedAt: attrs.updated_at
    };

    let actionLabel =
      action === 'get'
        ? 'Retrieved'
        : action === 'cancel'
          ? 'Cancelled'
          : action === 'resume'
            ? 'Resumed'
            : action === 'pause'
              ? 'Paused'
              : action === 'unpause'
                ? 'Unpaused'
                : 'Updated';

    return {
      output,
      message: `${actionLabel} subscription **#${sub.id}** for ${attrs.user_email} — status: ${attrs.status_formatted}.`
    };
  })
  .build();
