import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import {
  date,
  id,
  integerAmount,
  invalid,
  nonemptyPatch,
  recordSchema,
  required,
  taskReceipt,
  unsupported
} from '../lib/validation';
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
    'Legacy mutations return deferred receipts; completion is not proven by a task ID. Current physical card operations are synchronous.',
    'Current physical creation supports shippingAddress, userId, fundId and routing; omit displayName, spendingRestrictions, spendProgramId and idempotencyKey.',
    'Legacy route availability and task lookup are not verified in the current public reference. Choose current for documented physical-card operations.',
    "Spending restriction amounts use the currency's minor units. No currency conversion is performed."
  ]
})
  .input(
    z.object({
      apiVersion: z
        .enum(['legacy', 'current'])
        .optional()
        .describe(
          'Defaults to legacy for compatibility. Current physical-card actions use the synchronous physical Cards API. Current virtual cards are issued through funds.'
        ),
      fundId: z
        .string()
        .nullable()
        .optional()
        .describe(
          'Current physical card fund association; null removes the association on update.'
        ),
      automaticRoutingEnabled: z
        .boolean()
        .optional()
        .describe('Current physical card routing. True cannot be combined with a fund ID.'),
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
              state: z
                .string()
                .optional()
                .describe('State/Province; required for legacy fulfillment.'),
              postalCode: z.string().describe('Postal/ZIP code'),
              country: z.string().describe('Country code'),
              firstName: z
                .string()
                .optional()
                .describe(
                  'Recipient first name for legacy physical-card fulfillment; omitted from current API requests.'
                ),
              lastName: z
                .string()
                .optional()
                .describe(
                  'Recipient last name for legacy physical-card fulfillment; omitted from current API requests.'
                )
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
      result: recordSchema.describe(
        'Card, deferred task receipt, or empty-success acknowledgment'
      ),
      taskId: z
        .string()
        .optional()
        .describe('Legacy deferred task receipt identifier; not a card identifier.')
    })
  )
  .handleInvocation(async ctx => {
    let client = clientFor(ctx);
    let input = ctx.input;
    let action = input.action;
    let address = (current = false) => {
      if (!input.fulfillment)
        throw invalid('fulfillment is required for physical card creation.');
      let a = input.fulfillment.shippingAddress;
      return {
        address1: required(a.address1, 'address1'),
        city: required(a.city, 'city'),
        state: current && a.state === undefined ? undefined : required(a.state, 'state'),
        postal_code: required(a.postalCode, 'postalCode'),
        country: required(a.country, 'country'),
        ...(current
          ? {}
          : {
              first_name: required(a.firstName, 'firstName'),
              last_name: required(a.lastName, 'lastName')
            })
      };
    };
    if (input.apiVersion === 'current') {
      if (action === 'create_virtual')
        throw invalid(
          'Current virtual cards are issued by creating a fund. Use manage_limit with resource=fund and permittedSpendTypes.virtualCard=true.'
        );
      unsupported(
        input,
        ['spendProgramId', 'spendingRestrictions', 'idempotencyKey'],
        'Current physical Cards API'
      );
      if (input.automaticRoutingEnabled !== undefined && input.fundId !== undefined)
        throw invalid(
          'automaticRoutingEnabled and fundId cannot be supplied together. Choose routing or a fund association.'
        );
      let body: Record<string, unknown> = {
        automatic_routing_enabled: input.automaticRoutingEnabled,
        fund_id: input.fundId
      };
      let result: Record<string, unknown>;
      if (action === 'create_physical') {
        unsupported(input, ['displayName', 'cardId'], 'Current physical card creation');
        result = await client.request('POST', '/cards/physical', {
          ...body,
          user_id: required(input.userId, 'userId'),
          shipping_address: address(true)
        });
      } else {
        let path = `/cards/physical/${id(input.cardId, 'cardId')}`;
        unsupported(input, ['userId', 'fulfillment'], 'Current physical card mutation');
        if (action === 'update') {
          body.display_name = input.displayName;
          nonemptyPatch(body);
          if (input.displayName !== undefined) required(input.displayName, 'displayName');
          result = await client.request('PATCH', path, body);
        } else {
          unsupported(
            input,
            ['displayName', 'fundId', 'automaticRoutingEnabled'],
            'Current physical card lifecycle'
          );
          result = await client.request(
            action === 'suspend' ? 'POST' : 'DELETE',
            action === 'terminate' ? path : `${path}/suspension`,
            undefined,
            undefined,
            undefined,
            action === 'terminate'
          );
        }
      }
      return {
        output: { result },
        message:
          action === 'terminate'
            ? 'Ramp acknowledged permanent card termination. Read the card to confirm its state.'
            : 'Ramp accepted the physical card operation. Read the card to confirm its state.'
      };
    }
    unsupported(input, ['fundId', 'automaticRoutingEnabled'], 'Legacy Cards API');
    let key =
      input.idempotencyKey === undefined
        ? crypto.randomUUID()
        : required(input.idempotencyKey, 'idempotencyKey');
    let sr = input.spendingRestrictions;
    let restrictions: Record<string, unknown> | undefined;
    if (sr) {
      integerAmount(sr.amount);
      if (sr.amount !== undefined || sr.currencyCode !== undefined)
        restrictions = { limit: { amount: sr.amount, currency_code: sr.currencyCode } };
      else restrictions = {};
      if (sr.interval !== undefined) restrictions.interval = required(sr.interval, 'interval');
      if (sr.allowedCategories !== undefined)
        restrictions.allowed_categories = sr.allowedCategories;
      if (sr.blockedCategories !== undefined)
        restrictions.blocked_categories = sr.blockedCategories;
      if (sr.lockDate !== undefined)
        restrictions.lock_date = date(sr.lockDate, 'lockDate', true);
      nonemptyPatch(restrictions);
    }
    let result: Record<string, unknown>;
    if (action === 'create_virtual' || action === 'create_physical') {
      unsupported(input, ['cardId'], 'Legacy card creation');
      if (action === 'create_virtual')
        unsupported(input, ['fulfillment'], 'Legacy virtual card creation');
      let data = {
        displayName: required(input.displayName, 'displayName'),
        userId: required(input.userId, 'userId'),
        spendProgramId: input.spendProgramId,
        spendingRestrictions: restrictions,
        idempotencyKey: key
      };
      result =
        action === 'create_virtual'
          ? await client.createVirtualCard(data)
          : await client.createPhysicalCard({
              ...data,
              fulfillment: { shipping_address: address() }
            });
    } else {
      let cardId = required(input.cardId, 'cardId');
      if (action === 'update') {
        unsupported(
          input,
          ['spendProgramId', 'fulfillment', 'idempotencyKey'],
          'Legacy card update'
        );
        let data = {
          displayName: input.displayName,
          userId: input.userId,
          spendingRestrictions: restrictions
        };
        nonemptyPatch(data);
        result = await client.updateCard(cardId, data);
        return {
          output: { result },
          message: 'Ramp accepted the legacy card update. Read the card to confirm its state.'
        };
      }
      unsupported(
        input,
        ['displayName', 'userId', 'spendProgramId', 'spendingRestrictions', 'fulfillment'],
        'Legacy card lifecycle'
      );
      result =
        action === 'suspend'
          ? await client.suspendCard(cardId, key)
          : action === 'unsuspend'
            ? await client.unsuspendCard(cardId, key)
            : await client.terminateCard(cardId, key);
    }
    let taskId = taskReceipt(result);
    return {
      output: { result, taskId },
      message:
        'Submitted the legacy card request. A deferred receipt does not prove card creation or a completed transition.'
    };
  })
  .build();
