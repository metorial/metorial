import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { intercomServiceError } from '../lib/errors';
import { arrayOrUndefined, stringOrUndefined } from '../lib/output';
import { spec } from '../spec';

export let manageSubscriptions = SlateTool.create(spec, {
  name: 'Manage Subscriptions',
  key: 'manage_subscriptions',
  description: `List subscription types and manage a contact's subscription preferences. Subscription types control opt-in and opt-out consent for non-essential communications.`,
  instructions: [
    'Use "list_types" to discover available subscription type IDs.',
    'Use "list_contact" to inspect the subscription preferences associated with a contact.',
    'For "add_to_contact", consentType must match the subscription type consent behavior.',
    'Adding an opt-out subscription opts the contact out; adding an opt-in subscription opts the contact in.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list_types', 'list_contact', 'add_to_contact', 'remove_from_contact'])
        .describe('Operation to perform'),
      contactId: z
        .string()
        .optional()
        .describe('Contact ID (required for contact subscription operations)'),
      subscriptionId: z
        .string()
        .optional()
        .describe('Subscription type ID (required for add/remove)'),
      consentType: z
        .enum(['opt_in', 'opt_out'])
        .optional()
        .describe('Consent type for add_to_contact')
    })
  )
  .output(
    z.object({
      subscription: z
        .object({
          subscriptionId: z.string().describe('Subscription type ID'),
          state: z.string().optional().describe('Subscription state'),
          consentType: z.string().optional().describe('Consent type'),
          name: z.string().optional().describe('Default translated name'),
          description: z.string().optional().describe('Default translated description'),
          locale: z.string().optional().describe('Default translation locale'),
          contentTypes: z.array(z.string()).optional().describe('Supported content types')
        })
        .optional()
        .describe('Subscription type changed by add/remove'),
      subscriptions: z
        .array(
          z.object({
            subscriptionId: z.string().describe('Subscription type ID'),
            state: z.string().optional().describe('Subscription state'),
            consentType: z.string().optional().describe('Consent type'),
            name: z.string().optional().describe('Default translated name'),
            description: z.string().optional().describe('Default translated description'),
            locale: z.string().optional().describe('Default translation locale'),
            contentTypes: z.array(z.string()).optional().describe('Supported content types')
          })
        )
        .optional()
        .describe('Subscription types returned for list actions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    if (ctx.input.action === 'list_types') {
      let result = await client.listSubscriptionTypes();
      let subscriptions = (result.data || []).map(mapSubscription);

      return {
        output: { subscriptions },
        message: `Found **${subscriptions.length}** subscription types`
      };
    }

    if (ctx.input.action === 'list_contact') {
      if (!ctx.input.contactId) {
        throw intercomServiceError('contactId is required for list_contact');
      }
      let result = await client.listContactSubscriptions(ctx.input.contactId);
      let subscriptions = (result.data || []).map(mapSubscription);

      return {
        output: { subscriptions },
        message: `Found **${subscriptions.length}** subscriptions for contact **${ctx.input.contactId}**`
      };
    }

    if (ctx.input.action === 'add_to_contact') {
      if (!ctx.input.contactId || !ctx.input.subscriptionId || !ctx.input.consentType) {
        throw intercomServiceError(
          'contactId, subscriptionId, and consentType are required for add_to_contact'
        );
      }
      let result = await client.addContactSubscription(
        ctx.input.contactId,
        ctx.input.subscriptionId,
        ctx.input.consentType
      );
      let subscription = mapSubscription(result);

      return {
        output: { subscription },
        message: `Added subscription **${ctx.input.subscriptionId}** to contact **${ctx.input.contactId}**`
      };
    }

    if (ctx.input.action === 'remove_from_contact') {
      if (!ctx.input.contactId || !ctx.input.subscriptionId) {
        throw intercomServiceError(
          'contactId and subscriptionId are required for remove_from_contact'
        );
      }
      let result = await client.removeContactSubscription(
        ctx.input.contactId,
        ctx.input.subscriptionId
      );
      let subscription = mapSubscription(result);

      return {
        output: { subscription },
        message: `Removed subscription **${ctx.input.subscriptionId}** from contact **${ctx.input.contactId}**`
      };
    }

    throw intercomServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();

let mapSubscription = (data: any) => ({
  subscriptionId: String(data.id),
  state: stringOrUndefined(data.state),
  consentType: stringOrUndefined(data.consent_type),
  name: stringOrUndefined(data.default_translation?.name),
  description: stringOrUndefined(data.default_translation?.description),
  locale: stringOrUndefined(data.default_translation?.locale),
  contentTypes: arrayOrUndefined(data.content_types)
});
