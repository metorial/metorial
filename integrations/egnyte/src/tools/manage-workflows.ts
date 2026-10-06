import { SlateTool } from 'slates';
import { z } from 'zod';
import { EgnyteClient } from '../lib/client';
import { integer, invalid, record, text } from '../lib/contracts';
import { spec } from '../spec';

export let createWorkflowTool = SlateTool.create(spec, {
  name: 'Create Workflow',
  key: 'create_workflow',
  description: `Create a review and approval workflow on a file in Egnyte. Define steps with assignees, due dates, and optional signature requirements. Supports review and approval step types.`
})
  .input(
    z.object({
      name: z.string().describe('Workflow name'),
      workflowType: z.enum(['REVIEW_APPROVE']).describe('Type of workflow'),
      fileGroupId: z.string().describe('Group ID of the file to attach the workflow to'),
      steps: z
        .array(
          z.object({
            name: z.string().optional().describe('Step name; defaults to its position'),
            stepType: z.enum(['REVIEW', 'APPROVAL']).describe('Step type'),
            assigneeIds: z
              .array(z.number())
              .optional()
              .describe('Exact numeric user IDs for this step'),
            assignees: z
              .array(z.string())
              .optional()
              .describe(
                'Legacy usernames; each is resolved to one exact user. Use either these or assigneeIds'
              ),
            dueDate: z.string().optional().describe('Due date for this step (ISO 8601)'),
            minMustComplete: z
              .number()
              .optional()
              .describe('Minimum number of assignees that must complete the step'),
            signatureRequired: z
              .boolean()
              .optional()
              .describe('Whether a signature is required')
          })
        )
        .describe('Workflow steps in order')
    })
  )
  .output(
    z.object({
      workflowId: z.string().describe('Created workflow ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EgnyteClient(ctx.auth);

    if (!ctx.input.steps.length) throw invalid('Provide at least one workflow step.');
    let steps = await Promise.all(
      ctx.input.steps.map(async (step, index) => {
        if ((step.assignees !== undefined) === (step.assigneeIds !== undefined))
          throw invalid('Provide either usernames or numeric assignee IDs for each step.');
        const assignees =
          step.assigneeIds ??
          (await Promise.all(
            (step.assignees ?? []).map(name => client.resolveUsername(name))
          ));
        if (!assignees.length || new Set(assignees).size !== assignees.length)
          throw invalid('Each step requires distinct assignees.');
        assignees.forEach(id => integer(id, 1));
        if (step.minMustComplete !== undefined)
          integer(step.minMustComplete, 1, assignees.length);
        if (step.dueDate !== undefined && !Number.isFinite(Date.parse(step.dueDate)))
          throw invalid('Provide an ISO-8601 workflow due date.');
        if (step.signatureRequired !== undefined && step.stepType !== 'APPROVAL')
          throw invalid('Signature settings apply only to approval steps.');
        return {
          name: step.name === undefined ? `Step ${index + 1}` : text(step.name),
          type: step.stepType,
          stepOptions: {
            assignees,
            dueDate: step.dueDate,
            minMustComplete: step.minMustComplete,
            ...(step.stepType === 'APPROVAL'
              ? { signatureRequired: step.signatureRequired ?? false }
              : {})
          }
        };
      })
    );

    let result = (await client.createWorkflow({
      name: text(ctx.input.name),
      workflowType: ctx.input.workflowType,
      file: { groupId: ctx.input.fileGroupId },
      steps
    })) as Record<string, unknown>;

    return {
      output: {
        workflowId: String(result.workflowId || result.id || '')
      },
      message: `Created workflow **${ctx.input.name}** with ${ctx.input.steps.length} step(s)`
    };
  })
  .build();

export let getWorkflowTool = SlateTool.create(spec, {
  name: 'Get Workflow',
  key: 'get_workflow',
  description: `Get details of a specific workflow in Egnyte including its status, steps, tasks, and completion information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workflowId: z.string().describe('Workflow ID to retrieve')
    })
  )
  .output(
    z.object({
      workflowId: z.string(),
      name: z.string().optional(),
      status: z
        .string()
        .optional()
        .describe('Workflow status (e.g. IN_PROGRESS, COMPLETED, CANCELLED)'),
      creationDate: z.string().optional(),
      completionDate: z.string().optional(),
      creator: z.string().optional(),
      steps: z
        .array(
          z.object({
            stepType: z.string().optional(),
            status: z.string().optional(),
            tasks: z
              .array(
                z.object({
                  taskId: z.string().optional(),
                  assignee: z.string().optional(),
                  status: z.string().optional(),
                  completionDate: z.string().optional()
                })
              )
              .optional()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new EgnyteClient(ctx.auth);

    let result = (await client.getWorkflow(ctx.input.workflowId)) as Record<string, unknown>;

    let steps = Array.isArray(result.steps)
      ? result.steps.map((s: Record<string, unknown>) => ({
          stepType: s.type ? String(s.type) : undefined,
          status: s.status ? String(s.status) : undefined,
          tasks: Array.isArray(s.tasks)
            ? s.tasks.map((t: Record<string, unknown>) => ({
                taskId: t.id ? String(t.id) : undefined,
                assignee:
                  t.assignee && typeof t.assignee === 'object'
                    ? String(record(t.assignee).username ?? '')
                    : undefined,
                status: t.status ? String(t.status) : undefined,
                completionDate: t.completionDate ? String(t.completionDate) : undefined
              }))
            : undefined
        }))
      : undefined;

    let creator = result.creator as Record<string, unknown> | undefined;

    return {
      output: {
        workflowId: String(result.id || ctx.input.workflowId),
        name: result.name ? String(result.name) : undefined,
        status: result.status ? String(result.status) : undefined,
        creationDate: result.creationDate ? String(result.creationDate) : undefined,
        completionDate: result.completionDate ? String(result.completionDate) : undefined,
        creator: creator?.username ? String(creator.username) : undefined,
        steps
      },
      message: `Retrieved workflow **${result.name || ctx.input.workflowId}** — status: ${result.status || 'unknown'}`
    };
  })
  .build();

export let listWorkflowTasksTool = SlateTool.create(spec, {
  name: 'List Workflow Tasks',
  key: 'list_workflow_tasks',
  description: `List pending workflow tasks assigned to the current user in Egnyte. Returns task details including workflow name, file info, assignee, and due dates.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      offset: z.number().optional().describe('Pagination offset'),
      count: z.number().optional().describe('Number of tasks per page')
    })
  )
  .output(
    z.object({
      tasks: z
        .array(
          z.object({
            taskId: z.string(),
            name: z.string().optional(),
            taskType: z.string().optional(),
            status: z.string().optional(),
            creationDate: z.string().optional(),
            dueDate: z.string().optional(),
            workflowId: z.string().optional(),
            workflowName: z.string().optional(),
            fileName: z.string().optional(),
            filePath: z.string().optional()
          })
        )
        .describe('List of workflow tasks'),
      totalCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new EgnyteClient(ctx.auth);

    let result = (await client.listWorkflowTasks({
      offset: ctx.input.offset,
      count: ctx.input.count
    })) as Record<string, unknown>;

    let rawTasks = Array.isArray(result.results) ? result.results : [];
    let tasks = rawTasks.map((t: Record<string, unknown>) => {
      let workflow = t.workflow as Record<string, unknown> | undefined;
      let file = t.file as Record<string, unknown> | undefined;
      return {
        taskId: String(t.id || ''),
        name: t.name ? String(t.name) : undefined,
        taskType: t.taskType ? String(t.taskType) : undefined,
        status: t.status ? String(t.status) : undefined,
        creationDate: t.creationDate ? String(t.creationDate) : undefined,
        dueDate: t.dueDate ? String(t.dueDate) : undefined,
        workflowId: workflow?.id ? String(workflow.id) : undefined,
        workflowName: workflow?.name ? String(workflow.name) : undefined,
        fileName: file?.name ? String(file.name) : undefined,
        filePath: file?.path ? String(file.path) : undefined
      };
    });

    return {
      output: {
        tasks,
        totalCount: typeof result.totalCount === 'number' ? result.totalCount : undefined
      },
      message: `Found **${tasks.length}** workflow task(s)`
    };
  })
  .build();

export let cancelWorkflowTool = SlateTool.create(spec, {
  name: 'Cancel Workflow',
  key: 'cancel_workflow',
  description: `Request cancellation of an in-progress workflow in Egnyte. Cancellation may finish asynchronously.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      workflowId: z.string().describe('ID of the workflow to cancel')
    })
  )
  .output(
    z.object({
      workflowId: z.string(),
      cancelled: z.boolean(),
      status: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new EgnyteClient(ctx.auth);

    await client.cancelWorkflow(ctx.input.workflowId);
    const state = await client.getWorkflow(ctx.input.workflowId);
    if (!['BEING_CANCELLED', 'CANCELLED'].includes(String(state.status)))
      throw invalid(
        'Workflow cancellation was requested, but the resulting state is not confirmed.'
      );

    return {
      output: {
        workflowId: ctx.input.workflowId,
        cancelled: state.status === 'CANCELLED',
        status: String(state.status)
      },
      message: `Workflow cancellation ${state.status === 'CANCELLED' ? 'completed' : 'is pending'} for **${ctx.input.workflowId}**`
    };
  })
  .build();
