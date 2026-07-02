import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let propertyInsuranceItemSchema = z
  .object({
    itemId: z.string().optional().describe('Unique identifier of the property insurance item'),
    name: z.string().optional().describe('Name of the item'),
    siteId: z.string().optional().describe('Associated site ID'),
    value: z.number().optional().describe('Value of the item')
  })
  .passthrough();

export let listPropertyInsuranceItems = SlateTool.create(spec, {
  name: 'List Property Insurance Items',
  key: 'list_property_insurance_items',
  description: `Retrieve property and insurance-related items from 21RISK, including value collection and risk improvement data. Useful for property insurance assessments and risk quantification.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      filter: z.string().optional().describe('OData $filter expression'),
      select: z.string().optional().describe('Comma-separated list of fields to return'),
      expand: z.string().optional().describe('Related entities to expand'),
      orderby: z.string().optional().describe('Sort order'),
      top: z.number().optional().describe('Maximum number of records to return'),
      skip: z.number().optional().describe('Number of records to skip for pagination')
    })
  )
  .output(
    z.object({
      items: z.array(propertyInsuranceItemSchema).describe('List of property insurance items'),
      count: z.number().describe('Number of items returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let items = await client.getPropertyInsuranceItems({
      filter: ctx.input.filter,
      select: ctx.input.select,
      expand: ctx.input.expand,
      orderby: ctx.input.orderby,
      top: ctx.input.top,
      skip: ctx.input.skip
    });

    let results = Array.isArray(items) ? items : [items];

    return {
      output: {
        items: results,
        count: results.length
      },
      message: `Retrieved **${results.length}** property insurance item(s).`
    };
  })
  .build();
