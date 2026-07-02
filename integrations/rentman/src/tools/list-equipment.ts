import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let equipmentSchema = z.object({
  equipmentId: z.number().describe('Unique equipment ID'),
  name: z.string().optional().describe('Equipment name'),
  code: z.string().optional().describe('Equipment code / SKU'),
  category: z.string().optional().describe('Equipment folder/category reference'),
  quantityTotal: z.number().optional().describe('Total quantity in stock'),
  rentalPrice: z.number().optional().describe('Rental price'),
  subrentalPrice: z.number().optional().describe('Subrental price'),
  weight: z.number().optional().describe('Weight per unit'),
  volume: z.number().optional().describe('Volume per unit'),
  isContainer: z.boolean().optional().describe('Whether item is a case/container'),
  trackSerialNumbers: z.boolean().optional().describe('Whether serial numbers are tracked'),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export let listEquipment = SlateTool.create(spec, {
  name: 'List Equipment',
  key: 'list_equipment',
  description: `Retrieve a list of equipment items from the Rentman inventory. Browse all available equipment, filter by fields, and paginate through results.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z.number().optional().default(25).describe('Maximum number of results (max 300)'),
      offset: z.number().optional().default(0).describe('Number of results to skip'),
      sort: z.string().optional().describe('Sort field with + or - prefix'),
      fields: z.string().optional().describe('Comma-separated fields to return')
    })
  )
  .output(
    z.object({
      equipment: z.array(equipmentSchema),
      itemCount: z.number(),
      limit: z.number(),
      offset: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.list('equipment', {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      sort: ctx.input.sort,
      fields: ctx.input.fields
    });

    let equipment = result.data.map((e: any) => ({
      equipmentId: e.id,
      name: e.name,
      code: e.code,
      category: e.folder,
      quantityTotal: e.quantity_total,
      rentalPrice: e.rental_price,
      subrentalPrice: e.subrental_price,
      weight: e.weight,
      volume: e.volume,
      isContainer: e.is_container,
      trackSerialNumbers: e.track_serial_numbers,
      createdAt: e.created,
      updatedAt: e.modified
    }));

    return {
      output: {
        equipment,
        itemCount: result.itemCount,
        limit: result.limit,
        offset: result.offset
      },
      message: `Found **${result.itemCount}** equipment items. Returned ${equipment.length} items (offset: ${result.offset}).`
    };
  })
  .build();
