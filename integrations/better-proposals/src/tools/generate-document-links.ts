import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateDocumentLinks = SlateTool.create(spec, {
  name: 'Generate Document Links',
  key: 'generate_document_links',
  description:
    'Generates personal recipient links without sending email. Counts as a send against the plan limit and may be blocked by approval requirements or repeated-send limits. Provided recipients replace existing unsigned contacts; signed contacts cannot be changed. Call list_proposals to discover proposal IDs.',
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      proposalId: z.string().describe('Proposal ID. Call list_proposals to discover IDs.'),
      signOrder: z
        .boolean()
        .optional()
        .describe('Require recipients to sign in their listed order'),
      recipients: z
        .array(
          z.object({
            firstName: z.string().describe('Recipient first name'),
            surname: z.string().describe('Recipient surname'),
            email: z.string().describe('Recipient email address'),
            requiredToSign: z.boolean().optional().describe('Whether this recipient must sign')
          })
        )
        .optional()
        .describe('Recipients to save on the document. Omit to use existing contacts.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API'),
      links: z
        .any()
        .describe('Proposal ID, recipient links, signing order, and sending timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).generateDocumentLinks(ctx.input);
    return {
      output: { status: result.status, links: result.data },
      message: 'Generated personal document links.'
    };
  })
  .build();
