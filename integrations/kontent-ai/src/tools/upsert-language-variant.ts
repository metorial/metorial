import { SlateTool } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import { spec } from '../spec';

export let upsertLanguageVariant = SlateTool.create(spec, {
  name: 'Upsert Language Variant',
  key: 'upsert_language_variant',
  description: `Creates or updates a language variant for a content item. Only the provided elements are modified; omitted elements remain unchanged. Use this to set content values (text, rich text, numbers, dates, linked items, assets, taxonomy terms, etc.) on a content item in a specific language.`,
  instructions: [
    'Element codenames must match those defined in the content type.',
    'For linked items and assets, pass arrays of references (e.g., [{"codename": "item_codename"}] or [{"id": "asset-id"}]).',
    'For taxonomy elements, pass arrays of term references (e.g., [{"codename": "term_codename"}]).',
    'Rich text values should be valid HTML strings.'
  ]
})
  .input(
    z.object({
      itemIdentifier: z
        .string()
        .describe('The ID, codename, or external ID of the content item'),
      itemIdentifierType: z
        .enum(['id', 'codename', 'external_id'])
        .default('id')
        .describe('Type of item identifier'),
      languageCodename: z
        .string()
        .describe('Codename of the language for the variant (e.g., "en-US", "default")'),
      elements: z
        .array(
          z.object({
            elementCodename: z.string().describe('Codename of the element to set'),
            value: z
              .any()
              .describe(
                'Value for the element. Type depends on the element type (string, number, array, etc.)'
              )
          })
        )
        .describe('Array of element codename-value pairs to set on the variant')
    })
  )
  .output(
    z.object({
      itemId: z.string().describe('ID of the content item'),
      languageId: z.string().describe('ID of the language'),
      workflowStepId: z.string().optional().describe('Current workflow step ID'),
      lastModified: z.string().describe('ISO 8601 timestamp of last modification'),
      elementCount: z.number().describe('Number of elements in the variant')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ManagementClient({
      token: ctx.auth.token,
      environmentId: ctx.config.environmentId
    });

    let elements = ctx.input.elements.map(e => ({
      element: { codename: e.elementCodename },
      value: e.value
    }));

    let variant = await client.upsertLanguageVariant(
      ctx.input.itemIdentifier,
      ctx.input.itemIdentifierType,
      ctx.input.languageCodename,
      elements
    );

    return {
      output: {
        itemId: variant.item?.id || '',
        languageId: variant.language?.id || '',
        workflowStepId: variant.workflow_step?.id || variant.workflow?.step_identifier?.id,
        lastModified: variant.last_modified,
        elementCount: variant.elements?.length || 0
      },
      message: `Upserted language variant for item \`${ctx.input.itemIdentifier}\` in language \`${ctx.input.languageCodename}\` with ${ctx.input.elements.length} element(s).`
    };
  })
  .build();
