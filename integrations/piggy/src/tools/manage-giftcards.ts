import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapEntity, requiredString } from '../lib/response';
import { spec } from '../spec';

let giftcardSchema = z
  .object({
    giftcardUuid: z.string().optional().describe('UUID of the gift card'),
    hash: z.string().optional().describe('Gift card hash/QR code'),
    balanceInCents: z.number().optional().describe('Current balance in cents'),
    active: z.boolean().optional().describe('Whether the gift card is active'),
    type: z.string().optional().describe('Gift card type (physical or digital)'),
    programUuid: z.string().optional().describe('UUID of the gift card program'),
    createdAt: z.string().optional().describe('Creation timestamp')
  })
  .passthrough();

let mapGiftcard = (g: Record<string, any>) =>
  mapEntity(g, {
    giftcardUuid: requiredString(g.uuid, 'gift card UUID'),
    hash: g.hash,
    balanceInCents: g.amount_in_cents ?? g.balance_in_cents,
    active: g.active,
    type: typeof g.type === 'string' ? g.type : undefined,
    programUuid: g.giftcard_program?.uuid,
    createdAt: g.created_at
  });

export let manageGiftcards = SlateTool.create(spec, {
  name: 'Manage Gift Cards',
  key: 'manage_giftcards',
  description: `Create, list, get, and find gift cards. Also supports creating transactions (adding/deducting balance) on gift cards. Gift cards are anonymous and not linked to contacts.`,
  instructions: [
    'Use action "create" to generate a new digital gift card in a program.',
    'Use action "findByHash" to look up a gift card by its hash/QR code.',
    'Use action "transact" to add or deduct balance from a gift card. Use positive amountInCents to add funds, negative to deduct.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'findByHash', 'create', 'transact'])
        .describe('Action to perform'),
      giftcardUuid: z
        .string()
        .optional()
        .describe('Gift card UUID (required for get and transact)'),
      hash: z.string().optional().describe('Gift card hash (required for findByHash)'),
      giftcardProgramUuid: z
        .string()
        .optional()
        .describe('Program UUID (required for create, optional filter for list)'),
      amountInCents: z
        .number()
        .optional()
        .describe(
          'Transaction amount in cents, positive=add, negative=deduct (required for transact)'
        ),
      shopUuid: z
        .string()
        .optional()
        .describe('Shop UUID from list_shops (required for transact)'),
      limit: z.number().optional().describe('Items per page for list'),
      page: z.number().optional().describe('Page number for list')
    })
  )
  .output(
    z.object({
      raw: z.record(z.string(), z.any()).optional().describe('Original provider response'),
      giftcard: giftcardSchema.optional().describe('Single gift card result'),
      giftcards: z.array(giftcardSchema).optional().describe('List of gift cards'),
      transactionUuid: z
        .string()
        .optional()
        .describe('UUID of the gift card transaction (for transact action)'),
      newBalanceInCents: z.number().optional().describe('New balance after transaction'),
      totalCount: z.number().optional().describe('Total count for list')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action } = ctx.input;

    if (action === 'list') {
      let result = await client.listGiftcards({
        giftcardProgramUuid: ctx.input.giftcardProgramUuid,
        limit: ctx.input.limit,
        page: ctx.input.page
      });
      let giftcards = result.data.map(mapGiftcard);
      return {
        output: { giftcards, totalCount: result.meta?.total },
        message: `Retrieved **${giftcards.length}** gift card(s).`
      };
    }

    if (action === 'get') {
      if (!ctx.input.giftcardUuid)
        throw createApiServiceError('giftcardUuid is required for get');
      let result = await client.getGiftcard(ctx.input.giftcardUuid);
      let g = result.data;
      return {
        output: {
          giftcard: mapGiftcard(g)
        },
        message: `Retrieved gift card **${g.uuid}** (balance: ${g.amount_in_cents ?? g.balance_in_cents} cents).`
      };
    }

    if (action === 'findByHash') {
      if (!ctx.input.hash) throw createApiServiceError('hash is required for findByHash');
      let result = await client.findGiftcardByHash(ctx.input.hash);
      let g = result.data;
      return {
        output: {
          giftcard: mapGiftcard(g)
        },
        message: `Found gift card by hash (balance: ${g.amount_in_cents ?? g.balance_in_cents} cents).`
      };
    }

    if (action === 'create') {
      if (!ctx.input.giftcardProgramUuid)
        throw createApiServiceError('giftcardProgramUuid is required for create');
      let result = await client.createGiftcard({
        giftcardProgramUuid: ctx.input.giftcardProgramUuid
      });
      let g = result.data;
      return {
        output: {
          giftcard: mapGiftcard(g)
        },
        message: `Created digital gift card **${g.uuid}**.`
      };
    }

    // transact
    if (!ctx.input.giftcardUuid)
      throw createApiServiceError('giftcardUuid is required for transact');
    if (ctx.input.amountInCents === undefined)
      throw createApiServiceError('amountInCents is required for transact');
    let shopUuid = ctx.input.shopUuid || ctx.config.shopUuid;
    if (!shopUuid) throw createApiServiceError('shopUuid is required for transact');

    let result = await client.createGiftcardTransaction({
      giftcardUuid: ctx.input.giftcardUuid,
      amountInCents: ctx.input.amountInCents,
      shopUuid
    });
    let t = result.data;
    return {
      output: {
        raw: t,
        transactionUuid: requiredString(t.uuid, 'gift card transaction UUID'),
        newBalanceInCents:
          t.giftcard?.amount_in_cents ?? t.giftcard?.balance_in_cents ?? undefined,
        giftcard: {
          giftcardUuid: requiredString(t.card?.uuid ?? t.giftcard?.uuid, 'gift card UUID'),
          balanceInCents:
            t.giftcard?.amount_in_cents ?? t.giftcard?.balance_in_cents ?? undefined,
          raw: t.card ?? t.giftcard
        }
      },
      message: `Gift card transaction of **${ctx.input.amountInCents}** cents on ${ctx.input.giftcardUuid}.`
    };
  })
  .build();
