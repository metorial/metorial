import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { collection, requiredId } from '../lib/response';
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
      let items = await client.getRecordTags(resourceType, resourceId);

      let tags = items.map((t: any) => ({
        tagId: t.id?.toString(),
        tagName: t.title ?? t.tag ?? t.name ?? undefined
      }));

      return {
        output: { tags, updated: false },
        message: `Found **${tags.length}** tag(s) on ${resourceType.slice(0, -1)} **${resourceId}**.`
      };
    }

    if (tagNames === undefined)
      throw createApiServiceError(
        'tagNames is required for add and replace. Pass [] explicitly to remove all tags with replace.'
      );
    if (action === 'add' && tagNames.length === 0)
      throw createApiServiceError('Provide at least one tag name to add.');
    let available: Record<string, any>[] = [];
    if (tagNames.length) {
      for (let page = 1; ; page++) {
        let data = await client.listTags({ page, perPage: 100 });
        let tags = collection(data, 'tags');
        available.push(...tags);
        if (
          tags.length < 100 ||
          (typeof data.total === 'number' && available.length >= data.total)
        )
          break;
        if (page >= 1000) throw createApiServiceError('Too many tag pages to resolve names.');
      }
    }
    let tags = [...new Set(tagNames)].map(name => {
      let matches = available.filter(tag => tag.title === name);
      if (matches.length !== 1)
        throw createApiServiceError(
          `Tag "${name}" was not found uniquely. Use list_tags to choose an existing, unambiguous tag name.`
        );
      return { id: Number(requiredId(matches[0]?.id, 'tag')) };
    });
    if (action === 'add') await client.attachTags(resourceType, resourceId, tags);
    else await client.replaceTags(resourceType, resourceId, tags);

    return {
      output: { updated: true },
      message: `${action === 'add' ? 'Added' : 'Replaced'} tags on ${resourceType.slice(0, -1)} **${resourceId}**.`
    };
  })
  .build();
