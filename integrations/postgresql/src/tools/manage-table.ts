import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { postgresServiceError } from '../lib/errors';
import { createClient, escapeIdentifier, qualifiedTableName } from '../lib/helpers';
import { spec } from '../spec';

let columnDefinitionSchema = z.object({
  columnName: z.string().describe('Name of the column'),
  dataType: z
    .string()
    .describe(
      'PostgreSQL data type (e.g., text, integer, bigint, boolean, jsonb, timestamptz, uuid)'
    ),
  nullable: z
    .boolean()
    .optional()
    .default(true)
    .describe('Whether the column allows NULL values'),
  defaultValue: z
    .string()
    .optional()
    .describe(
      'SQL expression for the default value (e.g., "now()", "0", "gen_random_uuid()")'
    ),
  primaryKey: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether this column is the primary key'),
  unique: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether this column has a unique constraint'),
  references: z
    .object({
      tableName: z.string().describe('Referenced table name'),
      columnName: z.string().describe('Referenced column name'),
      schemaName: z.string().optional().describe('Referenced table schema')
    })
    .optional()
    .describe('Foreign key reference')
});

export let manageTable = SlateTool.create(spec, {
  name: 'Manage Table',
  key: 'manage_table',
  description: `Create, alter, or drop a PostgreSQL table. Supports creating tables with columns, constraints, and foreign keys.
For altering tables, supports adding columns, dropping columns, renaming columns, altering column types, and renaming the table.`,
  instructions: [
    'For creating tables, provide the full column definitions.',
    'For altering tables, specify only the changes you want to make.',
    'Use the "drop" action with caution as it permanently removes the table and all its data.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'alter', 'drop']).describe('Action to perform on the table'),
      tableName: z.string().describe('Name of the table'),
      schemaName: z.string().optional().describe('Schema for the table'),

      // Create options
      columns: z
        .array(columnDefinitionSchema)
        .optional()
        .describe('Column definitions (required for create action)'),
      ifNotExists: z
        .boolean()
        .optional()
        .default(false)
        .describe('Add IF NOT EXISTS clause for create action'),

      // Alter options
      addColumns: z
        .array(columnDefinitionSchema)
        .optional()
        .describe('Columns to add to the table'),
      dropColumns: z
        .array(z.string())
        .optional()
        .describe('Column names to drop from the table'),
      renameColumn: z
        .object({
          from: z.string().describe('Current column name'),
          to: z.string().describe('New column name')
        })
        .optional()
        .describe('Rename a column'),
      renameTable: z.string().optional().describe('New table name (for rename operation)'),
      alterColumns: z
        .array(
          z.object({
            columnName: z.string().describe('Column to alter'),
            setDataType: z.string().optional().describe('New data type'),
            setDefault: z.string().optional().describe('New default value expression'),
            dropDefault: z.boolean().optional().describe('Remove the default value'),
            setNotNull: z.boolean().optional().describe('Add NOT NULL constraint'),
            dropNotNull: z.boolean().optional().describe('Remove NOT NULL constraint')
          })
        )
        .optional()
        .describe('Columns to alter'),

      // Drop options
      cascade: z
        .boolean()
        .optional()
        .default(false)
        .describe('Use CASCADE when dropping (also drops dependent objects)'),
      ifExists: z
        .boolean()
        .optional()
        .default(false)
        .describe('Add IF EXISTS clause for drop action')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation completed successfully'),
      executedSql: z.string().describe('The SQL statement(s) that were executed')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let schema = ctx.input.schemaName || ctx.config.defaultSchema;
    let fullTableName = qualifiedTableName(ctx.input.tableName, schema);
    let statements: string[] = [];

    if (ctx.input.action === 'create') {
      if (!ctx.input.columns || ctx.input.columns.length === 0) {
        throw postgresServiceError('Column definitions are required for create action');
      }

      let columnDefs: string[] = [];
      let pkColumns: string[] = [];

      for (let col of ctx.input.columns) {
        let def = `${escapeIdentifier(col.columnName)} ${col.dataType}`;
        if (!col.nullable) def += ' NOT NULL';
        if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;
        if (col.unique) def += ' UNIQUE';
        if (col.primaryKey) pkColumns.push(col.columnName);
        if (col.references) {
          let refTable = qualifiedTableName(
            col.references.tableName,
            col.references.schemaName
          );
          def += ` REFERENCES ${refTable}(${escapeIdentifier(col.references.columnName)})`;
        }
        columnDefs.push(def);
      }

      if (pkColumns.length > 0) {
        columnDefs.push(`PRIMARY KEY (${pkColumns.map(escapeIdentifier).join(', ')})`);
      }

      let ifNotExists = ctx.input.ifNotExists ? 'IF NOT EXISTS ' : '';
      statements.push(
        `CREATE TABLE ${ifNotExists}${fullTableName} (\n  ${columnDefs.join(',\n  ')}\n)`
      );
    } else if (ctx.input.action === 'alter') {
      if (ctx.input.addColumns) {
        for (let col of ctx.input.addColumns) {
          let def = `${escapeIdentifier(col.columnName)} ${col.dataType}`;
          if (!col.nullable) def += ' NOT NULL';
          if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;
          if (col.unique) def += ' UNIQUE';
          if (col.references) {
            let refTable = qualifiedTableName(
              col.references.tableName,
              col.references.schemaName
            );
            def += ` REFERENCES ${refTable}(${escapeIdentifier(col.references.columnName)})`;
          }
          statements.push(`ALTER TABLE ${fullTableName} ADD COLUMN ${def}`);
        }
      }

      if (ctx.input.dropColumns) {
        for (let colName of ctx.input.dropColumns) {
          statements.push(
            `ALTER TABLE ${fullTableName} DROP COLUMN ${escapeIdentifier(colName)}`
          );
        }
      }

      if (ctx.input.renameColumn) {
        statements.push(
          `ALTER TABLE ${fullTableName} RENAME COLUMN ${escapeIdentifier(ctx.input.renameColumn.from)} TO ${escapeIdentifier(ctx.input.renameColumn.to)}`
        );
      }

      if (ctx.input.alterColumns) {
        for (let alter of ctx.input.alterColumns) {
          let colName = escapeIdentifier(alter.columnName);
          if (alter.setDataType) {
            statements.push(
              `ALTER TABLE ${fullTableName} ALTER COLUMN ${colName} TYPE ${alter.setDataType}`
            );
          }
          if (alter.setDefault) {
            statements.push(
              `ALTER TABLE ${fullTableName} ALTER COLUMN ${colName} SET DEFAULT ${alter.setDefault}`
            );
          }
          if (alter.dropDefault) {
            statements.push(
              `ALTER TABLE ${fullTableName} ALTER COLUMN ${colName} DROP DEFAULT`
            );
          }
          if (alter.setNotNull) {
            statements.push(
              `ALTER TABLE ${fullTableName} ALTER COLUMN ${colName} SET NOT NULL`
            );
          }
          if (alter.dropNotNull) {
            statements.push(
              `ALTER TABLE ${fullTableName} ALTER COLUMN ${colName} DROP NOT NULL`
            );
          }
        }
      }

      if (ctx.input.renameTable) {
        statements.push(
          `ALTER TABLE ${fullTableName} RENAME TO ${escapeIdentifier(ctx.input.renameTable)}`
        );
      }

      if (statements.length === 0) {
        throw postgresServiceError(
          'No alter operations specified. Provide addColumns, dropColumns, renameColumn, alterColumns, or renameTable.'
        );
      }
    } else if (ctx.input.action === 'drop') {
      let ifExists = ctx.input.ifExists ? 'IF EXISTS ' : '';
      let cascade = ctx.input.cascade ? ' CASCADE' : '';
      statements.push(`DROP TABLE ${ifExists}${fullTableName}${cascade}`);
    }

    let executedSql = statements.join(';\n');
    ctx.info(`Executing: ${executedSql}`);

    // Execute all statements
    for (let stmt of statements) {
      await client.query(stmt, ctx.config.queryTimeout);
    }

    let actionLabel =
      ctx.input.action === 'create'
        ? 'Created'
        : ctx.input.action === 'alter'
          ? 'Altered'
          : 'Dropped';

    return {
      output: {
        success: true,
        executedSql
      },
      message: `${actionLabel} table \`${ctx.input.tableName}\`. Executed **${statements.length}** statement(s).`
    };
  })
  .build();
