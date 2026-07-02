import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let jobOutputSchema = z.object({
  jobId: z.string().describe('Unique identifier for the job'),
  addressId: z.string().describe('ID of the address where the job is performed'),
  toDoListId: z.string().nullable().describe('ID of the associated to-do list'),
  status: z
    .string()
    .describe('Current status of the job (e.g. scheduled, in_progress, completed, cancelled)'),
  price: z.number().nullable().describe('Price of the job'),
  isPartiallyCompleted: z
    .boolean()
    .nullable()
    .describe('Whether the job was only partially completed'),
  cancelledBy: z.string().nullable().describe('Who cancelled the job, if applicable'),
  serviceTypeKey: z.string().describe('Service type key (e.g. regular_cleaning.one_hour)'),
  url: z.string().nullable().describe('URL link to the job details'),
  currentStartDatetime: z.string().nullable().describe('Currently scheduled start time'),
  preferredStartDatetime: z.string().nullable().describe('Preferred start time'),
  startNoEarlierThan: z.string().describe('Earliest allowed start time'),
  endNoLaterThan: z.string().describe('Latest allowed end time'),
  createdAt: z.string().nullable().describe('Timestamp when the job was created')
});

let mapJob = (data: any) => ({
  jobId: data.id,
  addressId: data.address_id,
  toDoListId: data.to_do_list_id ?? null,
  status: data.status,
  price: data.price ?? null,
  isPartiallyCompleted: data.is_partially_completed ?? null,
  cancelledBy: data.cancelled_by ?? null,
  serviceTypeKey: data.service_type_key,
  url: data.url ?? null,
  currentStartDatetime: data.current_start_datetime ?? null,
  preferredStartDatetime: data.preferred_start_datetime ?? null,
  startNoEarlierThan: data.start_no_earlier_than,
  endNoLaterThan: data.end_no_later_than,
  createdAt: data.created_at ?? null
});

export let listJobs = SlateTool.create(spec, {
  name: 'List Jobs',
  key: 'list_jobs',
  description: `List all cleaning or maintenance jobs. Optionally filter by address, status, or to-do list. Use this to monitor job progress across your properties.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      addressId: z.string().optional().describe('Filter jobs by address ID'),
      status: z
        .enum(['scheduled', 'in_progress', 'completed', 'cancelled'])
        .optional()
        .describe('Filter jobs by status'),
      toDoListId: z.string().optional().describe('Filter jobs by to-do list ID')
    })
  )
  .output(
    z.object({
      jobs: z.array(jobOutputSchema).describe('List of jobs matching the filters')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listJobs(ctx.input);
    let jobs = (result.data ?? result ?? []).map(mapJob);

    return {
      output: { jobs },
      message: `Found **${jobs.length}** job(s).`
    };
  })
  .build();

export let getJob = SlateTool.create(spec, {
  name: 'Get Job',
  key: 'get_job',
  description: `Retrieve detailed information about a specific job by its ID, including status, scheduling, pricing, and assigned to-do list.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobId: z.string().describe('ID of the job to retrieve')
    })
  )
  .output(jobOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getJob(ctx.input.jobId);
    let job = mapJob(result);

    return {
      output: job,
      message: `Retrieved job **${job.jobId}** (status: ${job.status}).`
    };
  })
  .build();

export let createJob = SlateTool.create(spec, {
  name: 'Create Job',
  key: 'create_job',
  description: `Schedule a new cleaning or maintenance job at a property. Specify the address, service type, and a preferred time window. Optionally attach a to-do list defining what tasks should be completed.`,
  instructions: [
    'Use the "Check Booking Availability" tool first to find available time slots before creating a job.',
    'Common service type keys include: `regular_cleaning.one_hour`, `regular_cleaning.two_hours`, `regular_cleaning.three_hours`, `regular_cleaning.four_hours`.'
  ]
})
  .input(
    z.object({
      addressId: z.string().describe('ID of the address where the job should be performed'),
      serviceTypeKey: z
        .string()
        .describe('Service type key (e.g. "regular_cleaning.one_hour")'),
      startNoEarlierThan: z
        .string()
        .describe('Earliest allowed start time (ISO 8601 datetime)'),
      endNoLaterThan: z.string().describe('Latest allowed end time (ISO 8601 datetime)'),
      toDoListId: z.string().optional().describe('ID of a to-do list to assign to the job'),
      preferredStartDatetime: z
        .string()
        .optional()
        .describe('Preferred start time within the window (ISO 8601 datetime)')
    })
  )
  .output(jobOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createJob(ctx.input);
    let job = mapJob(result);

    return {
      output: job,
      message: `Created job **${job.jobId}** for service type \`${job.serviceTypeKey}\` (status: ${job.status}).`
    };
  })
  .build();

export let updateJob = SlateTool.create(spec, {
  name: 'Update Job',
  key: 'update_job',
  description: `Make minor updates to an existing job, such as adjusting the time window or changing the to-do list. For major schedule changes, use the "Reschedule Job" tool instead.`,
  constraints: [
    'Only minor time adjustments are allowed. For major changes, use the reschedule endpoint.'
  ]
})
  .input(
    z.object({
      jobId: z.string().describe('ID of the job to update'),
      toDoListId: z.string().optional().describe('New to-do list ID to assign to the job'),
      startNoEarlierThan: z
        .string()
        .optional()
        .describe('Updated earliest allowed start time (ISO 8601 datetime)'),
      endNoLaterThan: z
        .string()
        .optional()
        .describe('Updated latest allowed end time (ISO 8601 datetime)')
    })
  )
  .output(jobOutputSchema)
  .handleInvocation(async ctx => {
    let { jobId, ...updateParams } = ctx.input;
    let client = new Client({ token: ctx.auth.token });
    let result = await client.updateJob(jobId, updateParams);
    let job = mapJob(result);

    return {
      output: job,
      message: `Updated job **${job.jobId}**.`
    };
  })
  .build();

export let cancelJob = SlateTool.create(spec, {
  name: 'Cancel Job',
  key: 'cancel_job',
  description: `Cancel a scheduled job. Once cancelled, the job cannot be reactivated; you would need to create a new job instead.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      jobId: z.string().describe('ID of the job to cancel')
    })
  )
  .output(jobOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.cancelJob(ctx.input.jobId);
    let job = mapJob(result);

    return {
      output: job,
      message: `Cancelled job **${job.jobId}**.`
    };
  })
  .build();

export let rescheduleJob = SlateTool.create(spec, {
  name: 'Reschedule Job',
  key: 'reschedule_job',
  description: `Reschedule an existing job with a new time window and optionally a new service type. Use this for major schedule changes. For minor adjustments, use the "Update Job" tool.`
})
  .input(
    z.object({
      jobId: z.string().describe('ID of the job to reschedule'),
      serviceTypeKey: z.string().describe('Service type key for the rescheduled job'),
      startNoEarlierThan: z
        .string()
        .describe('New earliest allowed start time (ISO 8601 datetime)'),
      endNoLaterThan: z.string().describe('New latest allowed end time (ISO 8601 datetime)'),
      preferredStartDatetime: z
        .string()
        .optional()
        .describe('Preferred start time within the new window (ISO 8601 datetime)'),
      toDoListId: z.string().optional().describe('To-do list ID for the rescheduled job')
    })
  )
  .output(jobOutputSchema)
  .handleInvocation(async ctx => {
    let { jobId, ...params } = ctx.input;
    let client = new Client({ token: ctx.auth.token });
    let result = await client.rescheduleJob(jobId, params);
    let job = mapJob(result);

    return {
      output: job,
      message: `Rescheduled job **${job.jobId}** to ${job.startNoEarlierThan} - ${job.endNoLaterThan}.`
    };
  })
  .build();
