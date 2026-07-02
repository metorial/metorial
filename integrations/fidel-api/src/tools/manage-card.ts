import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let cardSchema = z.object({
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
    'Direct API card enrollment requires PCI compliance. For non-PCI-compliant applications, use the Fidel SDKs instead.',
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
      programId: z.string().describe('ID of the program to enroll the card in'),
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
    let client = new Client({ token: ctx.auth.token });
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
        cardId: card.id,
        programId: card.programId,
        accountId: card.accountId,
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
        metadata: card.metadata
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
      programId: z.string().describe('ID of the program the card is enrolled in')
    })
  )
  .output(cardSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let card = await client.getCard(ctx.input.cardId, ctx.input.programId);

    return {
      output: {
        cardId: card.id,
        programId: card.programId,
        accountId: card.accountId,
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
        metadata: card.metadata
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
      programId: z.string().describe('ID of the program to list cards for'),
      start: z.number().optional().describe('Offset for pagination'),
      limit: z.number().optional().describe('Maximum number of cards to return')
    })
  )
  .output(
    z.object({
      cards: z.array(cardSchema).describe('List of enrolled cards'),
      count: z.number().optional().describe('Total number of cards')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.listCards(ctx.input.programId, {
      start: ctx.input.start,
      limit: ctx.input.limit
    });

    let items = data?.items ?? [];
    let cards = items.map((c: any) => ({
      cardId: c.id,
      programId: c.programId,
      accountId: c.accountId,
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
      metadata: c.metadata
    }));

    return {
      output: {
        cards,
        count: data?.resource?.total ?? cards.length
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
      programId: z.string().describe('ID of the program the card is enrolled in')
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
