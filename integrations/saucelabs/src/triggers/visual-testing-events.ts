import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let visualTestingEvents = SlateTrigger.create(spec, {
  name: 'Visual Testing Build Completed',
  key: 'visual_testing_events',
  description:
    'Receive webhook notifications when a Visual Testing build is completed on Sauce Labs. Includes build status, snapshot summary, and project details. Configure in Sauce Labs under Account > Webhooks.'
})
  .input(
    z.object({
      eventType: z.string().describe('Visual testing event type'),
      eventId: z.string().describe('Unique event identifier'),
      payload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      buildId: z.string().describe('Visual build identifier'),
      buildName: z.string().optional().describe('Build name'),
      buildUrl: z.string().optional().describe('URL to view the build in the Sauce Labs UI'),
      orgId: z.string().optional().describe('Organization UUID'),
      userId: z.string().optional().describe('User UUID who created the build'),
      teamId: z.string().optional().describe('Team UUID'),
      status: z
        .string()
        .optional()
        .describe(
          'Build status (APPROVED, EMPTY, EQUAL, ERRORED, QUEUED, REJECTED, UNAPPROVED)'
        ),
      branch: z.string().optional().describe('Branch name'),
      project: z.string().optional().describe('Project name'),
      dataCenter: z
        .string()
        .optional()
        .describe('Data center (us-west-1, eu-central-1, us-east-1)'),
      summary: z
        .record(z.string(), z.number())
        .optional()
        .describe('Snapshot counts by status')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      if (!data?.build_id) {
        return { inputs: [] };
      }

      let statusLower = (data.status ?? '').toLowerCase();
      let eventType = `visual_build.${statusLower || 'completed'}`;

      return {
        inputs: [
          {
            eventType,
            eventId: data.build_id,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let p = ctx.input.payload;

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          buildId: p.build_id,
          buildName: p.build_name,
          buildUrl: p.build_url,
          orgId: p.org_id,
          userId: p.user_id,
          teamId: p.team_id,
          status: p.status,
          branch: p.branch,
          project: p.project,
          dataCenter: p.data_center,
          summary: p.summary
        }
      };
    }
  })
  .build();
