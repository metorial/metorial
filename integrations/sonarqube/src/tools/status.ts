import { z } from 'zod';
import {
  createClient,
  projectInput,
  projectKeyFromInput,
  rawRecordSchema,
  readOnlyTool,
  validateProjectStatusIdentifier
} from './shared';

export let getComputeTaskTool = readOnlyTool({
  name: 'Get Compute Task',
  key: 'get_compute_task',
  description:
    'Get SonarQube Compute Engine task details by task id. Use get_project_analysis_status first when you need to discover recent or running task ids for a project.'
})
  .input(
    z.object({
      taskId: z.string().describe('Compute Engine task id.'),
      additionalFields: z
        .array(z.enum(['scannerContext', 'warnings', 'stacktrace']))
        .optional()
        .describe(
          'Optional CE task fields to request from SonarQube. stacktrace is SonarQube Server-only.'
        )
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Task id used for the request.'),
      status: z.string().optional().describe('Compute task status.'),
      type: z.string().optional().describe('Compute task type.'),
      componentId: z.string().optional().describe('Associated component/project id.'),
      componentKey: z.string().optional().describe('Associated component/project key.'),
      componentName: z.string().optional().describe('Associated component/project name.'),
      componentQualifier: z
        .string()
        .optional()
        .describe('Associated component qualifier, such as TRK.'),
      analysisId: z.string().optional().describe('Analysis id produced by the task.'),
      submitterLogin: z.string().optional().describe('Login that submitted the task.'),
      submittedAt: z.string().optional().describe('Submission timestamp.'),
      startedAt: z.string().optional().describe('Start timestamp.'),
      executedAt: z.string().optional().describe('Execution/completion timestamp.'),
      executionTimeMs: z.number().optional().describe('Execution time in milliseconds.'),
      errorMessage: z.string().optional().describe('Task failure message when available.'),
      errorType: z.string().optional().describe('Task failure type when available.'),
      errorStacktrace: z
        .string()
        .optional()
        .describe('Task failure stacktrace when requested and returned by SonarQube.'),
      hasErrorStacktrace: z
        .boolean()
        .optional()
        .describe('Whether SonarQube reports an error stacktrace for the task.'),
      hasScannerContext: z
        .boolean()
        .optional()
        .describe('Whether SonarQube reports scanner context for the task.'),
      scannerContext: z
        .string()
        .optional()
        .describe('Scanner context when requested and returned by SonarQube.'),
      warningCount: z.number().optional().describe('Number of task warnings.'),
      warnings: z
        .array(z.string())
        .optional()
        .describe('Task warnings returned by SonarQube.'),
      raw: rawRecordSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let data = await client.getComputeTask({
      taskId: ctx.input.taskId,
      additionalFields: ctx.input.additionalFields
    });
    let task =
      typeof data.task === 'object' && data.task !== null
        ? (data.task as Record<string, unknown>)
        : data;

    return {
      output: {
        taskId: String(task.id ?? ctx.input.taskId),
        status: typeof task.status === 'string' ? task.status : undefined,
        type: typeof task.type === 'string' ? task.type : undefined,
        componentId: typeof task.componentId === 'string' ? task.componentId : undefined,
        componentKey: typeof task.componentKey === 'string' ? task.componentKey : undefined,
        componentName: typeof task.componentName === 'string' ? task.componentName : undefined,
        componentQualifier:
          typeof task.componentQualifier === 'string' ? task.componentQualifier : undefined,
        analysisId: typeof task.analysisId === 'string' ? task.analysisId : undefined,
        submitterLogin:
          typeof task.submitterLogin === 'string' ? task.submitterLogin : undefined,
        submittedAt: typeof task.submittedAt === 'string' ? task.submittedAt : undefined,
        startedAt: typeof task.startedAt === 'string' ? task.startedAt : undefined,
        executedAt: typeof task.executedAt === 'string' ? task.executedAt : undefined,
        executionTimeMs:
          typeof task.executionTimeMs === 'number' ? task.executionTimeMs : undefined,
        errorMessage: typeof task.errorMessage === 'string' ? task.errorMessage : undefined,
        errorType: typeof task.errorType === 'string' ? task.errorType : undefined,
        errorStacktrace:
          typeof task.errorStacktrace === 'string' ? task.errorStacktrace : undefined,
        hasErrorStacktrace:
          typeof task.hasErrorStacktrace === 'boolean' ? task.hasErrorStacktrace : undefined,
        hasScannerContext:
          typeof task.hasScannerContext === 'boolean' ? task.hasScannerContext : undefined,
        scannerContext:
          typeof task.scannerContext === 'string' ? task.scannerContext : undefined,
        warningCount: typeof task.warningCount === 'number' ? task.warningCount : undefined,
        warnings: Array.isArray(task.warnings)
          ? task.warnings.filter((warning): warning is string => typeof warning === 'string')
          : undefined,
        raw: data
      },
      message: `Retrieved SonarQube compute task **${ctx.input.taskId}**.`
    };
  })
  .build();

export let getProjectAnalysisStatusTool = readOnlyTool({
  name: 'Get Project Analysis Status',
  key: 'get_project_analysis_status',
  description:
    'Get pending, in-progress, and last executed Compute Engine analysis tasks for an exact SonarQube project key. Use search_projects first when the user gave a project name or partial key. Use this for analysis queue/task status, not quality gate status.',
  instructions: [
    'Provide projectKey unless intentionally using a configured defaultProjectKey; do not call this with empty input for an unspecified project.'
  ]
})
  .input(z.object(projectInput))
  .output(
    z.object({
      projectKey: z.string().describe('Project key used for the request.'),
      currentTask: rawRecordSchema.optional().describe('Current in-progress task.'),
      queue: z.array(rawRecordSchema).optional().describe('Pending tasks for the project.'),
      lastExecutedTask: rawRecordSchema.optional().describe('Most recent executed task.'),
      raw: rawRecordSchema
    })
  )
  .handleInvocation(async ctx => {
    let projectKey = projectKeyFromInput(ctx.config, ctx.input);
    let client = createClient(ctx);
    let data = await client.getProjectAnalysisStatus(projectKey);

    return {
      output: {
        projectKey,
        currentTask:
          typeof data.current === 'object' && data.current !== null
            ? (data.current as Record<string, unknown>)
            : undefined,
        queue: Array.isArray(data.queue)
          ? data.queue.filter(
              (item): item is Record<string, unknown> =>
                typeof item === 'object' && item !== null
            )
          : undefined,
        lastExecutedTask:
          typeof data.lastExecutedTask === 'object' && data.lastExecutedTask !== null
            ? (data.lastExecutedTask as Record<string, unknown>)
            : undefined,
        raw: data
      },
      message: `Retrieved analysis task status for SonarQube project **${projectKey}**.`
    };
  })
  .build();

export let getQualityGateStatusTool = readOnlyTool({
  name: 'Get Quality Gate Status',
  key: 'get_quality_gate_status',
  description:
    'Get the SonarQube quality gate status for exactly one project key, project id, or analysis id. Use search_projects first when the user gave a project name or partial key. Branch and pullRequest are only valid with projectKey, and only one of branch or pullRequest may be provided.'
})
  .input(
    z.object({
      analysisId: z
        .string()
        .optional()
        .describe('Analysis id. Cannot be combined with projectId or projectKey.'),
      projectId: z
        .string()
        .optional()
        .describe(
          'Project id. Cannot be combined with analysisId, projectKey, branch, or pullRequest.'
        ),
      projectKey: z
        .string()
        .optional()
        .describe('Project key. Defaults to config.defaultProjectKey when omitted.'),
      branch: z.string().optional().describe('Branch key for projectKey requests.'),
      pullRequest: z
        .string()
        .optional()
        .describe('Pull request id/key for projectKey requests.')
    })
  )
  .output(
    z.object({
      status: z
        .string()
        .optional()
        .describe('Quality gate status such as OK, WARN, ERROR, or NONE.'),
      ignoredConditions: z.boolean().optional().describe('Whether conditions were ignored.'),
      caycStatus: z
        .string()
        .optional()
        .describe('Clean as You Code compliance status when returned by SonarQube Server.'),
      period: rawRecordSchema.optional().describe('New-code period metadata when returned.'),
      conditions: z
        .array(
          z.object({
            metricKey: z.string().optional().describe('Condition metric key.'),
            status: z.string().optional().describe('Condition status.'),
            comparator: z.string().optional().describe('Condition comparator.'),
            errorThreshold: z.string().optional().describe('Condition threshold.'),
            actualValue: z.string().optional().describe('Actual metric value.'),
            periodIndex: z
              .number()
              .optional()
              .describe('Deprecated SonarQube Cloud period index when returned.'),
            raw: rawRecordSchema
          })
        )
        .optional()
        .describe('Quality gate conditions.'),
      raw: rawRecordSchema
    })
  )
  .handleInvocation(async ctx => {
    let projectKey = ctx.input.projectKey;
    if (!ctx.input.analysisId && !ctx.input.projectId) {
      projectKey = projectKeyFromInput(ctx.config, { projectKey });
    }
    validateProjectStatusIdentifier({
      analysisId: ctx.input.analysisId,
      projectId: ctx.input.projectId,
      projectKey
    });

    let client = createClient(ctx);
    let data = await client.getQualityGateStatus({
      analysisId: ctx.input.analysisId,
      projectId: ctx.input.projectId,
      projectKey,
      branch: ctx.input.branch,
      pullRequest: ctx.input.pullRequest
    });
    let status =
      typeof data.projectStatus === 'object' && data.projectStatus !== null
        ? (data.projectStatus as Record<string, unknown>)
        : data;
    let conditions = Array.isArray(status.conditions)
      ? status.conditions
          .filter(
            (item): item is Record<string, unknown> =>
              typeof item === 'object' && item !== null
          )
          .map(condition => ({
            metricKey:
              typeof condition.metricKey === 'string' ? condition.metricKey : undefined,
            status: typeof condition.status === 'string' ? condition.status : undefined,
            comparator:
              typeof condition.comparator === 'string' ? condition.comparator : undefined,
            errorThreshold:
              typeof condition.errorThreshold === 'string'
                ? condition.errorThreshold
                : undefined,
            actualValue:
              typeof condition.actualValue === 'string' ? condition.actualValue : undefined,
            periodIndex:
              typeof condition.periodIndex === 'number' ? condition.periodIndex : undefined,
            raw: condition
          }))
      : undefined;

    return {
      output: {
        status: typeof status.status === 'string' ? status.status : undefined,
        ignoredConditions:
          typeof status.ignoredConditions === 'boolean' ? status.ignoredConditions : undefined,
        caycStatus: typeof status.caycStatus === 'string' ? status.caycStatus : undefined,
        period:
          typeof status.period === 'object' && status.period !== null
            ? (status.period as Record<string, unknown>)
            : undefined,
        conditions,
        raw: data
      },
      message: `Quality gate status is **${typeof status.status === 'string' ? status.status : 'unknown'}**.`
    };
  })
  .build();
