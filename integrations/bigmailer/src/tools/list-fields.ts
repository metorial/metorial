import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listFields = SlateTool.create(spec, {
  name: 'List Custom Fields',
  key: 'list_fields',
  description: `List all custom fields defined for a brand. Returns field names, data types, merge tag names, and sample values used for test campaigns.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      brandId: z.string().describe('ID of the brand'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of fields to return (1-100). Defaults to 10.'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      hasMore: z.boolean().describe('Whether more fields exist beyond this page'),
      cursor: z.string().describe('Cursor for fetching the next page'),
      total: z.number().describe('Total number of fields'),
      fields: z.array(
        z.object({
          fieldId: z.string().describe('Field unique identifier'),
          name: z.string().describe('Field display name'),
          fieldType: z.string().describe('Field data type (text, integer, date, email)'),
          mergeTagName: z.string().describe('Merge tag reference name'),
          sampleValue: z.string().describe('Sample value for test campaigns'),
          createdAt: z.string().describe('Creation timestamp (ISO 8601)')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.listFields(ctx.input.brandId, {
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let fields = result.data.map(f => ({
      fieldId: f.id,
      name: f.name,
      fieldType: f.type,
      mergeTagName: f.merge_tag_name,
      sampleValue: f.sample_value,
      createdAt: new Date(f.created * 1000).toISOString()
    }));

    return {
      output: {
        hasMore: result.has_more,
        cursor: result.cursor,
        total: result.total,
        fields
      },
      message: `Found **${result.total}** field(s). Returned **${fields.length}** field(s)${result.has_more ? ' (more available)' : ''}.`
    };
  })
  .build();
