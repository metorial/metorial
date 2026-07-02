import { SlateTool } from 'slates';
import { z } from 'zod';
import { AshbyClient } from '../lib/client';
import { spec } from '../spec';

let offerSchema = z.object({
  offerId: z.string().describe('Unique ID of the offer'),
  status: z.string().describe('Current status of the offer'),
  applicationId: z.string().optional().describe('Associated application ID'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last updated timestamp')
});

let mapOffer = (o: any) => ({
  offerId: o.id,
  status: o.status,
  applicationId: o.applicationId || undefined,
  createdAt: o.createdAt,
  updatedAt: o.updatedAt
});

export let manageOfferTool = SlateTool.create(spec, {
  name: 'Manage Offer',
  key: 'manage_offer',
  description: `Creates, retrieves, lists, updates, approves, or starts offers in Ashby. Use this tool to manage the full offer lifecycle for candidates in the hiring pipeline.`,
  instructions: [
    'To **create** an offer, set action to "create" and provide applicationId and optional offerFields.',
    'To **get** an offer, set action to "get" and provide offerId.',
    'To **list** offers, set action to "list" with optional pagination parameters.',
    'To **update** an offer, set action to "update" and provide offerId and offerFields.',
    'To **approve** an offer, set action to "approve" and provide offerId.',
    'To **start** an offer, set action to "start" and provide offerId.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'list', 'update', 'approve', 'start'])
        .describe('The offer action to perform'),
      offerId: z
        .string()
        .optional()
        .describe('Offer ID (required for get, update, approve, and start)'),
      applicationId: z.string().optional().describe('Application ID (for create)'),
      offerFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Offer form field values (for create and update)'),
      cursor: z.string().optional().describe('Pagination cursor (for list action)'),
      perPage: z.number().optional().describe('Number of results per page (for list action)')
    })
  )
  .output(
    z.object({
      offer: offerSchema
        .optional()
        .describe('Single offer result (for create, get, update, approve, start)'),
      offers: z.array(offerSchema).optional().describe('List of offers (for list action)'),
      nextCursor: z.string().optional().describe('Pagination cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AshbyClient({ token: ctx.auth.token });
    let { action, offerId, applicationId, offerFields, cursor, perPage } = ctx.input;

    if (action === 'create') {
      if (!applicationId) throw new Error('applicationId is required to create an offer');

      let result = await client.createOffer({ applicationId, ...offerFields });
      let offer = mapOffer(result.results);

      return {
        output: { offer },
        message: `Created offer **${offer.offerId}** for application ${applicationId}.`
      };
    }

    if (action === 'get') {
      if (!offerId) throw new Error('offerId is required to get an offer');

      let result = await client.getOffer(offerId);
      let offer = mapOffer(result.results);

      return {
        output: { offer },
        message: `Retrieved offer **${offer.offerId}** (status: ${offer.status}).`
      };
    }

    if (action === 'list') {
      let result = await client.listOffers({ cursor, perPage });
      let offers = (result.results || []).map(mapOffer);

      return {
        output: {
          offers,
          nextCursor: result.moreDataAvailable ? result.nextCursor : undefined
        },
        message: `Found **${offers.length}** offers${result.moreDataAvailable ? ' (more available)' : ''}.`
      };
    }

    if (action === 'update') {
      if (!offerId) throw new Error('offerId is required to update an offer');

      let result = await client.updateOffer(offerId, offerFields || {});
      let offer = mapOffer(result.results);

      return {
        output: { offer },
        message: `Updated offer **${offer.offerId}**.`
      };
    }

    if (action === 'approve') {
      if (!offerId) throw new Error('offerId is required to approve an offer');

      let result = await client.approveOffer(offerId);
      let offer = mapOffer(result.results);

      return {
        output: { offer },
        message: `Approved offer **${offer.offerId}**.`
      };
    }

    // action === 'start'
    if (!offerId) throw new Error('offerId is required to start an offer');

    let result = await client.startOffer(offerId);
    let offer = mapOffer(result.results);

    return {
      output: { offer },
      message: `Started offer **${offer.offerId}**.`
    };
  })
  .build();
