import { allOf, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, generateIdempotencyKey, requireSquareScopes } from '../lib/helpers';
import { spec } from '../spec';
import {
  cardBillingAddressInput,
  cardOutputSchema,
  mapCard,
  mapCardBillingAddressInput,
  type SquareCard
} from './cards-shared';

export let createCard = SlateTool.create(spec, {
  name: 'Create Card',
  key: 'create_card',
  description:
    'Save a tokenized card for a Square customer. Use a one-time card token or recent payment ID; call list_customers to discover the customer ID.',
  tags: { destructive: false }
})
  .scopes(allOf('PAYMENTS_WRITE'))
  .input(
    z.object({
      sourceId: z
        .string()
        .min(1)
        .max(16384)
        .describe(
          'One-time token from Square payment collection or a recent Square payment ID; never raw card data'
        ),
      customerId: z
        .string()
        .min(1)
        .describe('Customer ID; call list_customers to discover it'),
      cardholderName: z.string().max(96).optional(),
      billingAddress: cardBillingAddressInput.optional(),
      referenceId: z.string().max(128).optional(),
      verificationToken: z
        .string()
        .optional()
        .describe('Buyer verification token when required'),
      idempotencyKey: z
        .string()
        .min(1)
        .max(45)
        .optional()
        .describe(
          'Use the same key when retrying this exact card request; generated if omitted'
        )
    })
  )
  .output(cardOutputSchema)
  .handleInvocation(async ctx => {
    requireSquareScopes(ctx.auth, ['PAYMENTS_WRITE']);
    let response = await createClient(ctx.auth).request<{ card: SquareCard }>(
      'POST',
      '/cards',
      {
        body: {
          idempotency_key: ctx.input.idempotencyKey ?? generateIdempotencyKey(),
          source_id: ctx.input.sourceId,
          verification_token: ctx.input.verificationToken,
          card: {
            customer_id: ctx.input.customerId,
            cardholder_name: ctx.input.cardholderName,
            billing_address: ctx.input.billingAddress
              ? mapCardBillingAddressInput(ctx.input.billingAddress)
              : undefined,
            reference_id: ctx.input.referenceId
          }
        }
      }
    );
    let card = response.card;
    return {
      output: mapCard(card),
      message: `Card **${card.id}** saved for customer **${card.customer_id ?? ctx.input.customerId}**.`
    };
  })
  .build();
