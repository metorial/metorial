import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requireZohoCrmArray } from '../lib/errors';
import { spec } from '../spec';

export let manageTags = SlateTool.create(spec, {
  name: 'Manage Tags',
  key: 'manage_tags',
  description: `List, add, or remove tags on CRM records.
Set **action** to "list" to view available tags for a module, "add" to tag records, or "remove" to untag records.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'add', 'remove']).describe('Action to perform'),
      module: z.string().describe('API name of the CRM module'),
      recordIds: z
        .array(z.string())
        .optional()
        .describe('IDs of records to add/remove tags from (required for "add" and "remove")'),
      tagNames: z
        .array(z.string())
        .optional()
        .describe('Tag names to add or remove (required for "add" and "remove")'),
      myTags: z
        .boolean()
        .optional()
        .describe('For "list", return only tags created by the current user.'),
      overWrite: z
        .boolean()
        .optional()
        .describe('For "add", replace existing record tags instead of appending.')
    })
  )
  .output(
    z.object({
      tags: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Available tags for the module (for "list" action)'),
      results: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Results of the add/remove operation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiBaseUrl: ctx.auth.apiBaseUrl
    });

    if (ctx.input.action === 'list') {
      let result = await client.getTags(ctx.input.module, ctx.input.myTags);
      let tagsList = result?.tags || [];
      return {
        output: { tags: tagsList },
        message: `Retrieved **${tagsList.length}** tag(s) for **${ctx.input.module}**.`
      };
    }

    if (ctx.input.action === 'add') {
      let recordIds = requireZohoCrmArray(ctx.input.recordIds, 'recordIds', 'add');
      let tagNames = requireZohoCrmArray(ctx.input.tagNames, 'tagNames', 'add');
      let result = await client.addTagsToRecords(
        ctx.input.module,
        recordIds,
        tagNames,
        ctx.input.overWrite
      );
      return {
        output: { results: result?.data || [] },
        message: `Added tags [${tagNames.join(', ')}] to **${recordIds.length}** record(s).`
      };
    }

    if (ctx.input.action === 'remove') {
      let recordIds = requireZohoCrmArray(ctx.input.recordIds, 'recordIds', 'remove');
      let tagNames = requireZohoCrmArray(ctx.input.tagNames, 'tagNames', 'remove');
      let result = await client.removeTagsFromRecords(ctx.input.module, recordIds, tagNames);
      return {
        output: { results: result?.data || [] },
        message: `Removed tags [${tagNames.join(', ')}] from **${recordIds.length}** record(s).`
      };
    }

    return {
      output: {},
      message: 'No action performed.'
    };
  })
  .build();
