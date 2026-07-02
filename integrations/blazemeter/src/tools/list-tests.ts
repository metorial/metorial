import { SlateTool } from 'slates';
import { z } from 'zod';
import { BlazeMeterClient } from '../lib/client';
import { spec } from '../spec';

export let listTests = SlateTool.create(spec, {
  name: 'List Performance Tests',
  key: 'list_tests',
  description: `List performance tests in your BlazeMeter account. Filter by project or workspace to find specific tests. Returns test configurations including name, ID, project, and status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.number().optional().describe('Filter tests by project ID'),
      workspaceId: z.number().optional().describe('Filter tests by workspace ID'),
      limit: z.number().optional().describe('Maximum number of tests to return')
    })
  )
  .output(
    z.object({
      tests: z
        .array(
          z.object({
            testId: z.number().describe('Test ID'),
            name: z.string().describe('Test name'),
            projectId: z.number().optional().describe('Project ID'),
            lastRunTime: z.string().optional().describe('Timestamp of last run'),
            created: z.number().optional().describe('Creation timestamp'),
            updated: z.number().optional().describe('Last update timestamp'),
            configuration: z.any().optional().describe('Test configuration')
          })
        )
        .describe('List of performance tests')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BlazeMeterClient({
      token: ctx.auth.token,
      apiKeyId: ctx.auth.apiKeyId,
      apiKeySecret: ctx.auth.apiKeySecret
    });

    let tests = await client.listTests(
      ctx.input.projectId,
      ctx.input.workspaceId,
      ctx.input.limit
    );

    let mapped = tests.map((t: any) => ({
      testId: t.id,
      name: t.name,
      projectId: t.projectId,
      lastRunTime: t.lastRunTime ? String(t.lastRunTime) : undefined,
      created: t.created,
      updated: t.updated,
      configuration: t.configuration
    }));

    return {
      output: { tests: mapped },
      message: `Found **${mapped.length}** performance test(s).`
    };
  })
  .build();
