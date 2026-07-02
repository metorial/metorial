import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, resolveProjectId } from '../lib/helpers';
import { spec } from '../spec';

export let getTestReport = SlateTool.create(spec, {
  name: 'Get Test Report',
  key: 'get_test_report',
  description: `Retrieve the unit test report for a pipeline, including total counts, success/failure breakdowns, test suites, and individual test case details. Use "summary" mode for a quick overview or "full" mode for detailed test case information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z
        .string()
        .optional()
        .describe('Project ID or URL-encoded path. Falls back to config default.'),
      pipelineId: z.number().describe('The pipeline ID to get the test report for'),
      mode: z
        .enum(['summary', 'full'])
        .default('summary')
        .describe('Level of detail: summary for counts only, full for test cases')
    })
  )
  .output(
    z.object({
      totalTime: z.number().optional(),
      totalCount: z.number().optional(),
      successCount: z.number().optional(),
      failedCount: z.number().optional(),
      skippedCount: z.number().optional(),
      errorCount: z.number().optional(),
      testSuites: z
        .array(
          z.object({
            name: z.string(),
            totalTime: z.number().optional(),
            totalCount: z.number().optional(),
            successCount: z.number().optional(),
            failedCount: z.number().optional(),
            skippedCount: z.number().optional(),
            errorCount: z.number().optional(),
            testCases: z
              .array(
                z.object({
                  name: z.string(),
                  classname: z.string().optional(),
                  status: z.string(),
                  executionTime: z.number().optional().nullable(),
                  systemOutput: z.string().optional().nullable(),
                  stackTrace: z.string().optional().nullable()
                })
              )
              .optional()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let projectId = resolveProjectId(ctx.input.projectId, ctx.config.projectId);

    if (ctx.input.mode === 'summary') {
      let r = (await client.getPipelineTestReportSummary(
        projectId,
        ctx.input.pipelineId
      )) as any;
      let total = r.total || {};
      return {
        output: {
          totalTime: total.time,
          totalCount: total.count,
          successCount: total.success,
          failedCount: total.failed,
          skippedCount: total.skipped,
          errorCount: total.error,
          testSuites: (r.test_suites || []).map((s: any) => ({
            name: s.name,
            totalTime: s.time,
            totalCount: s.count,
            successCount: s.success,
            failedCount: s.failed,
            skippedCount: s.skipped,
            errorCount: s.error
          }))
        },
        message: `Test report summary: **${total.count || 0}** tests — **${total.success || 0}** passed, **${total.failed || 0}** failed, **${total.skipped || 0}** skipped.`
      };
    }

    let r = (await client.getPipelineTestReport(projectId, ctx.input.pipelineId)) as any;
    return {
      output: {
        totalTime: r.total_time,
        totalCount: r.total_count,
        successCount: r.success_count,
        failedCount: r.failed_count,
        skippedCount: r.skipped_count,
        errorCount: r.error_count,
        testSuites: (r.test_suites || []).map((s: any) => ({
          name: s.name,
          totalTime: s.total_time,
          totalCount: s.total_count,
          successCount: s.success_count,
          failedCount: s.failed_count,
          skippedCount: s.skipped_count,
          errorCount: s.error_count,
          testCases: (s.test_cases || []).map((tc: any) => ({
            name: tc.name,
            classname: tc.classname,
            status: tc.status,
            executionTime: tc.execution_time,
            systemOutput: tc.system_output,
            stackTrace: tc.stack_trace
          }))
        }))
      },
      message: `Full test report: **${r.total_count || 0}** tests — **${r.success_count || 0}** passed, **${r.failed_count || 0}** failed.`
    };
  })
  .build();
