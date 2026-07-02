import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let caseChanges = SlateTrigger.create(spec, {
  name: 'Case Changes',
  key: 'case_changes',
  description:
    'Triggers when cases are created, updated, closed, or reopened. Polls the Kibana cases API to detect changes.'
})
  .input(
    z.object({
      changeType: z
        .enum(['created', 'updated', 'closed', 'reopened'])
        .describe('Type of change detected'),
      caseId: z.string().describe('ID of the affected case'),
      title: z.string().describe('Title of the case'),
      status: z.string().describe('Current case status'),
      severity: z.string().optional().describe('Case severity'),
      updatedAt: z.string().describe('Last update timestamp'),
      tags: z.array(z.string()).describe('Case tags')
    })
  )
  .output(
    z.object({
      caseId: z.string().describe('ID of the affected case'),
      title: z.string().describe('Title of the case'),
      description: z.string().optional().describe('Description of the case'),
      status: z.string().describe('Current case status'),
      severity: z.string().optional().describe('Case severity'),
      tags: z.array(z.string()).describe('Case tags'),
      owner: z.string().optional().describe('Owner application'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      createdBy: z.string().optional().describe('User who created the case'),
      updatedAt: z.string().describe('Last update timestamp'),
      closedAt: z.string().optional().describe('Closure timestamp'),
      totalComments: z.number().optional().describe('Total number of comments'),
      totalAlerts: z.number().optional().describe('Total attached alerts')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx);

      let state = ctx.state ?? {};
      let lastPollTime = state.lastPollTime as string | undefined;
      let knownCases = (state.knownCases ?? {}) as Record<
        string,
        { updatedAt: string; status: string }
      >;

      let result = await client.findCases({
        perPage: 100,
        sortField: 'updatedAt',
        sortOrder: 'desc'
      });

      let cases = result.cases ?? [];
      let inputs: Array<{
        changeType: 'created' | 'updated' | 'closed' | 'reopened';
        caseId: string;
        title: string;
        status: string;
        severity: string | undefined;
        updatedAt: string;
        tags: string[];
      }> = [];

      let newKnownCases: Record<string, { updatedAt: string; status: string }> = {};

      for (let c of cases) {
        let caseId = c.id;
        let updatedAt = c.updated_at ?? '';
        let status = c.status ?? 'open';
        let known = knownCases[caseId];

        newKnownCases[caseId] = { updatedAt, status };

        if (!lastPollTime) continue;

        if (!known) {
          inputs.push({
            changeType: 'created',
            caseId,
            title: c.title,
            status,
            severity: c.severity,
            updatedAt,
            tags: c.tags ?? []
          });
        } else if (known.updatedAt !== updatedAt) {
          let changeType: 'updated' | 'closed' | 'reopened' = 'updated';
          if (known.status !== status) {
            if (status === 'closed') {
              changeType = 'closed';
            } else if (known.status === 'closed') {
              changeType = 'reopened';
            }
          }

          inputs.push({
            changeType,
            caseId,
            title: c.title,
            status,
            severity: c.severity,
            updatedAt,
            tags: c.tags ?? []
          });
        }
      }

      return {
        inputs,
        updatedState: {
          lastPollTime: new Date().toISOString(),
          knownCases: newKnownCases
        }
      };
    },

    handleEvent: async ctx => {
      let client = createClient(ctx);
      let input = ctx.input;

      let caseDetails: any = {};
      try {
        caseDetails = await client.getCase(input.caseId);
      } catch {
        // Case may have been deleted
      }

      return {
        type: `case.${input.changeType}`,
        id: `${input.caseId}-${input.updatedAt}`,
        output: {
          caseId: input.caseId,
          title: input.title,
          description: caseDetails.description,
          status: input.status,
          severity: input.severity,
          tags: input.tags,
          owner: caseDetails.owner,
          createdAt: caseDetails.created_at,
          createdBy: caseDetails.created_by?.username ?? caseDetails.created_by?.full_name,
          updatedAt: input.updatedAt,
          closedAt: caseDetails.closed_at,
          totalComments: caseDetails.totalComment,
          totalAlerts: caseDetails.totalAlerts
        }
      };
    }
  })
  .build();
