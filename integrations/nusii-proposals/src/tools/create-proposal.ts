import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createProposal = SlateTool.create(spec, {
  name: 'Create Proposal',
  key: 'create_proposal',
  description: `Create a new proposal in Nusii. Optionally create from a template, assign a client, set expiration, and configure display options. The proposal is created in "draft" status.`,
  instructions: [
    'Provide a templateId to create the proposal from an existing template — the template sections will be copied automatically.',
    'Set either clientId (existing client) or clientEmail (to assign by email).'
  ]
})
  .input(
    z.object({
      title: z.string().describe('Title of the proposal'),
      clientId: z
        .number()
        .optional()
        .describe('ID of an existing client to associate with this proposal'),
      clientEmail: z
        .string()
        .optional()
        .describe('Client email to associate with this proposal (alternative to clientId)'),
      templateId: z.number().optional().describe('Template ID to create the proposal from'),
      preparedById: z.number().optional().describe('User ID of who prepared the proposal'),
      expiresAt: z.string().optional().describe('Expiration date/time in ISO 8601 format'),
      displayDate: z
        .string()
        .optional()
        .describe('Display date shown on the proposal in ISO 8601 format'),
      report: z.boolean().optional().describe('Enable report mode (hides pricing)'),
      excludeTotal: z.boolean().optional().describe('Exclude total from the proposal'),
      excludeTotalInPdf: z.boolean().optional().describe('Exclude total from the PDF version'),
      theme: z.string().optional().describe('Theme name for visual styling'),
      documentSectionTitle: z.string().optional().describe('Title for the documents section')
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
    let result = await client.createProposal(ctx.input);

    return {
      output: result,
      message: `Created proposal **"${result.title}"** (ID: ${result.proposalId}, status: ${result.status}).`
    };
  })
  .build();
