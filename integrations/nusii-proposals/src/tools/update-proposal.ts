import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateProposal = SlateTool.create(spec, {
  name: 'Update Proposal',
  key: 'update_proposal',
  description: `Update an existing proposal's title, client assignment, expiration, display date, theme, or report settings. Only provided fields will be updated.`
})
  .input(
    z.object({
      proposalId: z.string().describe('The ID of the proposal to update'),
      title: z.string().optional().describe('Updated title'),
      clientId: z.number().optional().describe('Updated client ID'),
      preparedById: z.number().optional().describe('Updated preparer user ID'),
      expiresAt: z.string().optional().describe('Updated expiration date in ISO 8601 format'),
      displayDate: z.string().optional().describe('Updated display date in ISO 8601 format'),
      report: z.boolean().optional().describe('Enable/disable report mode'),
      excludeTotal: z.boolean().optional().describe('Exclude/include total'),
      excludeTotalInPdf: z.boolean().optional().describe('Exclude/include total in PDF'),
      theme: z.string().optional().describe('Updated theme name')
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
    let { proposalId, ...updateData } = ctx.input;
    let client = new Client({ token: ctx.auth.token });
    let result = await client.updateProposal(proposalId, updateData);

    return {
      output: result,
      message: `Updated proposal **"${result.title}"** (ID: ${result.proposalId}).`
    };
  })
  .build();
