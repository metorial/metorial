import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let dnsRecordChangesTrigger = SlateTrigger.create(spec, {
  name: 'DNS Record Changes',
  key: 'dns_record_changes',
  description:
    '[Polling fallback] Polls for new or modified DNS records in a zone. Detects when DNS records are added, updated, or removed by comparing snapshots between polling intervals.'
})
  .input(
    z.object({
      changeType: z.enum(['added', 'modified', 'removed']).describe('Type of change detected'),
      recordId: z.string().describe('DNS record ID'),
      recordType: z.string().describe('DNS record type'),
      name: z.string().describe('DNS record name'),
      content: z.string().describe('DNS record content/value'),
      ttl: z.number().optional().describe('Time to live'),
      proxied: z.boolean().optional().describe('Whether the record is proxied'),
      modifiedOn: z.string().optional().describe('When the record was last modified')
    })
  )
  .output(
    z.object({
      recordId: z.string().describe('DNS record ID'),
      changeType: z.string().describe('Type of change: added, modified, or removed'),
      recordType: z.string().describe('DNS record type (A, AAAA, CNAME, etc.)'),
      name: z.string().describe('DNS record name'),
      content: z.string().describe('DNS record content/value'),
      ttl: z.number().optional().describe('Time to live'),
      proxied: z
        .boolean()
        .optional()
        .describe('Whether the record is proxied through Cloudflare')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let zoneId = ctx.config.zoneId;
      if (!zoneId) return { inputs: [], updatedState: ctx.state };

      let client = new Client(ctx.auth);
      let response = await client.listDnsRecords(zoneId, { perPage: 100 });

      let currentRecords: Record<string, any> = {};
      for (let r of response.result) {
        currentRecords[r.id] = {
          recordId: r.id,
          recordType: r.type,
          name: r.name,
          content: r.content,
          ttl: r.ttl,
          proxied: r.proxied,
          modifiedOn: r.modified_on
        };
      }

      let previousRecords: Record<string, any> = ctx.state?.records || {};
      let inputs: any[] = [];

      // Detect added and modified records
      for (let [recordId, record] of Object.entries(currentRecords)) {
        let prev = previousRecords[recordId];
        if (!prev) {
          // Only treat as "added" if we had previous state (not first run)
          if (ctx.state?.records) {
            inputs.push({ ...record, changeType: 'added' as const });
          }
        } else if (prev.modifiedOn !== record.modifiedOn || prev.content !== record.content) {
          inputs.push({ ...record, changeType: 'modified' as const });
        }
      }

      // Detect removed records
      if (ctx.state?.records) {
        for (let [recordId, record] of Object.entries(previousRecords)) {
          if (!currentRecords[recordId]) {
            inputs.push({ ...record, changeType: 'removed' as const });
          }
        }
      }

      return {
        inputs,
        updatedState: {
          records: currentRecords
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `dns_record.${ctx.input.changeType}`,
        id: `${ctx.input.recordId}-${ctx.input.changeType}-${ctx.input.modifiedOn || Date.now()}`,
        output: {
          recordId: ctx.input.recordId,
          changeType: ctx.input.changeType,
          recordType: ctx.input.recordType,
          name: ctx.input.name,
          content: ctx.input.content,
          ttl: ctx.input.ttl,
          proxied: ctx.input.proxied
        }
      };
    }
  })
  .build();
