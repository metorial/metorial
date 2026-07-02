import { SlateTool } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import { spec } from '../spec';

export let getContentItem = SlateTool.create(spec, {
  name: 'Get Content Item',
  key: 'get_content_item',
  description: `Retrieves a single content item by its ID, codename, or external ID. Returns the item metadata and optionally its language variants with element values.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      identifier: z.string().describe('The ID, codename, or external ID of the content item'),
      identifierType: z
        .enum(['id', 'codename', 'external_id'])
        .default('id')
        .describe('Type of identifier provided'),
      includeVariants: z
        .boolean()
        .default(false)
        .describe('Whether to also fetch language variants for this item')
    })
  )
  .output(
    z.object({
      contentItemId: z.string().describe('Internal ID of the content item'),
      name: z.string().describe('Name of the content item'),
      codename: z.string().describe('Codename of the content item'),
      typeId: z.string().optional().describe('ID of the content type'),
      collectionId: z.string().optional().describe('ID of the collection'),
      externalId: z.string().optional().describe('External ID if set'),
      lastModified: z.string().describe('ISO 8601 timestamp of last modification'),
      variants: z
        .array(
          z.object({
            languageId: z.string().describe('ID of the language'),
            elements: z.array(
              z.object({
                elementId: z.string().optional().describe('ID of the element'),
                value: z.any().describe('Value of the element')
              })
            ),
            workflowStepId: z.string().optional().describe('Current workflow step ID'),
            lastModified: z.string().describe('ISO 8601 timestamp of last modification')
          })
        )
        .optional()
        .describe('Language variants if includeVariants is true')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ManagementClient({
      token: ctx.auth.token,
      environmentId: ctx.config.environmentId
    });

    let item = await client.getContentItem(ctx.input.identifier, ctx.input.identifierType);

    let variants: any;
    if (ctx.input.includeVariants) {
      let rawVariants = await client.listLanguageVariants(item.id, 'id');
      variants = rawVariants.map(v => ({
        languageId: v.language?.id || '',
        elements: v.elements.map(e => ({
          elementId: e.element?.id,
          value: e.value
        })),
        workflowStepId: v.workflow_step?.id || v.workflow?.step_identifier?.id,
        lastModified: v.last_modified
      }));
    }

    return {
      output: {
        contentItemId: item.id,
        name: item.name,
        codename: item.codename,
        typeId: item.type?.id,
        collectionId: item.collection?.id,
        externalId: item.external_id,
        lastModified: item.last_modified,
        variants
      },
      message: `Retrieved content item **"${item.name}"** (codename: \`${item.codename}\`).${variants ? ` Found ${variants.length} language variant(s).` : ''}`
    };
  })
  .build();
