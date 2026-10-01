import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../../../spec';
import { BiginClient } from '../lib/client';

export let listTags = SlateTool.create(spec, {
  name: 'Bigin List Tags',
  key: 'bigin_list_tags',
  description: `Retrieve all tags defined for a specific Bigin module.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      module: z
        .enum(['Contacts', 'Accounts', 'Pipelines', 'Products', 'Tasks', 'Events', 'Calls'])
        .describe('Module API name to retrieve tags for')
    })
  )
  .output(
    z.object({
      tags: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of tag objects with id and name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BiginClient({
      token: ctx.auth.token,
      apiDomain: ctx.auth.apiDomain
    });

    let result = await client.getTags(ctx.input.module);
    let tagsList = result.tags || [];

    return {
      output: { tags: tagsList },
      message: `Retrieved **${tagsList.length}** tag(s) for **${ctx.input.module}**.`
    };
  })
  .build();

export let createTag = SlateTool.create(spec, {
  name: 'Bigin Create Tags',
  key: 'bigin_create_tags',
  description: `Create new tags in a Bigin module. Tags can be later added to records for categorization.`
})
  .input(
    z.object({
      module: z
        .enum(['Contacts', 'Accounts', 'Pipelines', 'Products', 'Tasks', 'Events', 'Calls'])
        .describe('Module API name to create tags in'),
      tagNames: z.array(z.string().min(1)).min(1).describe('Names of the tags to create')
    })
  )
  .output(
    z.object({
      tags: z.array(z.record(z.string(), z.any())).describe('Created tag objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BiginClient({
      token: ctx.auth.token,
      apiDomain: ctx.auth.apiDomain
    });

    let result = await client.createTag(ctx.input.module, ctx.input.tagNames);
    let tagsList = result.tags || [];

    return {
      output: { tags: tagsList },
      message: `Created **${ctx.input.tagNames.length}** tag(s) in **${ctx.input.module}**: ${ctx.input.tagNames.join(', ')}.`
    };
  })
  .build();

export let addTagsToRecords = SlateTool.create(spec, {
  name: 'Bigin Add Tags to Records',
  key: 'bigin_add_tags_to_records',
  description: `Add one or more tags to one or more records in a Bigin module. Tags must already exist in the module or will be auto-created.`
})
  .input(
    z.object({
      module: z
        .enum(['Contacts', 'Accounts', 'Pipelines', 'Products', 'Tasks', 'Events', 'Calls'])
        .describe('Module API name'),
      recordIds: z.array(z.string().min(1)).min(1).describe('IDs of the records to tag'),
      tagNames: z.array(z.string().min(1)).min(1).describe('Names of the tags to add'),
      overWrite: z
        .boolean()
        .optional()
        .describe(
          'If true, existing tags on the records will be replaced. Default is false (append).'
        )
    })
  )
  .output(
    z.object({
      status: z.string().describe('Operation status'),
      message: z.string().optional().describe('Status message'),
      results: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Individual record outcomes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BiginClient({
      token: ctx.auth.token,
      apiDomain: ctx.auth.apiDomain
    });

    let result = await client.addTagsToRecords(
      ctx.input.module,
      ctx.input.recordIds,
      ctx.input.tagNames,
      ctx.input.overWrite
    );
    let results = result?.data ?? [];
    if (!results.length)
      throw createApiServiceError('Bigin returned no tag mutation results.');
    let firstItem = results[0];
    let status = results.every((item: any) => item.status === 'success') ? 'success' : 'error';

    return {
      output: {
        status,
        message: firstItem?.message,
        results
      },
      message: `Tag operation status: **${status}**. Added tag(s) **${ctx.input.tagNames.join(', ')}** to **${ctx.input.recordIds.length}** record(s) in **${ctx.input.module}**.`
    };
  })
  .build();

export let removeTagsFromRecord = SlateTool.create(spec, {
  name: 'Bigin Remove Tags from Record',
  key: 'bigin_remove_tags_from_record',
  description: `Remove one or more tags from a specific record.`
})
  .input(
    z.object({
      module: z
        .enum(['Contacts', 'Accounts', 'Pipelines', 'Products', 'Tasks', 'Events', 'Calls'])
        .describe('Module API name'),
      recordId: z.string().describe('ID of the record to remove tags from'),
      tagNames: z.array(z.string().min(1)).min(1).describe('Names of the tags to remove')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Operation status'),
      message: z.string().optional().describe('Status message'),
      results: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Individual record outcomes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BiginClient({
      token: ctx.auth.token,
      apiDomain: ctx.auth.apiDomain
    });

    let result = await client.removeTagsFromRecord(
      ctx.input.module,
      ctx.input.recordId,
      ctx.input.tagNames
    );
    let results = result?.data ?? [];
    if (!results.length)
      throw createApiServiceError('Bigin returned no tag mutation results.');
    let firstItem = results[0];
    let status = results.every((item: any) => item.status === 'success') ? 'success' : 'error';

    return {
      output: {
        status,
        message: firstItem?.message,
        results
      },
      message: `Tag operation status: **${status}**. Removed tag(s) **${ctx.input.tagNames.join(', ')}** from record **${ctx.input.recordId}** in **${ctx.input.module}**.`
    };
  })
  .build();
