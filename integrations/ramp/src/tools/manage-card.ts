import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let spendingRestrictionsSchema = z
  .object({
    amount: z.number().optional().describe('Spending limit amount in cents'),
    currencyCode: z.string().optional().describe('Currency code (e.g. USD)'),
    interval: z
      .string()
      .optional()
      .describe('Spending interval (e.g. DAILY, MONTHLY, ANNUAL, TOTAL)'),
    allowedCategories: z
      .array(z.number())
      .optional()
      .describe('List of allowed merchant category codes'),
    blockedCategories: z
      .array(z.number())
      .optional()
      .describe('List of blocked merchant category codes'),
    lockDate: z.string().optional().describe('Date after which the card is locked (ISO 8601)')
  })
  .optional()
  .describe('Spending restriction configuration');

export let manageCard = SlateTool.create(spec, {
  name: 'Manage Card',
  key: 'manage_card',
  description: `Create, update, suspend, unsuspend, or terminate a Ramp card.
- **create_virtual**: Issue a new virtual card for a user with optional spending restrictions.
- **create_physical**: Issue a new physical card with shipping fulfillment details.
- **update**: Modify card display name, owner, or spending restrictions.
- **suspend** / **unsuspend**: Temporarily lock or unlock a card.
- **terminate**: Permanently deactivate a card.`,
  instructions: [
    'Card creation is asynchronous — the response includes a task ID to check status',
    'Spending restriction amounts are in cents (e.g. 100000 = $1,000)'
  ]
})
  .input(
    z.object({
      action: z
        .enum([
          'create_virtual',
          'create_physical',
          'update',
          'suspend',
          'unsuspend',
          'terminate'
        ])
        .describe('Action to perform'),
      cardId: z
        .string()
        .optional()
        .describe('Card ID (required for update, suspend, unsuspend, terminate)'),
      displayName: z.string().optional().describe('Display name for the card'),
      userId: z
        .string()
        .optional()
        .describe('User ID to assign as card holder (required for create actions)'),
      spendProgramId: z.string().optional().describe('Spend program to link the card to'),
      spendingRestrictions: spendingRestrictionsSchema,
      fulfillment: z
        .object({
          shippingAddress: z
            .object({
              address1: z.string().describe('Street address line 1'),
              city: z.string().describe('City'),
              state: z.string().describe('State/Province'),
              postalCode: z.string().describe('Postal/ZIP code'),
              country: z.string().describe('Country code'),
              firstName: z.string().describe('Recipient first name'),
              lastName: z.string().describe('Recipient last name')
            })
            .describe('Shipping address for physical card')
        })
        .optional()
        .describe('Shipping details (required for create_physical)'),
      idempotencyKey: z.string().optional().describe('Unique idempotency key')
    })
  )
  .output(
    z.object({
      result: z.any().describe('API response from the action')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let { action } = ctx.input;
    let idempotencyKey = ctx.input.idempotencyKey || crypto.randomUUID();

    let buildSpendingRestrictions = () => {
      if (!ctx.input.spendingRestrictions) return undefined;
      let sr = ctx.input.spendingRestrictions;
      let result: Record<string, any> = {};
      if (sr.amount !== undefined || sr.currencyCode) {
        result.limit = {};
        if (sr.amount !== undefined) result.limit.amount = sr.amount;
        if (sr.currencyCode) result.limit.currency_code = sr.currencyCode;
      }
      if (sr.interval) result.interval = sr.interval;
      if (sr.allowedCategories) result.allowed_categories = sr.allowedCategories;
      if (sr.blockedCategories) result.blocked_categories = sr.blockedCategories;
      if (sr.lockDate) result.lock_date = sr.lockDate;
      return result;
    };

    if (action === 'create_virtual') {
      if (!ctx.input.userId || !ctx.input.displayName) {
        throw new Error('userId and displayName are required for create_virtual');
      }
      let result = await client.createVirtualCard({
        displayName: ctx.input.displayName,
        userId: ctx.input.userId,
        spendProgramId: ctx.input.spendProgramId,
        spendingRestrictions: buildSpendingRestrictions(),
        idempotencyKey
      });
      return {
        output: { result },
        message: `Created virtual card **${ctx.input.displayName}** for user ${ctx.input.userId}. Task ID: ${result.id}`
      };
    }

    if (action === 'create_physical') {
      if (!ctx.input.userId || !ctx.input.displayName || !ctx.input.fulfillment) {
        throw new Error(
          'userId, displayName, and fulfillment are required for create_physical'
        );
      }
      let fulfillment: Record<string, any> = {
        shipping_address: {
          address1: ctx.input.fulfillment.shippingAddress.address1,
          city: ctx.input.fulfillment.shippingAddress.city,
          state: ctx.input.fulfillment.shippingAddress.state,
          postal_code: ctx.input.fulfillment.shippingAddress.postalCode,
          country: ctx.input.fulfillment.shippingAddress.country,
          first_name: ctx.input.fulfillment.shippingAddress.firstName,
          last_name: ctx.input.fulfillment.shippingAddress.lastName
        }
      };
      let result = await client.createPhysicalCard({
        displayName: ctx.input.displayName,
        userId: ctx.input.userId,
        fulfillment,
        spendProgramId: ctx.input.spendProgramId,
        spendingRestrictions: buildSpendingRestrictions(),
        idempotencyKey
      });
      return {
        output: { result },
        message: `Created physical card **${ctx.input.displayName}** for user ${ctx.input.userId}. Task ID: ${result.id}`
      };
    }

    if (!ctx.input.cardId) {
      throw new Error(
        'cardId is required for update, suspend, unsuspend, and terminate actions'
      );
    }

    if (action === 'update') {
      let result = await client.updateCard(ctx.input.cardId, {
        displayName: ctx.input.displayName,
        userId: ctx.input.userId,
        spendingRestrictions: buildSpendingRestrictions()
      });
      return {
        output: { result },
        message: `Updated card **${ctx.input.cardId}**.`
      };
    }

    if (action === 'suspend') {
      let result = await client.suspendCard(ctx.input.cardId, idempotencyKey);
      return {
        output: { result },
        message: `Suspended card **${ctx.input.cardId}**.`
      };
    }

    if (action === 'unsuspend') {
      let result = await client.unsuspendCard(ctx.input.cardId, idempotencyKey);
      return {
        output: { result },
        message: `Unsuspended card **${ctx.input.cardId}**.`
      };
    }

    if (action === 'terminate') {
      let result = await client.terminateCard(ctx.input.cardId, idempotencyKey);
      return {
        output: { result },
        message: `Terminated card **${ctx.input.cardId}** permanently.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
