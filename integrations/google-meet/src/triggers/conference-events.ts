import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { MeetClient } from '../lib/client';
import { googleMeetActionScopes } from '../scopes';
import { spec } from '../spec';

export let conferenceEventsTrigger = SlateTrigger.create(spec, {
  name: 'Conference Events',
  key: 'conference_events',
  description:
    'Triggers when conferences start or end in meeting spaces. Polls for new and recently ended conference records.'
})
  .scopes(googleMeetActionScopes.conferenceEvents)
  .input(
    z.object({
      eventType: z
        .enum(['started', 'ended'])
        .describe('Whether the conference started or ended'),
      conferenceRecordName: z.string().describe('Resource name of the conference record'),
      spaceName: z.string().optional().describe('Associated space resource name'),
      startTime: z.string().optional().describe('When the conference started'),
      endTime: z.string().optional().describe('When the conference ended')
    })
  )
  .output(
    z.object({
      conferenceRecordName: z.string().describe('Resource name of the conference record'),
      spaceName: z.string().optional().describe('Associated space resource name'),
      startTime: z.string().optional().describe('When the conference started'),
      endTime: z.string().optional().describe('When the conference ended')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new MeetClient({ token: ctx.auth.token });

      let lastPollTime = ctx.state?.lastPollTime as string | undefined;
      let knownActiveConferences =
        (ctx.state?.knownActiveConferences as string[] | undefined) || [];

      let filter = lastPollTime ? `start_time>="${lastPollTime}"` : undefined;

      let result = await client.listConferenceRecords(filter, 50);
      let inputs: Array<{
        eventType: 'started' | 'ended';
        conferenceRecordName: string;
        spaceName?: string;
        startTime?: string;
        endTime?: string;
      }> = [];

      let currentActiveConferences: string[] = [];

      for (let record of result.conferenceRecords) {
        let name = record.name || '';

        if (!record.endTime) {
          currentActiveConferences.push(name);
          if (!knownActiveConferences.includes(name)) {
            inputs.push({
              eventType: 'started',
              conferenceRecordName: name,
              spaceName: record.space,
              startTime: record.startTime,
              endTime: record.endTime
            });
          }
        } else if (knownActiveConferences.includes(name)) {
          inputs.push({
            eventType: 'ended',
            conferenceRecordName: name,
            spaceName: record.space,
            startTime: record.startTime,
            endTime: record.endTime
          });
        } else if (!lastPollTime) {
          // On first poll, report recently ended conferences
        } else {
          inputs.push({
            eventType: 'ended',
            conferenceRecordName: name,
            spaceName: record.space,
            startTime: record.startTime,
            endTime: record.endTime
          });
        }
      }

      return {
        inputs,
        updatedState: {
          lastPollTime: new Date().toISOString(),
          knownActiveConferences: currentActiveConferences
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `conference.${ctx.input.eventType}`,
        id: `${ctx.input.conferenceRecordName}-${ctx.input.eventType}`,
        output: {
          conferenceRecordName: ctx.input.conferenceRecordName,
          spaceName: ctx.input.spaceName,
          startTime: ctx.input.startTime,
          endTime: ctx.input.endTime
        }
      };
    }
  })
  .build();
