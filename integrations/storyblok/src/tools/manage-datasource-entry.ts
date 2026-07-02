import { SlateTool } from 'slates';
import { z } from 'zod';
import { StoryblokClient } from '../lib/client';
import { spec } from '../spec';

export let manageDatasourceEntry = SlateTool.create(spec, {
  name: 'Manage Datasource Entry',
  key: 'manage_datasource_entry',
  description: `Create, update, delete, or list entries within a datasource. Entries are key-value pairs that store structured data.`,
  instructions: [
    'To **create** an entry, set action to "create" and provide datasourceId, name, and value.',
    'To **update** an entry, set action to "update" and provide entryId plus fields to change.',
    'To **delete** an entry, set action to "delete" and provide entryId.',
    'To **list** entries, set action to "list" and provide datasourceId.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete', 'list'])
        .describe('The entry action to perform'),
      datasourceId: z
        .string()
        .optional()
        .describe('Datasource ID (required for create, list)'),
      entryId: z.string().optional().describe('Entry ID (required for update, delete)'),
      name: z.string().optional().describe('Key/name of the entry (required for create)'),
      value: z.string().optional().describe('Value of the entry (required for create)'),
      dimensionValue: z.string().optional().describe('Value for a specific dimension'),
      page: z.number().optional().describe('Page number for list pagination'),
      perPage: z.number().optional().describe('Entries per page for list')
    })
  )
  .output(
    z.object({
      entryId: z.number().optional().describe('ID of the affected entry'),
      name: z.string().optional().describe('Key/name of the entry'),
      value: z.string().optional().describe('Value of the entry'),
      entries: z
        .array(
          z.object({
            entryId: z.number().optional(),
            name: z.string().optional(),
            value: z.string().optional(),
            dimensionValue: z.string().optional()
          })
        )
        .optional()
        .describe('List of entries (for list action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StoryblokClient({
      token: ctx.auth.token,
      region: ctx.auth.region,
      spaceId: ctx.config.spaceId
    });

    let { action } = ctx.input;

    if (action === 'list') {
      if (!ctx.input.datasourceId) throw new Error('datasourceId is required to list entries');
      let entries = await client.listDatasourceEntries(ctx.input.datasourceId, {
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
      return {
        output: {
          entries: entries.map(e => ({
            entryId: e.id,
            name: e.name,
            value: e.value,
            dimensionValue: e.dimension_value
          }))
        },
        message: `Found **${entries.length}** entries.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.datasourceId)
        throw new Error('datasourceId is required to create an entry');
      if (!ctx.input.name) throw new Error('name is required to create an entry');
      if (ctx.input.value === undefined)
        throw new Error('value is required to create an entry');

      let entry = await client.createDatasourceEntry({
        name: ctx.input.name,
        value: ctx.input.value,
        datasourceId: ctx.input.datasourceId,
        dimensionValue: ctx.input.dimensionValue
      });
      return {
        output: { entryId: entry.id, name: entry.name, value: entry.value },
        message: `Created entry **${entry.name}** = \`${entry.value}\`.`
      };
    }

    if (!ctx.input.entryId) throw new Error('entryId is required for this action');

    if (action === 'delete') {
      await client.deleteDatasourceEntry(ctx.input.entryId);
      return {
        output: { entryId: Number.parseInt(ctx.input.entryId, 10) },
        message: `Deleted entry \`${ctx.input.entryId}\`.`
      };
    }

    // action === 'update'
    let entry = await client.updateDatasourceEntry(ctx.input.entryId, {
      name: ctx.input.name,
      value: ctx.input.value,
      dimensionValue: ctx.input.dimensionValue
    });
    return {
      output: { entryId: entry.id, name: entry.name, value: entry.value },
      message: `Updated entry **${entry.name}** = \`${entry.value}\`.`
    };
  })
  .build();
