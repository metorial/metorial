import { SlateTool } from 'slates';
import { z } from 'zod';
import { BlazeMeterClient } from '../lib/client';
import { spec } from '../spec';

export let runTest = SlateTool.create(spec, {
  name: 'Run Performance Test',
  key: 'run_test',
  description: `Start or stop a performance test or multi-test. Use **operation** to specify whether to start or stop. Starting a test returns a master (test run) ID for tracking results. Stopping terminates the active test run.`,
  instructions: [
    'Use "start" to begin a test execution.',
    'Use "stop" to terminate a running test. Provide either **testId** or **masterId** to stop.',
    'Use "terminate" to force-stop a running master immediately.'
  ]
})
  .input(
    z.object({
      operation: z
        .enum(['start', 'stop', 'terminate'])
        .describe('Whether to start, stop, or terminate'),
      testId: z.number().optional().describe('Performance test ID'),
      masterId: z
        .number()
        .optional()
        .describe('Master (test run) ID, used for stop/terminate'),
      isMultiTest: z.boolean().optional().describe('Set to true if the test is a multi-test')
    })
  )
  .output(
    z.object({
      masterId: z.number().optional().describe('Master (test run) ID'),
      status: z.string().optional().describe('Resulting status'),
      stopped: z.boolean().optional().describe('Whether the test was stopped')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BlazeMeterClient({
      token: ctx.auth.token,
      apiKeyId: ctx.auth.apiKeyId,
      apiKeySecret: ctx.auth.apiKeySecret
    });

    if (ctx.input.operation === 'start') {
      if (!ctx.input.testId) {
        throw new Error('testId is required to start a test');
      }
      let result: any;
      if (ctx.input.isMultiTest) {
        result = await client.startMultiTest(ctx.input.testId);
      } else {
        result = await client.startTest(ctx.input.testId);
      }
      return {
        output: {
          masterId: result.id,
          status: result.status || 'started'
        },
        message: `Started test (ID: ${ctx.input.testId}). Master run ID: **${result.id}**.`
      };
    }

    if (ctx.input.operation === 'stop') {
      if (ctx.input.masterId) {
        await client.stopMaster(ctx.input.masterId);
        return {
          output: { masterId: ctx.input.masterId, stopped: true },
          message: `Stopped master run **${ctx.input.masterId}**.`
        };
      }
      if (ctx.input.testId) {
        await client.stopTest(ctx.input.testId);
        return {
          output: { stopped: true },
          message: `Stopped test **${ctx.input.testId}**.`
        };
      }
      throw new Error('Either testId or masterId is required to stop');
    }

    if (ctx.input.operation === 'terminate') {
      if (!ctx.input.masterId) {
        throw new Error('masterId is required to terminate a test run');
      }
      await client.terminateMaster(ctx.input.masterId);
      return {
        output: { masterId: ctx.input.masterId, stopped: true },
        message: `Terminated master run **${ctx.input.masterId}**.`
      };
    }

    throw new Error(`Unknown operation: ${ctx.input.operation}`);
  })
  .build();
