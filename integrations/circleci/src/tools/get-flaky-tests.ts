import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getFlakyTests = SlateTool.create(spec, {
  name: 'Get Flaky Tests',
  key: 'get_flaky_tests',
  description: `Retrieve a list of flaky tests detected in a project. Flaky tests are tests that have inconsistent pass/fail results across recent runs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectSlug: z
        .string()
        .describe('Project slug in the format vcs-slug/org-name/repo-name')
    })
  )
  .output(
    z.object({
      flakyTests: z.array(
        z.object({
          testName: z.string().optional(),
          className: z.string().optional(),
          source: z.string().optional(),
          jobName: z.string().optional(),
          workflowName: z.string().optional(),
          timesFlaked: z.number().optional(),
          pipelineNumber: z.number().optional()
        })
      ),
      totalCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getFlakyTests(ctx.input.projectSlug);

    let flakyTests = (result.flaky_tests || []).map((t: any) => ({
      testName: t.test_name,
      className: t.classname,
      source: t.source,
      jobName: t.job_name,
      workflowName: t.workflow_name,
      timesFlaked: t.times_flaked,
      pipelineNumber: t.pipeline_number
    }));

    return {
      output: {
        flakyTests,
        totalCount: result.total_flaky_tests || flakyTests.length
      },
      message: `Found **${flakyTests.length}** flaky test(s) in project \`${ctx.input.projectSlug}\`.`
    };
  })
  .build();
