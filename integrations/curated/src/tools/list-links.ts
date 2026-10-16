import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { publicationIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listLinks = SlateTool.create(spec, {
  name: 'List Collected Links',
  key: 'list_links',
  description: `Retrieve all collected links for a publication that have not yet been assigned to an issue. Use this to browse your link collection and find links to include in draft issues. Call list_publications to discover the publication ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      publicationId: publicationIdSchema
    })
  )
  .output(
    z.object({
      raw: z
        .unknown()
        .optional()
        .describe('Complete provider response, including additional metadata'),
      links: z.array(
        z.object({
          issueId: z
            .number()
            .nullable()
            .optional()
            .describe('Draft issue containing the link, or null for collected items'),
          createdAt: z.string().optional().describe('Date the link was collected'),
          updatedAt: z.string().optional().describe('Date the link was last updated'),
          linkId: z.number().describe('Unique identifier of the link'),
          url: z.string().describe('URL of the link'),
          title: z.string().describe('Title of the link'),
          description: z.string().describe('Description of the link'),
          imageUrl: z.string().optional().describe('Image URL attached to the link'),
          category: z.string().optional().describe('Category code the link is assigned to')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let links = await client.listLinks(ctx.input.publicationId);

    let mapped = links.map(link => ({
      issueId: link.issue_id,
      createdAt: link.created_at ?? undefined,
      updatedAt: link.updated_at ?? undefined,
      linkId: link.id,
      url: link.url,
      title: link.title,
      description: link.description,
      imageUrl: link.image_url ?? undefined,
      category: link.category ?? undefined
    }));

    return {
      output: {
        raw: links,
        links: mapped
      },
      message: `Found **${mapped.length}** collected link(s).`
    };
  })
  .build();
