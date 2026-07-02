import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let templateRoleSchema = z.object({
  email: z.string().describe('Email address of the recipient'),
  name: z.string().describe('Full name of the recipient'),
  roleName: z
    .string()
    .describe('Role name as defined in the template (e.g., "Signer 1", "Manager")'),
  clientUserId: z
    .string()
    .optional()
    .describe('Set for embedded signing. Must be unique per recipient.'),
  tabs: z
    .record(z.string(), z.any())
    .optional()
    .describe('Tab values to pre-fill for this recipient')
});

export let sendEnvelopeFromTemplate = SlateTool.create(spec, {
  name: 'Send Envelope from Template',
  key: 'send_envelope_from_template',
  description: `Creates and sends a DocuSign envelope using a pre-existing template. Assign recipients to template roles and optionally override the email subject, message, and tab values.
Use **List Templates** first to find the templateId and available role names.`,
  instructions: [
    'The roleName for each recipient must match a role defined in the template.',
    'Use the List Templates tool to discover available templates and their role names.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to use'),
      emailSubject: z.string().optional().describe('Override the template email subject'),
      emailBlurb: z.string().optional().describe('Override the template email body text'),
      status: z
        .enum(['created', 'sent'])
        .default('sent')
        .describe('Set to "sent" to send immediately, or "created" to save as draft'),
      templateRoles: z
        .array(templateRoleSchema)
        .min(1)
        .describe('Recipients mapped to template roles')
    })
  )
  .output(
    z.object({
      envelopeId: z.string().describe('ID of the created envelope'),
      status: z.string().describe('Current status of the envelope'),
      statusDateTime: z.string().optional().describe('Timestamp of the status change'),
      uri: z.string().optional().describe('URI for the envelope resource')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUri: ctx.auth.baseUri,
      accountId: ctx.auth.accountId
    });

    let request: any = {
      templateId: ctx.input.templateId,
      status: ctx.input.status,
      templateRoles: ctx.input.templateRoles
    };

    if (ctx.input.emailSubject) request.emailSubject = ctx.input.emailSubject;
    if (ctx.input.emailBlurb) request.emailBlurb = ctx.input.emailBlurb;

    let result = await client.createEnvelope(request);

    return {
      output: {
        envelopeId: result.envelopeId,
        status: result.status,
        statusDateTime: result.statusDateTime,
        uri: result.uri
      },
      message: `Envelope **${result.envelopeId}** ${ctx.input.status === 'sent' ? 'sent' : 'created as draft'} from template, assigned to ${ctx.input.templateRoles.length} recipient(s).`
    };
  })
  .build();
