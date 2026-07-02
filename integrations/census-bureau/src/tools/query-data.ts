import { SlateTool } from 'slates';
import { z } from 'zod';
import { CensusDataClient } from '../lib/client';
import { spec } from '../spec';

export let queryData = SlateTool.create(spec, {
  name: 'Query Census Data',
  key: 'query_census_data',
  description: `Query statistical data from the Census Bureau Data API. Retrieves variables (e.g., population, income, housing characteristics) from a specific dataset, filtered by geographic area using FIPS codes.

Common datasets include:
- **acs/acs5** — American Community Survey 5-Year Estimates
- **acs/acs1** — American Community Survey 1-Year Estimates
- **dec/pl** — Decennial Census Redistricting Data
- **dec/dhc** — Decennial Census Demographic and Housing Characteristics
- **pep/population** — Population Estimates
- **timeseries/poverty/saipe** — Small Area Income and Poverty Estimates
- **timeseries/healthins/sahie** — Small Area Health Insurance Estimates

Geography is specified using the \`for\` and \`in\` clause format, e.g., \`county:*\` for all counties, \`state:06\` for California.`,
  instructions: [
    'Use the "Discover Datasets" tool first to find available datasets and their paths.',
    'Use the "Lookup Variables" tool to find valid variable names for a dataset.',
    'The `forGeography` field uses the format "level:code" (e.g., "state:*" for all states, "county:037" for LA County).',
    'The `inGeography` field narrows the scope (e.g., "state:06" to get counties within California).',
    'The API returns data as a 2D array where the first row contains column headers.'
  ],
  constraints: [
    'Maximum of 50 variables per query.',
    'Up to 500 queries per day without an API key.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      dataset: z
        .string()
        .describe(
          'Dataset path (e.g., "acs/acs5", "dec/pl", "pep/population", "timeseries/poverty/saipe")'
        ),
      vintage: z
        .string()
        .optional()
        .describe('Year of the dataset (e.g., "2022"). Required for non-timeseries datasets.'),
      variables: z
        .array(z.string())
        .describe(
          'Variable names to retrieve (e.g., ["NAME", "B01001_001E"] for name and total population). Max 50.'
        ),
      forGeography: z
        .string()
        .describe(
          'Geography level and FIPS code to query (e.g., "state:*", "county:037", "tract:*", "us:1")'
        ),
      inGeography: z
        .string()
        .optional()
        .describe(
          'Parent geography filter using "level:code" pairs separated by spaces (e.g., "state:06", "state:06 county:037")'
        ),
      predicates: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Additional predicate filters on variable values (e.g., {"STNAME": "California"})'
        )
    })
  )
  .output(
    z.object({
      headers: z.array(z.string()).describe('Column headers for the data'),
      rows: z
        .array(z.array(z.string()))
        .describe('Data rows, each row is an array of string values'),
      totalRows: z.number().describe('Total number of data rows returned (excluding header)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CensusDataClient(ctx.auth.token);

    let result = await client.queryData({
      dataset: ctx.input.dataset,
      vintage: ctx.input.vintage,
      variables: ctx.input.variables,
      forGeo: ctx.input.forGeography,
      inGeo: ctx.input.inGeography,
      predicates: ctx.input.predicates
    });

    let headers = result[0] || [];
    let rows = result.slice(1);

    return {
      output: {
        headers,
        rows,
        totalRows: rows.length
      },
      message: `Retrieved **${rows.length}** rows from **${ctx.input.dataset}**${ctx.input.vintage ? ` (${ctx.input.vintage})` : ''} with variables: ${ctx.input.variables.join(', ')}.`
    };
  })
  .build();
