import { createTextAttachment, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAgreement = SlateTool.create(spec, {
  name: 'Get Agreement',
  key: 'get_agreement',
  description: `Retrieve detailed information about a specific agreement including its status, participants, documents, and metadata. Optionally fetch signing URLs, form field data, or event history for the agreement.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      agreementId: z.string().describe('ID of the agreement to retrieve'),
      includeSigningUrls: z
        .boolean()
        .optional()
        .describe(
          'Also fetch signing URLs for the agreement (only available when agreement is waiting for signatures)'
        ),
      includeFormData: z
        .boolean()
        .optional()
        .describe('Also fetch form field data from the agreement'),
      includeEvents: z
        .boolean()
        .optional()
        .describe('Also fetch event history for the agreement')
    })
  )
  .output(
    z.object({
      agreementId: z.string().describe('ID of the agreement'),
      name: z.string().describe('Name of the agreement'),
      status: z.string().describe('Current status of the agreement'),
      createdDate: z.string().optional().describe('Date the agreement was created'),
      expirationTime: z.string().optional().describe('Expiration date of the agreement'),
      senderEmail: z.string().optional().describe('Email of the agreement sender'),
      participantSetsInfo: z.array(z.any()).optional().describe('Participant set information'),
      documentVisibilityEnabled: z
        .boolean()
        .optional()
        .describe('Whether document visibility is enabled'),
      signingUrls: z
        .array(z.any())
        .optional()
        .describe(
          'Signing URLs for pending signers (only populated if includeSigningUrls is true)'
        ),
      formDataMimeType: z
        .string()
        .optional()
        .describe('MIME type of the form data attachment, if requested'),
      formDataByteLength: z
        .number()
        .optional()
        .describe('Size of the form data attachment in bytes, if requested'),
      formDataAttachmentCount: z
        .number()
        .optional()
        .describe('Number of form data attachments returned, if requested'),
      events: z
        .array(z.any())
        .optional()
        .describe('Event history for the agreement (only populated if includeEvents is true)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiBaseUrl: ctx.auth.apiBaseUrl,
      shard: ctx.auth.shard
    });

    let agreement = await client.getAgreement(ctx.input.agreementId);

    let output: any = {
      agreementId: agreement.id,
      name: agreement.name,
      status: agreement.status,
      createdDate: agreement.createdDate,
      expirationTime: agreement.expirationTime,
      senderEmail: agreement.senderEmail,
      participantSetsInfo: agreement.participantSetsInfo,
      documentVisibilityEnabled: agreement.documentVisibilityEnabled
    };

    let attachments: ReturnType<typeof createTextAttachment>[] = [];

    if (ctx.input.includeSigningUrls) {
      try {
        let signingUrlsData = await client.getSigningUrls(ctx.input.agreementId);
        output.signingUrls = signingUrlsData.signingUrlSetInfos || [];
      } catch (e: any) {
        ctx.warn(`Could not fetch signing URLs: ${e.message}`);
        output.signingUrls = [];
      }
    }

    if (ctx.input.includeFormData) {
      try {
        let formData = await client.getAgreementFormData(ctx.input.agreementId);
        let content = typeof formData === 'string' ? formData : JSON.stringify(formData);
        output.formDataMimeType = 'text/csv';
        output.formDataByteLength = Buffer.byteLength(content, 'utf8');
        output.formDataAttachmentCount = 1;
        attachments.push(createTextAttachment(content, 'text/csv'));
      } catch (e: any) {
        ctx.warn(`Could not fetch form data: ${e.message}`);
      }
    }

    if (ctx.input.includeEvents) {
      try {
        let events = await client.getAgreementEvents(ctx.input.agreementId);
        output.events = events.events || [];
      } catch (e: any) {
        ctx.warn(`Could not fetch events: ${e.message}`);
      }
    }

    return {
      output,
      attachments,
      message: `Agreement **${agreement.name}** is in status **${agreement.status}**.`
    };
  });
