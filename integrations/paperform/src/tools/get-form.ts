import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getForm = SlateTool.create(spec, {
  name: 'Get Form',
  key: 'get_form',
  description: `Retrieve detailed information about a specific Paperform form, including its title, description, status, URL, submission count, and tags. Identify the form by its slug, custom slug, or ID.`,
  instructions: [
    'Prefer using the form ID over the slug when possible, as custom slugs can change.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formSlugOrId: z.string().describe('The form slug, custom slug, or unique ID')
    })
  )
  .output(
    z.object({
      formId: z.string().describe('Unique form ID'),
      slug: z.string().describe('Form slug'),
      customSlug: z.string().nullable().describe('Custom slug if set'),
      title: z.string().nullable().describe('Form title'),
      description: z.string().nullable().describe('Form description'),
      coverImageUrl: z.string().nullable().describe('Cover image URL'),
      url: z.string().describe('Form sharing URL'),
      additionalUrls: z.array(z.string()).describe('Additional form URLs'),
      live: z.boolean().describe('Whether the form is accepting submissions'),
      submissionCount: z.number().describe('Total number of submissions'),
      spaceId: z.number().describe('Space ID containing the form'),
      tags: z.array(z.string()).nullable().describe('Tags assigned to the form'),
      createdAt: z.string().describe('Creation timestamp (UTC)'),
      updatedAt: z.string().describe('Last update timestamp (UTC)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let f = await client.getForm(ctx.input.formSlugOrId);

    return {
      output: {
        formId: f.id,
        slug: f.slug,
        customSlug: f.custom_slug,
        title: f.title,
        description: f.description,
        coverImageUrl: f.cover_image_url,
        url: f.url,
        additionalUrls: f.additional_urls,
        live: f.live,
        submissionCount: f.submission_count,
        spaceId: f.space_id,
        tags: f.tags,
        createdAt: f.created_at_utc,
        updatedAt: f.updated_at_utc
      },
      message: `Retrieved form **${f.title || f.slug}** (${f.live ? 'live' : 'not live'}, ${f.submission_count} submissions).`
    };
  })
  .build();
