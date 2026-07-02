import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProductModules = SlateTool.create(spec, {
  name: 'List Product Modules',
  key: 'list_product_modules',
  description: `Retrieve all product modules for the current vendor. Modules define the licensing model used for each part of a product.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      modules: z
        .array(
          z.object({
            productModuleNumber: z.string().describe('Module identifier'),
            productNumber: z.string().optional().describe('Parent product number'),
            name: z.string().optional().describe('Module name'),
            active: z.boolean().optional().describe('Whether active'),
            licensingModel: z.string().optional().describe('Licensing model name')
          })
        )
        .describe('List of product modules')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let items = await client.listProductModules();
    let modules = items.map(item => ({
      productModuleNumber: item.number,
      productNumber: item.productNumber,
      name: item.name,
      active: item.active,
      licensingModel: item.licensingModel
    }));
    return {
      output: { modules },
      message: `Found **${modules.length}** product module(s).`
    };
  })
  .build();
