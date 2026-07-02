import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEquipment = SlateTool.create(spec, {
  name: 'Get Equipment',
  key: 'get_equipment',
  description: `Retrieve detailed information about a specific equipment item. Optionally include serial numbers, stock movements, repairs, accessories, and set contents.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      equipmentId: z.number().describe('The ID of the equipment item'),
      includeSerialNumbers: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include serial numbers'),
      includeStockMovements: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include stock movements'),
      includeRepairs: z.boolean().optional().default(false).describe('Include repairs'),
      includeAccessories: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include accessories'),
      includeSetContents: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include kit/set contents')
    })
  )
  .output(
    z.object({
      equipmentId: z.number(),
      name: z.string().optional(),
      code: z.string().optional(),
      category: z.string().optional(),
      quantityTotal: z.number().optional(),
      rentalPrice: z.number().optional(),
      subrentalPrice: z.number().optional(),
      weight: z.number().optional(),
      volume: z.number().optional(),
      isContainer: z.boolean().optional(),
      trackSerialNumbers: z.boolean().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      serialNumbers: z.array(z.record(z.string(), z.any())).optional(),
      stockMovements: z.array(z.record(z.string(), z.any())).optional(),
      repairs: z.array(z.record(z.string(), z.any())).optional(),
      accessories: z.array(z.record(z.string(), z.any())).optional(),
      setContents: z.array(z.record(z.string(), z.any())).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.get('equipment', ctx.input.equipmentId);
    let e = result.data as any;

    let output: any = {
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
    };

    if (ctx.input.includeSerialNumbers) {
      let sn = await client.listNested('equipment', ctx.input.equipmentId, 'serialnumbers');
      output.serialNumbers = sn.data;
    }

    if (ctx.input.includeStockMovements) {
      let sm = await client.listNested('equipment', ctx.input.equipmentId, 'stockmovements');
      output.stockMovements = sm.data;
    }

    if (ctx.input.includeRepairs) {
      let rep = await client.listNested('equipment', ctx.input.equipmentId, 'repairs');
      output.repairs = rep.data;
    }

    if (ctx.input.includeAccessories) {
      let acc = await client.listNested('equipment', ctx.input.equipmentId, 'accessories');
      output.accessories = acc.data;
    }

    if (ctx.input.includeSetContents) {
      let sc = await client.listNested(
        'equipment',
        ctx.input.equipmentId,
        'equipmentsetscontent'
      );
      output.setContents = sc.data;
    }

    return {
      output,
      message: `Retrieved equipment **${output.name || output.equipmentId}**${output.code ? ` (${output.code})` : ''}.`
    };
  })
  .build();
