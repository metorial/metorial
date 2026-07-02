import { SlateTool } from 'slates';
import { z } from 'zod';
import { IdpClient } from '../lib/idp-client';
import { spec } from '../spec';

let lineItemMeasurementSchema = z.object({
  quantity: z.number().optional().describe('The quantity for this measurement'),
  unit: z.string().optional().describe('The unit of measurement (e.g., "oz", "lb", "cup")')
});

let ingredientSchema = z.object({
  name: z.string().describe('Product name used to match against available items'),
  displayText: z
    .string()
    .optional()
    .describe('Display name shown to the user instead of the search name'),
  productIds: z
    .array(z.number())
    .optional()
    .describe('Specific Instacart product IDs to match'),
  upcs: z.array(z.string()).optional().describe('Universal Product Codes to match'),
  measurements: z
    .array(lineItemMeasurementSchema)
    .optional()
    .describe('Quantity and unit specifications'),
  filters: z
    .object({
      brandName: z.string().optional().describe('Filter by brand name'),
      healthAttributes: z
        .array(z.string())
        .optional()
        .describe('Filter by health attributes (e.g., "organic", "gluten_free")')
    })
    .optional()
    .describe('Filters to narrow product matching')
});

export let createRecipePage = SlateTool.create(spec, {
  name: 'Create Recipe Page',
  key: 'create_recipe_page',
  description: `Create a shoppable recipe page on Instacart Marketplace. Provide recipe details (title, ingredients, instructions) and receive a hosted URL where users can match ingredients to available products at nearby retailers and add them to their cart for delivery or pickup.

Requires **Developer Platform API key** authentication.`,
  instructions: [
    'Each ingredient name is used for product search matching — use descriptive product names rather than recipe ingredient descriptions.',
    'The returned URL links to an Instacart-hosted page; users complete checkout on Instacart.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      title: z.string().describe('The recipe title'),
      imageUrl: z
        .string()
        .optional()
        .describe('URL to the recipe image (recommended 500x500 pixels)'),
      author: z.string().optional().describe('Recipe creator name'),
      servings: z.number().optional().describe('Number of servings'),
      cookingTime: z.number().optional().describe('Cooking time in minutes'),
      externalReferenceId: z
        .string()
        .optional()
        .describe('External tracking ID for your reference'),
      expiresIn: z
        .number()
        .optional()
        .describe('Number of days until the link expires (max 365, default 30)'),
      instructions: z.array(z.string()).optional().describe('Cooking/preparation steps'),
      ingredients: z.array(ingredientSchema).describe('List of recipe ingredients'),
      landingPageConfiguration: z
        .object({
          partnerLinkbackUrl: z
            .string()
            .optional()
            .describe('URL to link back to your site from the recipe page'),
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
      productsLinkUrl: z.string().describe('URL to the hosted Instacart recipe page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IdpClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let result = await client.createRecipePage(ctx.input);

    return {
      output: result,
      message: `Recipe page created for **${ctx.input.title}** with ${ctx.input.ingredients.length} ingredient(s).\n\n[View Recipe Page](${result.productsLinkUrl})`
    };
  })
  .build();
