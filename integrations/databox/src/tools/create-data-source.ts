import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createDataSource = SlateTool.create(spec, {
  name: 'Create Data Source',
  key: 'create_data_source',
  description: `Creates a new data source in Databox. A data source is a logical container for datasets, similar to an integration or connection. After creating a data source, you can create datasets within it and push data.`,
  instructions: [
    'Use the **List Accounts** tool first to get a valid accountId.',
    'Use the **List Timezones** tool to find a valid IANA timezone string if needed.'
  ]
})
  .input(
    z.object({
      accountId: z
        .number()
        .describe('ID of the Databox account to associate this data source with'),
      title: z.string().describe('Human-readable name for the data source'),
      timezone: z
        .string()
        .optional()
        .describe('IANA timezone string (e.g. "UTC", "America/New_York"). Defaults to "UTC"')
    })
  )
  .output(
    z.object({
      dataSourceId: z.number().describe('Unique identifier of the created data source'),
      title: z.string().describe('Title of the data source'),
      created: z.string().describe('ISO 8601 creation timestamp'),
      timezone: z.string().describe('Timezone of the data source'),
      sourceKey: z.string().describe('Data source key')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createDataSource({
      accountId: ctx.input.accountId,
      title: ctx.input.title,
      timezone: ctx.input.timezone
    });

    return {
      output: {
        dataSourceId: result.id,
        title: result.title,
        created: result.created,
        timezone: result.timezone,
        sourceKey: result.key
      },
      message: `Created data source **"${result.title}"** (ID: ${result.id}) with timezone **${result.timezone}**.`
    };
  })
  .build();
