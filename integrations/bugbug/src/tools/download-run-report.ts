import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, validateResourceId } from '../lib/client';
import { spec } from '../spec';

export let downloadRunReport = SlateTool.create(spec, {
  name: 'Download Run Report',
  key: 'download_run_report',
  description:
    'Download a JUnit XML report for a test run or suite run to use in CI/CD test reporting.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      runType: z
        .enum(['test', 'suite'])
        .describe('Whether the report belongs to a test run or a suite run'),
      runId: z
        .string()
        .describe('Run ID returned by run_test, run_suite, list_test_runs, or list_suite_runs')
    })
  )
  .output(
    z.object({
      runId: z.string(),
      runType: z.enum(['test', 'suite']),
      status: z.string(),
      fileName: z.string(),
      mimeType: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let run =
      ctx.input.runType === 'test'
        ? await client.getTestRun(ctx.input.runId)
        : await client.getSuiteRun(ctx.input.runId);
    let path = ctx.input.runType === 'test' ? 'testruns' : 'suiteruns';
    let mimeType = 'application/xml';
    let fileName = `bugbug-${ctx.input.runType}-run-${run.id}.xml`;
    await ctx.addAttachment({
      type: 'url',
      url: `https://app.bugbug.io/api/v2/${path}/${validateResourceId(run.id, 'runId')}/report/junit/`,
      headers: { Authorization: `Token ${ctx.auth.token}` },
      mimeType,
      filename: fileName
    });
    return {
      output: {
        runId: run.id,
        runType: ctx.input.runType,
        status: run.status,
        fileName,
        mimeType
      },
      message: `Prepared the JUnit XML report for ${ctx.input.runType} run **${run.id}** for download.`
    };
  })
  .build();
