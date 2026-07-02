import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import {
  documentOutputSchema,
  lineItemInputSchema,
  mapDocumentOutput,
  mapLineItemInput
} from '../lib/schemas';
import { spec } from '../spec';

export let listEstimates = SlateTool.create(spec, {
  name: 'List Estimates',
  key: 'list_estimates',
  description: `Retrieve a list of estimates (quotes/proformas) from Quaderno. Estimates can later be converted to invoices.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search query to filter estimates'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      estimates: z.array(documentOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listEstimates({
      q: ctx.input.query,
      page: ctx.input.page
    });

    let estimates = (Array.isArray(result) ? result : []).map(mapDocumentOutput);

    return {
      output: { estimates },
      message: `Found **${estimates.length}** estimate(s)`
    };
  })
  .build();

export let getEstimate = SlateTool.create(spec, {
  name: 'Get Estimate',
  key: 'get_estimate',
  description: `Retrieve a single estimate by ID from Quaderno.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      estimateId: z.string().describe('ID of the estimate to retrieve')
    })
  )
  .output(documentOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let doc = await client.getEstimate(ctx.input.estimateId);

    return {
      output: mapDocumentOutput(doc),
      message: `Retrieved estimate **#${doc.number || doc.id}** — Total: ${doc.total} ${doc.currency || ''}`
    };
  })
  .build();

export let createEstimate = SlateTool.create(spec, {
  name: 'Create Estimate',
  key: 'create_estimate',
  description: `Create a new estimate (quote/proforma) in Quaderno. Estimates can be sent to clients and later converted to invoices.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to send the estimate to'),
      currency: z.string().optional().describe('Currency code'),
      issueDate: z.string().optional().describe('Issue date in YYYY-MM-DD format'),
      subject: z.string().optional().describe('Subject line'),
      notes: z.string().optional().describe('Notes'),
      poNumber: z.string().optional().describe('Purchase order number'),
      tag: z.string().optional().describe('Tag for categorization'),
      items: z.array(lineItemInputSchema).min(1).describe('Line items for the estimate')
    })
  )
  .output(documentOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let data: Record<string, any> = {
      contact_id: ctx.input.contactId,
      items_attributes: ctx.input.items.map(mapLineItemInput)
    };

    if (ctx.input.currency) data.currency = ctx.input.currency;
    if (ctx.input.issueDate) data.issue_date = ctx.input.issueDate;
    if (ctx.input.subject) data.subject = ctx.input.subject;
    if (ctx.input.notes) data.notes = ctx.input.notes;
    if (ctx.input.poNumber) data.po_number = ctx.input.poNumber;
    if (ctx.input.tag) data.tag = ctx.input.tag;

    let doc = await client.createEstimate(data);

    return {
      output: mapDocumentOutput(doc),
      message: `Created estimate **#${doc.number || doc.id}** for ${doc.total} ${doc.currency || ''}`
    };
  })
  .build();

export let deleteEstimate = SlateTool.create(spec, {
  name: 'Delete Estimate',
  key: 'delete_estimate',
  description: `Delete an estimate from Quaderno.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      estimateId: z.string().describe('ID of the estimate to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the estimate was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteEstimate(ctx.input.estimateId);

    return {
      output: { success: true },
      message: `Deleted estimate **${ctx.input.estimateId}**`
    };
  })
  .build();

export let deliverEstimate = SlateTool.create(spec, {
  name: 'Deliver Estimate',
  key: 'deliver_estimate',
  description: `Send an estimate to the client via email.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      estimateId: z.string().describe('ID of the estimate to deliver')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the delivery was initiated')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deliverEstimate(ctx.input.estimateId);

    return {
      output: { success: true },
      message: `Delivered estimate **${ctx.input.estimateId}** to client`
    };
  })
  .build();
