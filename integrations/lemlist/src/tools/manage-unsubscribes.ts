import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, isMissing, optionalText, text } from '../lib/client';
import { spec } from '../spec';

export let manageUnsubscribes = SlateTool.create(spec, {
  name: 'Manage Unsubscribes',
  key: 'manage_unsubscribes',
  description: `DEPRECATED — use \`manage_subscriptions\` instead. These legacy routes stop working on November 1, 2026. Add or remove emails from the global unsubscribe list, check the unsubscribe status of a specific email, or list all unsubscribed contacts. Used for maintaining compliance and managing opt-outs.`,
  instructions: [
    'Use action "add" to unsubscribe an email, "remove" to re-subscribe, "check" to verify status, or "list" to get all unsubscribes.',
    'The "email" field is required for add, remove, and check actions.',
    'Use manage_subscriptions for current variable/contact opt-outs and re-subscription. Removing an opt-out can enable outreach; never remove protected or unintended opt-outs.'
  ],
  tags: { deprecated: true, readOnly: false, destructive: true }
})
  .input(
    z.object({
      action: z.enum(['add', 'remove', 'check', 'list']).describe('Action to perform'),
      email: z
        .string()
        .optional()
        .describe('Email address (required for add, remove, and check actions)'),
      offset: z.number().optional().describe('Pagination offset (for list action)'),
      limit: z.number().optional().describe('Number of results (for list action, max 100)')
    })
  )
  .output(
    z.object({
      email: z.string().optional(),
      unsubscribed: z.boolean().optional(),
      source: z.string().optional(),
      createdAt: z.string().optional(),
      unsubscribes: z
        .array(
          z.object({
            email: z.string().optional(),
            campaignId: z.string().optional(),
            campaignName: z.string().optional(),
            unsubscribedAt: z.string().optional(),
            scope: z.string().optional()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client({ token: ctx.auth.token }),
      { action, email } = ctx.input;
    if (action === 'list') {
      const unsubscribes = (
        await client.listUnsubscribes({ offset: ctx.input.offset, limit: ctx.input.limit })
      ).map(u => ({
        email: optionalText(u.value ?? u.email),
        campaignId: optionalText(u.campaignId),
        campaignName: optionalText(u.campaignName),
        unsubscribedAt: optionalText(u.createdAt ?? u.unsubscribedAt),
        scope: optionalText(u.scope)
      }));
      return {
        output: { unsubscribes },
        message: `Retrieved **${unsubscribes.length}** legacy unsubscribe entries in this page.`
      };
    }
    if (!email?.trim())
      throw createApiServiceError('Email is required for add, remove, and check actions.');
    if (action === 'check') {
      try {
        const data = await client.getUnsubscribeStatus(email);
        if (text(data.value, 'unsubscribe value') !== email)
          throw createApiServiceError('Lemlist returned a different unsubscribe value.');
        return {
          output: {
            email: text(data.value),
            unsubscribed: true,
            source: optionalText(data.source),
            createdAt: optionalText(data.createdAt)
          },
          message: 'The requested value is unsubscribed.'
        };
      } catch (error) {
        if (!isMissing(error)) throw error;
        return {
          output: { email, unsubscribed: false },
          message: 'The requested value is not in the legacy unsubscribe list.'
        };
      }
    }
    const data =
      action === 'add'
        ? await client.addUnsubscribe(email)
        : await client.removeUnsubscribe(email);
    if (text(data.value, 'unsubscribe value') !== email)
      throw createApiServiceError('Lemlist returned a different unsubscribe value.');
    return {
      output: { email, unsubscribed: action === 'add' },
      message:
        action === 'add'
          ? 'The provider accepted the legacy opt-out.'
          : 'The provider accepted the legacy re-subscription.'
    };
  })
  .build();
