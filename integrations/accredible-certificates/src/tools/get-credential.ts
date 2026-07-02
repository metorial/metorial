import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCredential = SlateTool.create(spec, {
  name: 'Get Credential',
  key: 'get_credential',
  description: `Retrieve a single credential by its ID. Returns full credential details including recipient info, evidence items, references, issuer, and certificate/badge image URLs.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      credentialId: z.string().describe('ID of the credential to retrieve')
    })
  )
  .output(
    z.object({
      credentialId: z.string().describe('Credential ID'),
      credentialName: z.string().optional().describe('Name of the credential'),
      description: z.string().optional().describe('Description of the credential'),
      credentialUrl: z.string().optional().describe('Public URL to view the credential'),
      issuedOn: z.string().optional().describe('Issue date'),
      expiredOn: z.string().optional().describe('Expiry date'),
      approved: z.boolean().optional().describe('Whether the credential is published'),
      isComplete: z.boolean().optional().describe('Whether the credential is complete'),
      isPrivate: z.boolean().optional().describe('Whether the credential is private'),
      groupName: z.string().optional().describe('Name of the credential group'),
      groupId: z.number().optional().describe('ID of the credential group'),
      courseLink: z.string().optional().describe('Link to the associated course'),
      recipientName: z.string().optional().describe('Recipient name'),
      recipientEmail: z.string().optional().describe('Recipient email'),
      recipientPhoneNumber: z.string().optional().describe('Recipient phone number'),
      issuerName: z.string().optional().describe('Issuer organization name'),
      issuerId: z.number().optional().describe('Issuer ID'),
      certificateImageUrl: z.string().optional().describe('Certificate preview image URL'),
      badgeImageUrl: z.string().optional().describe('Badge preview image URL'),
      seoImageUrl: z.string().optional().describe('SEO image URL'),
      customAttributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom attributes attached to the credential'),
      evidenceItems: z
        .array(
          z.object({
            evidenceItemId: z.number().optional().describe('Evidence item ID'),
            description: z.string().optional().describe('Evidence item description'),
            type: z.string().optional().describe('Evidence item type'),
            linkUrl: z.string().optional().describe('Evidence item URL')
          })
        )
        .optional()
        .describe('Attached evidence items')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let credential = await client.getCredential(ctx.input.credentialId);

    return {
      output: {
        credentialId: String(credential.id),
        credentialName: credential.name,
        description: credential.description,
        credentialUrl: credential.url,
        issuedOn: credential.issued_on,
        expiredOn: credential.expired_on,
        approved: credential.approve,
        isComplete: credential.complete,
        isPrivate: credential.private,
        groupName: credential.group_name,
        groupId: credential.group_id,
        courseLink: credential.course_link,
        recipientName: credential.recipient?.name,
        recipientEmail: credential.recipient?.email,
        recipientPhoneNumber: credential.recipient?.phone_number,
        issuerName: credential.issuer?.name,
        issuerId: credential.issuer?.id,
        certificateImageUrl: credential.certificate?.image?.preview,
        badgeImageUrl: credential.badge?.image?.preview,
        seoImageUrl: credential.seo_image,
        customAttributes: credential.custom_attributes,
        evidenceItems: credential.evidence_items?.map((e: any) => ({
          evidenceItemId: e.id,
          description: e.description,
          type: e.type,
          linkUrl: e.link_url
        }))
      },
      message: `Credential **${credential.name || credential.id}** for **${credential.recipient?.name}** (${credential.recipient?.email}) in group **${credential.group_name}**.`
    };
  })
  .build();
