import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrazeClient } from '../lib/client';
import { brazeServiceError } from '../lib/errors';
import { spec } from '../spec';

let hasAnyUserIdentifier = (input: {
  externalIds?: string[];
  emails?: string[];
  phones?: string[];
  externalId?: string;
  email?: string;
  phone?: string;
}) =>
  (input.externalIds?.length ?? 0) > 0 ||
  (input.emails?.length ?? 0) > 0 ||
  (input.phones?.length ?? 0) > 0 ||
  Boolean(input.externalId) ||
  Boolean(input.email) ||
  Boolean(input.phone);

export let updateSubscriptionStatus = SlateTool.create(spec, {
  name: 'Update Subscription Status',
  key: 'update_subscription_status',
  description: `Update user subscription states for email or SMS subscription groups. Add or remove users from a subscription group by setting their state to subscribed or unsubscribed.`,
  constraints: ['Maximum 50 users per request.', 'Rate limited to 5,000 requests per minute.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      subscriptionGroupId: z.string().describe('ID of the subscription group to update'),
      subscriptionState: z
        .enum(['subscribed', 'unsubscribed'])
        .describe('New subscription state'),
      externalIds: z.array(z.string()).optional().describe('External user IDs to update'),
      emails: z
        .array(z.string())
        .optional()
        .describe('Email addresses to update (for email subscription groups)'),
      phones: z
        .array(z.string())
        .optional()
        .describe('Phone numbers to update (for SMS subscription groups)')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Response status from Braze')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrazeClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    if (!hasAnyUserIdentifier(ctx.input)) {
      throw brazeServiceError('Provide externalIds, emails, or phones to update.');
    }

    let result = await client.setSubscriptionStatus({
      subscriptionGroupId: ctx.input.subscriptionGroupId,
      subscriptionState: ctx.input.subscriptionState,
      externalIds: ctx.input.externalIds,
      emails: ctx.input.emails,
      phones: ctx.input.phones
    });

    let count =
      (ctx.input.externalIds?.length ?? 0) +
      (ctx.input.emails?.length ?? 0) +
      (ctx.input.phones?.length ?? 0);

    return {
      output: {
        message: result.message
      },
      message: `Updated subscription status to **${ctx.input.subscriptionState}** for ${count} user(s) in group **${ctx.input.subscriptionGroupId}**.`
    };
  })
  .build();

export let getSubscriptionStatus = SlateTool.create(spec, {
  name: 'Get Subscription Status',
  key: 'get_subscription_status',
  description: `Query a user's subscription status within a specific subscription group, or list all subscription groups a user belongs to. Supports lookup by external ID, email, or phone number.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      subscriptionGroupId: z
        .string()
        .optional()
        .describe(
          'Specific subscription group ID to check. If omitted, returns all subscription groups for the user.'
        ),
      externalId: z.string().optional().describe('External user ID to look up'),
      email: z.string().optional().describe('Email address to look up'),
      phone: z.string().optional().describe('Phone number to look up')
    })
  )
  .output(
    z.object({
      status: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Subscription status results'),
      message: z.string().describe('Response status from Braze')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrazeClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    if (!hasAnyUserIdentifier(ctx.input)) {
      throw brazeServiceError('Provide externalId, email, or phone to query.');
    }

    let result: any;
    if (ctx.input.subscriptionGroupId) {
      result = await client.getSubscriptionStatus({
        subscriptionGroupId: ctx.input.subscriptionGroupId,
        externalId: ctx.input.externalId,
        email: ctx.input.email,
        phone: ctx.input.phone
      });
    } else {
      result = await client.getUserSubscriptionGroups({
        externalId: ctx.input.externalId,
        email: ctx.input.email,
        phone: ctx.input.phone
      });
    }

    return {
      output: {
        status: result.status ?? result.subscription_groups ?? [],
        message: result.message
      },
      message: ctx.input.subscriptionGroupId
        ? `Retrieved subscription status for group **${ctx.input.subscriptionGroupId}**.`
        : `Retrieved all subscription groups for the user.`
    };
  })
  .build();
