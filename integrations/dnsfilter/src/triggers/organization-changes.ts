import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let organizationChanges = SlateTrigger.create(spec, {
  name: 'Organization Changes',
  key: 'organization_changes',
  description:
    'Triggers when organizations are added or removed. Monitors the list of organizations for changes between polling intervals.'
})
  .input(
    z.object({
      eventType: z
        .enum(['added', 'removed'])
        .describe('Whether the organization was added or removed'),
      organizationId: z.string().describe('Organization ID'),
      organizationName: z.string().describe('Organization name'),
      organizationData: z.record(z.string(), z.any()).describe('Full organization data')
    })
  )
  .output(
    z.object({
      organizationId: z.string().describe('Organization ID'),
      organizationName: z.string().describe('Organization name'),
      eventType: z.string().describe('Type of change'),
      organization: z.record(z.string(), z.any()).describe('Full organization data')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },
    pollEvents: async ctx => {
      let client = new Client(ctx.auth.token);
      let currentOrgs = await client.listOrganizations();

      let currentOrgIds = new Set(currentOrgs.map((o: any) => String(o.id)));
      let previousOrgIds: Set<string> = new Set(
        (ctx.state?.organizationIds as string[]) ?? []
      );

      let inputs: Array<{
        eventType: 'added' | 'removed';
        organizationId: string;
        organizationName: string;
        organizationData: Record<string, any>;
      }> = [];

      // Detect added organizations
      for (let org of currentOrgs) {
        let orgId = String(org.id);
        if (!previousOrgIds.has(orgId)) {
          inputs.push({
            eventType: 'added',
            organizationId: orgId,
            organizationName: org.name ?? '',
            organizationData: org
          });
        }
      }

      // Detect removed organizations
      for (let prevId of previousOrgIds) {
        if (!currentOrgIds.has(prevId)) {
          inputs.push({
            eventType: 'removed',
            organizationId: prevId,
            organizationName: '',
            organizationData: { id: prevId }
          });
        }
      }

      return {
        inputs,
        updatedState: {
          organizationIds: Array.from(currentOrgIds)
        }
      };
    },
    handleEvent: async ctx => {
      return {
        type: `organization.${ctx.input.eventType}`,
        id: `org-${ctx.input.organizationId}-${ctx.input.eventType}-${Date.now()}`,
        output: {
          organizationId: ctx.input.organizationId,
          organizationName: ctx.input.organizationName,
          eventType: ctx.input.eventType,
          organization: ctx.input.organizationData
        }
      };
    }
  })
  .build();
