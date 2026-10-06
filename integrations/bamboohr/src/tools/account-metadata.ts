import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { spec } from '../spec';

export let getAccountFields = SlateTool.create(spec, {
  name: 'Get Account Fields',
  key: 'get_account_fields',
  description: `Retrieve visible employee field definitions, including field IDs, names, types and aliases for employee reads, writes and reports.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(z.object({}))
  .output(
    z.object({
      fields: z.array(z.record(z.string(), z.any())).describe('List of field definitions')
    })
  )
  .handleInvocation(async ctx => {
    let client = clientFor(ctx);

    let data = await client.getFields();
    let fields = data;

    return {
      output: {
        fields
      },
      message: `Retrieved **${fields.length}** field definitions.`
    };
  })
  .build();

export let getAccountMetadata = SlateTool.create(spec, {
  name: 'Get Account Metadata',
  key: 'get_account_metadata',
  description: `Retrieve company-level metadata including list values (e.g., departments, locations, divisions), table definitions, and user accounts. Useful for discovering valid values for fields and understanding the data model.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      include: z
        .array(z.enum(['lists', 'tables', 'users']))
        .optional()
        .describe('Which metadata to include. Defaults to all.')
    })
  )
  .output(
    z.object({
      lists: z
        .any()
        .optional()
        .describe('List definitions and values (departments, locations, etc.)'),
      tables: z.any().optional().describe('Table definitions'),
      users: z.any().optional().describe('User accounts')
    })
  )
  .handleInvocation(async ctx => {
    let client = clientFor(ctx);

    let includes = ctx.input.include || ['lists', 'tables', 'users'];

    let output: { lists?: unknown; tables?: unknown; users?: unknown } = {};
    let promises: Promise<void>[] = [];

    if (includes.includes('lists')) {
      promises.push(
        client.getLists().then(d => {
          output.lists = d;
        })
      );
    }
    if (includes.includes('tables')) {
      promises.push(
        client.getTables().then(d => {
          output.tables = d;
        })
      );
    }
    if (includes.includes('users')) {
      promises.push(
        client.getUsers().then(d => {
          output.users = d;
        })
      );
    }

    await Promise.all(promises);

    return {
      output,
      message: `Retrieved account metadata: ${includes.join(', ')}.`
    };
  })
  .build();
