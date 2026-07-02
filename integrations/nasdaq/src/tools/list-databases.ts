import { SlateTool } from 'slates';
import { z } from 'zod';
import { TablesClient } from '../lib/client';
import { spec } from '../spec';

export let listDatabases = SlateTool.create(spec, {
  name: 'List Databases',
  key: 'list_databases',
  description: `Browse available databases on Nasdaq Data Link. Returns a paginated list of databases with their codes, descriptions, dataset counts, and subscription status.
Use this to discover available data providers and databases.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      perPage: z.number().optional().describe('Number of databases per page.'),
      page: z.number().optional().describe('Page number for pagination.')
    })
  )
  .output(
    z.object({
      databases: z
        .array(
          z.object({
            databaseId: z.number().describe('Unique database ID.'),
            databaseCode: z.string().describe('Database code.'),
            name: z.string().describe('Database name.'),
            description: z.string().describe('Database description.'),
            datasetsCount: z.number().describe('Number of datasets in the database.'),
            downloads: z.number().describe('Total number of downloads.'),
            premium: z.boolean().describe('Whether a subscription is required.')
          })
        )
        .describe('Available databases.'),
      totalCount: z.number().describe('Total number of databases.'),
      currentPage: z.number().describe('Current page number.'),
      totalPages: z.number().describe('Total number of pages.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TablesClient({ apiKey: ctx.auth.token });

    let response = await client.listDatabases({
      perPage: ctx.input.perPage,
      page: ctx.input.page
    });

    let databases = response.databases.map(db => ({
      databaseId: db.id,
      databaseCode: db.database_code,
      name: db.name,
      description: db.description || '',
      datasetsCount: db.datasets_count,
      downloads: db.downloads,
      premium: db.premium
    }));

    return {
      output: {
        databases,
        totalCount: response.meta.total_count,
        currentPage: response.meta.current_page,
        totalPages: response.meta.total_pages
      },
      message: `Listed **${databases.length}** databases (page ${response.meta.current_page} of ${response.meta.total_pages}, ${response.meta.total_count} total).`
    };
  })
  .build();
