import { SlateTool } from 'slates';
import { z } from 'zod';
import { BiginClient } from '../lib/client';
import { spec } from '../spec';

export let listTags = SlateTool.create(spec, {
  name: 'List Tags',
  key: 'list_tags',
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
  name: 'Create Tags',
  key: 'create_tags',
  description: `Create new tags in a Bigin module. Tags can be later added to records for categorization.`
})
  .input(
    z.object({
      module: z
        .enum(['Contacts', 'Accounts', 'Pipelines', 'Products', 'Tasks', 'Events', 'Calls'])
        .describe('Module API name to create tags in'),
      tagNames: z.array(z.string()).describe('Names of the tags to create')
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
  name: 'Add Tags to Records',
  key: 'add_tags_to_records',
  description: `Add one or more tags to one or more records in a Bigin module. Tags must already exist in the module or will be auto-created.`
})
  .input(
    z.object({
      module: z
        .enum(['Contacts', 'Accounts', 'Pipelines', 'Products', 'Tasks', 'Events', 'Calls'])
        .describe('Module API name'),
      recordIds: z.array(z.string()).describe('IDs of the records to tag'),
      tagNames: z.array(z.string()).describe('Names of the tags to add'),
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
      message: z.string().optional().describe('Status message')
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
    let firstItem = result.data?.[0];

    return {
      output: {
        status: firstItem?.status || 'success',
        message: firstItem?.message
      },
      message: `Added tag(s) **${ctx.input.tagNames.join(', ')}** to **${ctx.input.recordIds.length}** record(s) in **${ctx.input.module}**.`
    };
  })
  .build();

export let removeTagsFromRecord = SlateTool.create(spec, {
  name: 'Remove Tags from Record',
  key: 'remove_tags_from_record',
  description: `Remove one or more tags from a specific record.`
})
  .input(
    z.object({
      module: z
        .enum(['Contacts', 'Accounts', 'Pipelines', 'Products', 'Tasks', 'Events', 'Calls'])
        .describe('Module API name'),
      recordId: z.string().describe('ID of the record to remove tags from'),
      tagNames: z.array(z.string()).describe('Names of the tags to remove')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Operation status'),
      message: z.string().optional().describe('Status message')
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
    let firstItem = result.data?.[0];

    return {
      output: {
        status: firstItem?.status || 'success',
        message: firstItem?.message
      },
      message: `Removed tag(s) **${ctx.input.tagNames.join(', ')}** from record **${ctx.input.recordId}** in **${ctx.input.module}**.`
    };
  })
  .build();
