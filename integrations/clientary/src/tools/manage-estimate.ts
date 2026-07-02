import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let estimateItemSchema = z.object({
  estimateItemId: z.number().optional().describe('ID of the estimate item'),
  title: z.string().describe('Line item title'),
  quantity: z.number().describe('Quantity'),
  price: z.number().describe('Unit price'),
  taxable: z.boolean().optional().describe('Whether item is taxable'),
  taxable2: z.boolean().optional().describe('Whether item has second tax'),
  taxable3: z.boolean().optional().describe('Whether item has third tax')
});

let estimateSchema = z.object({
  estimateId: z.number().describe('Unique ID of the estimate'),
  clientId: z.number().optional().describe('Associated client ID'),
  number: z.string().optional().describe('Estimate number'),
  date: z.string().optional().describe('Estimate date (YYYY-MM-DD)'),
  currencyCode: z.string().optional().describe('Currency code (e.g. USD)'),
  status: z
    .string()
    .optional()
    .describe(
      'Status: Draft, Sent, Viewed, Cancelled, Declined, Revised, Accepted, or Archived'
    ),
  subtotal: z.number().optional().describe('Subtotal before tax'),
  total: z.number().optional().describe('Total amount'),
  tax: z.number().optional().describe('First tax rate percentage'),
  tax2: z.number().optional().describe('Second tax rate percentage'),
  tax3: z.number().optional().describe('Third tax rate percentage'),
  notes: z.string().optional().describe('Estimate notes'),
  poNumber: z.string().optional().describe('Purchase order number'),
  items: z.array(estimateItemSchema).optional().describe('Estimate line items')
});

export let createEstimate = SlateTool.create(spec, {
  name: 'Create Estimate',
  key: 'create_estimate',
  description: `Create a new estimate (proposal/quote) in Clientary with line items and optional taxes. Can be scoped to a specific client.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      clientId: z.number().optional().describe('Client ID to associate the estimate with'),
      date: z.string().describe('Estimate date (YYYY-MM-DD)'),
      currencyCode: z.string().describe('Currency code (e.g. USD, EUR)'),
      poNumber: z.string().optional().describe('Purchase order number'),
      notes: z.string().optional().describe('Notes to appear on the estimate'),
      tax: z.number().optional().describe('First tax rate percentage'),
      tax2: z.number().optional().describe('Second tax rate percentage'),
      tax3: z.number().optional().describe('Third tax rate percentage'),
      items: z
        .array(
          z.object({
            title: z.string().describe('Line item title'),
            quantity: z.number().describe('Quantity'),
            price: z.number().describe('Unit price'),
            taxable: z.boolean().optional().describe('Subject to first tax'),
            taxable2: z.boolean().optional().describe('Subject to second tax'),
            taxable3: z.boolean().optional().describe('Subject to third tax')
          })
        )
        .optional()
        .describe('Estimate line items')
    })
  )
  .output(estimateSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });

    let data: Record<string, any> = {
      date: ctx.input.date,
      currency_code: ctx.input.currencyCode
    };
    if (ctx.input.clientId) data.client_id = ctx.input.clientId;
    if (ctx.input.poNumber) data.po_number = ctx.input.poNumber;
    if (ctx.input.notes) data.notes = ctx.input.notes;
    if (ctx.input.tax !== undefined) data.tax = ctx.input.tax;
    if (ctx.input.tax2 !== undefined) data.tax2 = ctx.input.tax2;
    if (ctx.input.tax3 !== undefined) data.tax3 = ctx.input.tax3;

    if (ctx.input.items) {
      data.estimate_items_attributes = ctx.input.items.map(item => ({
        title: item.title,
        quantity: item.quantity,
        price: item.price,
        taxable: item.taxable,
        taxable2: item.taxable2,
        taxable3: item.taxable3
      }));
    }

    let result = await client.createEstimate(data, ctx.input.clientId);
    let est = result.estimate || result;

    return {
      output: mapEstimate(est),
      message: `Created estimate **#${est.number || est.id}**.`
    };
  })
  .build();

export let updateEstimate = SlateTool.create(spec, {
  name: 'Update Estimate',
  key: 'update_estimate',
  description: `Update an existing estimate. Supports partial updates and line item management. To add items, omit \`estimateItemId\`. To update items, include their \`estimateItemId\`. To remove items, set \`destroy\` to true.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      estimateId: z.number().describe('ID of the estimate to update'),
      date: z.string().optional().describe('Estimate date (YYYY-MM-DD)'),
      currencyCode: z.string().optional().describe('Currency code'),
      poNumber: z.string().optional().describe('Purchase order number'),
      notes: z.string().optional().describe('Estimate notes'),
      tax: z.number().optional().describe('First tax rate percentage'),
      tax2: z.number().optional().describe('Second tax rate percentage'),
      tax3: z.number().optional().describe('Third tax rate percentage'),
      items: z
        .array(
          z.object({
            estimateItemId: z
              .number()
              .optional()
              .describe('ID of existing item to update. Omit to create new.'),
            title: z.string().optional().describe('Line item title'),
            quantity: z.number().optional().describe('Quantity'),
            price: z.number().optional().describe('Unit price'),
            destroy: z.boolean().optional().describe('Set true to remove this item')
          })
        )
        .optional()
        .describe('Line items to add, update, or remove')
    })
  )
  .output(estimateSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });

    let data: Record<string, any> = {};
    if (ctx.input.date !== undefined) data.date = ctx.input.date;
    if (ctx.input.currencyCode !== undefined) data.currency_code = ctx.input.currencyCode;
    if (ctx.input.poNumber !== undefined) data.po_number = ctx.input.poNumber;
    if (ctx.input.notes !== undefined) data.notes = ctx.input.notes;
    if (ctx.input.tax !== undefined) data.tax = ctx.input.tax;
    if (ctx.input.tax2 !== undefined) data.tax2 = ctx.input.tax2;
    if (ctx.input.tax3 !== undefined) data.tax3 = ctx.input.tax3;

    if (ctx.input.items) {
      data.estimate_items_attributes = ctx.input.items.map(item => {
        let mapped: Record<string, any> = {};
        if (item.estimateItemId) mapped.id = item.estimateItemId;
        if (item.title !== undefined) mapped.title = item.title;
        if (item.quantity !== undefined) mapped.quantity = item.quantity;
        if (item.price !== undefined) mapped.price = item.price;
        if (item.destroy) mapped._destroy = true;
        return mapped;
      });
    }

    let result = await client.updateEstimate(ctx.input.estimateId, data);
    let est = result.estimate || result;

    return {
      output: mapEstimate(est),
      message: `Updated estimate **#${est.number || est.id}**.`
    };
  })
  .build();

export let getEstimates = SlateTool.create(spec, {
  name: 'Get Estimates',
  key: 'get_estimates',
  description: `Retrieve a specific estimate by ID or list estimates with optional filtering by client or project.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      estimateId: z
        .number()
        .optional()
        .describe('ID of a specific estimate. If omitted, lists estimates.'),
      clientId: z.number().optional().describe('Filter estimates by client ID'),
      projectId: z.number().optional().describe('Filter estimates by project ID'),
      page: z.number().optional().describe('Page number for pagination (30 results per page)')
    })
  )
  .output(
    z.object({
      estimates: z.array(estimateSchema).describe('List of estimates'),
      totalCount: z.number().optional().describe('Total number of matching estimates'),
      pageCount: z.number().optional().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });

    if (ctx.input.estimateId) {
      let result = await client.getEstimate(ctx.input.estimateId);
      let est = result.estimate || result;
      return {
        output: { estimates: [mapEstimate(est)] },
        message: `Retrieved estimate **#${est.number || est.id}**.`
      };
    }

    let result = await client.listEstimates({
      page: ctx.input.page,
      clientId: ctx.input.clientId,
      projectId: ctx.input.projectId
    });

    let estimates = (result.estimates || []).map(mapEstimate);

    return {
      output: {
        estimates,
        totalCount: result.total_count,
        pageCount: result.page_count
      },
      message: `Retrieved ${estimates.length} estimate(s).`
    };
  })
  .build();

export let deleteEstimate = SlateTool.create(spec, {
  name: 'Delete Estimate',
  key: 'delete_estimate',
  description: `Permanently delete an estimate and all its line items.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      estimateId: z.number().describe('ID of the estimate to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    await client.deleteEstimate(ctx.input.estimateId);

    return {
      output: { success: true },
      message: `Deleted estimate ID ${ctx.input.estimateId}.`
    };
  })
  .build();

export let sendEstimate = SlateTool.create(spec, {
  name: 'Send Estimate',
  key: 'send_estimate',
  description: `Send an estimate via email to one or more recipients.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      estimateId: z.number().describe('ID of the estimate to send'),
      recipients: z.string().describe('Comma-separated email addresses of recipients'),
      subject: z.string().optional().describe('Email subject line'),
      message: z.string().optional().describe('Email body message')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the estimate was sent successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });

    await client.sendEstimate(ctx.input.estimateId, {
      recipients: ctx.input.recipients,
      subject: ctx.input.subject,
      message: ctx.input.message
    });

    return {
      output: { success: true },
      message: `Sent estimate ID ${ctx.input.estimateId} to ${ctx.input.recipients}.`
    };
  })
  .build();

let mapEstimate = (est: any) => ({
  estimateId: est.id,
  clientId: est.client_id,
  number: est.number,
  date: est.date,
  currencyCode: est.currency_code,
  status: est.status_label || String(est.status),
  subtotal: est.subtotal,
  total: est.total,
  tax: est.tax,
  tax2: est.tax2,
  tax3: est.tax3,
  notes: est.notes,
  poNumber: est.po_number,
  items: est.estimate_items
    ? est.estimate_items.map((item: any) => ({
        estimateItemId: item.id,
        title: item.title,
        quantity: item.quantity,
        price: item.price,
        taxable: item.taxable,
        taxable2: item.taxable2,
        taxable3: item.taxable3
      }))
    : undefined
});
