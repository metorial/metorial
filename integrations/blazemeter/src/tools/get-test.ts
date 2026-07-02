import { SlateTool } from 'slates';
import { z } from 'zod';
import { BlazeMeterClient } from '../lib/client';
import { spec } from '../spec';

export let getTest = SlateTool.create(spec, {
  name: 'Get Performance Test',
  key: 'get_test',
  description: `Retrieve details of a specific performance test by its ID. Returns full configuration, including test type, execution settings, and scheduling information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      testId: z.number().describe('ID of the performance test to retrieve')
    })
  )
  .output(
    z.object({
      testId: z.number().describe('Test ID'),
      name: z.string().describe('Test name'),
      projectId: z.number().optional().describe('Project ID'),
      lastRunTime: z.string().optional().describe('Timestamp of last run'),
      created: z.number().optional().describe('Creation timestamp'),
      updated: z.number().optional().describe('Last update timestamp'),
      configuration: z.any().optional().describe('Full test configuration'),
      overrideExecutions: z.any().optional().describe('Override execution settings')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BlazeMeterClient({
      token: ctx.auth.token,
      apiKeyId: ctx.auth.apiKeyId,
      apiKeySecret: ctx.auth.apiKeySecret
    });

    let test = await client.getTest(ctx.input.testId);

    return {
      output: {
        testId: test.id,
        name: test.name,
        projectId: test.projectId,
        lastRunTime: test.lastRunTime ? String(test.lastRunTime) : undefined,
        created: test.created,
        updated: test.updated,
        configuration: test.configuration,
        overrideExecutions: test.overrideExecutions
      },
      message: `Retrieved test **${test.name}** (ID: ${test.id}).`
    };
  })
  .build();
