import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { MeetClient } from '../lib/client';
import { googleMeetActionScopes } from '../scopes';
import { spec } from '../spec';

export let participantEventsTrigger = SlateTrigger.create(spec, {
  name: 'Participant Events',
  key: 'participant_events',
  description:
    'Triggers when participants join or leave an active conference. Polls for participant changes across conference records.'
})
  .scopes(googleMeetActionScopes.participantEvents)
  .input(
    z.object({
      eventType: z.enum(['joined', 'left']).describe('Whether the participant joined or left'),
      conferenceRecordName: z.string().describe('Conference record resource name'),
      participantName: z.string().describe('Participant resource name'),
      displayName: z.string().optional().describe('Display name of the participant'),
      userType: z.enum(['signedIn', 'anonymous', 'phone']).describe('Type of participant'),
      userResourceName: z
        .string()
        .optional()
        .describe('User resource name for signed-in users'),
      earliestStartTime: z.string().optional().describe('When the participant first joined'),
      latestEndTime: z.string().optional().describe('When the participant last left')
    })
  )
  .output(
    z.object({
      conferenceRecordName: z.string().describe('Conference record resource name'),
      participantName: z.string().describe('Participant resource name'),
      displayName: z.string().optional().describe('Display name'),
      userType: z.string().describe('Type: signedIn, anonymous, or phone'),
      userResourceName: z
        .string()
        .optional()
        .describe('User resource name for signed-in users'),
      earliestStartTime: z.string().optional().describe('When the participant first joined'),
      latestEndTime: z.string().optional().describe('When the participant last left')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new MeetClient({ token: ctx.auth.token });

      let knownParticipants =
        (ctx.state?.knownParticipants as Record<string, string[]> | undefined) || {};
      let activeConferences = (ctx.state?.activeConferences as string[] | undefined) || [];

      // Get recent conference records to find active ones
      let records = await client.listConferenceRecords(undefined, 20);
      let currentActiveConferences: string[] = [];
      let inputs: Array<{
        eventType: 'joined' | 'left';
        conferenceRecordName: string;
        participantName: string;
        displayName?: string;
        userType: 'signedIn' | 'anonymous' | 'phone';
        userResourceName?: string;
        earliestStartTime?: string;
        latestEndTime?: string;
      }> = [];

      let updatedKnownParticipants: Record<string, string[]> = {};

      for (let record of records.conferenceRecords) {
        let recordName = record.name || '';
        if (!record.endTime) {
          currentActiveConferences.push(recordName);
        }

        // Check participants for active conferences and recently active ones
        if (!record.endTime || activeConferences.includes(recordName)) {
          let participantsResult = await client.listParticipants(recordName, 100);
          let currentParticipantNames: string[] = [];

          for (let p of participantsResult.participants) {
            let pName = p.name || '';
            currentParticipantNames.push(pName);

            let previouslyKnown = knownParticipants[recordName] || [];

            let userType: 'signedIn' | 'anonymous' | 'phone' = 'anonymous';
            let displayName: string | undefined;
            let userResourceName: string | undefined;

            if (p.signedinUser) {
              userType = 'signedIn';
              displayName = p.signedinUser.displayName;
              userResourceName = p.signedinUser.user;
            } else if (p.phoneUser) {
              userType = 'phone';
              displayName = p.phoneUser.displayName;
            } else if (p.anonymousUser) {
              userType = 'anonymous';
              displayName = p.anonymousUser.displayName;
            }

            if (!previouslyKnown.includes(pName)) {
              inputs.push({
                eventType: 'joined',
                conferenceRecordName: recordName,
                participantName: pName,
                displayName,
                userType,
                userResourceName,
                earliestStartTime: p.earliestStartTime,
                latestEndTime: p.latestEndTime
              });
            } else if (p.latestEndTime && !previouslyKnown.includes(`${pName}:left`)) {
              inputs.push({
                eventType: 'left',
                conferenceRecordName: recordName,
                participantName: pName,
                displayName,
                userType,
                userResourceName,
                earliestStartTime: p.earliestStartTime,
                latestEndTime: p.latestEndTime
              });
              currentParticipantNames.push(`${pName}:left`);
            }
          }

          updatedKnownParticipants[recordName] = currentParticipantNames;
        }
      }

      return {
        inputs,
        updatedState: {
          knownParticipants: updatedKnownParticipants,
          activeConferences: currentActiveConferences
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `participant.${ctx.input.eventType}`,
        id: `${ctx.input.participantName}-${ctx.input.eventType}-${ctx.input.latestEndTime || ctx.input.earliestStartTime || Date.now()}`,
        output: {
          conferenceRecordName: ctx.input.conferenceRecordName,
          participantName: ctx.input.participantName,
          displayName: ctx.input.displayName,
          userType: ctx.input.userType,
          userResourceName: ctx.input.userResourceName,
          earliestStartTime: ctx.input.earliestStartTime,
          latestEndTime: ctx.input.latestEndTime
        }
      };
    }
  })
  .build();
