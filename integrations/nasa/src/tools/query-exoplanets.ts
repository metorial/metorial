import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { NasaClient } from '../lib/client';
import { spec } from '../spec';

export let queryExoplanets = SlateTool.create(spec, {
  name: 'Query Exoplanet Archive',
  key: 'query_exoplanets',
  description: `Query NASA's Exoplanet Archive for data on confirmed exoplanets, stellar hosts, and related survey results. Uses the TAP (Table Access Protocol) interface to run queries against archive tables.`,
  instructions: [
    'Common tables: ps (planetary systems), pscomppars (planetary systems composite parameters), stellarhosts (stellar hosts).',
    'Use SQL-like WHERE clauses for filtering (e.g., "pl_bmasse < 2" for planets less than 2 Earth masses).',
    'Common columns for "ps" table: pl_name, hostname, discoverymethod, disc_year, pl_orbper, pl_rade, pl_bmasse, pl_eqt, sy_dist.'
  ],
  constraints: ['Results may be large; use select and where clauses to limit data returned.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      table: z
        .string()
        .describe('Archive table to query (e.g., "ps", "pscomppars", "stellarhosts")'),
      select: z
        .string()
        .optional()
        .describe(
          'Comma-separated column names to retrieve (SQL SELECT). Defaults to all columns.'
        ),
      where: z
        .string()
        .optional()
        .describe(
          'SQL WHERE clause for filtering (e.g., "disc_year = 2023 AND discoverymethod = \'Transit\'")'
        ),
      orderBy: z.string().optional().describe('SQL ORDER BY clause (e.g., "disc_year DESC")')
    })
  )
  .output(
    z.object({
      raw: z.any().optional().describe('Complete provider response'),
      rows: z.array(z.record(z.string(), z.any())).describe('Query result rows'),
      rowCount: z.number().describe('Number of rows returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NasaClient({ token: ctx.auth.token });

    let result = await client.queryExoplanetArchive({
      table: ctx.input.table,
      select: ctx.input.select,
      where: ctx.input.where,
      orderBy: ctx.input.orderBy
    });

    if (!Array.isArray(result)) {
      throw createApiServiceError(
        'NASA Exoplanet Archive did not return JSON rows. Check the table, column names, and query expressions.'
      );
    }
    let rows = result;

    return {
      output: { raw: result, rows, rowCount: rows.length },
      message: `Query returned **${rows.length}** rows from table "${ctx.input.table}".`
    };
  })
  .build();
