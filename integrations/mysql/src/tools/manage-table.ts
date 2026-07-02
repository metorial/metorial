import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, escapeIdentifier, qualifiedTableName } from '../lib/helpers';
import { spec } from '../spec';

let columnDefinitionSchema = z.object({
  columnName: z.string().describe('Name of the column'),
  dataType: z
    .string()
    .describe(
      'MySQL data type (e.g., VARCHAR(255), INT, BIGINT, TEXT, DATETIME, JSON, DECIMAL(10,2))'
    ),
  nullable: z
    .boolean()
    .optional()
    .default(true)
    .describe('Whether the column allows NULL values'),
  defaultValue: z
    .string()
    .optional()
    .describe('SQL expression for the default value (e.g., "CURRENT_TIMESTAMP", "0", "NULL")'),
  autoIncrement: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether this column auto-increments'),
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
      databaseName: z.string().optional().describe('Referenced table database')
    })
    .optional()
    .describe('Foreign key reference')
});

export let manageTable = SlateTool.create(spec, {
  name: 'Manage Table',
  key: 'manage_table',
  description: `Create, alter, or drop a MySQL table. Supports creating tables with columns, constraints, foreign keys, and storage engine selection.
For altering tables, supports adding columns, dropping columns, renaming columns, modifying column types, and renaming the table.`,
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
      databaseName: z.string().optional().describe('Database for the table'),

      // Create options
      columns: z
        .array(columnDefinitionSchema)
        .optional()
        .describe('Column definitions (required for create action)'),
      engine: z
        .string()
        .optional()
        .default('InnoDB')
        .describe('Storage engine for create action (default: InnoDB)'),
      charset: z.string().optional().describe('Default character set (e.g., utf8mb4)'),
      collation: z
        .string()
        .optional()
        .describe('Default collation (e.g., utf8mb4_unicode_ci)'),
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
      modifyColumns: z
        .array(
          z.object({
            columnName: z.string().describe('Column to modify'),
            newDataType: z.string().optional().describe('New data type'),
            nullable: z.boolean().optional().describe('Set NULL or NOT NULL'),
            defaultValue: z.string().optional().describe('New default value expression'),
            dropDefault: z.boolean().optional().describe('Remove the default value')
          })
        )
        .optional()
        .describe('Columns to modify'),

      // Drop options
      cascade: z.boolean().optional().default(false).describe('Use CASCADE when dropping'),
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
    let db = ctx.input.databaseName || ctx.auth.database || ctx.config.defaultDatabase;
    let fullTableName = qualifiedTableName(ctx.input.tableName, db);
    let statements: string[] = [];

    if (ctx.input.action === 'create') {
      if (!ctx.input.columns || ctx.input.columns.length === 0) {
        throw new Error('Column definitions are required for create action');
      }

      let columnDefs: string[] = [];
      let pkColumns: string[] = [];

      for (let col of ctx.input.columns) {
        let def = `${escapeIdentifier(col.columnName)} ${col.dataType}`;
        if (!col.nullable) def += ' NOT NULL';
        if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;
        if (col.autoIncrement) def += ' AUTO_INCREMENT';
        if (col.unique) def += ' UNIQUE';
        if (col.primaryKey) pkColumns.push(col.columnName);
        if (col.references) {
          let refTable = qualifiedTableName(
            col.references.tableName,
            col.references.databaseName
          );
          def += ` REFERENCES ${refTable}(${escapeIdentifier(col.references.columnName)})`;
        }
        columnDefs.push(def);
      }

      if (pkColumns.length > 0) {
        columnDefs.push(`PRIMARY KEY (${pkColumns.map(escapeIdentifier).join(', ')})`);
      }

      let ifNotExists = ctx.input.ifNotExists ? 'IF NOT EXISTS ' : '';
      let sql = `CREATE TABLE ${ifNotExists}${fullTableName} (\n  ${columnDefs.join(',\n  ')}\n)`;

      if (ctx.input.engine) sql += ` ENGINE=${ctx.input.engine}`;
      if (ctx.input.charset) sql += ` DEFAULT CHARSET=${ctx.input.charset}`;
      if (ctx.input.collation) sql += ` COLLATE=${ctx.input.collation}`;

      statements.push(sql);
    } else if (ctx.input.action === 'alter') {
      if (ctx.input.addColumns) {
        for (let col of ctx.input.addColumns) {
          let def = `${escapeIdentifier(col.columnName)} ${col.dataType}`;
          if (!col.nullable) def += ' NOT NULL';
          if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;
          if (col.autoIncrement) def += ' AUTO_INCREMENT';
          if (col.unique) def += ' UNIQUE';
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

      if (ctx.input.modifyColumns) {
        for (let modify of ctx.input.modifyColumns) {
          let _parts: string[] = [];
          if (modify.newDataType) {
            let def = `${escapeIdentifier(modify.columnName)} ${modify.newDataType}`;
            if (modify.nullable === false) def += ' NOT NULL';
            if (modify.nullable === true) def += ' NULL';
            if (modify.defaultValue) def += ` DEFAULT ${modify.defaultValue}`;
            if (modify.dropDefault) def += ' DEFAULT NULL';
            statements.push(`ALTER TABLE ${fullTableName} MODIFY COLUMN ${def}`);
          } else {
            if (modify.dropDefault) {
              statements.push(
                `ALTER TABLE ${fullTableName} ALTER COLUMN ${escapeIdentifier(modify.columnName)} DROP DEFAULT`
              );
            }
            if (modify.defaultValue) {
              statements.push(
                `ALTER TABLE ${fullTableName} ALTER COLUMN ${escapeIdentifier(modify.columnName)} SET DEFAULT ${modify.defaultValue}`
              );
            }
          }
        }
      }

      if (ctx.input.renameTable) {
        statements.push(
          `ALTER TABLE ${fullTableName} RENAME TO ${escapeIdentifier(ctx.input.renameTable)}`
        );
      }

      if (statements.length === 0) {
        throw new Error(
          'No alter operations specified. Provide addColumns, dropColumns, renameColumn, modifyColumns, or renameTable.'
        );
      }
    } else if (ctx.input.action === 'drop') {
      let ifExists = ctx.input.ifExists ? 'IF EXISTS ' : '';
      let cascade = ctx.input.cascade ? ' CASCADE' : '';
      statements.push(`DROP TABLE ${ifExists}${fullTableName}${cascade}`);
    }

    let executedSql = statements.join(';\n');
    ctx.info(`Executing: ${executedSql}`);

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
