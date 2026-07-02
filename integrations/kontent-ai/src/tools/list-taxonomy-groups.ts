import { SlateTool } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import { spec } from '../spec';

let taxonomyTermSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    termId: z.string().optional().describe('Internal ID of the term'),
    name: z.string().describe('Name of the term'),
    codename: z.string().optional().describe('Codename of the term'),
    externalId: z.string().optional().describe('External ID if set'),
    terms: z.array(taxonomyTermSchema).describe('Child terms')
  })
);

export let listTaxonomyGroups = SlateTool.create(spec, {
  name: 'List Taxonomy Groups',
  key: 'list_taxonomy_groups',
  description: `Retrieves all taxonomy groups with their hierarchical term structures. Taxonomy groups are used to categorize and classify content items.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      taxonomyGroups: z.array(
        z.object({
          taxonomyGroupId: z.string().describe('Internal ID of the taxonomy group'),
          name: z.string().describe('Name of the taxonomy group'),
          codename: z.string().describe('Codename of the taxonomy group'),
          externalId: z.string().optional().describe('External ID if set'),
          lastModified: z.string().describe('ISO 8601 timestamp'),
          terms: z.array(taxonomyTermSchema).describe('Hierarchical terms')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new ManagementClient({
      token: ctx.auth.token,
      environmentId: ctx.config.environmentId
    });

    let groups = await client.listTaxonomyGroups();

    let mapTerms = (terms: any[]): any[] =>
      terms.map(t => ({
        termId: t.id,
        name: t.name,
        codename: t.codename,
        externalId: t.external_id,
        terms: mapTerms(t.terms || [])
      }));

    let taxonomyGroups = groups.map(g => ({
      taxonomyGroupId: g.id,
      name: g.name,
      codename: g.codename,
      externalId: g.external_id,
      lastModified: g.last_modified,
      terms: mapTerms(g.terms || [])
    }));

    return {
      output: { taxonomyGroups },
      message: `Retrieved **${taxonomyGroups.length}** taxonomy group(s).`
    };
  })
  .build();
