import { SlateTool } from 'slates';
import { z } from 'zod';
import { RunscopeClient } from '../lib/runscope-client';
import { spec } from '../spec';

export let manageMonitoringTest = SlateTool.create(spec, {
  name: 'Manage API Monitoring Test',
  key: 'manage_monitoring_test',
  description: `Create, update, delete, or list API monitoring tests within a bucket. Tests contain steps that define HTTP requests and assertions used to monitor API health and correctness.`,
  instructions: [
    'Use "list" with **bucketKey** to see all tests in a bucket.',
    'Use "create" with **bucketKey** and **name** to create a new monitoring test.',
    'Use "update" to modify an existing test.',
    'Use "delete" to remove a test.'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Operation to perform'),
      bucketKey: z.string().describe('Bucket key that contains/will contain the test'),
      testId: z.string().optional().describe('Test ID (required for update/delete)'),
      name: z.string().optional().describe('Test name'),
      description: z.string().optional().describe('Test description'),
      steps: z
        .array(z.any())
        .optional()
        .describe('Array of test step objects defining HTTP requests and assertions')
    })
  )
  .output(
    z.object({
      tests: z
        .array(
          z.object({
            testId: z.string().describe('Test ID'),
            name: z.string().describe('Test name'),
            description: z.string().optional().describe('Test description'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List of tests'),
      testId: z.string().optional().describe('Test ID'),
      name: z.string().optional().describe('Test name'),
      deleted: z.boolean().optional().describe('Whether the test was deleted')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.runscopeToken && !ctx.auth.token) {
      throw new Error('Runscope OAuth token is required for API Monitoring operations');
    }
    let client = new RunscopeClient({ token: ctx.auth.runscopeToken || ctx.auth.token });

    if (ctx.input.action === 'list') {
      let tests = await client.listTests(ctx.input.bucketKey);
      let mapped = tests.map((t: any) => ({
        testId: t.id,
        name: t.name,
        description: t.description,
        createdAt: t.created_at ? String(t.created_at) : undefined
      }));
      return {
        output: { tests: mapped },
        message: `Found **${mapped.length}** monitoring test(s) in bucket \`${ctx.input.bucketKey}\`.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('name is required for creating a test');
      let test = await client.createTest(ctx.input.bucketKey, {
        name: ctx.input.name,
        description: ctx.input.description,
        steps: ctx.input.steps
      });
      return {
        output: { testId: test.id, name: test.name },
        message: `Created monitoring test **${test.name}** (ID: ${test.id}).`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.testId) throw new Error('testId is required for updating a test');
      let test = await client.updateTest(ctx.input.bucketKey, ctx.input.testId, {
        name: ctx.input.name,
        description: ctx.input.description,
        steps: ctx.input.steps
      });
      return {
        output: { testId: test.id, name: test.name },
        message: `Updated monitoring test **${test.name}** (ID: ${test.id}).`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.testId) throw new Error('testId is required for deleting a test');
      await client.deleteTest(ctx.input.bucketKey, ctx.input.testId);
      return {
        output: { testId: ctx.input.testId, deleted: true },
        message: `Deleted monitoring test **${ctx.input.testId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
