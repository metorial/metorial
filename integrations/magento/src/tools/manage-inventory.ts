import { SlateTool } from 'slates';
import { z } from 'zod';
import { MagentoClient } from '../lib/client';
import { spec } from '../spec';

let sourceItemSchema = z.object({
  sku: z.string().describe('Product SKU'),
  sourceCode: z.string().describe('Inventory source code'),
  quantity: z.number().optional().describe('Quantity at this source'),
  status: z.number().optional().describe('Source item status (1=in stock, 0=out of stock)')
});

export let manageInventory = SlateTool.create(spec, {
  name: 'Manage Inventory',
  key: 'manage_inventory',
  description: `View and update product inventory levels. Check stock status, get source item quantities across multiple warehouses, update stock quantities, and verify product salability for a given stock.`,
  instructions: [
    'To **get stock**, set action to "get_stock" with a product SKU to view legacy single-source stock.',
    'To **get source items**, set action to "get_sources" with a SKU for multi-source inventory details.',
    'To **update source items**, set action to "update_sources" and provide sourceItems with quantities.',
    'To **check salability**, set action to "check_salable" with a SKU and stockId.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['get_stock', 'get_sources', 'update_sources', 'check_salable'])
        .describe('Inventory action'),
      sku: z
        .string()
        .optional()
        .describe('Product SKU (for get_stock, get_sources, check_salable)'),
      stockId: z
        .number()
        .optional()
        .describe('Stock ID to check salability against (for check_salable)'),
      sourceItems: z
        .array(sourceItemSchema)
        .optional()
        .describe('Source items to update (for update_sources)')
    })
  )
  .output(
    z.object({
      stockItem: z
        .object({
          itemId: z.number().optional().describe('Stock item ID'),
          productId: z.number().optional().describe('Product ID'),
          qty: z.number().optional().describe('Quantity in stock'),
          isInStock: z.boolean().optional().describe('Whether the product is in stock'),
          manageStock: z.boolean().optional().describe('Whether stock management is enabled')
        })
        .optional()
        .describe('Legacy stock item details'),
      sourceItems: z
        .array(
          z.object({
            sku: z.string().optional().describe('Product SKU'),
            sourceCode: z.string().optional().describe('Source code'),
            quantity: z.number().optional().describe('Quantity at source'),
            status: z.number().optional().describe('Source item status')
          })
        )
        .optional()
        .describe('Multi-source inventory items'),
      isSalable: z.boolean().optional().describe('Whether the product is salable'),
      updated: z.boolean().optional().describe('Whether source items were updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MagentoClient({
      storeUrl: ctx.config.storeUrl,
      storeCode: ctx.config.storeCode,
      token: ctx.auth.token
    });

    if (ctx.input.action === 'get_stock') {
      if (!ctx.input.sku) throw new Error('sku is required for get_stock action');
      let stock = await client.getStockItem(ctx.input.sku);
      return {
        output: {
          stockItem: {
            itemId: stock.item_id,
            productId: stock.product_id,
            qty: stock.qty,
            isInStock: stock.is_in_stock,
            manageStock: stock.manage_stock
          }
        },
        message: `Stock for **${ctx.input.sku}**: ${stock.qty} units (${stock.is_in_stock ? 'in stock' : 'out of stock'}).`
      };
    }

    if (ctx.input.action === 'get_sources') {
      if (!ctx.input.sku) throw new Error('sku is required for get_sources action');
      let result = await client.getSourceItems(ctx.input.sku);
      return {
        output: {
          sourceItems: result.items.map(s => ({
            sku: s.sku,
            sourceCode: s.source_code,
            quantity: s.quantity,
            status: s.status
          }))
        },
        message: `Found **${result.total_count}** source items for SKU \`${ctx.input.sku}\`.`
      };
    }

    if (ctx.input.action === 'update_sources') {
      if (!ctx.input.sourceItems || ctx.input.sourceItems.length === 0) {
        throw new Error('sourceItems are required for update_sources action');
      }
      await client.saveSourceItems(
        ctx.input.sourceItems.map(s => ({
          sku: s.sku,
          source_code: s.sourceCode,
          quantity: s.quantity,
          status: s.status
        }))
      );
      return {
        output: { updated: true },
        message: `Updated **${ctx.input.sourceItems.length}** source item(s).`
      };
    }

    // check_salable
    if (!ctx.input.sku) throw new Error('sku is required for check_salable action');
    if (ctx.input.stockId === undefined)
      throw new Error('stockId is required for check_salable action');
    let isSalable = await client.isProductSalable(ctx.input.sku, ctx.input.stockId);
    return {
      output: { isSalable },
      message: `Product \`${ctx.input.sku}\` is **${isSalable ? 'salable' : 'not salable'}** for stock \`${ctx.input.stockId}\`.`
    };
  })
  .build();
