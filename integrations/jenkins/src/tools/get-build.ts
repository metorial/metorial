import { SlateTool } from 'slates';
import { z } from 'zod';
import { JenkinsClient } from '../lib/client';
import { spec } from '../spec';

export let getBuild = SlateTool.create(spec, {
  name: 'Get Build',
  key: 'get_build',
  description: `Retrieve detailed information about a specific build or the last build of a Jenkins job. Includes build status, duration, timestamp, and optionally the console output and test results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobPath: z.string().describe('Path to the job (e.g. "my-job" or "folder/my-job")'),
      buildNumber: z
        .number()
        .optional()
        .describe('Build number to retrieve. Omit to get the last build.'),
      includeConsoleOutput: z
        .boolean()
        .optional()
        .describe('Whether to include the console output text (can be large)'),
      includeTestResults: z
        .boolean()
        .optional()
        .describe('Whether to include test results if available')
    })
  )
  .output(
    z.object({
      buildNumber: z.number().describe('Build number'),
      buildUrl: z.string().describe('URL of the build'),
      result: z
        .string()
        .optional()
        .nullable()
        .describe(
          'Build result (SUCCESS, FAILURE, UNSTABLE, ABORTED, or null if still running)'
        ),
      building: z.boolean().describe('Whether the build is currently running'),
      displayName: z.string().optional().describe('Display name of the build'),
      description: z.string().optional().nullable().describe('Build description'),
      timestamp: z.number().describe('Build start timestamp in milliseconds'),
      duration: z.number().describe('Build duration in milliseconds'),
      estimatedDuration: z.number().optional().describe('Estimated duration in milliseconds'),
      consoleOutput: z
        .string()
        .optional()
        .nullable()
        .describe('Console output text (if requested)'),
      testResults: z
        .object({
          totalCount: z.number().describe('Total test count'),
          failCount: z.number().describe('Failed test count'),
          skipCount: z.number().describe('Skipped test count'),
          passCount: z.number().describe('Passed test count')
        })
        .optional()
        .nullable()
        .describe('Test results summary (if requested and available)'),
      artifacts: z
        .array(
          z.object({
            fileName: z.string().describe('Name of the artifact file'),
            relativePath: z.string().describe('Relative path of the artifact')
          })
        )
        .optional()
        .describe('Build artifacts'),
      buildParameters: z
        .array(
          z.object({
            paramName: z.string().describe('Parameter name'),
            paramValue: z.string().optional().nullable().describe('Parameter value')
          })
        )
        .optional()
        .describe('Build parameters used')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JenkinsClient({
      instanceUrl: ctx.config.instanceUrl,
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let build = ctx.input.buildNumber
      ? await client.getBuild(ctx.input.jobPath, ctx.input.buildNumber)
      : await client.getLastBuild(ctx.input.jobPath);

    let consoleOutput: string | null = null;
    if (ctx.input.includeConsoleOutput) {
      consoleOutput = await client.getConsoleOutput(ctx.input.jobPath, build.number);
    }

    let testResults: any = null;
    if (ctx.input.includeTestResults) {
      let raw = await client.getBuildTestResults(ctx.input.jobPath, build.number);
      if (raw) {
        testResults = {
          totalCount: raw.totalCount || 0,
          failCount: raw.failCount || 0,
          skipCount: raw.skipCount || 0,
          passCount: (raw.totalCount || 0) - (raw.failCount || 0) - (raw.skipCount || 0)
        };
      }
    }

    let artifacts = (build.artifacts || []).map((a: any) => ({
      fileName: a.fileName,
      relativePath: a.relativePath
    }));

    let buildParameters: any[] | undefined;
    let paramAction = build.actions?.find((a: any) => a._class?.includes('ParametersAction'));
    if (paramAction?.parameters) {
      buildParameters = paramAction.parameters.map((p: any) => ({
        paramName: p.name,
        paramValue: p.value != null ? String(p.value) : null
      }));
    }

    let durationSec = Math.round(build.duration / 1000);

    return {
      output: {
        buildNumber: build.number,
        buildUrl: build.url,
        result: build.result,
        building: build.building,
        displayName: build.displayName,
        description: build.description,
        timestamp: build.timestamp,
        duration: build.duration,
        estimatedDuration: build.estimatedDuration,
        consoleOutput,
        testResults,
        artifacts,
        buildParameters
      },
      message: `Build **#${build.number}** of \`${ctx.input.jobPath}\` — ${build.building ? '**running**' : `result: **${build.result}**`} (${durationSec}s).`
    };
  })
  .build();
