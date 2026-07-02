import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccountFields = SlateTool.create(spec, {
  name: 'Get Account Fields',
  key: 'get_account_fields',
  description: `Retrieve all available employee field definitions for the BambooHR account. Returns field IDs, names, types, and aliases. Useful for discovering what fields can be used in employee requests, reports, and webhook configurations.`,
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
    let client = new Client({
      token: ctx.auth.token,
      companyDomain: ctx.config.companyDomain
    });

    let data = await client.getFields();
    let fields = Array.isArray(data) ? data : [];

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
    let client = new Client({
      token: ctx.auth.token,
      companyDomain: ctx.config.companyDomain
    });

    let includes = ctx.input.include || ['lists', 'tables', 'users'];

    let output: any = {};
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
