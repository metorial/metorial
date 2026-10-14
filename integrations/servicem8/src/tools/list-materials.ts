import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listMaterials = SlateTool.create(spec, {
  name: 'List Materials',
  key: 'list_materials',
  description:
    'Find materials, products and labour rates in the ServiceM8 catalog. Use a returned materialUuid with manage_job_materials to add a catalog item to a job.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      filter: z
        .string()
        .optional()
        .describe("OData-style filter, such as active eq 1 or item_number eq 'PART-01'")
    })
  )
  .output(
    z.object({
      materials: z.array(
        z.object({
          materialUuid: z.string(),
          name: z.string().optional(),
          itemNumber: z.string().optional(),
          description: z.string().optional(),
          price: z.string().optional(),
          cost: z.string().optional(),
          quantityInStock: z.number().optional(),
          taxRateUuid: z.string().optional(),
          active: z.number().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let materials = await new Client(ctx.auth).listMaterials({ filter: ctx.input.filter });
    return {
      output: {
        materials: materials.map(material => ({
          materialUuid: material.uuid,
          name: material.name,
          itemNumber: material.item_number,
          description: material.item_description,
          price: material.price,
          cost: material.cost,
          quantityInStock:
            material.quantity_in_stock === undefined
              ? undefined
              : Number(material.quantity_in_stock),
          taxRateUuid: material.tax_rate_uuid,
          active: material.active
        }))
      },
      message: `Found **${materials.length}** catalog material(s).`
    };
  })
  .build();
