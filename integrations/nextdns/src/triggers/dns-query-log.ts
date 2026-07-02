import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { NextDnsClient } from '../lib/client';
import { spec } from '../spec';

export let dnsQueryLog = SlateTrigger.create(spec, {
  name: 'DNS Query Log',
  key: 'dns_query_log',
  description:
    'Triggers on new DNS query log entries for a NextDNS profile. Captures queries as they are logged, including domain, status, device, and blocking reasons. Set the profileId in global config to monitor a specific profile, otherwise all profiles are polled.'
})
  .input(
    z.object({
      logId: z.string().describe('Unique identifier for this log entry'),
      profileId: z.string().describe('Profile ID this log belongs to'),
      timestamp: z.string().describe('ISO 8601 timestamp of the query'),
      domain: z.string().describe('Queried domain name'),
      root: z.string().optional().describe('Root domain'),
      tracker: z.string().optional().describe('Tracker identifier'),
      encrypted: z.boolean().optional().describe('Whether the query was encrypted'),
      protocol: z.string().optional().describe('DNS protocol used'),
      clientIp: z.string().optional().describe('Client IP address'),
      clientName: z.string().optional().describe('Client name'),
      deviceId: z.string().optional().describe('Device ID'),
      deviceName: z.string().optional().describe('Device name'),
      deviceModel: z.string().optional().describe('Device model'),
      status: z.string().describe('Query status'),
      reasons: z.array(z.record(z.string(), z.unknown())).optional().describe('Block reasons')
    })
  )
  .output(
    z.object({
      profileId: z.string().describe('Profile ID this log belongs to'),
      domain: z.string().describe('Queried domain name'),
      root: z.string().optional().describe('Root domain'),
      tracker: z.string().optional().describe('Tracker identifier if applicable'),
      encrypted: z.boolean().optional().describe('Whether the query was encrypted'),
      protocol: z.string().optional().describe('DNS protocol used'),
      clientIp: z.string().optional().describe('Source IP address'),
      clientName: z.string().optional().describe('Client name if identified'),
      deviceId: z.string().optional().describe('Device identifier'),
      deviceName: z.string().optional().describe('Device name'),
      deviceModel: z.string().optional().describe('Device model'),
      status: z.string().describe('Query status (default, blocked, allowed, error)'),
      reasons: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Reasons for blocking'),
      timestamp: z.string().describe('ISO 8601 timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new NextDnsClient({ token: ctx.auth.token });
      let lastTimestamp = ctx.state?.lastTimestamp as string | undefined;

      let profileIds: string[] = [];

      if (ctx.config.profileId) {
        profileIds = [ctx.config.profileId];
      } else {
        let profiles = await client.listProfiles();
        profileIds = (profiles.data || []).map((p: any) => p.id as string);
      }

      let allEntries: any[] = [];

      for (let profileId of profileIds) {
        let logParams: Record<string, string | number | boolean | undefined> = {
          limit: 100,
          sort: 'desc'
        };
        if (lastTimestamp) {
          logParams.from = lastTimestamp;
        }

        let logs = await client.getLogs(profileId, logParams);
        let entries = logs.data || [];
        for (let entry of entries) {
          allEntries.push({ ...entry, _profileId: profileId });
        }
      }

      // Sort by timestamp descending
      allEntries.sort(
        (a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Filter entries newer than lastTimestamp to avoid duplicates
      if (lastTimestamp) {
        let lastTs = new Date(lastTimestamp).getTime();
        allEntries = allEntries.filter((e: any) => new Date(e.timestamp).getTime() > lastTs);
      }

      let newLastTimestamp = allEntries.length > 0 ? allEntries[0].timestamp : lastTimestamp;

      let inputs = allEntries.map((entry: any) => ({
        logId: `${entry._profileId}-${entry.timestamp}-${entry.domain}`,
        profileId: entry._profileId as string,
        timestamp: entry.timestamp as string,
        domain: entry.domain as string,
        root: entry.root as string | undefined,
        tracker: entry.tracker as string | undefined,
        encrypted: entry.encrypted as boolean | undefined,
        protocol: entry.protocol as string | undefined,
        clientIp: entry.clientIp as string | undefined,
        clientName: entry.client as string | undefined,
        deviceId: entry.device?.id as string | undefined,
        deviceName: entry.device?.name as string | undefined,
        deviceModel: entry.device?.model as string | undefined,
        status: entry.status as string,
        reasons: entry.reasons as Record<string, unknown>[] | undefined
      }));

      return {
        inputs,
        updatedState: {
          lastTimestamp: newLastTimestamp
        }
      };
    },

    handleEvent: async ctx => {
      let statusType = ctx.input.status || 'default';

      return {
        type: `dns_query.${statusType}`,
        id: ctx.input.logId,
        output: {
          profileId: ctx.input.profileId,
          domain: ctx.input.domain,
          root: ctx.input.root,
          tracker: ctx.input.tracker,
          encrypted: ctx.input.encrypted,
          protocol: ctx.input.protocol,
          clientIp: ctx.input.clientIp,
          clientName: ctx.input.clientName,
          deviceId: ctx.input.deviceId,
          deviceName: ctx.input.deviceName,
          deviceModel: ctx.input.deviceModel,
          status: ctx.input.status,
          reasons: ctx.input.reasons,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
