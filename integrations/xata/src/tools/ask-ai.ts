import { SlateTool } from 'slates';
import { z } from 'zod';
import { XataWorkspaceClient } from '../lib/client';
import { spec } from '../spec';

export let askAi = SlateTool.create(spec, {
  name: 'Ask AI',
  key: 'ask_ai',
  description: `DEPRECATED — Xata Lite was permanently retired on February 28, 2026. This legacy operation is unavailable. Discover current organizations with list_organizations and use the current project/branch tools for platform management; data access uses native PostgreSQL. Legacy contract: Ask a natural language question about data in a Xata table and get an AI-generated answer. The AI searches relevant records and synthesizes a response. Supports follow-up questions using session IDs for conversational context.`,
  instructions: [
    'Xata Lite is retired. Use list_organizations, list_projects and the current project branch tools for platform management. Use a native PostgreSQL client for record, schema, search and transaction work; this legacy key is not remapped.',
    'Use rules to guide the AI response, e.g. ["Answer in bullet points", "Be concise"].',
    'Provide a sessionId to continue a previous conversation.'
  ],
  tags: {
    deprecated: true,
    readOnly: true
  }
})
  .input(
    z.object({
      databaseName: z.string().describe('Name of the database'),
      branch: z.string().optional().describe('Branch name (defaults to config branch)'),
      tableName: z.string().describe('Name of the table to ask about'),
      question: z.string().describe('Natural language question about the data'),
      rules: z
        .array(z.string())
        .optional()
        .describe(
          'Instructions for how the AI should answer, e.g. ["Be concise", "Use bullet points"]'
        ),
      searchType: z
        .enum(['keyword', 'vector'])
        .optional()
        .describe('Type of search to use for finding relevant records'),
      sessionId: z
        .string()
        .optional()
        .describe('Session ID from a previous ask response, for follow-up questions')
    })
  )
  .output(
    z.object({
      answer: z.string().describe('AI-generated answer to the question'),
      sessionId: z.string().optional().describe('Session ID for follow-up questions'),
      records: z
        .array(z.any())
        .optional()
        .describe('Records that were used to generate the answer')
    })
  )
  .handleInvocation(async ctx => {
    let client = new XataWorkspaceClient({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId || '',
      region: ctx.config.region
    });

    let branch = ctx.input.branch || ctx.config.branch;

    let result = await client.askTable(ctx.input.databaseName, branch, ctx.input.tableName, {
      question: ctx.input.question,
      rules: ctx.input.rules,
      searchType: ctx.input.searchType,
      sessionId: ctx.input.sessionId
    });

    return {
      output: {
        answer: result.answer,
        sessionId: result.sessionId,
        records: result.records
      },
      message: `**Answer:** ${result.answer}`
    };
  })
  .build();
