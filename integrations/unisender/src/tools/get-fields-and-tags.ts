import { SlateTool } from 'slates';
import { z } from 'zod';
import { UnisenderClient } from '../lib/client';
import { spec } from '../spec';

export let getFieldsAndTags = SlateTool.create(spec, {
  name: 'Get Fields and Tags',
  key: 'get_fields_and_tags',
  description: `Retrieve custom contact fields and/or tags. Fields store additional contact data; tags are used for segmentation and targeting. Both are global across all lists.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeFields: z
        .boolean()
        .optional()
        .describe('Whether to include custom fields (default: true)'),
      includeTags: z.boolean().optional().describe('Whether to include tags (default: true)')
    })
  )
  .output(
    z.object({
      fields: z
        .array(
          z.object({
            fieldId: z.number().describe('Field ID'),
            name: z.string().describe('Field name'),
            fieldType: z.string().describe('Field data type'),
            isVisible: z.boolean().describe('Whether the field is visible'),
            viewPosition: z.number().describe('Display order position')
          })
        )
        .optional()
        .describe('Custom contact fields'),
      tags: z
        .array(
          z.object({
            tagId: z.number().describe('Tag ID'),
            name: z.string().describe('Tag name')
          })
        )
        .optional()
        .describe('Contact tags')
    })
  )
  .handleInvocation(async ctx => {
    let client = new UnisenderClient({
      token: ctx.auth.token,
      locale: ctx.config.locale
    });

    let includeFields = ctx.input.includeFields !== false;
    let includeTags = ctx.input.includeTags !== false;

    let fields: any;
    let tags: any;

    if (includeFields) {
      let rawFields = await client.getFields();
      fields = rawFields.map(f => ({
        fieldId: f.id,
        name: f.name,
        fieldType: f.type,
        isVisible: f.is_visible === 1,
        viewPosition: f.view_pos
      }));
    }

    if (includeTags) {
      let rawTags = await client.getTags();
      tags = rawTags.map(t => ({
        tagId: t.id,
        name: t.name
      }));
    }

    let parts: string[] = [];
    if (fields) parts.push(`**${fields.length}** field(s)`);
    if (tags) parts.push(`**${tags.length}** tag(s)`);

    return {
      output: { fields, tags },
      message: `Retrieved ${parts.join(' and ')}`
    };
  })
  .build();
