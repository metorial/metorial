import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createLink = SlateTool.create(spec, {
  name: 'Create Link',
  key: 'create_link',
  description: `Collect a new link for a publication. The link is added to the publication's collected items and can later be moved into a draft issue. You can optionally specify a title, description, image, and category.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      publicationId: z.string().describe('ID of the publication'),
      url: z.string().describe('URL of the link to collect'),
      title: z.string().optional().describe('Title for the link'),
      description: z.string().optional().describe('Description for the link'),
      imageUrl: z.string().optional().describe('Image URL to attach to the link'),
      category: z.string().optional().describe('Category code to assign the link to')
    })
  )
  .output(
    z.object({
      linkId: z.number().describe('Unique identifier of the created link'),
      url: z.string().describe('URL of the link'),
      title: z.string().describe('Title of the link'),
      description: z.string().describe('Description of the link'),
      imageUrl: z.string().optional().describe('Image URL attached to the link'),
      category: z.string().optional().describe('Category code assigned to the link')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let link = await client.createLink(ctx.input.publicationId, {
      url: ctx.input.url,
      title: ctx.input.title,
      description: ctx.input.description,
      image: ctx.input.imageUrl,
      category: ctx.input.category
    });

    return {
      output: {
        linkId: link.id,
        url: link.url,
        title: link.title,
        description: link.description,
        imageUrl: link.image_url,
        category: link.category
      },
      message: `Created link **"${link.title || link.url}"** (ID: ${link.id}).`
    };
  })
  .build();
