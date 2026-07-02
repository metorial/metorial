import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLinks = SlateTool.create(spec, {
  name: 'List Collected Links',
  key: 'list_links',
  description: `Retrieve all collected links for a publication that have not yet been assigned to an issue. Use this to browse your link collection and find links to include in draft issues.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      publicationId: z.string().describe('ID of the publication')
    })
  )
  .output(
    z.object({
      links: z.array(
        z.object({
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

    let mapped = (Array.isArray(links) ? links : []).map(link => ({
      linkId: link.id,
      url: link.url,
      title: link.title,
      description: link.description,
      imageUrl: link.image_url,
      category: link.category
    }));

    return {
      output: { links: mapped },
      message: `Found **${mapped.length}** collected link(s).`
    };
  })
  .build();
