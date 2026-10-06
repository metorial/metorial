import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, isMissing, optionalBoolean, optionalText, text } from '../lib/client';
import { spec } from '../spec';

const entrySchema = z.object({
  id: z.string(),
  value: z.string(),
  source: z.string().optional(),
  createdAt: z.string().optional()
});
export const manageSubscriptions = SlateTool.create(spec, {
  key: 'manage_subscriptions',
  name: 'Manage Subscriptions',
  description:
    'Check, add or remove current multichannel opt-outs, or list unsubscribed variables. A variable can be an email, domain beginning with @, phone number or LinkedIn URL. A contact opt-out blocks that contact on every channel.',
  instructions: [
    'Use target variable with value, or target contact with contactId. The list action only supports variable targets and uses offset/limit.',
    'Re-subscribing can enable outreach. Variable opt-outs originating from lead or abuse are protected and cannot be removed. Do not retry a conflict automatically.',
    'Contact and variable protections are separate: clearing one does not clear the other. A missing contact is an error, not proof that it is subscribed.'
  ],
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      action: z.enum(['check', 'unsubscribe', 'resubscribe', 'list']),
      target: z
        .enum(['variable', 'contact'])
        .optional()
        .describe('Defaults to variable. Contact opt-outs block all communication channels.'),
      value: z
        .string()
        .optional()
        .describe(
          'Variable value for non-list variable actions; emails, @domains, phone numbers and LinkedIn URLs are supported.'
        ),
      contactId: z
        .string()
        .optional()
        .describe(
          'Existing contact identifier for contact actions. Discover it in lead readback.'
        ),
      offset: z.number().optional().describe('Variable-list offset, starting at 0.'),
      limit: z.number().optional().describe('Variable-list page size, 1 to 100; default 100.')
    })
  )
  .output(
    z.object({
      target: z.enum(['variable', 'contact']),
      value: z.string().optional(),
      contactId: z.string().optional(),
      unsubscribed: z.boolean().optional(),
      source: z.string().optional(),
      variableType: z
        .string()
        .optional()
        .describe('Omitted when the provider does not explicitly report a variable type.'),
      records: z.array(entrySchema).optional(),
      nextOffset: z.number().optional(),
      possiblyMore: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client({ token: ctx.auth.token }),
      target = ctx.input.target ?? 'variable',
      action = ctx.input.action;
    if (action === 'list') {
      if (
        target !== 'variable' ||
        ctx.input.value !== undefined ||
        ctx.input.contactId !== undefined
      )
        throw createApiServiceError(
          'The list action accepts only a variable target and pagination fields.'
        );
      const limit = ctx.input.limit ?? 100,
        offset = ctx.input.offset ?? 0;
      const records = (await client.listUnsubscribedVariables({ offset, limit })).map(
        item => ({
          id: text(item._id),
          value: text(item.value, 'unsubscribe value'),
          source: optionalText(item.source),
          createdAt: optionalText(item.createdAt)
        })
      );
      const possiblyMore = records.length >= limit;
      return {
        output: {
          target,
          records,
          possiblyMore,
          nextOffset: possiblyMore ? offset + records.length : undefined
        },
        message: `Retrieved **${records.length}** unsubscribed variables in this page.`
      };
    }
    if (ctx.input.offset !== undefined || ctx.input.limit !== undefined)
      throw createApiServiceError('Pagination fields are only valid for list.');
    if (target === 'contact') {
      if (ctx.input.value !== undefined || !ctx.input.contactId?.trim())
        throw createApiServiceError(
          'Contact actions require contactId and cannot include value.'
        );
      const contactId = ctx.input.contactId;
      await client.getContactSubscription(contactId);
      if (action === 'unsubscribe') await client.unsubscribeContact(contactId);
      else if (action === 'resubscribe') await client.resubscribeContact(contactId);
      const status = await client.getContactSubscription(contactId),
        unsubscribed = optionalBoolean(status.doNotContact);
      if (action !== 'check' && unsubscribed !== (action === 'unsubscribe'))
        throw createApiServiceError(
          'Lemlist has not confirmed the requested contact subscription state. Read it again before retrying.'
        );
      return {
        output: { target, contactId: text(status._id), unsubscribed },
        message:
          'Retrieved the current contact subscription status. Separate variable opt-outs still apply.'
      };
    }
    if (ctx.input.contactId !== undefined || !ctx.input.value?.trim())
      throw createApiServiceError(
        'Variable actions require value and cannot include contactId.'
      );
    const value = ctx.input.value;
    if (action === 'resubscribe') {
      try {
        const previous = await client.getVariableSubscription(value);
        if (previous.source === 'lead' || previous.source === 'abuse')
          throw createApiServiceError(
            'This opt-out is protected because its source is lead or abuse. It cannot be re-subscribed.'
          );
      } catch (error) {
        if (!isMissing(error)) throw error;
      }
      await client.resubscribeVariable(value);
    } else if (action === 'unsubscribe') await client.unsubscribeVariable(value);
    try {
      const current = await client.getVariableSubscription(value);
      if (action === 'resubscribe')
        throw createApiServiceError(
          'Lemlist still reports this value as unsubscribed. Read it again before retrying.'
        );
      return {
        output: {
          target,
          value: text(current.value),
          unsubscribed: true,
          source: optionalText(current.source)
        },
        message: 'The requested variable is currently unsubscribed.'
      };
    } catch (error) {
      if (!isMissing(error)) throw error;
      if (action === 'unsubscribe')
        throw createApiServiceError(
          'Lemlist has not confirmed the requested opt-out. Read it again before retrying.'
        );
      return {
        output: { target, value, unsubscribed: false },
        message:
          'The value is not in the variable opt-out list. Separate contact-level protections may still apply.'
      };
    }
  })
  .build();
