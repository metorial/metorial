import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAttributes = SlateTool.create(spec, {
  name: 'List Attributes',
  key: 'list_attributes',
  description: `Retrieve custom attribute definitions from BoxHero. Attributes are additional metadata fields (e.g., Category, Expiration Date, Safety Stock) that can be attached to items. Supported types include text, number, date, and barcode.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      attributes: z
        .array(
          z.object({
            attributeId: z.number().describe('Unique attribute ID'),
            name: z.string().describe('Attribute name'),
            type: z.string().describe('Attribute data type (text, number, date, barcode)'),
            rank: z.number().optional().describe('Display sort order')
          })
        )
        .describe('List of attribute definitions'),
      raw: z.unknown().optional().describe('Original response returned by BoxHero')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.listAttributes();

    let attributes = response.items.map(attr => ({
      attributeId: attr.id,
      name: attr.attr_name,
      type: attr.attr_type,
      rank: attr.rank
    }));

    return {
      output: { attributes, raw: response },
      message: `Retrieved ${attributes.length} attribute definition(s).`
    };
  })
  .build();
