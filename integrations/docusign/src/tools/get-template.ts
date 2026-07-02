import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let documentOutputSchema = z.object({
  documentId: z.string().optional(),
  name: z.string().optional(),
  order: z.string().optional(),
  pages: z.string().optional()
});

let recipientOutputSchema = z.object({
  recipientId: z.string().optional(),
  recipientType: z.string().optional(),
  roleName: z.string().optional(),
  name: z.string().optional(),
  email: z.string().optional(),
  routingOrder: z.string().optional()
});

let mapRecipients = (recipients: any) => {
  if (!recipients) {
    return undefined;
  }

  let groups = [
    ...(recipients.signers || []),
    ...(recipients.carbonCopies || []),
    ...(recipients.certifiedDeliveries || []),
    ...(recipients.agents || []),
    ...(recipients.editors || []),
    ...(recipients.inPersonSigners || [])
  ];

  return groups.map((recipient: any) => ({
    recipientId: recipient.recipientId,
    recipientType: recipient.recipientType,
    roleName: recipient.roleName,
    name: recipient.name,
    email: recipient.email,
    routingOrder: recipient.routingOrder
  }));
};

export let getTemplate = SlateTool.create(spec, {
  name: 'Get Template',
  key: 'get_template',
  description: `Retrieves the definition of a DocuSign template, including its subject, documents, and placeholder recipient roles for envelope creation.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to retrieve')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('ID of the template'),
      name: z.string().optional().describe('Template name'),
      description: z.string().optional().describe('Template description'),
      emailSubject: z.string().optional().describe('Default email subject'),
      emailBlurb: z.string().optional().describe('Default email body'),
      ownerName: z.string().optional().describe('Template owner name'),
      shared: z.string().optional().describe('Whether the template is shared'),
      createdDateTime: z.string().optional().describe('When the template was created'),
      lastModified: z.string().optional().describe('When the template was last modified'),
      documents: z.array(documentOutputSchema).optional().describe('Template documents'),
      recipients: z
        .array(recipientOutputSchema)
        .optional()
        .describe('Template placeholder recipients and roles')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUri: ctx.auth.baseUri,
      accountId: ctx.auth.accountId
    });

    let template = await client.getTemplate(ctx.input.templateId);
    let documents = template.documents?.map((document: any) => ({
      documentId: document.documentId,
      name: document.name,
      order: document.order,
      pages: document.pages
    }));
    let recipients = mapRecipients(template.recipients);

    return {
      output: {
        templateId: template.templateId,
        name: template.name,
        description: template.description,
        emailSubject: template.emailSubject,
        emailBlurb: template.emailBlurb,
        ownerName: template.owner?.userName,
        shared: template.shared,
        createdDateTime: template.createdDateTime,
        lastModified: template.lastModified,
        documents,
        recipients
      },
      message: `Retrieved template **${template.name || template.templateId}** with **${recipients?.length || 0}** recipient role(s).`
    };
  })
  .build();
