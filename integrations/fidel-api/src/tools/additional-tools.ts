import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { programIdInput } from '../lib/schemas';
import { spec } from '../spec';
import { locationSchema } from './manage-location';
import { webhookSchema } from './manage-webhook';

let rawSchema = z.record(z.string(), z.any());
let pageFields = {
  cursor: z
    .string()
    .optional()
    .describe('JSON.stringify(last) from the previous page. Do not URL-encode it.'),
  limit: z.number().optional().describe('Maximum number of results'),
  order: z.enum(['asc', 'desc']).optional().describe('Sort direction')
};
let pageSchema = z.object({
  items: z
    .array(rawSchema)
    .describe('Provider resources with their original IDs and properties'),
  count: z.number().optional().describe('Number of results reported by Fidel'),
  last: z.any().optional().describe('Provider continuation key'),
  raw: rawSchema.describe('Complete provider response')
});

export let getWebhook = SlateTool.create(spec, {
  key: 'get_webhook',
  name: 'Get Webhook',
  description:
    'Retrieve an account or program webhook by its ID, including its URL, event, and verification secret.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      webhookId: z.string().describe('Webhook ID from create_webhook or list_webhooks')
    })
  )
  .output(webhookSchema)
  .handleInvocation(async ctx => {
    let hook = await new Client({ token: ctx.auth.token }).getWebhook(ctx.input.webhookId);
    return {
      message: 'Retrieved webhook.',
      output: {
        webhookId: hook.id,
        event: hook.event,
        url: hook.url,
        programId: hook.programId ?? undefined,
        accountId: hook.accountId,
        live: hook.live,
        secretKey: hook.secretKey ?? undefined,
        created: hook.created,
        updated: hook.updated,
        raw: hook
      }
    };
  })
  .build();

export let updateLocation = SlateTool.create(spec, {
  key: 'update_location',
  name: 'Update Location',
  description:
    'Update a merchant location address, metadata, or known merchant IDs. Supply the complete address as required by Fidel.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      locationId: z.string().describe('Location ID from list_locations'),
      address: z.string().describe('Street address'),
      city: z.string().describe('City'),
      countryCode: z.string().describe('Three-letter country code'),
      postcode: z.string().describe('Postal code'),
      stateCode: z
        .string()
        .nullable()
        .optional()
        .describe('Two-letter US state code; null removes it'),
      metadata: rawSchema.optional().describe('Custom metadata'),
      searchBy: z
        .object({
          merchantIds: z
            .object({
              amex: z.array(z.string()).optional(),
              mastercard: z.array(z.string()).optional(),
              visa: z.array(z.string()).optional()
            })
            .optional()
        })
        .optional()
        .describe('Known merchant identifiers')
    })
  )
  .output(locationSchema)
  .handleInvocation(async ctx => {
    let { locationId, ...data } = ctx.input;
    let location = await new Client({ token: ctx.auth.token }).updateLocation(
      locationId,
      data
    );
    return {
      message: 'Location updated.',
      output: {
        locationId: location.id,
        brandId: location.brandId,
        programId: location.programId,
        accountId: location.accountId,
        address: location.address,
        city: location.city,
        countryCode: location.countryCode,
        postcode: location.postcode,
        live: location.live,
        status: location.status ?? undefined,
        geolocation: location.geolocation ?? undefined,
        created: location.created,
        updated: location.updated,
        metadata: location.metadata ?? undefined,
        raw: location
      }
    };
  })
  .build();

export let updateCardMetadata = SlateTool.create(spec, {
  key: 'update_card_metadata',
  name: 'Update Card Metadata',
  description:
    'Replace the metadata on an enrolled card. Send an empty object to clear its metadata.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      cardId: z.string().describe('Card ID from list_cards'),
      metadata: rawSchema.describe('Replacement metadata; {} clears it')
    })
  )
  .output(z.object({ cardId: z.string(), metadata: rawSchema.optional(), raw: rawSchema }))
  .handleInvocation(async ctx => {
    let item = await new Client({ token: ctx.auth.token }).updateCardMetadata(
      ctx.input.cardId,
      ctx.input.metadata
    );
    return {
      message: 'Card metadata replaced.',
      output: { cardId: ctx.input.cardId, metadata: item.metadata, raw: item }
    };
  })
  .build();

export let listCardsByMetadata = SlateTool.create(spec, {
  key: 'list_cards_by_metadata',
  name: 'List Cards by Metadata ID',
  description:
    'Find enrolled cards across programs using their metadata.id index, for customer reconciliation.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      metadataId: z.string().describe('The metadata.id assigned when cards were enrolled'),
      ...pageFields
    })
  )
  .output(pageSchema)
  .handleInvocation(async ctx => {
    let { metadataId, ...options } = ctx.input;
    let raw = await new Client({ token: ctx.auth.token }).list(
      `/cards/metadata/${encodeURIComponent(metadataId)}/`,
      options
    );
    return {
      message: 'Retrieved matching cards.',
      output: { items: raw.items, count: raw.count, last: raw.last, raw }
    };
  })
  .build();

export let deleteOffer = SlateTool.create(spec, {
  key: 'delete_offer',
  name: 'Delete Offer',
  description:
    'Delete a self-sourced offer created by a publisher. Marketplace and content-provider offers cannot be deleted.',
  tags: { readOnly: false, destructive: true }
})
  .input(z.object({ offerId: z.string().describe('Offer ID from list_offers') }))
  .output(z.object({ offerId: z.string(), deleted: z.boolean() }))
  .handleInvocation(async ctx => {
    await new Client({ token: ctx.auth.token }).deleteOffer(ctx.input.offerId);
    return {
      message: 'Offer deleted.',
      output: { offerId: ctx.input.offerId, deleted: true }
    };
  })
  .build();

export let listOfferLocations = SlateTool.create(spec, {
  key: 'list_offer_locations',
  name: 'List Offer Locations',
  description: 'List the merchant locations linked to an offer and their onboarding details.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({ offerId: z.string().describe('Offer ID from list_offers'), ...pageFields })
  )
  .output(pageSchema)
  .handleInvocation(async ctx => {
    let { offerId, ...options } = ctx.input;
    let raw = await new Client({ token: ctx.auth.token }).list(
      `/offers/${encodeURIComponent(offerId)}/locations`,
      options
    );
    return {
      message: 'Retrieved offer locations.',
      output: { items: raw.items, count: raw.count, last: raw.last, raw }
    };
  })
  .build();

export let listOfferCards = SlateTool.create(spec, {
  key: 'list_offer_cards',
  name: 'List Cards with Active Offer',
  description: 'List cards on which an offer is activated.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({ offerId: z.string().describe('Offer ID from list_offers'), ...pageFields })
  )
  .output(pageSchema)
  .handleInvocation(async ctx => {
    let { offerId, ...options } = ctx.input;
    let raw = await new Client({ token: ctx.auth.token }).list(
      `/offers/${encodeURIComponent(offerId)}/cards`,
      options
    );
    return {
      message: 'Retrieved cards with active offer.',
      output: { items: raw.items, count: raw.count, last: raw.last, raw }
    };
  })
  .build();

export let checkOfferCard = SlateTool.create(spec, {
  key: 'check_offer_card',
  name: 'Check Active Offer on Card',
  description: 'Check whether an offer is active on a card, without changing its activation.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      offerId: z.string().describe('Offer ID'),
      cardId: z.string().describe('Card ID')
    })
  )
  .output(
    z.object({
      exists: z.boolean(),
      count: z.number().optional(),
      items: z.array(rawSchema),
      raw: rawSchema
    })
  )
  .handleInvocation(async ctx => {
    let raw = await new Client({ token: ctx.auth.token }).checkOfferCard(
      ctx.input.offerId,
      ctx.input.cardId
    );
    return {
      message: 'Retrieved offer activation status.',
      output: { exists: raw.exists, count: raw.count, items: raw.items, raw }
    };
  })
  .build();

export let linkAllOfferLocations = SlateTool.create(spec, {
  key: 'link_all_offer_locations',
  name: 'Link All Brand Locations to Offer',
  description:
    'Request linking all locations of the offer brand in a program to the offer. Fidel processes this request asynchronously.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      offerId: z.string().describe('Offer ID'),
      programId: programIdInput
    })
  )
  .output(
    z.object({
      offerId: z.string(),
      programId: z.string(),
      accepted: z.boolean(),
      raw: rawSchema
    })
  )
  .handleInvocation(async ctx => {
    let raw = await new Client({ token: ctx.auth.token }).linkAllOfferLocations(
      ctx.input.offerId,
      ctx.input.programId
    );
    return {
      message: 'Offer location linking request accepted for asynchronous processing.',
      output: {
        offerId: ctx.input.offerId,
        programId: ctx.input.programId,
        accepted: true,
        raw
      }
    };
  })
  .build();

export let createMissingTransactionRequest = SlateTool.create(spec, {
  key: 'create_missing_transaction_request',
  name: 'Create Missing Transaction Request',
  description:
    'Ask the card network to investigate a missing transaction for a linked card at a known location.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      cardId: z.string().describe('Card ID from list_cards'),
      locationId: z.string().describe('Location ID from list_locations'),
      amount: z.number().describe('Transaction amount'),
      transactionDate: z.string().describe('Transaction date in YYYY-MM-DD format')
    })
  )
  .output(
    z.object({
      raw: rawSchema.describe(
        'Provider response containing request ID, status, and estimated completion date'
      )
    })
  )
  .handleInvocation(async ctx => {
    let { cardId, ...data } = ctx.input;
    let raw = await new Client({ token: ctx.auth.token }).createMissingTransactionRequest(
      cardId,
      data
    );
    return { message: 'Missing transaction investigation created.', output: { raw } };
  })
  .build();

export let getMissingTransactionRequest = SlateTool.create(spec, {
  key: 'get_missing_transaction_request',
  name: 'Get Missing Transaction Request',
  description: 'Retrieve a missing transaction investigation and any network result.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      requestId: z
        .string()
        .describe(
          'Investigation ID from create_missing_transaction_request or list_missing_transaction_requests'
        )
    })
  )
  .output(
    z.object({
      raw: rawSchema.describe(
        'Provider response containing the investigation status and result'
      )
    })
  )
  .handleInvocation(async ctx => {
    let raw = await new Client({ token: ctx.auth.token }).getMissingTransactionRequest(
      ctx.input.requestId
    );
    return { message: 'Retrieved missing transaction investigation.', output: { raw } };
  })
  .build();

export let listMissingTransactionRequests = SlateTool.create(spec, {
  key: 'list_missing_transaction_requests',
  name: 'List Missing Transaction Requests',
  description:
    'List missing transaction investigations in a program, optionally filtering by card, location, brand, or status.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      programId: programIdInput,
      cardId: z.string().optional(),
      locationId: z.string().optional(),
      brandId: z.string().optional(),
      status: z.string().optional(),
      scheme: z.string().optional(),
      amount: z.number().optional(),
      transactionDate: z.string().optional(),
      ...pageFields,
      cursor: z.string().optional().describe('Provider start token for continuation'),
      sort: z.enum(['created', 'updated']).optional().describe('Field to sort results by')
    })
  )
  .output(pageSchema)
  .handleInvocation(async ctx => {
    let { programId, ...options } = ctx.input;
    let raw = await new Client({ token: ctx.auth.token }).listMissingTransactionRequests(
      programId,
      options
    );
    return {
      message: 'Retrieved missing transaction investigations.',
      output: { items: raw.items, count: raw.count, last: raw.last, raw }
    };
  })
  .build();
