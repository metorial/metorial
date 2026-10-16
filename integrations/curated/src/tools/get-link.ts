import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { publicationIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getLink = SlateTool.create(spec, {
  name: 'Get Link',
  key: 'get_link',
  description:
    'Retrieve a collected link by ID, including its content and draft issue assignment. Call list_publications for a publication ID and list_links for link IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      publicationId: publicationIdSchema,
      linkId: z.string().describe('Link ID. Call list_links to discover collected link IDs.')
    })
  )
  .output(
    z.object({
      raw: z
        .unknown()
        .optional()
        .describe('Complete provider response, including additional metadata'),
      issueId: z
        .number()
        .nullable()
        .optional()
        .describe('Draft issue containing the link, or null for collected items'),
      createdAt: z.string().optional().describe('Date the link was collected'),
      updatedAt: z.string().optional().describe('Date the link was last updated'),
      linkId: z.number().describe('Unique identifier of the created link'),
      url: z.string().describe('URL of the link'),
      title: z.string().describe('Title of the link'),
      description: z.string().describe('Description of the link'),
      imageUrl: z.string().optional().describe('Image URL attached to the link'),
      category: z.string().optional().describe('Category code assigned to the link')
    })
  )
  .handleInvocation(async ctx => {
    let link = await new Client({ token: ctx.auth.token }).getLink(
      ctx.input.publicationId,
      ctx.input.linkId
    );
    return {
      output: {
        raw: link,
        linkId: link.id,
        url: link.url,
        title: link.title,
        description: link.description,
        imageUrl: link.image_url ?? undefined,
        category: link.category ?? undefined,
        issueId: link.issue_id,
        createdAt: link.created_at ?? undefined,
        updatedAt: link.updated_at ?? undefined
      },
      message: `Retrieved link **${link.id}**.`
    };
  })
  .build();
