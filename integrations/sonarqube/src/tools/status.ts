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
    'Get SonarQube Compute Engine task details by task id, including task status, component, analysis id, submitter, and timing metadata.'
})
  .input(
    z.object({
      taskId: z.string().describe('Compute Engine task id.')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Task id used for the request.'),
      status: z.string().optional().describe('Compute task status.'),
      type: z.string().optional().describe('Compute task type.'),
      componentKey: z.string().optional().describe('Associated component/project key.'),
      analysisId: z.string().optional().describe('Analysis id produced by the task.'),
      submittedAt: z.string().optional().describe('Submission timestamp.'),
      startedAt: z.string().optional().describe('Start timestamp.'),
      executedAt: z.string().optional().describe('Execution/completion timestamp.'),
      executionTimeMs: z.number().optional().describe('Execution time in milliseconds.'),
      raw: rawRecordSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let data = await client.getComputeTask(ctx.input.taskId);
    let task =
      typeof data.task === 'object' && data.task !== null
        ? (data.task as Record<string, unknown>)
        : data;

    return {
      output: {
        taskId: String(task.id ?? ctx.input.taskId),
        status: typeof task.status === 'string' ? task.status : undefined,
        type: typeof task.type === 'string' ? task.type : undefined,
        componentKey: typeof task.componentKey === 'string' ? task.componentKey : undefined,
        analysisId: typeof task.analysisId === 'string' ? task.analysisId : undefined,
        submittedAt: typeof task.submittedAt === 'string' ? task.submittedAt : undefined,
        startedAt: typeof task.startedAt === 'string' ? task.startedAt : undefined,
        executedAt: typeof task.executedAt === 'string' ? task.executedAt : undefined,
        executionTimeMs:
          typeof task.executionTimeMs === 'number' ? task.executionTimeMs : undefined,
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
    'Get pending, in-progress, and last executed Compute Engine analysis tasks for a SonarQube project.'
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
    'Get the SonarQube quality gate status for one project key, project id, or analysis id, optionally scoped to a branch or pull request.'
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
      conditions: z
        .array(
          z.object({
            metricKey: z.string().optional().describe('Condition metric key.'),
            status: z.string().optional().describe('Condition status.'),
            comparator: z.string().optional().describe('Condition comparator.'),
            errorThreshold: z.string().optional().describe('Condition threshold.'),
            actualValue: z.string().optional().describe('Actual metric value.'),
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
            raw: condition
          }))
      : undefined;

    return {
      output: {
        status: typeof status.status === 'string' ? status.status : undefined,
        ignoredConditions:
          typeof status.ignoredConditions === 'boolean' ? status.ignoredConditions : undefined,
        conditions,
        raw: data
      },
      message: `Quality gate status is **${typeof status.status === 'string' ? status.status : 'unknown'}**.`
    };
  })
  .build();
