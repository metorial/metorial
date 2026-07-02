import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deviceStatusChange = SlateTrigger.create(spec, {
  name: 'Device Status Change',
  key: 'device_status_change',
  description:
    'Triggers when the Bolt IoT device online/offline status changes. Polls the device to detect transitions between alive and dead states.'
})
  .input(
    z.object({
      eventType: z
        .enum(['device.online', 'device.offline'])
        .describe('Type of status change event'),
      eventId: z.string().describe('Unique identifier for this event'),
      currentStatus: z.string().describe('Current device status ("alive" or "dead")'),
      previousStatus: z.string().describe('Previous device status ("alive" or "dead")')
    })
  )
  .output(
    z.object({
      deviceName: z.string().describe('The device ID of the Bolt module'),
      isOnline: z.boolean().describe('Whether the device is currently online'),
      status: z.string().describe('Current status value ("alive" or "dead")'),
      changedAt: z.string().describe('ISO timestamp of when the status change was detected')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        deviceName: ctx.auth.deviceName
      });

      let response = await client.isAlive();
      let currentStatus = response.success === '1' ? response.value : 'dead';
      let previousStatus = (ctx.state as any)?.lastStatus as string | undefined;
      let now = new Date().toISOString();

      let inputs: Array<{
        eventType: 'device.online' | 'device.offline';
        eventId: string;
        currentStatus: string;
        previousStatus: string;
      }> = [];

      if (previousStatus !== undefined && previousStatus !== currentStatus) {
        inputs.push({
          eventType: currentStatus === 'alive' ? 'device.online' : 'device.offline',
          eventId: `${ctx.auth.deviceName}-${currentStatus}-${now}`,
          currentStatus,
          previousStatus
        });
      }

      return {
        inputs,
        updatedState: {
          lastStatus: currentStatus,
          lastCheckedAt: now
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          deviceName: ctx.auth.deviceName,
          isOnline: ctx.input.currentStatus === 'alive',
          status: ctx.input.currentStatus,
          changedAt: new Date().toISOString()
        }
      };
    }
  })
  .build();
