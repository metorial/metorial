import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let offerItemSchema = z.object({
  title: z.string().describe('Line item title'),
  description: z.string().optional().describe('Line item description'),
  quantity: z.number().optional().describe('Quantity'),
  unit: z.string().optional().describe('Unit label'),
  unitPrice: z.number().optional().describe('Unit price'),
  netTotal: z.number().optional().describe('Net total for this item')
});

let offerOutputSchema = z.object({
  offerId: z.number().describe('Offer/proposal ID'),
  title: z.string().optional().describe('Offer title'),
  identifier: z.string().optional().describe('Offer number/identifier'),
  status: z.string().optional().describe('Offer status'),
  date: z.string().optional().describe('Offer date'),
  dueDate: z.string().optional().describe('Valid until date'),
  currency: z.string().optional().describe('Currency code'),
  netTotal: z.number().optional().describe('Net total amount'),
  tax: z.number().optional().describe('Tax percentage'),
  grossTotal: z.number().optional().describe('Gross total amount'),
  recipientAddress: z.string().optional().describe('Recipient address'),
  tags: z.array(z.string()).optional().describe('Offer tags'),
  company: z.any().optional().describe('Associated company details'),
  project: z.any().optional().describe('Associated project details'),
  deal: z.any().optional().describe('Associated deal details'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

let mapOffer = (o: any) => ({
  offerId: o.id,
  title: o.title,
  identifier: o.identifier,
  status: o.status,
  date: o.date,
  dueDate: o.due_date,
  currency: o.currency,
  netTotal: o.net_total,
  tax: o.tax,
  grossTotal: o.gross_total,
  recipientAddress: o.recipient_address,
  tags: o.tags,
  company: o.company,
  project: o.project,
  deal: o.deal,
  createdAt: o.created_at,
  updatedAt: o.updated_at
});

export let listOffers = SlateTool.create(spec, {
  name: 'List Offers',
  key: 'list_offers',
  description: `Retrieve a list of offers/proposals. Filter by status, company, project, deal, or date range.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['created', 'sent', 'accepted', 'partially_billed', 'billed', 'archived'])
        .optional()
        .describe('Filter by offer status'),
      companyId: z.number().optional().describe('Filter by company ID'),
      projectId: z.number().optional().describe('Filter by project ID'),
      dealId: z.number().optional().describe('Filter by deal ID'),
      from: z.string().optional().describe('Filter offers from this date (YYYY-MM-DD)'),
      to: z.string().optional().describe('Filter offers until this date (YYYY-MM-DD)'),
      identifier: z.string().optional().describe('Filter by offer number')
    })
  )
  .output(
    z.object({
      offers: z.array(offerOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });

    let params: Record<string, any> = {};
    if (ctx.input.status) params.status = ctx.input.status;
    if (ctx.input.companyId) params.company_id = ctx.input.companyId;
    if (ctx.input.projectId) params.project_id = ctx.input.projectId;
    if (ctx.input.dealId) params.deal_id = ctx.input.dealId;
    if (ctx.input.from) params.from = ctx.input.from;
    if (ctx.input.to) params.to = ctx.input.to;
    if (ctx.input.identifier) params.identifier = ctx.input.identifier;

    let data = await client.listOffers(params);
    let offers = (data as any[]).map(mapOffer);

    return {
      output: { offers },
      message: `Found **${offers.length}** offers.`
    };
  })
  .build();

export let getOffer = SlateTool.create(spec, {
  name: 'Get Offer',
  key: 'get_offer',
  description: `Retrieve detailed information about a specific offer/proposal.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      offerId: z.number().describe('The ID of the offer to retrieve')
    })
  )
  .output(offerOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });
    let o = await client.getOffer(ctx.input.offerId);

    return {
      output: mapOffer(o),
      message: `Retrieved offer **${o.identifier || o.title}** (ID: ${o.id}).`
    };
  })
  .build();

export let createOffer = SlateTool.create(spec, {
  name: 'Create Offer',
  key: 'create_offer',
  description: `Create a new offer/proposal. Requires recipient address, dates, title, tax rate, currency, and line items.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      recipientAddress: z.string().describe('Recipient address (multiline)'),
      date: z.string().describe('Offer date (YYYY-MM-DD)'),
      dueDate: z.string().describe('Valid until date (YYYY-MM-DD)'),
      title: z.string().describe('Offer title'),
      tax: z.number().describe('Tax percentage (e.g., 19.0)'),
      currency: z.string().describe('Currency code (e.g., "EUR")'),
      items: z.array(offerItemSchema).describe('Offer line items'),
      companyId: z.number().optional().describe('Associated company ID'),
      projectId: z.number().optional().describe('Associated project ID'),
      dealId: z.number().optional().describe('Associated deal ID'),
      tags: z.array(z.string()).optional().describe('Offer tags')
    })
  )
  .output(offerOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });

    let data: Record<string, any> = {
      recipient_address: ctx.input.recipientAddress,
      date: ctx.input.date,
      due_date: ctx.input.dueDate,
      title: ctx.input.title,
      tax: ctx.input.tax,
      currency: ctx.input.currency,
      items: ctx.input.items.map(item => ({
        title: item.title,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unitPrice,
        net_total: item.netTotal
      }))
    };

    if (ctx.input.companyId) data.company_id = ctx.input.companyId;
    if (ctx.input.projectId) data.project_id = ctx.input.projectId;
    if (ctx.input.dealId) data.deal_id = ctx.input.dealId;
    if (ctx.input.tags) data.tags = ctx.input.tags;

    let o = await client.createOffer(data);

    return {
      output: mapOffer(o),
      message: `Created offer **${o.identifier || o.title}** (ID: ${o.id}).`
    };
  })
  .build();

export let updateOfferStatus = SlateTool.create(spec, {
  name: 'Update Offer Status',
  key: 'update_offer_status',
  description: `Change the status of an offer/proposal. When a client digitally confirms, it triggers an update event.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      offerId: z.number().describe('The ID of the offer'),
      status: z
        .enum(['created', 'sent', 'accepted', 'partially_billed', 'billed', 'archived'])
        .describe('New offer status')
    })
  )
  .output(offerOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });
    let o = await client.updateOfferStatus(ctx.input.offerId, ctx.input.status);

    return {
      output: mapOffer(o),
      message: `Updated offer **${ctx.input.offerId}** status to **${ctx.input.status}**.`
    };
  })
  .build();
