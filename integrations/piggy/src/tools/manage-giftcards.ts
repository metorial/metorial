import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      shopUuid: z.string().optional().describe('Shop UUID (required for transact)'),
      limit: z.number().optional().describe('Items per page for list'),
      page: z.number().optional().describe('Page number for list')
    })
  )
  .output(
    z.object({
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
      let giftcards = (result.data || []).map((g: any) => ({
        giftcardUuid: g.uuid,
        hash: g.hash,
        balanceInCents: g.balance_in_cents,
        active: g.active,
        type: g.type === 0 ? 'physical' : 'digital',
        programUuid: g.giftcard_program?.uuid,
        createdAt: g.created_at,
        ...g
      }));
      return {
        output: { giftcards, totalCount: result.meta?.total },
        message: `Retrieved **${giftcards.length}** gift card(s).`
      };
    }

    if (action === 'get') {
      if (!ctx.input.giftcardUuid) throw new Error('giftcardUuid is required for get');
      let result = await client.getGiftcard(ctx.input.giftcardUuid);
      let g = result.data || result;
      return {
        output: {
          giftcard: {
            giftcardUuid: g.uuid,
            hash: g.hash,
            balanceInCents: g.balance_in_cents,
            active: g.active,
            ...g
          }
        },
        message: `Retrieved gift card **${g.uuid}** (balance: ${g.balance_in_cents} cents).`
      };
    }

    if (action === 'findByHash') {
      if (!ctx.input.hash) throw new Error('hash is required for findByHash');
      let result = await client.findGiftcardByHash(ctx.input.hash);
      let g = result.data || result;
      return {
        output: {
          giftcard: {
            giftcardUuid: g.uuid,
            hash: g.hash,
            balanceInCents: g.balance_in_cents,
            active: g.active,
            ...g
          }
        },
        message: `Found gift card by hash (balance: ${g.balance_in_cents} cents).`
      };
    }

    if (action === 'create') {
      if (!ctx.input.giftcardProgramUuid)
        throw new Error('giftcardProgramUuid is required for create');
      let result = await client.createGiftcard({
        giftcardProgramUuid: ctx.input.giftcardProgramUuid
      });
      let g = result.data || result;
      return {
        output: {
          giftcard: {
            giftcardUuid: g.uuid,
            hash: g.hash,
            balanceInCents: g.balance_in_cents,
            active: g.active,
            ...g
          }
        },
        message: `Created digital gift card **${g.uuid}**.`
      };
    }

    // transact
    if (!ctx.input.giftcardUuid) throw new Error('giftcardUuid is required for transact');
    if (ctx.input.amountInCents === undefined)
      throw new Error('amountInCents is required for transact');
    let shopUuid = ctx.input.shopUuid || ctx.config.shopUuid;
    if (!shopUuid) throw new Error('shopUuid is required for transact');

    let result = await client.createGiftcardTransaction({
      giftcardUuid: ctx.input.giftcardUuid,
      amountInCents: ctx.input.amountInCents,
      shopUuid
    });
    let t = result.data || result;
    return {
      output: {
        transactionUuid: t.uuid,
        newBalanceInCents: t.giftcard?.balance_in_cents,
        giftcard: {
          giftcardUuid: ctx.input.giftcardUuid,
          balanceInCents: t.giftcard?.balance_in_cents,
          ...t.giftcard
        }
      },
      message: `Gift card transaction of **${ctx.input.amountInCents}** cents on ${ctx.input.giftcardUuid}. New balance: ${t.giftcard?.balance_in_cents} cents.`
    };
  })
  .build();
