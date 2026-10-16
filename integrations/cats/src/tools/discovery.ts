import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { collection, requiredId } from '../lib/response';
import { spec } from '../spec';

export let getSite = SlateTool.create(spec, {
  key: 'get_site',
  name: 'Get Site',
  description: 'Inspect the CATS site associated with the connected API key.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      siteId: z.string(),
      subdomain: z.string().optional(),
      mode: z.string().optional(),
      raw: z.any()
    })
  )
  .handleInvocation(async ctx => {
    let raw = await new Client({ token: ctx.auth.token }).getSite();
    return {
      output: {
        siteId: requiredId(raw?.id, 'site'),
        subdomain: raw.subdomain ?? undefined,
        mode: raw.mode ?? undefined,
        raw
      },
      message: 'Retrieved the connected CATS site.'
    };
  })
  .build();

let list = (
  key: string,
  name: string,
  resource: string,
  description: string,
  request: (
    client: Client,
    input: { page?: number; perPage?: number; resourceId?: string }
  ) => Promise<any>,
  needsId?: string
) =>
  SlateTool.create(spec, { key, name, description, tags: { readOnly: true } })
    .input(
      z.object({
        page: z.number().optional().describe('Page number, starting at 1'),
        perPage: z.number().optional().describe('Results per page, at most 100'),
        ...(needsId ? { resourceId: z.string().describe(needsId) } : {})
      })
    )
    .output(
      z.object({
        records: z.array(
          z.object({ id: z.string(), title: z.string().optional(), raw: z.any() })
        ),
        totalCount: z.number().optional(),
        raw: z.any()
      })
    )
    .handleInvocation(async ctx => {
      let resourceId =
        typeof ctx.input.resourceId === 'string' ? ctx.input.resourceId : undefined;
      if (needsId && !resourceId) throw createApiServiceError(needsId);
      let raw = await request(new Client({ token: ctx.auth.token }), {
        page: ctx.input.page,
        perPage: ctx.input.perPage,
        resourceId
      });
      let records = collection(raw, resource).map(item => ({
        id: requiredId(item.id, resource),
        title: item.title ?? undefined,
        raw: item
      }));
      return {
        output: { records, totalCount: raw.total ?? undefined, raw },
        message: `Listed ${records.length} records.`
      };
    })
    .build();

export let listPipelines = list(
  'list_pipelines',
  'List Pipelines',
  'pipelines',
  'List candidate-job relationships with their current workflow and status IDs.',
  (client, input) => client.listPipelines(input)
);
export let listWorkflows = list(
  'list_workflows',
  'List Workflows',
  'workflows',
  'Discover hiring workflow IDs, titles, and the default workflow.',
  (client, input) => client.listWorkflows(input)
);
export let listWorkflowStatuses = list(
  'list_workflow_statuses',
  'List Workflow Statuses',
  'statuses',
  'Discover status IDs and attached triggers for a hiring workflow.',
  (client, input) => client.listWorkflowStatuses(input.resourceId!, input),
  'resourceId must be a workflow ID from list_workflows or get_pipeline.'
);
export let listJobStatuses = list(
  'list_job_statuses',
  'List Job Statuses',
  'statuses',
  'Discover site-wide job status IDs before calling change_job_status.',
  (client, input) => client.getJobStatuses(input)
);
export let listTags = list(
  'list_tags',
  'List Tags',
  'tags',
  'Discover existing CATS tag IDs and titles before updating record tags.',
  (client, input) => client.listTags(input)
);

export let changeJobStatus = SlateTool.create(spec, {
  key: 'change_job_status',
  name: 'Change Job Status',
  description:
    'Change a job to a status discovered with list_job_statuses. Omitted triggers use the provider defaults.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      jobId: z.string().describe('Job ID from search_jobs'),
      statusId: z.number().describe('Status ID from list_job_statuses'),
      triggers: z
        .array(z.object({ id: z.number(), fire: z.boolean() }))
        .optional()
        .describe('When provided, include every trigger attached to the status')
    })
  )
  .output(z.object({ jobId: z.string(), updated: z.boolean() }))
  .handleInvocation(async ctx => {
    await new Client({ token: ctx.auth.token }).changeJobStatus(ctx.input.jobId, {
      status_id: ctx.input.statusId,
      ...(ctx.input.triggers === undefined ? {} : { triggers: ctx.input.triggers })
    });
    return {
      output: { jobId: ctx.input.jobId, updated: true },
      message: `Changed job ${ctx.input.jobId} status.`
    };
  })
  .build();

let remove = (
  key: string,
  name: string,
  description: string,
  request: (client: Client, id: string) => Promise<void>
) =>
  SlateTool.create(spec, {
    key,
    name,
    description,
    tags: { readOnly: false, destructive: true }
  })
    .input(z.object({ recordId: z.string().describe('ID of the record to delete') }))
    .output(z.object({ recordId: z.string(), deleted: z.boolean() }))
    .handleInvocation(async ctx => {
      await request(new Client({ token: ctx.auth.token }), ctx.input.recordId);
      return {
        output: { recordId: ctx.input.recordId, deleted: true },
        message: `Deleted record ${ctx.input.recordId}.`
      };
    })
    .build();

export let deleteCompany = remove(
  'delete_company',
  'Delete Company',
  'Delete a company by its ID from search_companies.',
  (client, id) => client.deleteCompany(id)
);
export let deleteContact = remove(
  'delete_contact',
  'Delete Contact',
  'Delete a contact by its ID from search_contacts.',
  (client, id) => client.deleteContact(id)
);
export let deleteTask = remove(
  'delete_task',
  'Delete Task',
  'Delete a task by its ID from list_tasks or create_task.',
  (client, id) => client.deleteTask(id)
);
