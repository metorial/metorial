import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateForm = SlateTool.create(spec, {
  name: 'Update Form',
  key: 'update_form',
  description: `Update settings for a Paperform form, such as its title, description, custom slug, disabled status, space assignment, or translation. Provide only the fields you want to change.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      formSlugOrId: z.string().describe('The form slug, custom slug, or unique ID'),
      title: z.string().nullable().optional().describe('New form title'),
      description: z.string().nullable().optional().describe('New form description'),
      disabled: z.boolean().optional().describe('Whether the form is disabled'),
      customSlug: z.string().nullable().optional().describe('Custom URL slug'),
      spaceId: z.string().nullable().optional().describe('Space ID to move the form into'),
      translationId: z
        .string()
        .nullable()
        .optional()
        .describe('Translation ID for localization')
    })
  )
  .output(
    z.object({
      formId: z.string().describe('Unique form ID'),
      slug: z.string().describe('Form slug'),
      customSlug: z.string().nullable().describe('Custom slug'),
      title: z.string().nullable().describe('Form title'),
      description: z.string().nullable().describe('Form description'),
      url: z.string().describe('Form sharing URL'),
      live: z.boolean().describe('Whether the form is accepting submissions'),
      updatedAt: z.string().describe('Last update timestamp (UTC)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let f = await client.updateForm(ctx.input.formSlugOrId, {
      title: ctx.input.title,
      description: ctx.input.description,
      disabled: ctx.input.disabled,
      customSlug: ctx.input.customSlug,
      spaceId: ctx.input.spaceId,
      translationId: ctx.input.translationId
    });

    return {
      output: {
        formId: f.id,
        slug: f.slug,
        customSlug: f.custom_slug,
        title: f.title,
        description: f.description,
        url: f.url,
        live: f.live,
        updatedAt: f.updated_at_utc
      },
      message: `Updated form **${f.title || f.slug}**.`
    };
  })
  .build();
