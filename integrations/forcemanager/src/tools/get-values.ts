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
    'Use resourceName to specify a built-in reference resource, such as AccountType, AccountStatus, ActivityType, OpportunityStatus, ContactType, Branch, Segment, Country, Currency, or Timezone.',
    'Omit resourceName to discover custom value tables. Use their databaseName as resourceName to retrieve their values.'
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
          'Name of the value table to query (e.g. "AccountType", "Country", "Currency"). Omit to list custom tables.'
        ),
      query: z.string().optional().describe('Optional query filter for the values'),
      page: z.number().int().nonnegative().optional().describe('Page number (0-indexed)')
    })
  )
  .output(
    z.object({
      values: z.array(z.any()).describe('List of value records'),
      totalCount: z.number().describe('Number of records returned'),
      nextPage: z
        .number()
        .nullable()
        .describe('Request this page until an empty page returns null')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    if (!ctx.input.resourceName) {
      let result = await client.getValuesInfo(ctx.input.page);
      return {
        output: {
          values: result.records,
          totalCount: result.records.length,
          nextPage: result.nextPage
        },
        message: `Retrieved **${result.records.length}** custom value tables`
      };
    }

    let result = await client.getValues(
      ctx.input.resourceName,
      ctx.input.query,
      ctx.input.page
    );

    return {
      output: {
        values: result.records,
        totalCount: result.records.length,
        nextPage: result.nextPage
      },
      message: `Retrieved **${result.records.length}** value(s) from **${ctx.input.resourceName}**`
    };
  })
  .build();
