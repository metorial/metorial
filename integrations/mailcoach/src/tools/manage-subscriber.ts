import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let subscriberOutputSchema = z.object({
  subscriberUuid: z.string().describe('Unique identifier of the subscriber'),
  emailListUuid: z.string().describe('UUID of the email list'),
  email: z.string().describe('Email address'),
  firstName: z.string().nullable().describe('First name'),
  lastName: z.string().nullable().describe('Last name'),
  status: z.string().describe('Subscription status'),
  tags: z.array(z.string()).describe('Tags assigned to the subscriber'),
  extraAttributes: z
    .record(z.string(), z.unknown())
    .nullable()
    .describe('Custom extra attributes'),
  subscribedAt: z.string().nullable().describe('Subscription timestamp'),
  unsubscribedAt: z.string().nullable().describe('Unsubscription timestamp'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let manageSubscriber = SlateTool.create(spec, {
  name: 'Manage Subscriber',
  key: 'manage_subscriber',
  description: `Add, update, or remove a subscriber from an email list. Also supports confirming, unsubscribing, and resending confirmation emails. Use action "create" to add a new subscriber, "update" to change details, "delete" to remove, "confirm" to confirm, "unsubscribe" to unsubscribe, or "resend_confirmation" to resend the confirmation email.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete', 'confirm', 'unsubscribe', 'resend_confirmation'])
        .describe('The operation to perform'),
      emailListUuid: z
        .string()
        .optional()
        .describe('UUID of the email list (required for create)'),
      subscriberUuid: z
        .string()
        .optional()
        .describe(
          'UUID of the subscriber (required for update, delete, confirm, unsubscribe, resend_confirmation)'
        ),
      email: z.string().optional().describe('Email address of the subscriber'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      tags: z.array(z.string()).optional().describe('Tags to assign to the subscriber'),
      extraAttributes: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom extra attributes as key-value pairs'),
      skipConfirmation: z
        .boolean()
        .optional()
        .describe('Skip the double opt-in confirmation (create only)')
    })
  )
  .output(
    z.object({
      subscriber: subscriberOutputSchema
        .nullable()
        .describe('The subscriber data, null when deleted or for resend_confirmation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.config.domain
    });

    let { action } = ctx.input;

    if (action === 'delete') {
      if (!ctx.input.subscriberUuid) throw new Error('subscriberUuid is required for delete');
      await client.deleteSubscriber(ctx.input.subscriberUuid);
      return {
        output: { subscriber: null },
        message: `Subscriber **${ctx.input.subscriberUuid}** has been deleted.`
      };
    }

    if (action === 'resend_confirmation') {
      if (!ctx.input.subscriberUuid)
        throw new Error('subscriberUuid is required for resend_confirmation');
      await client.resendConfirmation(ctx.input.subscriberUuid);
      return {
        output: { subscriber: null },
        message: `Confirmation email has been resent to subscriber **${ctx.input.subscriberUuid}**.`
      };
    }

    if (action === 'confirm') {
      if (!ctx.input.subscriberUuid) throw new Error('subscriberUuid is required for confirm');
      let result = await client.confirmSubscriber(ctx.input.subscriberUuid);
      return {
        output: { subscriber: mapSubscriber(result) },
        message: `Subscriber **${result.email}** has been confirmed.`
      };
    }

    if (action === 'unsubscribe') {
      if (!ctx.input.subscriberUuid)
        throw new Error('subscriberUuid is required for unsubscribe');
      let result = await client.unsubscribe(ctx.input.subscriberUuid);
      return {
        output: { subscriber: mapSubscriber(result) },
        message: `Subscriber **${result.email}** has been unsubscribed.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.emailListUuid) throw new Error('emailListUuid is required for create');
      if (!ctx.input.email) throw new Error('email is required for create');

      let result = await client.createSubscriber(ctx.input.emailListUuid, {
        email: ctx.input.email,
        first_name: ctx.input.firstName,
        last_name: ctx.input.lastName,
        tags: ctx.input.tags,
        extra_attributes: ctx.input.extraAttributes,
        skip_confirmation: ctx.input.skipConfirmation
      });

      return {
        output: { subscriber: mapSubscriber(result) },
        message: `Subscriber **${result.email}** has been added to the list.`
      };
    }

    // update
    if (!ctx.input.subscriberUuid) throw new Error('subscriberUuid is required for update');

    let result = await client.updateSubscriber(ctx.input.subscriberUuid, {
      email: ctx.input.email,
      first_name: ctx.input.firstName,
      last_name: ctx.input.lastName,
      tags: ctx.input.tags,
      extra_attributes: ctx.input.extraAttributes
    });

    return {
      output: { subscriber: mapSubscriber(result) },
      message: `Subscriber **${result.email}** has been updated.`
    };
  });

let mapSubscriber = (sub: any) => ({
  subscriberUuid: sub.uuid,
  emailListUuid: sub.email_list_uuid,
  email: sub.email,
  firstName: sub.first_name ?? null,
  lastName: sub.last_name ?? null,
  status: sub.status ?? 'subscribed',
  tags: sub.tags ?? [],
  extraAttributes: sub.extra_attributes ?? null,
  subscribedAt: sub.subscribed_at ?? null,
  unsubscribedAt: sub.unsubscribed_at ?? null,
  createdAt: sub.created_at,
  updatedAt: sub.updated_at
});
