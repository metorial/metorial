import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/utils';
import { spec } from '../spec';

export let getContract = SlateTool.create(spec, {
  name: 'Get Contract',
  key: 'get_contract',
  description: `Retrieve detailed information about a specific contract by its ID. Returns full contract details including worker info, compensation, status, and custom fields.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contractId: z.string().describe('The unique ID of the contract to retrieve')
    })
  )
  .output(
    z.object({
      contract: z.record(z.string(), z.any()).describe('Full contract details')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.getContract(ctx.input.contractId);
    let contract = result?.data ?? result;

    return {
      output: { contract },
      message: `Retrieved contract **${contract.title ?? ctx.input.contractId}**.`
    };
  })
  .build();
