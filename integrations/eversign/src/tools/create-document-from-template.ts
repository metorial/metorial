import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let templateSignerSchema = z.object({
  role: z.string().describe('Role name as defined in the template'),
  name: z.string().describe('Full name of the signer'),
  email: z.string().describe('Email address of the signer'),
  pin: z.string().optional().describe('Secret PIN the signer must enter'),
  message: z.string().optional().describe('Custom message for this signer'),
  deliverEmail: z.boolean().optional().describe('Set to false to prevent email delivery'),
  language: z.string().optional().describe('Two-letter language code')
});

let templateRecipientSchema = z.object({
  role: z.string().describe('Role name as defined in the template'),
  name: z.string().describe('Full name of the recipient'),
  email: z.string().describe('Email address of the recipient'),
  language: z.string().optional().describe('Two-letter language code')
});

let mergeFieldSchema = z.object({
  identifier: z.string().describe('Field identifier as defined in the template'),
  value: z.string().describe('Value to fill into the merge field')
});

export let createDocumentFromTemplate = SlateTool.create(spec, {
  name: 'Create Document from Template',
  key: 'create_document_from_template',
  description: `Create and send a new document based on an existing template. Assign real signers to template roles, fill in merge field values, and configure delivery and signing options.`,
  instructions: [
    'All required signer roles from the template must be assigned.',
    'Use the "List Templates" tool to find available templates and their roles.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('Hash ID of the template to use'),
      title: z.string().optional().describe('Custom title for the new document'),
      message: z.string().optional().describe('Message for all signers'),
      signers: z
        .array(templateSignerSchema)
        .min(1)
        .describe('Signers assigned to template roles'),
      recipients: z
        .array(templateRecipientSchema)
        .optional()
        .describe('CC recipients assigned to template roles'),
      fields: z.array(mergeFieldSchema).optional().describe('Merge field values to fill in'),
      embeddedSigningEnabled: z.boolean().optional().describe('Enable embedded signing'),
      redirect: z.string().optional().describe('URL to redirect signers after signing'),
      redirectDecline: z
        .string()
        .optional()
        .describe('URL to redirect signers after declining'),
      expires: z.string().optional().describe('Expiration Unix timestamp'),
      customRequesterName: z.string().optional().describe('Custom requester display name'),
      customRequesterEmail: z.string().optional().describe('Custom requester email')
    })
  )
  .output(
    z.object({
      documentHash: z.string().describe('Unique document identifier'),
      title: z.string().optional().describe('Document title'),
      isCompleted: z.boolean().describe('Whether the document is completed'),
      embeddedSigningEnabled: z.boolean().describe('Whether embedded signing is enabled'),
      signers: z
        .array(
          z.object({
            signerId: z.number().describe('Signer ID'),
            name: z.string().describe('Signer name'),
            email: z.string().describe('Signer email'),
            role: z.string().optional().describe('Signer role'),
            signed: z.boolean().describe('Whether the signer has signed'),
            embeddedSigningUrl: z.string().optional().describe('Embedded signing URL')
          })
        )
        .describe('List of signers with their status')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let body: Record<string, any> = {
      template_id: ctx.input.templateId
    };

    if (ctx.input.title) body.title = ctx.input.title;
    if (ctx.input.message) body.message = ctx.input.message;
    if (ctx.input.embeddedSigningEnabled) body.embedded_signing_enabled = 1;
    if (ctx.input.redirect) body.redirect = ctx.input.redirect;
    if (ctx.input.redirectDecline) body.redirect_decline = ctx.input.redirectDecline;
    if (ctx.input.expires) body.expires = ctx.input.expires;
    if (ctx.input.customRequesterName)
      body.custom_requester_name = ctx.input.customRequesterName;
    if (ctx.input.customRequesterEmail)
      body.custom_requester_email = ctx.input.customRequesterEmail;

    body.signers = ctx.input.signers.map(s => {
      let signer: Record<string, any> = {
        role: s.role,
        name: s.name,
        email: s.email
      };
      if (s.pin) signer.pin = s.pin;
      if (s.message) signer.message = s.message;
      if (s.deliverEmail !== undefined) signer.deliver_email = s.deliverEmail ? 1 : 0;
      if (s.language) signer.language = s.language;
      return signer;
    });

    if (ctx.input.recipients) {
      body.recipients = ctx.input.recipients.map(r => {
        let recipient: Record<string, any> = {
          role: r.role,
          name: r.name,
          email: r.email
        };
        if (r.language) recipient.language = r.language;
        return recipient;
      });
    }

    if (ctx.input.fields) {
      body.fields = ctx.input.fields.map(f => ({
        identifier: f.identifier,
        value: f.value
      }));
    }

    let doc = await client.createDocumentFromTemplate(body);

    let signers = (doc.signers || []).map((s: any) => ({
      signerId: s.id,
      name: s.name || '',
      email: s.email || '',
      role: s.role || undefined,
      signed: s.signed === 1 || s.signed === true,
      embeddedSigningUrl: s.embedded_signing_url || undefined
    }));

    return {
      output: {
        documentHash: doc.document_hash,
        title: doc.title || undefined,
        isCompleted: doc.is_completed === 1 || doc.is_completed === true,
        embeddedSigningEnabled:
          doc.embedded_signing_enabled === 1 || doc.embedded_signing_enabled === true,
        signers
      },
      message: `Document "${doc.title || doc.document_hash}" created from template and sent to ${signers.length} signer(s).`
    };
  })
  .build();
