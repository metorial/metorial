import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listContentTypes = SlateTool.create(spec, {
  name: 'List Content Types',
  key: 'list_content_types',
  description: `List all content types in the current environment. Returns content type names, field definitions, and configuration details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Max content types to return (default 100).'),
      skip: z.number().optional().describe('Number to skip for pagination.')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of content types.'),
      contentTypes: z
        .array(
          z.object({
            contentTypeId: z.string().describe('Content type ID.'),
            name: z.string().describe('Display name.'),
            description: z.string().optional().describe('Content type description.'),
            displayField: z
              .string()
              .optional()
              .describe('Field used as the display/title field.'),
            fields: z
              .array(
                z.object({
                  fieldId: z.string().describe('Field ID.'),
                  name: z.string().describe('Field name.'),
                  type: z
                    .string()
                    .describe('Field type (e.g. Symbol, Text, Integer, Link, Array).'),
                  required: z.boolean().optional().describe('Whether the field is required.'),
                  localized: z
                    .boolean()
                    .optional()
                    .describe('Whether the field supports localization.'),
                  linkType: z
                    .string()
                    .optional()
                    .describe('Link type if type is Link (Entry or Asset).')
                })
              )
              .describe('Field definitions.'),
            publishedAt: z.string().optional().describe('ISO 8601 publish timestamp.')
          })
        )
        .describe('List of content types.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let params: Record<string, string | number | boolean> = {};
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.skip) params.skip = ctx.input.skip;

    let result = await client.getContentTypes(params);
    let items = result.items || [];

    let contentTypes = items.map((ct: any) => ({
      contentTypeId: ct.sys?.id,
      name: ct.name,
      description: ct.description,
      displayField: ct.displayField,
      fields: (ct.fields || []).map((f: any) => ({
        fieldId: f.id,
        name: f.name,
        type: f.type,
        required: f.required,
        localized: f.localized,
        linkType: f.linkType
      })),
      publishedAt: ct.sys?.publishedAt
    }));

    return {
      output: {
        total: result.total || 0,
        contentTypes
      },
      message: `Found **${result.total || 0}** content types.`
    };
  })
  .build();
