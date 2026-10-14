import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { organizationIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let createPart = SlateTool.create(spec, {
  name: 'Create Part',
  key: 'create_part',
  description: `Creates a new part in MaintainX inventory. Parts can be tracked for stock levels, associated with work orders, and linked to vendors and purchase orders. For multi-organization keys, call list_organizations and pass organizationId.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      organizationId: organizationIdSchema,
      name: z.string().describe('Name of the part'),
      description: z.string().optional().describe('Part description'),
      unitCost: z
        .number()
        .refine(Number.isSafeInteger, 'Unit cost must be a safe whole number of cents')
        .optional()
        .describe('Cost per unit in cents; 120 means 1.20'),
      quantity: z.number().optional().describe('Initial stock quantity'),
      minimumQuantity: z.number().optional().describe('Minimum stock threshold for alerts'),
      area: z.string().optional().describe('Storage area/location'),
      barcode: z.string().optional().describe('Barcode identifier'),
      nonStock: z
        .boolean()
        .optional()
        .describe('Unsupported by the current MaintainX API; omit this field')
    })
  )
  .output(
    z.object({
      partId: z.number().describe('ID of the created part'),
      name: z.string().describe('Name of the part')
    })
  )
  .handleInvocation(async ctx => {
    let client = Client.fromContext(ctx);

    let result = await client.createPart({
      name: ctx.input.name,
      description: ctx.input.description,
      unitCost: ctx.input.unitCost,
      quantity: ctx.input.quantity,
      minimumQuantity: ctx.input.minimumQuantity,
      area: ctx.input.area,
      barcode: ctx.input.barcode,
      nonStock: ctx.input.nonStock
    });

    let partId = result.id ?? result.part?.id;

    return {
      output: {
        partId,
        name: ctx.input.name
      },
      message: `Created part **"${ctx.input.name}"** (ID: ${partId})${ctx.input.quantity !== undefined ? ` with initial stock of ${ctx.input.quantity}` : ''}.`
    };
  })
  .build();
