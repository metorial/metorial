import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getValues = SlateTool.create(spec, {
  name: 'Get Values',
  key: 'get_values',
  description: `Retrieve lookup/reference values used across ForceManager entities.
Provides access to master data tables such as account types, account statuses, activity types, opportunity statuses, contact types, branches, segments, countries, and currencies.
Use this tool to discover valid IDs for reference fields on other entities.`,
  instructions: [
    'Use resourceName to specify which value list to retrieve. Common resource names: AccountType, AccountStatus, ActivityType, OpportunityStatus, ContactType, Branch, Segment, Country, Currency, Timezone.',
    'Omit resourceName to get a list of all available value tables.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      resourceName: z
        .string()
        .optional()
        .describe(
          'Name of the value table to query (e.g. "AccountType", "Country", "Currency"). Omit to list all available tables.'
        ),
      query: z.string().optional().describe('Optional query filter for the values')
    })
  )
  .output(
    z.object({
      values: z.array(z.any()).describe('List of value records'),
      totalCount: z.number().describe('Number of records returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    if (!ctx.input.resourceName) {
      let tables = await client.getValuesInfo();
      return {
        output: { values: tables, totalCount: tables.length },
        message: `Retrieved **${tables.length}** available value tables`
      };
    }

    let values = await client.getValues(ctx.input.resourceName, ctx.input.query);

    return {
      output: { values, totalCount: values.length },
      message: `Retrieved **${values.length}** value(s) from **${ctx.input.resourceName}**`
    };
  })
  .build();
