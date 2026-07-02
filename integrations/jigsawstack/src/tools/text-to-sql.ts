import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let textToSql = SlateTool.create(spec, {
  name: 'Text to SQL',
  key: 'text_to_sql',
  description: `Convert natural language queries into SQL statements. Provide a database schema for context and describe what you want to query in plain English. Supports PostgreSQL, MySQL, and SQLite dialects.`,
  instructions: [
    'Provide either a SQL schema string or a file store key containing the schema, not both.',
    'The prompt should be at least 10 characters long.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      prompt: z
        .string()
        .describe('Natural language description of the query (minimum 10 characters)'),
      sqlSchema: z
        .string()
        .optional()
        .describe('SQL schema definition providing table and column context'),
      database: z
        .enum(['postgresql', 'mysql', 'sqlite'])
        .optional()
        .describe('Target database type'),
      fileStoreKey: z
        .string()
        .optional()
        .describe('File store key containing the schema (use instead of sqlSchema)')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      sql: z.string().describe('Generated SQL query')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.textToSql({
      prompt: ctx.input.prompt,
      sqlSchema: ctx.input.sqlSchema,
      database: ctx.input.database,
      fileStoreKey: ctx.input.fileStoreKey
    });

    return {
      output: {
        success: result.success,
        sql: result.sql
      },
      message: `Generated SQL query from natural language prompt.\n\n\`\`\`sql\n${result.sql}\n\`\`\``
    };
  })
  .build();
