import { SlateTool } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import { environmentIdInput } from '../lib/schemas';
import { spec } from '../spec';

export let deleteLanguageVariant = SlateTool.create(spec, {
  name: 'Delete Language Variant',
  key: 'delete_language_variant',
  description:
    'Deletes one language variant of a content item. Published variants must be unpublished first. When the deleted variant is the item last remaining variant, the parent content item is also deleted.',
  tags: { destructive: true }
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
      success: z.boolean().describe('Whether the variant deletion succeeded'),
      itemIdentifier: z.string().describe('Content item identifier used for the deletion'),
      languageCodename: z.string().describe('Language codename of the deleted variant')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ManagementClient({
      token: ctx.auth.token,
      environmentId: ctx.input.environmentId ?? ctx.config.environmentId
    });
    await client.deleteLanguageVariant(
      ctx.input.itemIdentifier,
      ctx.input.itemIdentifierType,
      ctx.input.languageCodename
    );
    return {
      output: {
        success: true,
        itemIdentifier: ctx.input.itemIdentifier,
        languageCodename: ctx.input.languageCodename
      },
      message: `Deleted the language variant of **${ctx.input.itemIdentifier}** in **${ctx.input.languageCodename}**.`
    };
  })
  .build();
