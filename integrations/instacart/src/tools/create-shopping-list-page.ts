import { SlateTool } from 'slates';
import { z } from 'zod';
import { IdpClient } from '../lib/idp-client';
import { spec } from '../spec';

let lineItemSchema = z.object({
  name: z.string().describe('Product name used to match against available items'),
  quantity: z.number().optional().describe('Quantity of the item (defaults to 1.0)'),
  unit: z.string().optional().describe('Unit of measurement (defaults to "each")'),
  displayText: z.string().optional().describe('Display name shown to the user'),
  productIds: z
    .array(z.number())
    .optional()
    .describe('Specific Instacart product IDs to match'),
  upcs: z.array(z.string()).optional().describe('Universal Product Codes to match'),
  filters: z
    .object({
      brandName: z.string().optional().describe('Filter by brand name'),
      healthAttributes: z.array(z.string()).optional().describe('Filter by health attributes')
    })
    .optional()
    .describe('Filters to narrow product matching')
});

export let createShoppingListPage = SlateTool.create(spec, {
  name: 'Create Shopping List Page',
  key: 'create_shopping_list_page',
  description: `Create a smart shopping list page on Instacart Marketplace. Provide a list of products and receive a hosted URL where users can view matched products at nearby retailers and add them to their cart.

Requires **Developer Platform API key** authentication.`,
  instructions: [
    'Use descriptive product names for best search matching results.',
    'Set linkType to "recipe" if this shopping list is based on a recipe context.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Title of the shopping list'),
      imageUrl: z
        .string()
        .optional()
        .describe('URL to the shopping list image (recommended 500x500 pixels)'),
      linkType: z
        .enum(['shopping_list', 'recipe'])
        .optional()
        .describe('Type of page to generate (defaults to "shopping_list")'),
      expiresIn: z
        .number()
        .optional()
        .describe('Number of days until the link expires (max 365)'),
      instructions: z
        .array(z.string())
        .optional()
        .describe('Additional context or instructions'),
      lineItems: z.array(lineItemSchema).describe('Products to include in the shopping list'),
      landingPageConfiguration: z
        .object({
          partnerLinkbackUrl: z.string().optional().describe('URL to link back to your site'),
          enablePantryItems: z
            .boolean()
            .optional()
            .describe('Whether to enable pantry item suggestions')
        })
        .optional()
        .describe('Landing page behavior settings')
    })
  )
  .output(
    z.object({
      productsLinkUrl: z.string().describe('URL to the hosted Instacart shopping list page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IdpClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let result = await client.createShoppingListPage(ctx.input);

    return {
      output: result,
      message: `Shopping list page created: **${ctx.input.title}** with ${ctx.input.lineItems.length} item(s).\n\n[View Shopping List](${result.productsLinkUrl})`
    };
  })
  .build();
