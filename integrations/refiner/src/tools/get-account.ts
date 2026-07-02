import { SlateTool } from 'slates';
import { z } from 'zod';
import { RefinerClient } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account',
  description: `Retrieve information about your Refiner account, including subscription plan details, usage metrics (tracked users, events, page views, survey responses), and configured environments.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      subscription: z
        .object({
          plan: z.string().describe('Current subscription plan name'),
          trackedUsersCount: z.number().describe('Monthly tracked users count'),
          trackedUsersLimit: z.number().describe('Monthly tracked users limit'),
          trackedEventsCount: z.number().describe('Monthly tracked events count'),
          pageViewsCount: z.number().describe('Monthly page views count'),
          pageViewsLimit: z.number().describe('Monthly page views limit'),
          surveyResponsesCount: z.number().describe('Monthly survey responses count'),
          surveyResponsesLimit: z.number().describe('Monthly survey responses limit')
        })
        .describe('Subscription and usage details'),
      environments: z
        .array(
          z.object({
            environmentUuid: z.string().describe('UUID of the environment'),
            name: z.string().describe('Name of the environment'),
            trackedUsers: z.number().describe('Tracked users in this environment'),
            trackedEvents: z.number().describe('Tracked events in this environment'),
            pageViews: z.number().describe('Page views in this environment'),
            surveyResponses: z.number().describe('Survey responses in this environment')
          })
        )
        .describe('Configured environments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RefinerClient({ token: ctx.auth.token });

    let result = (await client.getAccount()) as any;
    let sub = result.subscription || {};

    return {
      output: {
        subscription: {
          plan: sub.plan ?? 'Unknown',
          trackedUsersCount: sub.mtu_count ?? 0,
          trackedUsersLimit: sub.mtu_limit ?? 0,
          trackedEventsCount: sub.mte_count ?? 0,
          pageViewsCount: sub.mpv_count ?? 0,
          pageViewsLimit: sub.mpv_limit ?? 0,
          surveyResponsesCount: sub.msr_count ?? 0,
          surveyResponsesLimit: sub.msr_limit ?? 0
        },
        environments: (result.environments || []).map((env: any) => ({
          environmentUuid: env.uuid,
          name: env.name,
          trackedUsers: env.mtu ?? 0,
          trackedEvents: env.mte ?? 0,
          pageViews: env.mpv ?? 0,
          surveyResponses: env.msr ?? 0
        }))
      },
      message: `Account on **${sub.plan ?? 'Unknown'}** plan — **${sub.mtu_count ?? 0}/${sub.mtu_limit ?? 0}** tracked users, **${sub.msr_count ?? 0}/${sub.msr_limit ?? 0}** survey responses this month.`
    };
  })
  .build();
