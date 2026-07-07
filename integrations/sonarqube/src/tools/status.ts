import { z } from 'zod';
import { sonarqubeValidationError } from '../lib/errors';
import { branchPullRequestInputs, createClient, readOnlyTool } from './shared';

export let getQualityGateStatusTool = readOnlyTool({
  name: 'Get SonarQube Project Quality Gate Status',
  key: 'get_project_quality_gate_status',
  description:
    "Get the Quality Gate Status for a project. Either 'analysisId', 'projectId' or 'projectKey' must be provided."
})
  .input(
    z.object({
      analysisId: z
        .string()
        .optional()
        .describe(
          "The optional analysis ID to get the status for, for example 'AU-TpxcA-iU5OvuD2FL1'"
        ),
      projectId: z
        .string()
        .optional()
        .describe(
          "The optional project ID to get the status for, for example 'AU-Tpxb--iU5OvuD2FLy'. Doesn't work with branches or pull requests."
        ),
      projectKey: z
        .string()
        .optional()
        .describe("The optional project key to get the status for, for example 'my_project'"),
      ...branchPullRequestInputs
    })
  )
  .output(
    z.object({
      status: z.string().describe('Overall quality gate status (OK, WARN, ERROR, etc.)'),
      conditions: z
        .array(
          z.object({
            metricKey: z.string().describe('Metric key'),
            status: z.string().describe('Condition status (OK, ERROR, etc.)'),
            errorThreshold: z.string().optional().describe('Error threshold value'),
            actualValue: z.string().optional().describe('Metric actual value')
          })
        )
        .describe('List of quality gate conditions'),
      ignoredConditions: z.boolean().optional().describe('Whether the quality gate is ignored')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.analysisId && !ctx.input.projectId && !ctx.input.projectKey) {
      throw sonarqubeValidationError(
        "Either 'analysisId', 'projectId' or 'projectKey' must be provided"
      );
    }

    if (ctx.input.branch && ctx.input.pullRequest) {
      throw sonarqubeValidationError(
        "Cannot use 'branch' and 'pullRequest' together. Use 'branch' for long-lived branches (see list_branches) or 'pullRequest' for pull requests (see list_pull_requests)."
      );
    }

    if (ctx.input.projectId && (ctx.input.branch || ctx.input.pullRequest)) {
      throw sonarqubeValidationError("Project ID doesn't work with branches or pull requests");
    }

    let client = createClient(ctx);
    let data = await client.getQualityGateStatus({
      analysisId: ctx.input.analysisId,
      projectId: ctx.input.projectId,
      projectKey: ctx.input.projectKey,
      branch: ctx.input.branch,
      pullRequest: ctx.input.pullRequest
    });
    let status =
      typeof data.projectStatus === 'object' && data.projectStatus !== null
        ? (data.projectStatus as Record<string, unknown>)
        : data;
    if (typeof status.status !== 'string') {
      throw sonarqubeValidationError(
        'SonarQube quality gate status response did not include status.'
      );
    }

    if (!Array.isArray(status.conditions)) {
      throw sonarqubeValidationError(
        'SonarQube quality gate status response did not include conditions.'
      );
    }

    let conditions = status.conditions.map(condition => {
      if (typeof condition !== 'object' || condition === null) {
        throw sonarqubeValidationError(
          'SonarQube quality gate status response included an invalid condition.'
        );
      }

      let conditionRecord = condition as Record<string, unknown>;
      if (typeof conditionRecord.metricKey !== 'string') {
        throw sonarqubeValidationError(
          'SonarQube quality gate status response did not include condition metricKey.'
        );
      }
      if (typeof conditionRecord.status !== 'string') {
        throw sonarqubeValidationError(
          'SonarQube quality gate status response did not include condition status.'
        );
      }

      return {
        metricKey: conditionRecord.metricKey,
        status: conditionRecord.status,
        errorThreshold:
          typeof conditionRecord.errorThreshold === 'string'
            ? conditionRecord.errorThreshold
            : undefined,
        actualValue:
          typeof conditionRecord.actualValue === 'string'
            ? conditionRecord.actualValue
            : undefined
      };
    });

    return {
      output: {
        status: status.status,
        conditions
      },
      message: `Quality gate status is **${status.status}**.`
    };
  })
  .build();
