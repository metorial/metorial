import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { spec } from '../spec';

export let getJobListings = SlateTool.create(spec, {
  name: 'Get Job Listings',
  key: 'get_job_listings',
  description: `Retrieve all job listings from BambooHR's applicant tracking system. Returns job summaries including titles, statuses, departments, and locations.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(z.object({}))
  .output(
    z.object({
      jobs: z.array(z.record(z.string(), z.any())).describe('List of job summaries')
    })
  )
  .handleInvocation(async ctx => {
    let client = clientFor(ctx);

    let data = await client.getJobSummaries();
    let jobs = data;

    return {
      output: {
        jobs
      },
      message: `Retrieved **${jobs.length}** job listing(s).`
    };
  })
  .build();

export let getApplications = SlateTool.create(spec, {
  name: 'Get Applications',
  key: 'get_applications',
  description: `Retrieve job applications from BambooHR's applicant tracking system. Filter by job ID, status, or new applications since a given date. Supports pagination.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      jobId: z.string().optional().describe('Filter by job ID'),
      applicationStatusId: z.string().optional().describe('Filter by application status ID'),
      newSince: z
        .string()
        .optional()
        .describe(
          'UTC timestamp in YYYY-MM-DD HH:mm:ss format; an ISO timestamp with timezone is also accepted and converted'
        ),
      page: z.number().optional().describe('Page number for pagination'),
      pageLimit: z
        .number()
        .optional()
        .describe('Legacy unsupported parameter; omit it and continue using page'),
      sortBy: z
        .string()
        .optional()
        .describe('Field to sort by (e.g., "created_date", "first_name")'),
      sortOrder: z.enum(['ASC', 'DESC']).optional().describe('Sort order')
    })
  )
  .output(
    z.object({
      applications: z.array(z.record(z.string(), z.any())).describe('List of applications'),
      paginationComplete: z.boolean().describe('Whether all results have been returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = clientFor(ctx);

    let data = await client.getApplications({
      jobId: ctx.input.jobId,
      applicationStatusId: ctx.input.applicationStatusId,
      newSince: ctx.input.newSince,
      page: ctx.input.page,
      pageLimit: ctx.input.pageLimit,
      sortBy: ctx.input.sortBy,
      sortOrder: ctx.input.sortOrder
    });

    let applications = data.applications;
    let paginationComplete = data.paginationComplete;

    return {
      output: {
        applications,
        paginationComplete
      },
      message: `Retrieved **${applications.length}** application(s).`
    };
  })
  .build();

export let getApplicationDetails = SlateTool.create(spec, {
  name: 'Get Application Details',
  key: 'get_application_details',
  description: `Retrieve detailed information about a specific job application, including the applicant's name, contact information, resume, answers to screening questions, and current status.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      applicationId: z.string().describe('The application ID')
    })
  )
  .output(
    z.object({
      application: z.record(z.string(), z.any()).describe('Application details')
    })
  )
  .handleInvocation(async ctx => {
    let client = clientFor(ctx);

    let data = await client.getApplicationDetails(ctx.input.applicationId);

    return {
      output: {
        application: data
      },
      message: `Retrieved details for application **${ctx.input.applicationId}**.`
    };
  })
  .build();

export let updateApplicationStatus = SlateTool.create(spec, {
  name: 'Update Application Status',
  key: 'update_application_status',
  description: `Change the status of an exact job application. Use list_resources with resourceType=application_statuses to discover valid active status IDs.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      applicationId: z.string().describe('The application ID'),
      statusId: z.string().describe('The new status ID')
    })
  )
  .output(
    z.object({
      applicationId: z.string().describe('The application ID'),
      statusId: z.string().describe('The new status ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = clientFor(ctx);

    await client.changeApplicationStatus(ctx.input.applicationId, ctx.input.statusId);

    return {
      output: {
        applicationId: ctx.input.applicationId,
        statusId: ctx.input.statusId
      },
      message: `Updated application **${ctx.input.applicationId}** to status **${ctx.input.statusId}**.`
    };
  })
  .build();

export let addApplicationComment = SlateTool.create(spec, {
  name: 'Add Application Comment',
  key: 'add_application_comment',
  description: `Add a comment to a job application. Useful for leaving notes during the recruitment review process.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      applicationId: z.string().describe('The application ID'),
      comment: z.string().describe('The comment text')
    })
  )
  .output(
    z.object({
      applicationId: z.string().describe('The application ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = clientFor(ctx);

    await client.addApplicationComment(ctx.input.applicationId, ctx.input.comment);

    return {
      output: {
        applicationId: ctx.input.applicationId
      },
      message: `Added comment to application **${ctx.input.applicationId}**.`
    };
  })
  .build();
