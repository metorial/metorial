import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createStockMovement = SlateTool.create(spec, {
  name: 'Create Stock Movement',
  key: 'create_stock_movement',
  description: `Create a manual stock movement for an equipment item in Rentman. Use this to record inventory changes such as items entering or leaving stock.`,
  constraints: ['Only "manual" stock movements can be created via the API.'],
  tags: { destructive: false }
})
  .input(
    z.object({
      equipmentId: z.number().describe('ID of the equipment item'),
      quantity: z
        .number()
        .describe('Quantity to move (positive for incoming, negative for outgoing)'),
      stockLocation: z.string().optional().describe('Stock location reference URI'),
      memo: z.string().optional().describe('Notes about this stock movement')
    })
  )
  .output(
    z.object({
      stockMovementId: z.number().describe('ID of the created stock movement'),
      equipmentId: z.number(),
      quantity: z.number().optional(),
      createdAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, any> = {
      quantity: ctx.input.quantity
    };

    if (ctx.input.stockLocation) body.stock_location = ctx.input.stockLocation;
    if (ctx.input.memo) body.memo = ctx.input.memo;

    let result = await client.createNested(
      'equipment',
      ctx.input.equipmentId,
      'stockmovements',
      body
    );
    let sm = result.data as any;

    return {
      output: {
        stockMovementId: sm.id,
        equipmentId: ctx.input.equipmentId,
        quantity: sm.quantity,
        createdAt: sm.created
      },
      message: `Created stock movement (ID: ${sm.id}) for equipment **${ctx.input.equipmentId}** with quantity **${ctx.input.quantity}**.`
    };
  })
  .build();

export let listStockMovements = SlateTool.create(spec, {
  name: 'List Stock Movements',
  key: 'list_stock_movements',
  description: `Retrieve stock movements for an equipment item. View inventory changes over time, including quantities and stock locations.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      equipmentId: z.number().describe('ID of the equipment item'),
      limit: z.number().optional().default(25).describe('Maximum number of results (max 300)'),
      offset: z.number().optional().default(0).describe('Number of results to skip')
    })
  )
  .output(
    z.object({
      stockMovements: z.array(
        z.object({
          stockMovementId: z.number(),
          quantity: z.number().optional(),
          stockLocation: z.string().optional(),
          memo: z.string().optional(),
          createdAt: z.string().optional()
        })
      ),
      itemCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listNested(
      'equipment',
      ctx.input.equipmentId,
      'stockmovements',
      {
        limit: ctx.input.limit,
        offset: ctx.input.offset
      }
    );

    let stockMovements = result.data.map((sm: any) => ({
      stockMovementId: sm.id,
      quantity: sm.quantity,
      stockLocation: sm.stock_location,
      memo: sm.memo,
      createdAt: sm.created
    }));

    return {
      output: {
        stockMovements,
        itemCount: result.itemCount
      },
      message: `Found **${result.itemCount}** stock movements for equipment **${ctx.input.equipmentId}**. Returned ${stockMovements.length}.`
    };
  })
  .build();
