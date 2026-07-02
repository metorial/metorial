import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTags = SlateTool.create(spec, {
  name: 'Manage Tags',
  key: 'manage_tags',
  description: `Get or update tags on a candidate, contact, company, or job. Use **action** "get" to retrieve current tags, "add" to append tags, or "replace" to replace all tags.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      resourceType: z
        .enum(['candidates', 'contacts', 'companies', 'jobs'])
        .describe('Type of record'),
      resourceId: z.string().describe('Record ID'),
      action: z
        .enum(['get', 'add', 'replace'])
        .describe('"get" to retrieve, "add" to append, "replace" to replace all tags'),
      tagNames: z
        .array(z.string())
        .optional()
        .describe('Tag names to add or replace (required for add/replace)')
    })
  )
  .output(
    z.object({
      tags: z
        .array(
          z.object({
            tagId: z.string().optional().describe('Tag ID'),
            tagName: z.string().optional().describe('Tag name')
          })
        )
        .optional()
        .describe('Current tags on the record'),
      updated: z.boolean().optional().describe('Whether tags were updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { resourceType, resourceId, action, tagNames } = ctx.input;

    if (action === 'get') {
      let data: any;
      if (resourceType === 'candidates') data = await client.getCandidateTags(resourceId);
      else if (resourceType === 'contacts') data = await client.getContactTags(resourceId);
      else if (resourceType === 'companies') data = await client.getCompanyTags(resourceId);
      else data = await client.getJobTags(resourceId);

      let tags = (data?._embedded?.tags ?? []).map((t: any) => ({
        tagId: t.id?.toString(),
        tagName: t.tag ?? t.name
      }));

      return {
        output: { tags, updated: false },
        message: `Found **${tags.length}** tag(s) on ${resourceType.slice(0, -1)} **${resourceId}**.`
      };
    }

    let names = tagNames ?? [];
    if (action === 'add') {
      if (resourceType === 'candidates') await client.attachCandidateTags(resourceId, names);
      else if (resourceType === 'contacts') await client.attachContactTags(resourceId, names);
      else if (resourceType === 'companies') await client.attachCompanyTags(resourceId, names);
      else await client.attachJobTags(resourceId, names);
    } else if (resourceType === 'candidates') {
      await client.replaceCandidateTags(resourceId, names);
    } else if (resourceType === 'contacts') {
      await client.attachContactTags(resourceId, names);
    } else if (resourceType === 'companies') {
      await client.attachCompanyTags(resourceId, names);
    } else {
      await client.attachJobTags(resourceId, names);
    }

    return {
      output: { updated: true },
      message: `${action === 'add' ? 'Added' : 'Replaced'} tags on ${resourceType.slice(0, -1)} **${resourceId}**.`
    };
  })
  .build();
