import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSuite = SlateTool.create(spec, {
  name: 'Get Suite',
  key: 'get_suite',
  description: `Retrieve detailed information about a specific test suite, including its linked test IDs and last run status. Use this to inspect which tests belong to a suite before running it.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      suiteId: z.string().describe('Unique identifier of the suite to retrieve')
    })
  )
  .output(
    z.object({
      suiteId: z.string().describe('Unique identifier of the suite'),
      name: z.string().describe('Name of the suite'),
      created: z.string().describe('ISO timestamp when the suite was created'),
      lastModified: z.string().describe('ISO timestamp when the suite was last modified'),
      lastRunStatus: z.string().nullable().describe('Status of the most recent run'),
      tests: z.array(z.string()).describe('IDs of tests included in this suite'),
      testsCount: z.number().describe('Number of tests in the suite')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let suite = await client.getSuite(ctx.input.suiteId);

    return {
      output: {
        suiteId: suite.id,
        name: suite.name,
        created: suite.created,
        lastModified: suite.lastModified,
        lastRunStatus: suite.lastRunStatus,
        tests: suite.tests,
        testsCount: suite.testsCount
      },
      message: `Retrieved suite **${suite.name}** with ${suite.testsCount} test(s). Last run status: ${suite.lastRunStatus ?? 'never run'}.`
    };
  })
  .build();
