import { SlateTool } from 'slates';
import { z } from 'zod';
import { AttioClient } from '../lib/client';
import { spec } from '../spec';

export let listAttributesTool = SlateTool.create(spec, {
  name: 'List Attributes',
  key: 'list_attributes',
  description: `List all attribute definitions for an object or list. Returns attribute metadata including title, slug, type, and configuration. Useful for understanding the data model before creating or querying records.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      targetType: z
        .enum(['object', 'list'])
        .describe('Whether to list attributes on an object or a list'),
      targetSlug: z.string().describe('Object or list slug/ID to list attributes for')
    })
  )
  .output(
    z.object({
      attributes: z
        .array(
          z.object({
            attributeId: z.string().describe('The attribute ID'),
            apiSlug: z.string().describe('API slug for the attribute'),
            title: z.string().describe('Display name'),
            attributeType: z.string().describe('Attribute type (text, email, number, etc.)'),
            isRequired: z.boolean().describe('Whether the attribute is required'),
            isUnique: z.boolean().describe('Whether the attribute must be unique'),
            isMultiselect: z.boolean().describe('Whether the attribute is multi-select'),
            isArchived: z.boolean().describe('Whether the attribute is archived')
          })
        )
        .describe('Available attributes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AttioClient({ token: ctx.auth.token });

    let attributes: any;
    if (ctx.input.targetType === 'object') {
      attributes = await client.listObjectAttributes(ctx.input.targetSlug);
    } else {
      attributes = await client.listListAttributes(ctx.input.targetSlug);
    }

    let mapped = attributes.map((a: any) => ({
      attributeId: a.id?.attribute_id ?? '',
      apiSlug: a.api_slug ?? '',
      title: a.title ?? '',
      attributeType: a.type ?? '',
      isRequired: a.is_required ?? false,
      isUnique: a.is_unique ?? false,
      isMultiselect: a.is_multiselect ?? false,
      isArchived: a.is_archived ?? false
    }));

    return {
      output: { attributes: mapped },
      message: `Found **${mapped.length}** attribute(s) on ${ctx.input.targetType} **${ctx.input.targetSlug}**.`
    };
  })
  .build();
