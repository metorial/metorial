import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConveyorClient } from '../lib/client';
import { spec } from '../spec';

let productLineSchema = z.object({
  productLineId: z.string().describe('Unique ID of the product line'),
  name: z.string().describe('Name of the product line'),
  programId: z.string().describe('ID of the associated program'),
  publiclyAccessible: z.boolean().describe('Whether the product line is publicly accessible'),
  inUse: z.boolean().describe('Whether the product line is currently in use'),
  createdAt: z.string().describe('When the product line was created'),
  updatedAt: z.string().describe('When the product line was last updated')
});

export let listProductLines = SlateTool.create(spec, {
  name: 'List Product Lines',
  key: 'list_product_lines',
  description: `Retrieve all product lines configured in your Conveyor account. Product lines are used to organize questionnaires and Trust Center content by product or service offering.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      productLines: z.array(productLineSchema).describe('List of product lines')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConveyorClient({ token: ctx.auth.token });

    let data = await client.listProductLines();
    let productLines = (data?._embedded?.product_lines || []).map((pl: any) => ({
      productLineId: pl.id,
      name: pl.name,
      programId: pl.program_id,
      publiclyAccessible: pl.publicly_accessible,
      inUse: pl.in_use,
      createdAt: pl.created_at,
      updatedAt: pl.updated_at
    }));

    return {
      output: { productLines },
      message: `Found **${productLines.length}** product lines.`
    };
  })
  .build();
