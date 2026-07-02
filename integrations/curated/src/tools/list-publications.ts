import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPublications = SlateTool.create(spec, {
  name: 'List Publications',
  key: 'list_publications',
  description: `Retrieve all publications associated with your Curated account. Returns each publication's ID, name, and subdomain key. Use this to find publication IDs needed for other operations.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      publications: z.array(
        z.object({
          publicationId: z.number().describe('Unique identifier of the publication'),
          name: z.string().describe('Display name of the publication'),
          subdomain: z.string().describe('Curated subdomain key for the publication')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let publications = await client.listPublications();

    let mapped = publications.map(pub => ({
      publicationId: pub.id,
      name: pub.name,
      subdomain: pub.key
    }));

    return {
      output: { publications: mapped },
      message: `Found **${mapped.length}** publication(s): ${mapped.map(p => `${p.name} (ID: ${p.publicationId})`).join(', ')}`
    };
  })
  .build();
