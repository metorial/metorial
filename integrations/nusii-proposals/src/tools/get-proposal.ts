import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProposal = SlateTool.create(spec, {
  name: 'Get Proposal',
  key: 'get_proposal',
  description: `Retrieve detailed information about a specific proposal including its status, client, currency, and associated section IDs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      proposalId: z.string().describe('The ID of the proposal to retrieve')
    })
  )
  .output(
    z.object({
      proposalId: z.string(),
      title: z.string(),
      accountId: z.number(),
      status: z.string(),
      publicId: z.string(),
      preparedById: z.number().nullable(),
      clientId: z.number().nullable(),
      senderId: z.number().nullable(),
      currency: z.string(),
      archivedAt: z.string().nullable(),
      sectionIds: z.array(z.string())
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getProposal(ctx.input.proposalId);

    return {
      output: result,
      message: `Retrieved proposal **"${result.title}"** (status: ${result.status}, ID: ${result.proposalId}).`
    };
  })
  .build();
