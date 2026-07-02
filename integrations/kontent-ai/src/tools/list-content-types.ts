import { SlateTool } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import { spec } from '../spec';

export let listContentTypes = SlateTool.create(spec, {
  name: 'List Content Types',
  key: 'list_content_types',
  description: `Retrieves content types from a Kontent.ai environment. Content types define the structure of content items including their elements (fields). Returns type metadata and element definitions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      continuationToken: z.string().optional().describe('Continuation token for pagination')
    })
  )
  .output(
    z.object({
      types: z.array(
        z.object({
          contentTypeId: z.string().describe('Internal ID of the content type'),
          name: z.string().describe('Name of the content type'),
          codename: z.string().describe('Codename of the content type'),
          externalId: z.string().optional().describe('External ID if set'),
          lastModified: z.string().describe('ISO 8601 timestamp'),
          elements: z
            .array(
              z.object({
                elementId: z.string().optional().describe('ID of the element'),
                name: z.string().describe('Name of the element'),
                codename: z.string().optional().describe('Codename of the element'),
                type: z
                  .string()
                  .describe(
                    'Type of the element (text, rich_text, number, date_time, asset, etc.)'
                  ),
                isRequired: z.boolean().optional().describe('Whether the element is required')
              })
            )
            .describe('Elements defined in the content type')
        })
      ),
      continuationToken: z.string().optional().describe('Token for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ManagementClient({
      token: ctx.auth.token,
      environmentId: ctx.config.environmentId
    });

    let result = await client.listContentTypes(ctx.input.continuationToken);

    let types = result.types.map(type => ({
      contentTypeId: type.id,
      name: type.name,
      codename: type.codename,
      externalId: type.external_id,
      lastModified: type.last_modified,
      elements: type.elements.map(el => ({
        elementId: el.id,
        name: el.name,
        codename: el.codename,
        type: el.type,
        isRequired: el.is_required
      }))
    }));

    return {
      output: {
        types,
        continuationToken: result.continuationToken
      },
      message: `Retrieved **${types.length}** content type(s).${result.continuationToken ? ' More available with continuation token.' : ''}`
    };
  })
  .build();
