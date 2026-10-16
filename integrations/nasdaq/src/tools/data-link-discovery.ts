import { SlateTool } from 'slates';
import { z } from 'zod';
import { dataLinkBaseUrl, TablesClient } from '../lib/client';
import { encodeCode } from '../lib/http';
import { spec } from '../spec';

export let getDatabaseInfo = SlateTool.create(spec, {
  name: 'Get Database Info',
  key: 'get_database_info',
  description:
    'Retrieve metadata for a Nasdaq Data Link database. Call list_databases to discover database codes.',
  tags: { readOnly: true }
})
  .input(z.object({ databaseCode: z.string().describe('Database code from list_databases.') }))
  .output(
    z.object({
      database: z
        .record(z.string(), z.unknown())
        .describe(
          'Provider database metadata including its stable ID, code, name and subscription status.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let result = await new TablesClient({
      apiKey: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    }).getDatabaseMetadata(ctx.input.databaseCode);
    return {
      output: result,
      message: `Retrieved database **${result.database.database_code}**.`
    };
  })
  .build();

export let exportDatabase = SlateTool.create(spec, {
  name: 'Export Database',
  key: 'export_database',
  description:
    'Prepare a downloadable ZIP containing a Nasdaq Data Link time-series database. Call list_databases to discover the database code. This is separate from a table export.',
  constraints: [
    'The database must support bulk downloads and the API key must have access. Partial downloads contain the latest available updates.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      databaseCode: z.string().describe('Time-series database code from list_databases.'),
      downloadType: z
        .enum(['complete', 'partial'])
        .optional()
        .describe('Complete database or recent updates. Defaults to complete.')
    })
  )
  .output(
    z.object({
      databaseCode: z.string(),
      downloadType: z.enum(['complete', 'partial']),
      mimeType: z.string()
    })
  )
  .handleInvocation(async ctx => {
    new TablesClient({ apiKey: ctx.auth.token, authMethod: ctx.auth.authMethod });
    let code = encodeCode(ctx.input.databaseCode, 'Database code');
    let downloadType = ctx.input.downloadType ?? 'complete';
    await ctx.addAttachment({
      type: 'url',
      url: `${dataLinkBaseUrl}/databases/${code}/data`,
      query: { api_key: ctx.auth.token, download_type: downloadType },
      mimeType: 'application/zip'
    });
    return {
      output: {
        databaseCode: ctx.input.databaseCode,
        downloadType,
        mimeType: 'application/zip'
      },
      message: `Prepared database **${ctx.input.databaseCode}** for download.`
    };
  })
  .build();
