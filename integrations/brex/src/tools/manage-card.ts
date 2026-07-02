import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
  constraints: [
    'Each user can have up to 10 active physical cards.',
    'Physical cards require a mailing address for shipping.'
  ]
})
  .input(
    z.object({
      cardId: z
        .string()
        .optional()
        .describe('ID of existing card to update/lock/unlock/terminate. Omit to create.'),
      action: z
        .enum(['lock', 'unlock', 'terminate'])
        .optional()
        .describe('Action to perform on an existing card'),
      reason: z.string().optional().describe('Reason for locking or terminating the card'),
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
        .describe('Duration period for the spend limit'),
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
      status: z.string().describe('Current card status'),
      cardType: z.string().optional().describe('Type of the card'),
      cardName: z.string().nullable().optional().describe('Display name of the card'),
      lastFour: z
        .string()
        .nullable()
        .optional()
        .describe('Last four digits of the card number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let card: any;
    let actionMsg: string;

    if (ctx.input.cardId && ctx.input.action) {
      // Perform action on existing card
      switch (ctx.input.action) {
        case 'lock':
          card = await client.lockCard(ctx.input.cardId, ctx.input.reason);
          actionMsg = 'locked';
          break;
        case 'unlock':
          card = await client.unlockCard(ctx.input.cardId);
          actionMsg = 'unlocked';
          break;
        case 'terminate':
          card = await client.terminateCard(ctx.input.cardId, ctx.input.reason);
          actionMsg = 'terminated';
          break;
      }
    } else if (ctx.input.cardId) {
      // Update existing card
      let updateData: Record<string, any> = {};
      if (ctx.input.cardName !== undefined) updateData.card_name = ctx.input.cardName;

      let spendControls: Record<string, any> = {};
      if (ctx.input.spendLimit) {
        spendControls.spend_limit = {
          amount: ctx.input.spendLimit.amount,
          currency: ctx.input.spendLimit.currency ?? 'USD'
        };
      }
      if (ctx.input.spendDuration) spendControls.spend_duration = ctx.input.spendDuration;
      if (ctx.input.lockAfterDate) spendControls.lock_after_date = ctx.input.lockAfterDate;

      if (Object.keys(spendControls).length > 0) {
        updateData.spend_controls = spendControls;
      }

      card = await client.updateCard(ctx.input.cardId, updateData);
      actionMsg = 'updated';
    } else {
      // Create new card
      let cardData: Record<string, any> = {
        owner: {
          type: 'USER',
          user_id: ctx.input.ownerUserId
        },
        card_name: ctx.input.cardName,
        card_type: ctx.input.cardType
      };

      if (ctx.input.spendLimit || ctx.input.spendDuration) {
        cardData.spend_controls = {
          spend_limit: ctx.input.spendLimit
            ? {
                amount: ctx.input.spendLimit.amount,
                currency: ctx.input.spendLimit.currency ?? 'USD'
              }
            : undefined,
          spend_duration: ctx.input.spendDuration,
          lock_after_date: ctx.input.lockAfterDate
        };
      }

      if (ctx.input.mailingAddress && ctx.input.cardType === 'PHYSICAL') {
        cardData.mailing_address = {
          line1: ctx.input.mailingAddress.line1,
          line2: ctx.input.mailingAddress.line2,
          city: ctx.input.mailingAddress.city,
          state: ctx.input.mailingAddress.state,
          postal_code: ctx.input.mailingAddress.postalCode,
          country: ctx.input.mailingAddress.country ?? 'US'
        };
      }

      card = await client.createCard(cardData);
      actionMsg = 'created';
    }

    return {
      output: {
        cardId: card.id,
        status: card.status,
        cardType: card.card_type,
        cardName: card.card_name,
        lastFour: card.last_four
      },
      message: `Card **${card.card_name || card.id}** successfully ${actionMsg}.`
    };
  })
  .build();
