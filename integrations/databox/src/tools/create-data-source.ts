import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { idempotencyInput } from '../lib/models';
import { spec } from '../spec';

export let createDataSource = SlateTool.create(spec, {
  name: 'Create Data Source',
  key: 'create_data_source',
  description: `Creates a new data source in Databox. A data source is a logical container for datasets, similar to an integration or connection. After creating a data source, you can create datasets within it and push data.`,
  instructions: [
    'Omit accountId to use the account associated with the v1 API key or the authenticated v2 organization. An explicit ID is the v1 request accountId or the v2 x-account-id header for an account enabled on the organization.',
    'Use the **List Timezones** tool to find a valid IANA timezone string if needed.'
  ]
})
  .input(
    z.object({
      accountId: z
        .number()
        .optional()
        .describe(
          'Optional target account: v1 account from list_accounts or v2 account ID sent as x-account-id. Omit for the API key’s default scope.'
        ),
      title: z.string().describe('Human-readable name for the data source'),
      idempotencyKey: idempotencyInput,
      timezone: z
        .string()
        .optional()
        .describe(
          'IANA timezone string (e.g. "UTC", "America/New_York"). Defaults to "UTC" in v1 and "Etc/UTC" in v2'
        )
    })
  )
  .output(
    z.object({
      dataSourceId: z.number().describe('Unique identifier of the created data source'),
      title: z.string().describe('Title of the data source'),
      created: z.string().describe('ISO 8601 creation timestamp'),
      timezone: z.string().describe('Timezone of the data source'),
      sourceKey: z
        .string()
        .describe('Non-secret internal integration identifier: v1 key or v2 integrationKey')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, apiVersion: ctx.config.apiVersion });
    let result = await client.createDataSource({
      accountId: ctx.input.accountId,
      title: ctx.input.title,
      timezone: ctx.input.timezone,
      idempotencyKey: ctx.input.idempotencyKey
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
