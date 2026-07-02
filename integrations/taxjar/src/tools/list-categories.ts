import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCategories = SlateTool.create(spec, {
  name: 'List Product Tax Categories',
  key: 'list_categories',
  description: `List all supported product tax categories and their corresponding tax codes. Use these codes in tax calculations and transactions to apply correct product-level exemption rules (e.g. clothing, food, software, digital goods).`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      categories: z
        .array(
          z.object({
            productTaxCode: z
              .string()
              .describe('Product tax code identifier to use in calculations'),
            name: z.string().describe('Category name'),
            description: z.string().describe('Category description')
          })
        )
        .describe('All available product tax categories')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment,
      apiVersion: ctx.config.apiVersion
    });

    let categories = await client.listCategories();

    let output = {
      categories: categories.map(c => ({
        productTaxCode: c.product_tax_code,
        name: c.name,
        description: c.description
      }))
    };

    return {
      output,
      message: `Found **${categories.length}** product tax categories.`
    };
  })
  .build();
