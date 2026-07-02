import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let recipientOutputSchema = z.object({
  recipientId: z.string().optional(),
  recipientType: z.string().optional(),
  email: z.string().optional(),
  name: z.string().optional(),
  status: z.string().optional(),
  routingOrder: z.string().optional(),
  signedDateTime: z.string().optional(),
  deliveredDateTime: z.string().optional(),
  sentDateTime: z.string().optional(),
  declinedDateTime: z.string().optional(),
  declinedReason: z.string().optional()
});

export let getEnvelopeRecipients = SlateTool.create(spec, {
  name: 'Get Envelope Recipients',
  key: 'get_envelope_recipients',
  description: `Retrieves all recipients for a DocuSign envelope, including their status, signing order, and optionally their tab (form field) data. Useful for tracking who has signed and who hasn't.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      envelopeId: z.string().describe('ID of the envelope'),
      includeTabs: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include tab (form field) data for each recipient')
    })
  )
  .output(
    z.object({
      signers: z.array(recipientOutputSchema).optional().describe('Signers on the envelope'),
      carbonCopies: z.array(recipientOutputSchema).optional().describe('CC recipients'),
      certifiedDeliveries: z
        .array(recipientOutputSchema)
        .optional()
        .describe('Certified delivery recipients'),
      agents: z.array(recipientOutputSchema).optional().describe('Agent recipients'),
      editors: z.array(recipientOutputSchema).optional().describe('Editor recipients'),
      inPersonSigners: z.array(recipientOutputSchema).optional().describe('In-person signers'),
      currentRoutingOrder: z
        .string()
        .optional()
        .describe('Current routing order being processed'),
      recipientCount: z.string().optional().describe('Total number of recipients')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUri: ctx.auth.baseUri,
      accountId: ctx.auth.accountId
    });

    let result = await client.getRecipients(ctx.input.envelopeId, ctx.input.includeTabs);

    let mapRecipients = (list: any[] | undefined) =>
      list?.map((r: any) => ({
        recipientId: r.recipientId,
        recipientType: r.recipientType,
        email: r.email,
        name: r.name,
        status: r.status,
        routingOrder: r.routingOrder,
        signedDateTime: r.signedDateTime,
        deliveredDateTime: r.deliveredDateTime,
        sentDateTime: r.sentDateTime,
        declinedDateTime: r.declinedDateTime,
        declinedReason: r.declinedReason
      }));

    let signers = mapRecipients(result.signers);
    let carbonCopies = mapRecipients(result.carbonCopies);
    let certifiedDeliveries = mapRecipients(result.certifiedDeliveries);
    let agents = mapRecipients(result.agents);
    let editors = mapRecipients(result.editors);
    let inPersonSigners = mapRecipients(result.inPersonSigners);

    let totalCount = [
      signers,
      carbonCopies,
      certifiedDeliveries,
      agents,
      editors,
      inPersonSigners
    ].reduce((sum, arr) => sum + (arr?.length || 0), 0);

    return {
      output: {
        signers,
        carbonCopies,
        certifiedDeliveries,
        agents,
        editors,
        inPersonSigners,
        currentRoutingOrder: result.currentRoutingOrder,
        recipientCount: String(totalCount)
      },
      message: `Envelope has **${totalCount}** recipient(s). ${signers?.filter((s: any) => s.status === 'completed').length || 0} signer(s) have completed signing.`
    };
  })
  .build();
