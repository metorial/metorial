import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { programIdInput } from '../lib/schemas';
import { spec } from '../spec';

export let cardSchema = z.object({
  raw: z.record(z.string(), z.any()).optional().describe('Complete provider resource'),
  cardId: z.string().describe('Unique identifier (token) for the enrolled card'),
  programId: z.string().optional().describe('ID of the program the card is enrolled in'),
  accountId: z.string().optional().describe('Account ID'),
  scheme: z.string().optional().describe('Card network scheme (visa, mastercard, amex)'),
  lastNumbers: z.string().optional().describe('Last four digits of the card number'),
  firstNumbers: z.string().optional().describe('First six digits of the card number (BIN)'),
  expMonth: z.number().optional().describe('Card expiration month'),
  expYear: z.number().optional().describe('Card expiration year'),
  expDate: z.string().optional().describe('Card expiration date string'),
  countryCode: z.string().optional().describe('Country code of the card'),
  live: z.boolean().optional().describe('Whether the card is in live mode'),
  type: z.string().optional().describe('Card type (e.g., visa, mastercard, amex)'),
  created: z.string().optional().describe('ISO 8601 date when the card was enrolled'),
  updated: z.string().optional().describe('ISO 8601 date when the card was last updated'),
  metadata: z
    .record(z.string(), z.any())
    .optional()
    .describe('Custom metadata attached to the card')
});

export let enrollCard = SlateTool.create(spec, {
  name: 'Enroll Card',
  key: 'enroll_card',
  description: `Enrolls a payment card in a Fidel API Program. The card is verified with the associated card network and a token is created to represent it. Requires PCI compliance for direct API enrollment.`,
  instructions: [
    'Direct live API enrollment requires PCI compliance and an SDK/public key configured on the connection. Use Fidel SDKs for applications without PCI compliance.',
    'A card can only be enrolled once per program. Visa cards have a limit of 5 active enrollments across all programs.'
  ],
  constraints: [
    'Visa cards can only be enrolled in up to 5 programs simultaneously.',
    'A single card can only be enrolled once within a single program.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      programId: programIdInput,
      number: z.string().describe('Full card number (PAN)'),
      expMonth: z.number().describe('Card expiration month (1-12)'),
      expYear: z.number().describe('Card expiration year (e.g., 2025)'),
      countryCode: z.string().describe('ISO 3166-1 alpha-3 country code of the cardholder'),
      termsOfUse: z
        .boolean()
        .optional()
        .describe('Whether the cardholder accepted terms of use'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Custom metadata to associate with the card (e.g., your own user identifiers)'
        )
    })
  )
  .output(cardSchema)
  .handleInvocation(async ctx => {
    if (ctx.input.termsOfUse !== true)
      throw createApiServiceError(
        'Card enrollment requires explicit cardholder consent: set termsOfUse to true after acceptance.'
      );
    let sdkKey =
      ctx.auth.sdkKey ?? (ctx.auth.token.startsWith('pk_') ? ctx.auth.token : undefined);
    if (!sdkKey)
      throw createApiServiceError(
        'Configure an SDK/public key in this connection to enroll cards.'
      );
    let client = new Client({ token: sdkKey });
    let card = await client.enrollCard(ctx.input.programId, {
      number: ctx.input.number,
      expMonth: ctx.input.expMonth,
      expYear: ctx.input.expYear,
      countryCode: ctx.input.countryCode,
      termsOfUse: ctx.input.termsOfUse,
      metadata: ctx.input.metadata
    });

    return {
      output: {
        raw: card,
        cardId: card.id,
        programId: card.programId ?? undefined,
        accountId: card.accountId ?? undefined,
        scheme: card.scheme,
        lastNumbers: card.lastNumbers,
        firstNumbers: card.firstNumbers,
        expMonth: card.expMonth,
        expYear: card.expYear,
        expDate: card.expDate,
        countryCode: card.countryCode,
        live: card.live,
        type: card.type,
        created: card.created,
        updated: card.updated,
        metadata: card.metadata ?? undefined
      },
      message: `Card ending in **${card.lastNumbers}** enrolled in program \`${card.programId}\` with ID \`${card.id}\`.`
    };
  })
  .build();

export let getCard = SlateTool.create(spec, {
  name: 'Get Card',
  key: 'get_card',
  description: `Retrieves details of a specific enrolled card by its ID. Returns the card's token, scheme, last digits, and metadata.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      cardId: z.string().describe('ID (token) of the card to retrieve'),
      programId: programIdInput
    })
  )
  .output(cardSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let card = await client.getCard(ctx.input.cardId, ctx.input.programId);

    return {
      output: {
        raw: card,
        cardId: card.id,
        programId: card.programId ?? undefined,
        accountId: card.accountId ?? undefined,
        scheme: card.scheme,
        lastNumbers: card.lastNumbers,
        firstNumbers: card.firstNumbers,
        expMonth: card.expMonth,
        expYear: card.expYear,
        expDate: card.expDate,
        countryCode: card.countryCode,
        live: card.live,
        type: card.type,
        created: card.created,
        updated: card.updated,
        metadata: card.metadata ?? undefined
      },
      message: `Retrieved card ending in **${card.lastNumbers}** (\`${card.id}\`).`
    };
  })
  .build();

export let listCards = SlateTool.create(spec, {
  name: 'List Cards',
  key: 'list_cards',
  description: `Lists all enrolled cards in a specific Program. Returns card tokens, schemes, and metadata for each enrolled card.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      programId: programIdInput,
      cursor: z
        .string()
        .optional()
        .describe('JSON.stringify(last) from the previous page. Do not URL-encode it.'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort by creation date'),
      start: z.number().optional().describe('Offset for pagination'),
      limit: z.number().optional().describe('Maximum number of cards to return')
    })
  )
  .output(
    z.object({
      cards: z.array(cardSchema).describe('List of enrolled cards'),
      last: z
        .any()
        .optional()
        .describe('Provider continuation key; serialize it as JSON for cursor'),
      raw: z.record(z.string(), z.any()).optional().describe('Complete provider response'),
      count: z.number().optional().describe('Number of returned cards')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.listCards(ctx.input.programId, {
      start: ctx.input.start,
      cursor: ctx.input.cursor,
      order: ctx.input.order,
      limit: ctx.input.limit
    });

    let items = data?.items ?? [];
    let cards = items.map((c: any) => ({
      raw: c,
      cardId: c.id,
      programId: c.programId ?? undefined,
      accountId: c.accountId ?? undefined,
      scheme: c.scheme,
      lastNumbers: c.lastNumbers,
      firstNumbers: c.firstNumbers,
      expMonth: c.expMonth,
      expYear: c.expYear,
      expDate: c.expDate,
      countryCode: c.countryCode,
      live: c.live,
      type: c.type,
      created: c.created,
      updated: c.updated,
      metadata: c.metadata ?? undefined
    }));

    return {
      output: {
        cards,
        count: data?.count,
        last: data?.last,
        raw: data.rawResponse ?? data
      },
      message: `Found **${cards.length}** card(s) in program \`${ctx.input.programId}\`.`
    };
  })
  .build();

export let deleteCard = SlateTool.create(spec, {
  name: 'Delete Card',
  key: 'delete_card',
  description: `Unlinks and deletes an enrolled card from a Program. The card network will stop sending transactions for this card. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      cardId: z.string().describe('ID (token) of the card to delete'),
      programId: programIdInput
    })
  )
  .output(
    z.object({
      cardId: z.string().describe('ID of the deleted card'),
      deleted: z.boolean().describe('Whether the card was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteCard(ctx.input.cardId, ctx.input.programId);

    return {
      output: {
        cardId: ctx.input.cardId,
        deleted: true
      },
      message: `Card \`${ctx.input.cardId}\` deleted from program \`${ctx.input.programId}\`.`
    };
  })
  .build();
