import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { NgrokClient } from '../lib/client';
import { spec } from '../spec';

export let domainChangesTrigger = SlateTrigger.create(spec, {
  name: 'Domain Changes',
  key: 'domain_changes',
  description:
    'Triggers when reserved domains are added or removed. Polls for reserved domains and detects new or deleted domains between polling intervals.'
})
  .input(
    z.object({
      changeType: z.enum(['created', 'deleted']).describe('Type of change'),
      domainId: z.string().describe('Domain ID'),
      domain: z.string().describe('Hostname'),
      createdAt: z.string().describe('Creation timestamp'),
      description: z.string().describe('Description'),
      metadata: z.string().describe('Metadata'),
      cnameTarget: z.string().optional().nullable().describe('CNAME target')
    })
  )
  .output(
    z.object({
      domainId: z.string().describe('Domain ID'),
      domain: z.string().describe('Hostname'),
      createdAt: z.string().describe('Creation timestamp'),
      description: z.string().describe('Description'),
      metadata: z.string().describe('Metadata'),
      cnameTarget: z
        .string()
        .optional()
        .nullable()
        .describe('CNAME target for DNS configuration')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new NgrokClient(ctx.auth.token);
      let result = await client.listDomains({ limit: 100 });
      let currentDomains = result.reserved_domains || [];
      let currentMap = new Map<string, any>();
      for (let d of currentDomains) {
        currentMap.set(d.id, d);
      }

      let previousIds: string[] = (ctx.state?.domainIds as string[]) || [];
      let previousIdSet = new Set(previousIds);
      let currentIds = new Set(currentMap.keys());

      let inputs: any[] = [];

      for (let [id, d] of currentMap) {
        if (!previousIdSet.has(id)) {
          inputs.push({
            changeType: 'created' as const,
            domainId: d.id,
            domain: d.domain || '',
            createdAt: d.created_at || '',
            description: d.description || '',
            metadata: d.metadata || '',
            cnameTarget: d.cname_target || null
          });
        }
      }

      for (let prevId of previousIds) {
        if (!currentIds.has(prevId)) {
          inputs.push({
            changeType: 'deleted' as const,
            domainId: prevId,
            domain: '',
            createdAt: '',
            description: '',
            metadata: '',
            cnameTarget: null
          });
        }
      }

      return {
        inputs,
        updatedState: {
          domainIds: Array.from(currentIds)
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `domain.${ctx.input.changeType}`,
        id: `${ctx.input.domainId}-${ctx.input.changeType}-${Date.now()}`,
        output: {
          domainId: ctx.input.domainId,
          domain: ctx.input.domain,
          createdAt: ctx.input.createdAt,
          description: ctx.input.description,
          metadata: ctx.input.metadata,
          cnameTarget: ctx.input.cnameTarget
        }
      };
    }
  })
  .build();
