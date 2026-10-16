import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let editProposal = SlateTool.create(spec, {
  name: 'Edit Proposal',
  key: 'edit_proposal',
  description:
    'Updates only the supplied proposal settings. Provided contacts replace the existing unsigned contacts; contacts that have already signed cannot be changed or removed. Call list_proposals to discover proposal IDs.',
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      proposalId: z.string().describe('Proposal ID. Call list_proposals to discover IDs.'),
      company: z.string().optional().describe('Client company ID or name'),
      coverId: z.string().optional().describe('Cover ID to assign'),
      documentType: z.string().optional().describe('Document type ID or name'),
      brandId: z.string().optional().describe('Brand ID to apply'),
      currency: z.string().optional().describe('Three-letter currency code'),
      taxEnabled: z.boolean().optional().describe('Whether tax is enabled'),
      taxLabel: z.string().optional().describe('Tax label'),
      taxAmount: z.string().optional().describe('Tax amount'),
      description: z.string().optional().describe('Proposal description'),
      contacts: z
        .array(
          z.object({
            firstName: z.string().describe('Contact first name'),
            surname: z.string().describe('Contact surname'),
            email: z.string().describe('Contact email address'),
            requiresSignature: z.boolean().optional().describe('Whether the contact must sign')
          })
        )
        .optional()
        .describe(
          'Replacement contact list containing at least one contact. Omit to keep existing contacts. Already signed contacts are preserved by the provider.'
        ),
      mergeTags: z
        .array(
          z.object({
            tag: z.string().describe('Merge tag name'),
            value: z.string().describe('Replacement value')
          })
        )
        .optional()
        .describe('Merge tags for dynamic content')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API'),
      proposal: z
        .any()
        .describe('Edited proposal data and its view, preview, and editor links')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).editProposal(
      ctx.input.proposalId,
      {
        company: ctx.input.company,
        cover: ctx.input.coverId,
        documentType: ctx.input.documentType,
        brand: ctx.input.brandId,
        currency: ctx.input.currency,
        tax: ctx.input.taxEnabled,
        taxLabel: ctx.input.taxLabel,
        taxAmount: ctx.input.taxAmount,
        description: ctx.input.description,
        contacts: ctx.input.contacts?.map(contact => ({
          firstName: contact.firstName,
          surname: contact.surname,
          email: contact.email,
          signature: contact.requiresSignature
        })),
        mergeTags: ctx.input.mergeTags
      }
    );
    return {
      output: { status: result.status, proposal: result.data },
      message: `Updated proposal **${ctx.input.proposalId}**.`
    };
  })
  .build();
