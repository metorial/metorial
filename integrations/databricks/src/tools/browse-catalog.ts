import { SlateTool } from 'slates';
import { z } from 'zod';
import { DatabricksClient } from '../lib/client';
import { databricksServiceError } from '../lib/errors';
import { spec } from '../spec';

export let browseCatalog = SlateTool.create(spec, {
  name: 'Browse Unity Catalog',
  key: 'browse_catalog',
  description: `Navigate the Unity Catalog hierarchy: list catalogs, schemas within a catalog, tables within a schema, or get details of a specific table. Provides governance metadata including owners, comments, and data types.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      level: z
        .enum(['catalogs', 'schemas', 'tables', 'table_detail'])
        .describe('Which level of the catalog to browse'),
      catalogName: z
        .string()
        .optional()
        .describe('Catalog name (required for schemas, tables, table_detail)'),
      schemaName: z.string().optional().describe('Schema name (required for tables)'),
      tableName: z
        .string()
        .optional()
        .describe('Full table name "catalog.schema.table" (required for table_detail)')
    })
  )
  .output(
    z.object({
      catalogs: z
        .array(
          z.object({
            catalogName: z.string().describe('Catalog name'),
            owner: z.string().optional().describe('Owner of the catalog'),
            comment: z.string().optional().describe('Catalog comment'),
            catalogType: z.string().optional().describe('Catalog type')
          })
        )
        .optional()
        .describe('List of catalogs'),
      schemas: z
        .array(
          z.object({
            schemaName: z.string().describe('Full schema name (catalog.schema)'),
            owner: z.string().optional().describe('Schema owner'),
            comment: z.string().optional().describe('Schema comment')
          })
        )
        .optional()
        .describe('List of schemas'),
      tables: z
        .array(
          z.object({
            tableName: z.string().describe('Full table name'),
            tableType: z.string().optional().describe('TABLE, VIEW, etc.'),
            owner: z.string().optional().describe('Table owner'),
            comment: z.string().optional().describe('Table comment'),
            dataSourceFormat: z
              .string()
              .optional()
              .describe('Storage format (DELTA, PARQUET, etc.)')
          })
        )
        .optional()
        .describe('List of tables'),
      tableDetail: z
        .object({
          tableName: z.string().describe('Full table name'),
          tableType: z.string().optional().describe('Table type'),
          owner: z.string().optional().describe('Table owner'),
          comment: z.string().optional().describe('Table comment'),
          dataSourceFormat: z.string().optional().describe('Storage format'),
          columns: z
            .array(
              z.object({
                columnName: z.string().describe('Column name'),
                typeName: z.string().describe('Column data type'),
                comment: z.string().optional().describe('Column comment'),
                nullable: z.boolean().optional().describe('Whether the column is nullable'),
                position: z.number().optional().describe('Column position')
              })
            )
            .optional()
            .describe('Column definitions'),
          storageLocation: z.string().optional().describe('Storage location URI'),
          createdAt: z.string().optional().describe('Creation time in epoch ms'),
          updatedAt: z.string().optional().describe('Last update time in epoch ms')
        })
        .optional()
        .describe('Detailed table info')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DatabricksClient({
      workspaceUrl: ctx.config.workspaceUrl,
      token: ctx.auth.token
    });

    switch (ctx.input.level) {
      case 'catalogs': {
        let catalogs = await client.listCatalogs();
        let mapped = catalogs.map((c: any) => ({
          catalogName: c.name,
          owner: c.owner,
          comment: c.comment,
          catalogType: c.catalog_type
        }));
        return {
          output: { catalogs: mapped },
          message: `Found **${mapped.length}** catalog(s).`
        };
      }
      case 'schemas': {
        if (!ctx.input.catalogName)
          throw databricksServiceError('catalogName is required for listing schemas');
        let schemas = await client.listSchemas(ctx.input.catalogName);
        let mapped = schemas.map((s: any) => ({
          schemaName: s.full_name ?? `${ctx.input.catalogName}.${s.name}`,
          owner: s.owner,
          comment: s.comment
        }));
        return {
          output: { schemas: mapped },
          message: `Found **${mapped.length}** schema(s) in **${ctx.input.catalogName}**.`
        };
      }
      case 'tables': {
        if (!ctx.input.catalogName || !ctx.input.schemaName)
          throw databricksServiceError(
            'catalogName and schemaName are required for listing tables'
          );
        let tables = await client.listTables(ctx.input.catalogName, ctx.input.schemaName);
        let mapped = tables.map((t: any) => ({
          tableName:
            t.full_name ?? `${ctx.input.catalogName}.${ctx.input.schemaName}.${t.name}`,
          tableType: t.table_type,
          owner: t.owner,
          comment: t.comment,
          dataSourceFormat: t.data_source_format
        }));
        return {
          output: { tables: mapped },
          message: `Found **${mapped.length}** table(s) in **${ctx.input.catalogName}.${ctx.input.schemaName}**.`
        };
      }
      case 'table_detail': {
        if (!ctx.input.tableName)
          throw databricksServiceError('tableName is required for table detail');
        let table = await client.getTable(ctx.input.tableName);
        let detail = {
          tableName: table.full_name ?? ctx.input.tableName,
          tableType: table.table_type,
          owner: table.owner,
          comment: table.comment,
          dataSourceFormat: table.data_source_format,
          columns: (table.columns ?? []).map((c: any) => ({
            columnName: c.name,
            typeName: c.type_name ?? c.type_text ?? '',
            comment: c.comment,
            nullable: c.nullable,
            position: c.position
          })),
          storageLocation: table.storage_location,
          createdAt: table.created_at ? String(table.created_at) : undefined,
          updatedAt: table.updated_at ? String(table.updated_at) : undefined
        };
        return {
          output: { tableDetail: detail },
          message: `Table **${detail.tableName}**: ${detail.tableType ?? 'TABLE'} with ${detail.columns?.length ?? 0} column(s).`
        };
      }
    }
  })
  .build();
