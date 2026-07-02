import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let activitySchema = z.object({
  activityUuid: z.string().describe('Unique identifier for the activity'),
  jobUuid: z.string().optional().describe('UUID of the associated job'),
  staffUuid: z.string().optional().describe('UUID of the assigned staff member'),
  startDate: z.string().optional().describe('Activity start date/time'),
  endDate: z.string().optional().describe('Activity end date/time'),
  active: z.number().optional().describe('1 = active, 0 = deleted'),
  editDate: z.string().optional().describe('Last modified timestamp')
});

export let listJobActivities = SlateTool.create(spec, {
  name: 'List Job Activities',
  key: 'list_job_activities',
  description: `List scheduled bookings and recorded time entries (job activities) from ServiceM8. Filter by job UUID, staff UUID, or date range to find specific schedule entries.`,
  instructions: [
    'Filter by job: "job_uuid eq \'<uuid>\'"',
    'Filter by staff: "staff_uuid eq \'<uuid>\'"',
    'Combine with "and" for multiple conditions'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      filter: z.string().optional().describe('OData-style filter expression')
    })
  )
  .output(
    z.object({
      activities: z.array(activitySchema).describe('List of job activities/schedule entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let activities = await client.listJobActivities({ filter: ctx.input.filter });

    let mapped = activities.map((a: any) => ({
      activityUuid: a.uuid,
      jobUuid: a.job_uuid,
      staffUuid: a.staff_uuid,
      startDate: a.start_date,
      endDate: a.end_date,
      active: a.active,
      editDate: a.edit_date
    }));

    return {
      output: { activities: mapped },
      message: `Found **${mapped.length}** job activity/schedule entry(ies).`
    };
  })
  .build();
