import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { DuoClient } from '../lib/client';
import { spec } from '../spec';

export let authenticationEvents = SlateTrigger.create(spec, {
  name: 'Authentication Events',
  key: 'authentication_events',
  description:
    'Polls Duo for new authentication log events including successful and failed authentication attempts, push notifications, and bypass events.'
})
  .input(
    z.object({
      txid: z.string().describe('Unique transaction ID of the authentication event'),
      timestamp: z.number().describe('Unix timestamp of the event'),
      username: z.string().optional().describe('Username that attempted authentication'),
      email: z.string().optional().describe('Email of the user'),
      factor: z.string().optional().describe('Authentication factor used'),
      result: z.string().optional().describe('Result of the authentication attempt'),
      reason: z.string().optional().describe('Reason for the result'),
      applicationName: z.string().optional().describe('Name of the application'),
      applicationKey: z.string().optional().describe('Key of the application'),
      accessDeviceIp: z.string().optional().describe('IP address of the accessing device'),
      accessDeviceLocation: z
        .any()
        .optional()
        .describe('Location info of the accessing device'),
      authDeviceName: z.string().optional().describe('Name of the authentication device'),
      eventType: z.string().optional().describe('Type of authentication event')
    })
  )
  .output(
    z.object({
      txid: z.string().describe('Unique transaction ID'),
      timestamp: z.number().describe('Unix timestamp of the event'),
      username: z.string().optional().describe('Username'),
      email: z.string().optional().describe('User email'),
      factor: z.string().optional().describe('Authentication factor used'),
      result: z.string().optional().describe('Authentication result'),
      reason: z.string().optional().describe('Result reason'),
      applicationName: z.string().optional().describe('Application name'),
      applicationKey: z.string().optional().describe('Application integration key'),
      accessDeviceIp: z.string().optional().describe('Access device IP'),
      accessDeviceLocation: z.any().optional().describe('Access device location'),
      authDeviceName: z.string().optional().describe('Auth device name'),
      eventType: z.string().optional().describe('Event type')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new DuoClient({
        integrationKey: ctx.auth.integrationKey,
        secretKey: ctx.auth.secretKey,
        apiHostname: ctx.auth.apiHostname
      });

      // Use a 2-minute buffer since Duo has a 2-minute delay on auth logs
      let twoMinutesMs = 2 * 60 * 1000;
      let nowMs = Date.now();
      let maxtime = String(nowMs - twoMinutesMs);

      // On first poll, start from 5 minutes ago (to avoid huge backfills)
      let defaultMintime = String(nowMs - 5 * 60 * 1000);
      let mintime = (ctx.state?.lastMaxtime as string) || defaultMintime;
      let nextOffset = ctx.state?.nextOffset as string[] | undefined;

      let result = await client.getAuthenticationLogsV2({
        mintime,
        maxtime,
        limit: 100,
        nextOffset
      });

      let data = result.response;
      let logs = data.authlogs || [];

      let inputs = logs.map((log: any) => ({
        txid: log.txid,
        timestamp: log.timestamp,
        username: log.user?.name || undefined,
        email: log.email || undefined,
        factor: log.factor || undefined,
        result: log.result || undefined,
        reason: log.reason || undefined,
        applicationName: log.application?.name || undefined,
        applicationKey: log.application?.key || undefined,
        accessDeviceIp: log.access_device?.ip || undefined,
        accessDeviceLocation: log.access_device?.location || undefined,
        authDeviceName: log.auth_device?.name || undefined,
        eventType: log.event_type || undefined
      }));

      let newNextOffset = data.metadata?.next_offset;
      let updatedState: Record<string, any> = {};

      if (newNextOffset) {
        // More pages available - keep the same mintime and maxtime, use next_offset
        updatedState.lastMaxtime = mintime;
        updatedState.nextOffset = newNextOffset;
      } else {
        // No more pages - advance mintime to current maxtime for next poll
        updatedState.lastMaxtime = maxtime;
        updatedState.nextOffset = undefined;
      }

      return { inputs, updatedState };
    },

    handleEvent: async ctx => {
      let resultType = ctx.input.result?.toLowerCase() || 'unknown';
      return {
        type: `authentication.${resultType}`,
        id: ctx.input.txid,
        output: {
          txid: ctx.input.txid,
          timestamp: ctx.input.timestamp,
          username: ctx.input.username,
          email: ctx.input.email,
          factor: ctx.input.factor,
          result: ctx.input.result,
          reason: ctx.input.reason,
          applicationName: ctx.input.applicationName,
          applicationKey: ctx.input.applicationKey,
          accessDeviceIp: ctx.input.accessDeviceIp,
          accessDeviceLocation: ctx.input.accessDeviceLocation,
          authDeviceName: ctx.input.authDeviceName,
          eventType: ctx.input.eventType
        }
      };
    }
  })
  .build();
