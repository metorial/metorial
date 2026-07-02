import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let offerSchema = z.object({
  offerId: z.string().describe('Unique identifier of the offer'),
  programId: z.string().optional().describe('ID of the program'),
  brandId: z.string().optional().describe('ID of the brand'),
  accountId: z.string().optional().describe('Account ID'),
  name: z.string().optional().describe('Name of the offer'),
  countryCode: z.string().optional().describe('Country code where the offer is valid'),
  live: z.boolean().optional().describe('Whether the offer is in live mode'),
  status: z.string().optional().describe('Current status of the offer'),
  offerType: z
    .string()
    .optional()
    .describe('Offer type: amount (fixed cashback) or discount (percentage)'),
  offerValue: z.number().optional().describe('Offer value (fixed amount or percentage)'),
  startDate: z.string().optional().describe('ISO 8601 start date of the offer'),
  endDate: z.string().optional().describe('ISO 8601 end date of the offer'),
  maxReward: z.number().optional().nullable().describe('Maximum reward amount'),
  created: z.string().optional().describe('ISO 8601 date when the offer was created'),
  updated: z.string().optional().describe('ISO 8601 date when the offer was last updated'),
  metadata: z.record(z.string(), z.any()).optional().describe('Custom metadata')
});

let mapOffer = (offer: any) => ({
  offerId: offer.id,
  programId: offer.programId,
  brandId: offer.brandId,
  accountId: offer.accountId,
  name: offer.name,
  countryCode: offer.countryCode,
  live: offer.live,
  status: offer.status,
  offerType: offer.type?.name ?? offer.type,
  offerValue: offer.type?.value ?? offer.value,
  startDate: offer.startDate,
  endDate: offer.endDate,
  maxReward: offer.maxReward,
  created: offer.created,
  updated: offer.updated,
  metadata: offer.metadata
});

export let createOffer = SlateTool.create(spec, {
  name: 'Create Offer',
  key: 'create_offer',
  description: `Creates a card-linked Offer for a specific Brand and Program. Offers can be fixed-amount cashback or percentage-based discounts. When a qualifying transaction occurs at a linked location, the offer is applied automatically.`,
  instructions: [
    'Offer type "amount" provides a fixed cashback value per transaction.',
    'Offer type "discount" provides a percentage-based discount on the transaction amount.',
    'Each transaction can be rewarded only once. If multiple offers qualify, the most valuable one is selected.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      programId: z.string().describe('ID of the program'),
      brandId: z.string().describe('ID of the brand'),
      name: z.string().describe('Name of the offer'),
      countryCode: z.string().describe('ISO 3166-1 alpha-3 country code'),
      offerType: z
        .enum(['amount', 'discount'])
        .describe('Type of offer: "amount" for fixed cashback, "discount" for percentage'),
      offerValue: z
        .number()
        .describe('Offer value: fixed amount (e.g., 5.00) or percentage (e.g., 10 for 10%)'),
      startDate: z.string().optional().describe('ISO 8601 start date for the offer'),
      endDate: z.string().optional().describe('ISO 8601 end date for the offer'),
      maxReward: z.number().optional().describe('Maximum reward amount per transaction'),
      metadata: z.record(z.string(), z.any()).optional().describe('Custom metadata')
    })
  )
  .output(offerSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let offer = await client.createOffer(ctx.input.programId, {
      brandId: ctx.input.brandId,
      countryCode: ctx.input.countryCode,
      name: ctx.input.name,
      type: { name: ctx.input.offerType, value: ctx.input.offerValue },
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      maxReward: ctx.input.maxReward,
      metadata: ctx.input.metadata
    });

    return {
      output: mapOffer(offer),
      message: `Offer **${offer.name}** created with ID \`${offer.id}\` (${ctx.input.offerType}: ${ctx.input.offerValue}).`
    };
  })
  .build();

export let getOffer = SlateTool.create(spec, {
  name: 'Get Offer',
  key: 'get_offer',
  description: `Retrieves details of a specific Offer by its ID, including its type, value, status, and date range.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      offerId: z.string().describe('ID of the offer to retrieve')
    })
  )
  .output(offerSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let offer = await client.getOffer(ctx.input.offerId);

    return {
      output: mapOffer(offer),
      message: `Retrieved offer **${offer.name}** (\`${offer.id}\`).`
    };
  })
  .build();

export let listOffers = SlateTool.create(spec, {
  name: 'List Offers',
  key: 'list_offers',
  description: `Lists all Offers in a specific Program. Returns offer details including type, value, status, and linked brands.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      programId: z.string().describe('ID of the program to list offers for'),
      start: z.number().optional().describe('Offset for pagination'),
      limit: z.number().optional().describe('Maximum number of offers to return')
    })
  )
  .output(
    z.object({
      offers: z.array(offerSchema).describe('List of offers'),
      count: z.number().optional().describe('Total number of offers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.listOffers(ctx.input.programId, {
      start: ctx.input.start,
      limit: ctx.input.limit
    });

    let items = data?.items ?? [];
    let offers = items.map(mapOffer);

    return {
      output: {
        offers,
        count: data?.resource?.total ?? offers.length
      },
      message: `Found **${offers.length}** offer(s) in program \`${ctx.input.programId}\`.`
    };
  })
  .build();

export let updateOffer = SlateTool.create(spec, {
  name: 'Update Offer',
  key: 'update_offer',
  description: `Updates an existing Offer's name, date range, max reward, or metadata.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      offerId: z.string().describe('ID of the offer to update'),
      name: z.string().optional().describe('New name for the offer'),
      startDate: z.string().optional().describe('New ISO 8601 start date'),
      endDate: z.string().optional().describe('New ISO 8601 end date'),
      maxReward: z.number().optional().describe('New maximum reward amount'),
      metadata: z.record(z.string(), z.any()).optional().describe('Updated metadata')
    })
  )
  .output(offerSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let offer = await client.updateOffer(ctx.input.offerId, {
      name: ctx.input.name,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      maxReward: ctx.input.maxReward,
      metadata: ctx.input.metadata
    });

    return {
      output: mapOffer(offer),
      message: `Offer **${offer.name}** (\`${offer.id}\`) updated successfully.`
    };
  })
  .build();

export let manageOfferLocations = SlateTool.create(spec, {
  name: 'Link/Unlink Offer Location',
  key: 'manage_offer_locations',
  description: `Links or unlinks a Location to/from an Offer. Linking a location makes transactions at that location eligible for the offer. Unlinking removes the eligibility.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      offerId: z.string().describe('ID of the offer'),
      locationId: z.string().describe('ID of the location to link or unlink'),
      action: z.enum(['link', 'unlink']).describe('Whether to link or unlink the location')
    })
  )
  .output(
    z.object({
      offerId: z.string().describe('ID of the offer'),
      locationId: z.string().describe('ID of the location'),
      action: z.string().describe('The action that was performed'),
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'link') {
      await client.linkOfferToLocation(ctx.input.offerId, ctx.input.locationId);
    } else {
      await client.unlinkOfferFromLocation(ctx.input.offerId, ctx.input.locationId);
    }

    return {
      output: {
        offerId: ctx.input.offerId,
        locationId: ctx.input.locationId,
        action: ctx.input.action,
        success: true
      },
      message: `Location \`${ctx.input.locationId}\` ${ctx.input.action === 'link' ? 'linked to' : 'unlinked from'} offer \`${ctx.input.offerId}\`.`
    };
  })
  .build();

export let manageOfferCard = SlateTool.create(spec, {
  name: 'Activate/Deactivate Offer on Card',
  key: 'manage_offer_card',
  description: `Activates or deactivates an Offer on a specific Card. Activating makes the card eligible for the offer's rewards. Deactivating removes the card's eligibility.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      offerId: z.string().describe('ID of the offer'),
      cardId: z.string().describe('ID of the card'),
      action: z
        .enum(['activate', 'deactivate'])
        .describe('Whether to activate or deactivate the offer on the card')
    })
  )
  .output(
    z.object({
      offerId: z.string().describe('ID of the offer'),
      cardId: z.string().describe('ID of the card'),
      action: z.string().describe('The action that was performed'),
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'activate') {
      await client.activateOfferOnCard(ctx.input.offerId, ctx.input.cardId);
    } else {
      await client.deactivateOfferOnCard(ctx.input.offerId, ctx.input.cardId);
    }

    return {
      output: {
        offerId: ctx.input.offerId,
        cardId: ctx.input.cardId,
        action: ctx.input.action,
        success: true
      },
      message: `Offer \`${ctx.input.offerId}\` ${ctx.input.action === 'activate' ? 'activated on' : 'deactivated from'} card \`${ctx.input.cardId}\`.`
    };
  })
  .build();
