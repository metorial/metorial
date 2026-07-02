import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCosts = SlateTool.create(spec, {
  name: 'List Costs',
  key: 'list_costs',
  description: `Retrieve a list of cost items from Rentman. Costs are extra charges added to projects, such as transport fees or service charges.`,
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
      costs: z.array(
        z.object({
          costId: z.number(),
          name: z.string().optional(),
          quantity: z.number().optional(),
          unitPrice: z.number().optional(),
          totalPrice: z.number().optional(),
          discount: z.number().optional(),
          project: z.string().optional(),
          subproject: z.string().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
      ),
      itemCount: z.number(),
      limit: z.number(),
      offset: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.list('costs', {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      sort: ctx.input.sort,
      fields: ctx.input.fields
    });

    let costs = result.data.map((c: any) => ({
      costId: c.id,
      name: c.name,
      quantity: c.quantity,
      unitPrice: c.unit_price,
      totalPrice: c.total_price,
      discount: c.discount,
      project: c.project,
      subproject: c.subproject,
      createdAt: c.created,
      updatedAt: c.modified
    }));

    return {
      output: {
        costs,
        itemCount: result.itemCount,
        limit: result.limit,
        offset: result.offset
      },
      message: `Found **${result.itemCount}** cost items. Returned ${costs.length} (offset: ${result.offset}).`
    };
  })
  .build();

export let updateCost = SlateTool.create(spec, {
  name: 'Update Cost',
  key: 'update_cost',
  description: `Update a cost item in Rentman. Modify the name, quantity, price, or discount.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      costId: z.number().describe('ID of the cost item'),
      name: z.string().optional().describe('Updated name'),
      quantity: z.number().optional().describe('Updated quantity'),
      unitPrice: z.number().optional().describe('Updated unit price'),
      discount: z.number().optional().describe('Updated discount percentage'),
      memo: z.string().optional().describe('Updated notes')
    })
  )
  .output(
    z.object({
      costId: z.number(),
      name: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, any> = {};
    if (ctx.input.name !== undefined) body.name = ctx.input.name;
    if (ctx.input.quantity !== undefined) body.quantity = ctx.input.quantity;
    if (ctx.input.unitPrice !== undefined) body.unit_price = ctx.input.unitPrice;
    if (ctx.input.discount !== undefined) body.discount = ctx.input.discount;
    if (ctx.input.memo !== undefined) body.memo = ctx.input.memo;

    let result = await client.update('costs', ctx.input.costId, body);
    let c = result.data as any;

    return {
      output: {
        costId: c.id,
        name: c.name,
        updatedAt: c.modified
      },
      message: `Updated cost **${c.name}** (ID: ${c.id}).`
    };
  })
  .build();

export let deleteCost = SlateTool.create(spec, {
  name: 'Delete Cost',
  key: 'delete_cost',
  description: `Permanently delete a cost item from Rentman.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      costId: z.number().describe('ID of the cost item to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.remove('costs', ctx.input.costId);

    return {
      output: { deleted: true },
      message: `Deleted cost with ID **${ctx.input.costId}**.`
    };
  })
  .build();
