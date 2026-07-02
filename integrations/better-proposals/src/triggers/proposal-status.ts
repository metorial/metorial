import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let proposalStatusTrigger = SlateTrigger.create(spec, {
  name: 'Proposal Status Change',
  key: 'proposal_status',
  description:
    'Triggers when proposals reach a specific status: new, sent, opened, signed, or paid. Polls the Better Proposals API for proposals matching the selected status.'
})
  .input(
    z.object({
      proposalId: z.string().describe('Unique identifier of the proposal'),
      proposalStatus: z
        .enum(['new', 'sent', 'opened', 'signed', 'paid'])
        .describe('The status that triggered the event'),
      proposalData: z.any().describe('Raw proposal data from the API')
    })
  )
  .output(
    z.object({
      proposalId: z.string().describe('Unique identifier of the proposal'),
      proposalStatus: z.string().describe('Current status of the proposal'),
      proposalData: z.any().describe('Full proposal details')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let knownIds: Record<string, string[]> = ctx.state?.knownIds ?? {};
      let inputs: Array<{
        proposalId: string;
        proposalStatus: 'new' | 'sent' | 'opened' | 'signed' | 'paid';
        proposalData: any;
      }> = [];

      let statuses = ['new', 'sent', 'opened', 'signed', 'paid'] as const;

      for (let status of statuses) {
        let result = await client.listProposalsByStatus(status);
        let proposals = Array.isArray(result.data)
          ? result.data
          : result.data
            ? [result.data]
            : [];

        let previousIds = knownIds[status] ?? [];

        for (let proposal of proposals) {
          let proposalId = proposal.id ?? proposal.Id ?? proposal._id;
          if (!proposalId) continue;

          if (!previousIds.includes(proposalId)) {
            inputs.push({
              proposalId,
              proposalStatus: status,
              proposalData: proposal
            });
          }
        }

        knownIds[status] = proposals
          .map((p: any) => p.id ?? p.Id ?? p._id)
          .filter((id: any): id is string => !!id);
      }

      return {
        inputs,
        updatedState: {
          knownIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `proposal.${ctx.input.proposalStatus}`,
        id: `${ctx.input.proposalId}-${ctx.input.proposalStatus}`,
        output: {
          proposalId: ctx.input.proposalId,
          proposalStatus: ctx.input.proposalStatus,
          proposalData: ctx.input.proposalData
        }
      };
    }
  })
  .build();
