import { SlateTool } from 'slates';
import { z } from 'zod';
import { AttioClient } from '../lib/client';
import { spec } from '../spec';

export let getListsTool = SlateTool.create(spec, {
  name: 'Get Lists',
  key: 'get_lists',
  description: `Retrieve all lists in the workspace, or get details for a specific list. Lists organize records into structured collections (e.g. sales pipelines, recruitment pipelines).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      listSlug: z
        .string()
        .optional()
        .describe('Specific list slug or ID. If omitted, returns all lists.')
    })
  )
  .output(
    z.object({
      lists: z
        .array(
          z.object({
            listId: z.string().describe('The list ID'),
            apiSlug: z.string().describe('API slug for the list'),
            name: z.string().describe('List display name'),
            parentObject: z.array(z.string()).describe('Parent object slugs'),
            createdAt: z.string().describe('When the list was created')
          })
        )
        .describe('Lists in the workspace')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AttioClient({ token: ctx.auth.token });

    if (ctx.input.listSlug) {
      let list = await client.getList(ctx.input.listSlug);
      let mapped = [
        {
          listId: list.id?.list_id ?? '',
          apiSlug: list.api_slug ?? '',
          name: list.name ?? '',
          parentObject: list.parent_object ?? [],
          createdAt: list.created_at ?? ''
        }
      ];
      return {
        output: { lists: mapped },
        message: `Retrieved list **${mapped[0]!.name}**.`
      };
    }

    let lists = await client.listLists();

    let mapped = lists.map((l: any) => ({
      listId: l.id?.list_id ?? '',
      apiSlug: l.api_slug ?? '',
      name: l.name ?? '',
      parentObject: l.parent_object ?? [],
      createdAt: l.created_at ?? ''
    }));

    return {
      output: { lists: mapped },
      message: `Found **${mapped.length}** list(s).`
    };
  })
  .build();

export let addListEntryTool = SlateTool.create(spec, {
  name: 'Add List Entry',
  key: 'add_list_entry',
  description: `Add a record to a list as an entry, or update an existing entry using upsert. When **upsert** is true, creates the entry if the record isn't already in the list, or updates it if it is.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      listSlug: z.string().describe('List slug or ID to add the entry to'),
      parentRecordId: z.string().describe('The record ID to add to the list'),
      parentObject: z
        .string()
        .describe('The object slug the record belongs to (e.g. "people", "companies")'),
      entryValues: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional attribute values for the list entry'),
      upsert: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, creates or updates the entry based on the parent record')
    })
  )
  .output(
    z.object({
      entryId: z.string().describe('The entry ID'),
      listId: z.string().describe('The list ID'),
      parentRecordId: z.string().describe('The parent record ID'),
      createdAt: z.string().describe('When the entry was created'),
      entryValues: z.record(z.string(), z.any()).describe('Entry attribute values')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AttioClient({ token: ctx.auth.token });

    let entry: any;
    if (ctx.input.upsert) {
      entry = await client.assertListEntry(
        ctx.input.listSlug,
        ctx.input.parentRecordId,
        ctx.input.parentObject,
        ctx.input.entryValues
      );
    } else {
      entry = await client.createListEntry(
        ctx.input.listSlug,
        ctx.input.parentRecordId,
        ctx.input.parentObject,
        ctx.input.entryValues
      );
    }

    let output = {
      entryId: entry.id?.entry_id ?? '',
      listId: entry.id?.list_id ?? '',
      parentRecordId: entry.parent_record_id ?? '',
      createdAt: entry.created_at ?? '',
      entryValues: entry.entry_values ?? {}
    };

    return {
      output,
      message: `Added record **${ctx.input.parentRecordId}** to list **${ctx.input.listSlug}** as entry **${output.entryId}**.`
    };
  })
  .build();

export let updateListEntryTool = SlateTool.create(spec, {
  name: 'Update List Entry',
  key: 'update_list_entry',
  description: `Update attribute values on an existing list entry. By default multi-select values are appended; set **overwriteMultiselect** to replace them entirely.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      listSlug: z.string().describe('List slug or ID'),
      entryId: z.string().describe('The entry ID to update'),
      entryValues: z
        .record(z.string(), z.any())
        .describe('Attribute values to update, keyed by attribute slug'),
      overwriteMultiselect: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, replaces multi-select values instead of appending')
    })
  )
  .output(
    z.object({
      entryId: z.string().describe('The entry ID'),
      listId: z.string().describe('The list ID'),
      parentRecordId: z.string().describe('The parent record ID'),
      createdAt: z.string().describe('When the entry was created'),
      entryValues: z.record(z.string(), z.any()).describe('Updated entry attribute values')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AttioClient({ token: ctx.auth.token });

    let entry = await client.updateListEntry(
      ctx.input.listSlug,
      ctx.input.entryId,
      ctx.input.entryValues,
      ctx.input.overwriteMultiselect
    );

    let output = {
      entryId: entry.id?.entry_id ?? '',
      listId: entry.id?.list_id ?? '',
      parentRecordId: entry.parent_record_id ?? '',
      createdAt: entry.created_at ?? '',
      entryValues: entry.entry_values ?? {}
    };

    return {
      output,
      message: `Updated entry **${output.entryId}** in list **${ctx.input.listSlug}**.`
    };
  })
  .build();

export let deleteListEntryTool = SlateTool.create(spec, {
  name: 'Delete List Entry',
  key: 'delete_list_entry',
  description: `Remove a record from a list by deleting its entry. This does not delete the underlying record.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      listSlug: z.string().describe('List slug or ID'),
      entryId: z.string().describe('The entry ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the entry was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AttioClient({ token: ctx.auth.token });
    await client.deleteListEntry(ctx.input.listSlug, ctx.input.entryId);

    return {
      output: { deleted: true },
      message: `Removed entry **${ctx.input.entryId}** from list **${ctx.input.listSlug}**.`
    };
  })
  .build();

export let queryListEntriesTool = SlateTool.create(spec, {
  name: 'Query List Entries',
  key: 'query_list_entries',
  description: `Query and filter entries in a list. Supports the same filter and sort syntax as record queries. Useful for retrieving entries from sales pipelines, recruitment stages, etc.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      listSlug: z.string().describe('List slug or ID'),
      filter: z.any().optional().describe('Filter expression'),
      sorts: z.array(z.any()).optional().describe('Sort specification array'),
      limit: z.number().optional().default(50).describe('Maximum entries to return (max 500)'),
      offset: z.number().optional().default(0).describe('Number of entries to skip')
    })
  )
  .output(
    z.object({
      entries: z
        .array(
          z.object({
            entryId: z.string().describe('The entry ID'),
            listId: z.string().describe('The list ID'),
            parentRecordId: z.string().describe('The parent record ID'),
            createdAt: z.string().describe('When the entry was created'),
            entryValues: z.record(z.string(), z.any()).describe('Entry attribute values')
          })
        )
        .describe('Matching entries'),
      count: z.number().describe('Number of entries returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AttioClient({ token: ctx.auth.token });

    let entries = await client.queryListEntries(ctx.input.listSlug, {
      filter: ctx.input.filter,
      sorts: ctx.input.sorts,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let mapped = entries.map((e: any) => ({
      entryId: e.id?.entry_id ?? '',
      listId: e.id?.list_id ?? '',
      parentRecordId: e.parent_record_id ?? '',
      createdAt: e.created_at ?? '',
      entryValues: e.entry_values ?? {}
    }));

    return {
      output: {
        entries: mapped,
        count: mapped.length
      },
      message: `Found **${mapped.length}** entry/entries in list **${ctx.input.listSlug}**.`
    };
  })
  .build();
