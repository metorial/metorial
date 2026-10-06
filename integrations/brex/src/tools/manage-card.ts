import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapCard } from '../lib/schemas';
import {
  dateOnly,
  exact,
  fail,
  integerAmount,
  keyedMutation,
  required
} from '../lib/validation';
import { spec } from '../spec';

export let manageCard = SlateTool.create(spec, {
  name: 'Manage Card',
  key: 'manage_card',
  description: `Create a new virtual or physical card, or update an existing card's settings.
Supports creating cards with spend controls, updating spend limits, locking, unlocking, and terminating cards.
Use **action** to lock, unlock, or terminate a card. Omit **action** to create or update.`,
  instructions: [
    'To create a card, omit cardId and provide ownerUserId and cardType.',
    'To update spend controls, provide cardId along with spendLimit and/or spendDuration.',
    'To lock, unlock, or terminate a card, provide cardId and the desired action.',
    'Terminating a card is permanent and cannot be undone.'
  ],
  constraints: ['Physical cards require a mailing address for shipping.']
})
  .input(
    z.object({
      limitType: z
        .enum(['USER', 'CARD'])
        .optional()
        .describe(
          'USER uses the corporate user limit and no spend controls; CARD requires a virtual card and complete spend controls. Defaults to CARD when controls are supplied, otherwise USER.'
        ),
      idempotencyKey: z
        .string()
        .optional()
        .describe(
          'Stable creation key. Omission generates one key for this invocation; reuse a known key for ambiguous retries.'
        ),
      cardId: z
        .string()
        .optional()
        .describe('ID of existing card to update/lock/unlock/terminate. Omit to create.'),
      action: z
        .enum(['lock', 'unlock', 'terminate'])
        .optional()
        .describe('Action to perform on an existing card'),
      reason: z
        .string()
        .optional()
        .describe(
          'Required documented code for lock/terminate: CARD_DAMAGED, CARD_LOST, CARD_NOT_RECEIVED, DO_NOT_NEED_PHYSICAL_CARD, DO_NOT_NEED_VIRTUAL_CARD, FRAUD, OTHER.'
        ),
      ownerUserId: z
        .string()
        .optional()
        .describe('User ID of the card owner (required for creation)'),
      cardName: z.string().optional().describe('Display name for the card'),
      cardType: z
        .enum(['VIRTUAL', 'PHYSICAL'])
        .optional()
        .describe('Card type (required for creation)'),
      spendLimit: z
        .object({
          amount: z.number().describe('Limit amount in cents'),
          currency: z.string().optional().describe('Currency code (defaults to USD)')
        })
        .optional()
        .describe('Spend limit for the card'),
      spendDuration: z
        .enum(['MONTHLY', 'QUARTERLY', 'YEARLY', 'ONE_TIME', 'TRANSACTION'])
        .optional()
        .describe(
          'Duration period for the spend limit. The retained TRANSACTION value is unsupported by the current API and is rejected.'
        ),
      lockAfterDate: z
        .string()
        .optional()
        .describe('ISO 8601 date after which the card automatically locks'),
      mailingAddress: z
        .object({
          line1: z.string(),
          line2: z.string().optional(),
          city: z.string(),
          state: z.string().optional(),
          postalCode: z.string(),
          country: z.string().optional().describe('Two-letter country code')
        })
        .optional()
        .describe('Mailing address for physical cards')
    })
  )
  .output(
    z.object({
      cardId: z.string().describe('ID of the card'),
      status: z.string().nullish().describe('Current card status'),
      cardType: z.string().nullish().describe('Type of the card'),
      cardName: z.string().nullable().optional().describe('Display name of the card'),
      idempotencyKey: z
        .string()
        .optional()
        .describe('Creation key retained in receipt/error metadata for ambiguous retries.'),
      lastFour: z
        .string()
        .nullable()
        .optional()
        .describe('Last four digits of the card number')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.cardId !== undefined) required(ctx.input.cardId, 'cardId');
    if (ctx.input.action && !ctx.input.cardId) fail('cardId is required for a card action.');
    if (ctx.input.spendDuration === 'TRANSACTION')
      fail('TRANSACTION spendDuration is not supported by the current Brex card API.');
    dateOnly(ctx.input.lockAfterDate, 'lockAfterDate');
    const controls = {
      spend_limit: ctx.input.spendLimit ? integerAmount(ctx.input.spendLimit) : undefined,
      spend_duration: ctx.input.spendDuration,
      lock_after_date: ctx.input.lockAfterDate
    };
    const hasControls = Object.values(controls).some(v => v !== undefined);
    const client = new Client({ token: ctx.auth.token });
    let card: Awaited<ReturnType<Client['getCard']>>;
    let creationKey: string | undefined;
    if (ctx.input.action) {
      if (
        [
          ctx.input.cardName,
          ctx.input.cardType,
          ctx.input.ownerUserId,
          ctx.input.limitType,
          ctx.input.spendLimit,
          ctx.input.spendDuration,
          ctx.input.lockAfterDate,
          ctx.input.mailingAddress
        ].some(v => v !== undefined)
      )
        fail('Card lifecycle actions cannot be combined with creation or update fields.');
      const reasons = [
        'CARD_DAMAGED',
        'CARD_LOST',
        'CARD_NOT_RECEIVED',
        'DO_NOT_NEED_PHYSICAL_CARD',
        'DO_NOT_NEED_VIRTUAL_CARD',
        'FRAUD',
        'OTHER'
      ];
      if (
        ctx.input.action !== 'unlock' &&
        !reasons.includes(required(ctx.input.reason, 'reason'))
      )
        fail('reason must be a documented card-change code.');
      if (ctx.input.action === 'unlock' && ctx.input.reason !== undefined)
        fail('unlock does not accept reason.');
      card =
        ctx.input.action === 'lock'
          ? await client.lockCard(ctx.input.cardId!, ctx.input.reason!)
          : ctx.input.action === 'terminate'
            ? await client.terminateCard(ctx.input.cardId!, ctx.input.reason!)
            : await client.unlockCard(ctx.input.cardId!);
    } else if (ctx.input.cardId) {
      if (
        [
          ctx.input.cardName,
          ctx.input.cardType,
          ctx.input.ownerUserId,
          ctx.input.limitType,
          ctx.input.mailingAddress,
          ctx.input.reason
        ].some(v => v !== undefined)
      )
        fail(
          'The current card update API supports spend controls only; omit creation and lifecycle fields.'
        );
      if (!hasControls) fail('Provide spend controls to update.');
      const current = await client.getCard(ctx.input.cardId);
      if (current.limit_type !== 'CARD')
        fail('Spend controls can be updated only on CARD limit-type vendor cards.');
      card = await client.updateCard(
        ctx.input.cardId,
        { spend_controls: controls },
        ctx.input.idempotencyKey
      );
    } else {
      if (ctx.input.reason !== undefined)
        fail('reason applies only to lock/terminate actions.');
      const limitType = ctx.input.limitType ?? (hasControls ? 'CARD' : 'USER');
      required(ctx.input.cardType, 'cardType');
      required(ctx.input.cardName, 'cardName');
      required(ctx.input.ownerUserId, 'ownerUserId');
      if (
        limitType === 'CARD' &&
        (ctx.input.cardType !== 'VIRTUAL' || !ctx.input.spendLimit || !ctx.input.spendDuration)
      )
        fail('CARD limit type requires a VIRTUAL card, spendLimit and spendDuration.');
      if (limitType === 'USER' && hasControls)
        fail('USER limit type must not include spend controls.');
      if (ctx.input.cardType === 'PHYSICAL' && !ctx.input.mailingAddress)
        fail('Physical cards require mailingAddress.');
      if (ctx.input.cardType !== 'PHYSICAL' && ctx.input.mailingAddress)
        fail('mailingAddress applies only to physical cards.');
      const a = ctx.input.mailingAddress;
      if (a && (a.line1.length >= 60 || (a.line2?.length ?? 0) >= 60))
        fail('The first two mailing-address lines must each be shorter than 60 characters.');
      const receipt = await keyedMutation(
        ctx.input.idempotencyKey,
        [ctx.auth.token, ctx.auth.refreshToken],
        key =>
          client.createCard(
            {
              owner: { type: 'USER', user_id: ctx.input.ownerUserId },
              card_name: ctx.input.cardName,
              card_type: ctx.input.cardType,
              limit_type: limitType,
              spend_controls: limitType === 'CARD' ? controls : null,
              mailing_address: a
                ? {
                    line1: a.line1,
                    line2: a.line2,
                    city: a.city,
                    state: a.state,
                    postal_code: a.postalCode,
                    country: a.country ?? 'US'
                  }
                : undefined
            },
            key
          )
      );
      card = receipt.value;
      creationKey = receipt.idempotencyKey;
    }
    if (ctx.input.cardId) exact(card.id, ctx.input.cardId);
    return {
      output: { ...mapCard(card), idempotencyKey: creationKey },
      message:
        'Card operation completed. Locking or terminating a card notifies its owner; termination is permanent.'
    };
  })
  .build();
