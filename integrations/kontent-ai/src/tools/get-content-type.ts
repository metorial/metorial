import { SlateTool } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import { spec } from '../spec';

export let getContentType = SlateTool.create(spec, {
  name: 'Get Content Type',
  key: 'get_content_type',
  description: `Retrieves a single content type with full details including all element definitions, content groups, and constraints. Useful for understanding the structure of content items before creating or updating them.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      identifier: z.string().describe('The ID, codename, or external ID of the content type'),
      identifierType: z
        .enum(['id', 'codename', 'external_id'])
        .default('id')
        .describe('Type of identifier provided')
    })
  )
  .output(
    z.object({
      contentTypeId: z.string().describe('Internal ID of the content type'),
      name: z.string().describe('Name of the content type'),
      codename: z.string().describe('Codename of the content type'),
      externalId: z.string().optional().describe('External ID if set'),
      lastModified: z.string().describe('ISO 8601 timestamp'),
      contentGroups: z
        .array(
          z.object({
            groupId: z.string().optional().describe('ID of the content group'),
            name: z.string().describe('Name of the content group'),
            codename: z.string().optional().describe('Codename of the content group')
          })
        )
        .optional()
        .describe('Content groups defined in the type'),
      elements: z
        .array(
          z.object({
            elementId: z.string().optional().describe('ID of the element'),
            name: z.string().describe('Name of the element'),
            codename: z.string().optional().describe('Codename of the element'),
            type: z.string().describe('Type of the element'),
            isRequired: z.boolean().optional().describe('Whether the element is required'),
            guidelines: z.string().optional().describe('Guidelines text for the element')
          })
        )
        .describe('Elements defined in the content type')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ManagementClient({
      token: ctx.auth.token,
      environmentId: ctx.config.environmentId
    });

    let type = await client.getContentType(ctx.input.identifier, ctx.input.identifierType);

    return {
      output: {
        contentTypeId: type.id,
        name: type.name,
        codename: type.codename,
        externalId: type.external_id,
        lastModified: type.last_modified,
        contentGroups: type.content_groups?.map(g => ({
          groupId: g.id,
          name: g.name,
          codename: g.codename
        })),
        elements: type.elements.map(el => ({
          elementId: el.id,
          name: el.name,
          codename: el.codename,
          type: el.type,
          isRequired: el.is_required,
          guidelines: el.guidelines
        }))
      },
      message: `Retrieved content type **"${type.name}"** with ${type.elements.length} element(s).`
    };
  })
  .build();
