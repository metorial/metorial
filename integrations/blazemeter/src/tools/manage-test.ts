import { SlateTool } from 'slates';
import { z } from 'zod';
import { BlazeMeterClient } from '../lib/client';
import { spec } from '../spec';

export let manageTest = SlateTool.create(spec, {
  name: 'Manage Performance Test',
  key: 'manage_test',
  description: `Create, update, or delete a performance test. Use **action** to specify the operation. When creating, provide a name and project ID. When updating, provide the test ID and fields to change.`,
  instructions: [
    'For "create", **name** and **projectId** are required.',
    'For "update", **testId** is required along with any fields to change.',
    'For "delete", only **testId** is required.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      testId: z.number().optional().describe('Test ID (required for update/delete)'),
      name: z.string().optional().describe('Test name'),
      projectId: z.number().optional().describe('Project ID (required for create)'),
      configuration: z
        .record(z.string(), z.any())
        .optional()
        .describe('Test configuration object (JMeter settings, scenarios, etc.)')
    })
  )
  .output(
    z.object({
      testId: z.number().optional().describe('Test ID'),
      name: z.string().optional().describe('Test name'),
      deleted: z.boolean().optional().describe('Whether the test was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BlazeMeterClient({
      token: ctx.auth.token,
      apiKeyId: ctx.auth.apiKeyId,
      apiKeySecret: ctx.auth.apiKeySecret
    });

    if (ctx.input.action === 'create') {
      if (!ctx.input.name || !ctx.input.projectId) {
        throw new Error('name and projectId are required for creating a test');
      }
      let test = await client.createTest({
        name: ctx.input.name,
        projectId: ctx.input.projectId,
        configuration: ctx.input.configuration
      });
      return {
        output: { testId: test.id, name: test.name },
        message: `Created test **${test.name}** (ID: ${test.id}).`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.testId) {
        throw new Error('testId is required for updating a test');
      }
      let test = await client.updateTest(ctx.input.testId, {
        name: ctx.input.name,
        configuration: ctx.input.configuration
      });
      return {
        output: { testId: test.id, name: test.name },
        message: `Updated test **${test.name}** (ID: ${test.id}).`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.testId) {
        throw new Error('testId is required for deleting a test');
      }
      await client.deleteTest(ctx.input.testId);
      return {
        output: { testId: ctx.input.testId, deleted: true },
        message: `Deleted test with ID: ${ctx.input.testId}.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
