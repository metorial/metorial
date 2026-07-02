import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoneybirdClient } from '../lib/client';
import { spec } from '../spec';

let productSchema = z.object({
  productId: z.string(),
  description: z.string().nullable(),
  title: z.string().nullable(),
  identifier: z.string().nullable(),
  price: z.string().nullable(),
  currency: z.string().nullable(),
  taxRateId: z.string().nullable(),
  ledgerAccountId: z.string().nullable(),
  frequency: z.number().nullable(),
  frequencyType: z.string().nullable(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable()
});

export let manageProducts = SlateTool.create(spec, {
  name: 'Manage Products',
  key: 'manage_products',
  description: `List, get, create, update, or delete products in the Moneybird product catalog. Products can be referenced when creating invoices and estimates to auto-fill line item details.`,
  instructions: [
    'Set "action" to control the operation.',
    'For "list", optionally filter by query or currency.',
    'For "get", provide productId or identifier.',
    'For "create" or "update", provide the product fields.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Operation to perform'),
      productId: z.string().optional().describe('Product ID (for get, update, delete)'),
      identifier: z
        .string()
        .optional()
        .describe('Product identifier/SKU (for get by identifier)'),
      query: z.string().optional().describe('Search query (for list)'),
      currency: z.string().optional().describe('Filter by currency (for list)'),
      page: z.number().optional().describe('Page number (for list)'),
      perPage: z.number().optional().describe('Results per page (for list)'),
      description: z.string().optional().describe('Product description (for create/update)'),
      title: z.string().optional().describe('Product title (for create/update)'),
      price: z.string().optional().describe('Product price (for create/update)'),
      taxRateId: z.string().optional().describe('Tax rate ID (for create/update)'),
      ledgerAccountId: z.string().optional().describe('Ledger account ID (for create/update)'),
      frequencyType: z
        .enum(['day', 'week', 'month', 'quarter', 'year'])
        .optional()
        .describe('Recurrence frequency type (for create/update)'),
      frequency: z
        .number()
        .optional()
        .describe('Recurrence frequency count (for create/update)')
    })
  )
  .output(
    z.object({
      product: productSchema.optional(),
      products: z.array(productSchema).optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MoneybirdClient({
      token: ctx.auth.token,
      administrationId: ctx.config.administrationId
    });

    let mapProduct = (p: any) => ({
      productId: String(p.id),
      description: p.description || null,
      title: p.title || null,
      identifier: p.identifier || null,
      price: p.price || null,
      currency: p.currency || null,
      taxRateId: p.tax_rate_id ? String(p.tax_rate_id) : null,
      ledgerAccountId: p.ledger_account_id ? String(p.ledger_account_id) : null,
      frequency: p.frequency ?? null,
      frequencyType: p.frequency_type || null,
      createdAt: p.created_at || null,
      updatedAt: p.updated_at || null
    });

    switch (ctx.input.action) {
      case 'list': {
        let products = await client.listProducts({
          query: ctx.input.query,
          currency: ctx.input.currency,
          page: ctx.input.page,
          perPage: ctx.input.perPage
        });
        let mapped = products.map(mapProduct);
        return {
          output: { products: mapped },
          message: `Found ${mapped.length} product(s).`
        };
      }
      case 'get': {
        let product: any;
        if (ctx.input.identifier) {
          product = await client.getProductByIdentifier(ctx.input.identifier);
        } else if (ctx.input.productId) {
          product = await client.getProduct(ctx.input.productId);
        } else {
          throw new Error('Either productId or identifier must be provided');
        }
        return {
          output: { product: mapProduct(product) },
          message: `Retrieved product **${product.description || product.title || product.id}**.`
        };
      }
      case 'create': {
        let productData: Record<string, any> = {};
        if (ctx.input.description) productData.description = ctx.input.description;
        if (ctx.input.title) productData.title = ctx.input.title;
        if (ctx.input.price) productData.price = ctx.input.price;
        if (ctx.input.identifier) productData.identifier = ctx.input.identifier;
        if (ctx.input.taxRateId) productData.tax_rate_id = ctx.input.taxRateId;
        if (ctx.input.ledgerAccountId)
          productData.ledger_account_id = ctx.input.ledgerAccountId;
        if (ctx.input.frequencyType) productData.frequency_type = ctx.input.frequencyType;
        if (ctx.input.frequency !== undefined) productData.frequency = ctx.input.frequency;
        let product = await client.createProduct(productData);
        return {
          output: { product: mapProduct(product) },
          message: `Created product **${product.description || product.id}**.`
        };
      }
      case 'update': {
        if (!ctx.input.productId) throw new Error('productId is required for update');
        let productData: Record<string, any> = {};
        if (ctx.input.description !== undefined)
          productData.description = ctx.input.description;
        if (ctx.input.title !== undefined) productData.title = ctx.input.title;
        if (ctx.input.price !== undefined) productData.price = ctx.input.price;
        if (ctx.input.identifier !== undefined) productData.identifier = ctx.input.identifier;
        if (ctx.input.taxRateId !== undefined) productData.tax_rate_id = ctx.input.taxRateId;
        if (ctx.input.ledgerAccountId !== undefined)
          productData.ledger_account_id = ctx.input.ledgerAccountId;
        if (ctx.input.frequencyType !== undefined)
          productData.frequency_type = ctx.input.frequencyType;
        if (ctx.input.frequency !== undefined) productData.frequency = ctx.input.frequency;
        let product = await client.updateProduct(ctx.input.productId, productData);
        return {
          output: { product: mapProduct(product) },
          message: `Updated product **${product.description || product.id}**.`
        };
      }
      case 'delete': {
        if (!ctx.input.productId) throw new Error('productId is required for delete');
        await client.deleteProduct(ctx.input.productId);
        return {
          output: { deleted: true },
          message: `Deleted product ${ctx.input.productId}.`
        };
      }
    }
  });
