import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { LastPassClient } from '../lib/client';
import { spec } from '../spec';

export let accountEvents = SlateTrigger.create(spec, {
  name: 'Account Events',
  key: 'account_events',
  description:
    'Polls for new audit events in the LastPass Enterprise account, including login attempts, password changes, shared folder activity, and administrative actions.'
})
  .input(
    z.object({
      timestamp: z.string().describe('Timestamp of the event'),
      username: z.string().describe('Email address of the user who triggered the event'),
      ipAddress: z.string().describe('IP address from which the event originated'),
      action: z.string().describe('Type of action performed'),
      eventData: z.string().describe('Additional data associated with the event'),
      eventId: z.string().describe('Unique identifier for deduplication')
    })
  )
  .output(
    z.object({
      username: z.string().describe('Email address of the user who triggered the event'),
      ipAddress: z.string().describe('IP address from which the event originated'),
      action: z.string().describe('Type of action performed'),
      eventData: z.string().describe('Additional data associated with the event'),
      timestamp: z.string().describe('Timestamp of the event')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new LastPassClient({
        companyId: ctx.auth.companyId,
        provisioningHash: ctx.auth.provisioningHash
      });

      let now = new Date();
      let lastPollTime = (ctx.state as any)?.lastPollTime as string | undefined;

      let fromDate: string;
      if (lastPollTime) {
        fromDate = lastPollTime;
      } else {
        // Default to 24 hours ago on first poll
        let yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        fromDate = formatDateTime(yesterday);
      }

      let toDate = formatDateTime(now);

      let events = await client.getEventReport({
        from: fromDate,
        to: toDate
      });

      let inputs = events.map(e => {
        let eventId = `${e.Time}-${e.Username}-${e.Action}-${e.IP_Address}`;
        return {
          timestamp: e.Time || '',
          username: e.Username || '',
          ipAddress: e.IP_Address || '',
          action: e.Action || '',
          eventData: e.Data || '',
          eventId
        };
      });

      return {
        inputs,
        updatedState: {
          lastPollTime: toDate
        }
      };
    },

    handleEvent: async ctx => {
      let actionType = normalizeActionType(ctx.input.action);

      return {
        type: `account.${actionType}`,
        id: ctx.input.eventId,
        output: {
          username: ctx.input.username,
          ipAddress: ctx.input.ipAddress,
          action: ctx.input.action,
          eventData: ctx.input.eventData,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();

let formatDateTime = (date: Date): string => {
  let year = date.getUTCFullYear();
  let month = String(date.getUTCMonth() + 1).padStart(2, '0');
  let day = String(date.getUTCDate()).padStart(2, '0');
  let hours = String(date.getUTCHours()).padStart(2, '0');
  let minutes = String(date.getUTCMinutes()).padStart(2, '0');
  let seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

let normalizeActionType = (action: string): string => {
  return action
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
};
