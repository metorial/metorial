import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let teamActivity = SlateTrigger.create(spec, {
  name: 'Team Activity',
  key: 'team_activity',
  description:
    'Polls for new activity events within a team, including video additions/deletions, subtitle changes, URL changes, and membership changes.'
})
  .input(
    z.object({
      activityType: z.string().describe('Type of activity event'),
      date: z.string().describe('Activity date (ISO 8601)'),
      username: z.string().nullable().describe('User who performed the action'),
      videoId: z.string().nullable().describe('Related video ID'),
      languageCode: z.string().nullable().describe('Related language code'),
      teamSlug: z.string().describe('Team slug the activity belongs to')
    })
  )
  .output(
    z.object({
      activityType: z
        .string()
        .describe('Type of activity (e.g. video-added, version-added, member-joined)'),
      date: z.string().describe('Activity date (ISO 8601)'),
      username: z.string().nullable().describe('User who performed the action'),
      videoId: z.string().nullable().describe('Related video ID'),
      languageCode: z.string().nullable().describe('Related language code'),
      teamSlug: z.string().describe('Team slug')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },
    pollEvents: async ctx => {
      let teamSlug = ctx.config && (ctx.config as any).teamSlug;
      if (!teamSlug) {
        // Try to infer from state or use a default approach
        teamSlug = ctx.state?.teamSlug;
      }
      if (!teamSlug) {
        return { inputs: [], updatedState: ctx.state || {} };
      }

      let client = new Client({
        token: ctx.auth.token,
        username: ctx.auth.username
      });

      let params: Record<string, any> = {
        limit: 50
      };

      if (ctx.state?.lastPollDate) {
        params.after = ctx.state.lastPollDate;
      }

      let result = await client.getTeamActivity(teamSlug, params);

      let inputs = result.objects.map(a => ({
        activityType: a.type,
        date: a.date,
        username: a.user?.username ?? null,
        videoId: a.video ?? null,
        languageCode: a.language ?? null,
        teamSlug
      }));

      let latestDate = ctx.state?.lastPollDate;
      if (result.objects.length > 0 && result.objects[0]!.date) {
        latestDate = result.objects[0]!.date;
      }

      return {
        inputs,
        updatedState: {
          teamSlug,
          lastPollDate: latestDate
        }
      };
    },
    handleEvent: async ctx => {
      return {
        type: `activity.${ctx.input.activityType}`,
        id: `${ctx.input.teamSlug}-${ctx.input.activityType}-${ctx.input.date}-${ctx.input.username || 'system'}`,
        output: {
          activityType: ctx.input.activityType,
          date: ctx.input.date,
          username: ctx.input.username,
          videoId: ctx.input.videoId,
          languageCode: ctx.input.languageCode,
          teamSlug: ctx.input.teamSlug
        }
      };
    }
  })
  .build();
