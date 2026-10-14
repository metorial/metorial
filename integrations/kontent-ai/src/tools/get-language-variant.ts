import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import { environmentIdInput } from '../lib/schemas';
import { spec } from '../spec';

export let getLanguageVariant = SlateTool.create(spec, {
  name: 'Get Language Variant',
  key: 'get_language_variant',
  description:
    'Retrieves the latest version of one content item in a specific language, including element values and workflow identifiers. If a draft and a published version both exist, returns the draft. Deactivated languages cannot be retrieved.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      environmentId: environmentIdInput,
      itemIdentifier: z.string().min(1).describe('Content item ID, codename, or external ID'),
      itemIdentifierType: z
        .enum(['id', 'codename', 'external_id'])
        .default('id')
        .describe('Type of content item identifier'),
      languageCodename: z.string().min(1).describe('Language codename from list_languages')
    })
  )
  .output(
    z.object({
      itemId: z.string().describe('Internal content item ID'),
      languageId: z.string().describe('Internal language ID'),
      workflowId: z.string().optional().describe('Current workflow ID'),
      workflowStepId: z.string().optional().describe('Current workflow step ID'),
      lastModified: z.string().describe('ISO 8601 modification timestamp'),
      elements: z
        .array(
          z
            .object({
              element: z
                .object({
                  id: z.string().optional(),
                  codename: z.string().optional(),
                  external_id: z.string().optional()
                })
                .describe('Element reference'),
              value: z.any().describe('Element value in the provider representation')
            })
            .passthrough()
        )
        .describe(
          'Element values with additional provider fields such as rich text components and URL slug mode'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new ManagementClient({
      token: ctx.auth.token,
      environmentId: ctx.input.environmentId ?? ctx.config.environmentId
    });
    let variant = await client.getLanguageVariant(
      ctx.input.itemIdentifier,
      ctx.input.itemIdentifierType,
      ctx.input.languageCodename
    );
    if (!variant.item?.id || !variant.language?.id) {
      throw createApiServiceError(
        'Kontent.ai returned a language variant without its item or language ID.'
      );
    }
    return {
      output: {
        itemId: variant.item.id,
        languageId: variant.language.id,
        workflowId: variant.workflow?.workflow_identifier?.id,
        workflowStepId: variant.workflow?.step_identifier?.id ?? variant.workflow_step?.id,
        lastModified: variant.last_modified,
        elements: variant.elements.map(element => ({ ...element }))
      },
      message: `Retrieved the latest language variant of **${ctx.input.itemIdentifier}** in **${ctx.input.languageCodename}**.`
    };
  })
  .build();
