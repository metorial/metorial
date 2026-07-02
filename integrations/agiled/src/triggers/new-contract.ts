import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newContractTrigger = SlateTrigger.create(spec, {
  name: 'New Contract',
  key: 'new_contract',
  description: 'Triggers when a new contract is created in Agiled.'
})
  .input(
    z.object({
      contractId: z.string().describe('ID of the contract'),
      contract: z.record(z.string(), z.unknown()).describe('Contract record from Agiled')
    })
  )
  .output(
    z.object({
      contractId: z.string().describe('ID of the new contract'),
      subject: z.string().optional().describe('Contract subject'),
      clientId: z.string().optional().describe('Client ID'),
      contractValue: z.string().optional().describe('Contract value'),
      startDate: z.string().optional().describe('Contract start date'),
      endDate: z.string().optional().describe('Contract end date'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        brand: ctx.auth.brand
      });

      let lastKnownId = (ctx.state as Record<string, unknown>)?.lastKnownId as
        | number
        | undefined;

      let result = await client.listContracts(1, 50);
      let contracts = result.data;

      let newContracts = lastKnownId ? contracts.filter(c => Number(c.id) > lastKnownId) : [];

      let maxId = contracts.reduce(
        (max, c) => Math.max(max, Number(c.id) || 0),
        lastKnownId ?? 0
      );

      return {
        inputs: newContracts.map(c => ({
          contractId: String(c.id),
          contract: c
        })),
        updatedState: {
          lastKnownId: maxId
        }
      };
    },

    handleEvent: async ctx => {
      let c = ctx.input.contract;
      return {
        type: 'contract.created',
        id: ctx.input.contractId,
        output: {
          contractId: ctx.input.contractId,
          subject: c.subject as string | undefined,
          clientId: c.client_id != null ? String(c.client_id) : undefined,
          contractValue: c.original_amount != null ? String(c.original_amount) : undefined,
          startDate: c.start_date as string | undefined,
          endDate: c.end_date as string | undefined,
          createdAt: c.created_at as string | undefined
        }
      };
    }
  })
  .build();
