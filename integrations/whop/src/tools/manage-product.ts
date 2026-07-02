import { SlateTool } from 'slates';
import { z } from 'zod';
import { WhopClient } from '../lib/client';
import { spec } from '../spec';

let productOutputSchema = z.object({
  productId: z.string().describe('Unique product identifier'),
  title: z.string().describe('Product title'),
  visibility: z.string().nullable().describe('Product visibility status'),
  headline: z.string().nullable().describe('Short product headline'),
  description: z.string().nullable().describe('Product description'),
  route: z.string().nullable().describe('URL-friendly product route slug'),
  memberCount: z.number().describe('Number of members for this product'),
  createdAt: z.string().describe('ISO 8601 creation timestamp'),
  updatedAt: z.string().describe('ISO 8601 last update timestamp')
});

export let manageProduct = SlateTool.create(spec, {
  name: 'Manage Product',
  key: 'manage_product',
  description: `Create, update, retrieve, or delete a Whop product. Products represent what customers purchase access to (e.g., digital goods, memberships).
Use **action** to specify the operation: \`create\`, \`update\`, \`get\`, or \`delete\`.`,
  instructions: [
    'For "create": companyId and title are required.',
    'For "update" and "get": productId is required.',
    'For "delete": productId is required; returns a boolean success value.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'get', 'delete']).describe('Operation to perform'),
      productId: z
        .string()
        .optional()
        .describe('Product ID (required for get, update, delete)'),
      companyId: z
        .string()
        .optional()
        .describe('Company ID (required for create). Uses config companyId if not provided.'),
      title: z.string().optional().describe('Product title (max 40 chars)'),
      description: z.string().optional().describe('Product description'),
      headline: z.string().optional().describe('Short product headline'),
      visibility: z
        .enum(['visible', 'hidden', 'archived', 'quick_link'])
        .optional()
        .describe('Product visibility'),
      route: z.string().optional().describe('URL-friendly product route slug'),
      redirectPurchaseUrl: z.string().optional().describe('URL to redirect after purchase'),
      collectShippingAddress: z
        .boolean()
        .optional()
        .describe('Whether to collect shipping address'),
      sendWelcomeMessage: z.boolean().optional().describe('Whether to send a welcome message')
    })
  )
  .output(
    z.object({
      product: productOutputSchema.nullable().describe('Product data (null for delete)'),
      deleted: z.boolean().optional().describe('Whether the product was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WhopClient(ctx.auth.token);
    let { action } = ctx.input;

    if (action === 'get') {
      if (!ctx.input.productId) throw new Error('productId is required for get action');
      let p = await client.getProduct(ctx.input.productId);
      return {
        output: {
          product: {
            productId: p.id,
            title: p.title,
            visibility: p.visibility,
            headline: p.headline || null,
            description: p.description || null,
            route: p.route || null,
            memberCount: p.member_count || 0,
            createdAt: p.created_at,
            updatedAt: p.updated_at
          }
        },
        message: `Retrieved product **${p.title}** (\`${p.id}\`).`
      };
    }

    if (action === 'create') {
      let companyId = ctx.input.companyId || ctx.config.companyId;
      if (!companyId) throw new Error('companyId is required for create action');
      if (!ctx.input.title) throw new Error('title is required for create action');

      let p = await client.createProduct({
        companyId,
        title: ctx.input.title,
        description: ctx.input.description,
        headline: ctx.input.headline,
        visibility: ctx.input.visibility,
        route: ctx.input.route,
        redirectPurchaseUrl: ctx.input.redirectPurchaseUrl,
        collectShippingAddress: ctx.input.collectShippingAddress,
        sendWelcomeMessage: ctx.input.sendWelcomeMessage
      });

      return {
        output: {
          product: {
            productId: p.id,
            title: p.title,
            visibility: p.visibility,
            headline: p.headline || null,
            description: p.description || null,
            route: p.route || null,
            memberCount: p.member_count || 0,
            createdAt: p.created_at,
            updatedAt: p.updated_at
          }
        },
        message: `Created product **${p.title}** (\`${p.id}\`).`
      };
    }

    if (action === 'update') {
      if (!ctx.input.productId) throw new Error('productId is required for update action');

      let p = await client.updateProduct(ctx.input.productId, {
        title: ctx.input.title,
        description: ctx.input.description,
        headline: ctx.input.headline,
        visibility: ctx.input.visibility,
        route: ctx.input.route,
        redirectPurchaseUrl: ctx.input.redirectPurchaseUrl,
        collectShippingAddress: ctx.input.collectShippingAddress,
        sendWelcomeMessage: ctx.input.sendWelcomeMessage
      });

      return {
        output: {
          product: {
            productId: p.id,
            title: p.title,
            visibility: p.visibility,
            headline: p.headline || null,
            description: p.description || null,
            route: p.route || null,
            memberCount: p.member_count || 0,
            createdAt: p.created_at,
            updatedAt: p.updated_at
          }
        },
        message: `Updated product **${p.title}** (\`${p.id}\`).`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.productId) throw new Error('productId is required for delete action');
      let result = await client.deleteProduct(ctx.input.productId);
      return {
        output: {
          product: null,
          deleted: !!result
        },
        message: `Deleted product \`${ctx.input.productId}\`.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
