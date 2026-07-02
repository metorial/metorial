import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let evidenceItemSchema = z.object({
  description: z.string().optional().describe('Description of the evidence item'),
  url: z.string().optional().describe('URL of the evidence (for URL-type evidence)'),
  category: z
    .enum(['url', 'file'])
    .optional()
    .describe('Type of evidence: "url" for links or "file" for uploaded files'),
  file: z.string().optional().describe('File URL (for file-type evidence)')
});

let referenceSchema = z.object({
  description: z.string().optional().describe('Description of the reference'),
  relationship: z
    .enum([
      'taught',
      'managed',
      'mentored',
      'worked',
      'studied',
      'friends',
      'stranger',
      'professor'
    ])
    .optional()
    .describe('Relationship between the referee and the recipient'),
  referee: z
    .object({
      name: z.string().optional().describe('Referee name'),
      email: z.string().optional().describe('Referee email'),
      avatar: z.string().optional().describe('URL to referee avatar image'),
      url: z.string().optional().describe('URL to referee profile')
    })
    .optional()
    .describe('Information about the referee')
});

export let issueCredential = SlateTool.create(spec, {
  name: 'Issue Credential',
  key: 'issue_credential',
  description: `Issue a new digital credential (certificate or badge) to a recipient. Specify the recipient's details, associate it with a credential group, and optionally attach evidence items, references, and custom attributes for certificate design variables.`,
  instructions: [
    'The groupId must reference an existing credential group.',
    'Dates should be in YYYY-MM-DD format.',
    'Phone numbers should be in E.164 format (e.g., +14155552671).'
  ],
  constraints: [
    'Credentials created without sufficient credits will be saved but remain unpublished.',
    'Rate limited to 2000 requests per 5 minutes.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      recipientName: z.string().describe('Full name of the credential recipient'),
      recipientEmail: z.string().describe('Email address of the credential recipient'),
      groupId: z.number().describe('ID of the credential group to associate with'),
      credentialName: z.string().optional().describe('Name/title of the credential'),
      description: z.string().optional().describe('Description of the credential'),
      issuedOn: z
        .string()
        .optional()
        .describe('Issue date in YYYY-MM-DD format. Defaults to today.'),
      expiredOn: z.string().optional().describe('Expiry date in YYYY-MM-DD format'),
      recipientPhoneNumber: z
        .string()
        .optional()
        .describe('Recipient phone number in E.164 format'),
      recipientId: z
        .string()
        .optional()
        .describe("Your organization's user ID for the recipient"),
      recipientMetaData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom metadata key-value pairs for the recipient'),
      isComplete: z
        .boolean()
        .optional()
        .describe('Whether the credential is complete. Defaults to true.'),
      isPrivate: z.boolean().optional().describe('Whether the credential is private'),
      autoApprove: z
        .boolean()
        .optional()
        .describe('Whether to publish the credential immediately. Defaults to true.'),
      customAttributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom attribute key-value pairs used as design variables'),
      metaData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom metadata key-value pairs for the credential'),
      evidenceItems: z
        .array(evidenceItemSchema)
        .optional()
        .describe('Evidence items to attach to the credential'),
      references: z
        .array(referenceSchema)
        .optional()
        .describe('References to attach to the credential')
    })
  )
  .output(
    z.object({
      credentialId: z.string().describe('ID of the created credential'),
      credentialUrl: z.string().optional().describe('Public URL to view the credential'),
      recipientName: z.string().optional().describe('Recipient name'),
      recipientEmail: z.string().optional().describe('Recipient email'),
      groupName: z.string().optional().describe('Name of the associated group'),
      groupId: z.number().optional().describe('ID of the associated group'),
      issuedOn: z.string().optional().describe('Issue date'),
      approved: z.boolean().optional().describe('Whether the credential is published')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let credential = await client.createCredential({
      recipient: {
        name: ctx.input.recipientName,
        email: ctx.input.recipientEmail,
        phoneNumber: ctx.input.recipientPhoneNumber,
        id: ctx.input.recipientId,
        metaData: ctx.input.recipientMetaData
      },
      groupId: ctx.input.groupId,
      name: ctx.input.credentialName,
      description: ctx.input.description,
      issuedOn: ctx.input.issuedOn,
      expiredOn: ctx.input.expiredOn,
      complete: ctx.input.isComplete,
      private: ctx.input.isPrivate,
      approve: ctx.input.autoApprove,
      customAttributes: ctx.input.customAttributes,
      metaData: ctx.input.metaData,
      evidenceItems: ctx.input.evidenceItems,
      references: ctx.input.references
    });

    return {
      output: {
        credentialId: String(credential.id),
        credentialUrl: credential.url,
        recipientName: credential.recipient?.name,
        recipientEmail: credential.recipient?.email,
        groupName: credential.group_name,
        groupId: credential.group_id,
        issuedOn: credential.issued_on,
        approved: credential.approve
      },
      message: `Credential **${credential.name || credential.id}** issued to **${credential.recipient?.name}** (${credential.recipient?.email}) in group **${credential.group_name}**.`
    };
  })
  .build();
