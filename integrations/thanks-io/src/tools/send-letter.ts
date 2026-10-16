import { SlateTool } from 'slates';
import { z } from 'zod';
import { ThanksIoClient } from '../lib/client';
import { mapRadiusSearch, radiusSearchSchema } from '../lib/schemas';
import { spec } from '../spec';

let recipientSchema = z.object({
  name: z.string().optional().describe('Recipient full name'),
  company: z.string().optional().describe('Recipient company name'),
  address: z.string().optional().describe('Street address'),
  address2: z.string().optional().describe('Address line 2'),
  city: z.string().optional().describe('City'),
  province: z.string().optional().describe('State/province code'),
  postalCode: z.string().optional().describe('ZIP/postal code'),
  country: z.string().optional().describe('Country code (US or CA)'),
  email: z
    .string()
    .optional()
    .describe('Email for paid address lookup if no mailing address is supplied'),
  phone: z.string().optional().describe('Recipient phone'),
  custom1: z.string().optional().describe('Custom field 1'),
  custom2: z.string().optional().describe('Custom field 2'),
  custom3: z.string().optional().describe('Custom field 3'),
  custom4: z.string().optional().describe('Custom field 4')
});

export let sendLetter = SlateTool.create(spec, {
  name: 'Send Letter',
  key: 'send_letter',
  description: `Send a handwritten letter in either a windowed or windowless envelope. Supports cover letter images, handwritten messages, additional PDF page attachments, and PDF-only mailers.
Recipients can be specified inline, via mailing list IDs, or via radius search. Supports personalization tags and QR codes.
Set **preview** to true to generate a visual preview without placing an order.`,
  instructions: [
    'Set letterType to "windowed" or "windowless" to choose envelope type.',
    'Use pdfOnlyUrl to send a complete PDF document without a generated cover letter.',
    'Use additionalPagesUrl to attach extra PDF pages after the cover letter.'
  ],
  constraints: [
    'Recipient addresses must be supported by Thanks.io for the selected mail type.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      letterType: z.enum(['windowed', 'windowless']).describe('Envelope type'),
      creativeId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe(
          'Saved creative ID from list_creatives; omit design, message, handwriting, background and gift card settings when used'
        ),
      radiusSearch: radiusSearchSchema.optional(),
      notificationEmails: z
        .string()
        .optional()
        .describe('Comma-separated email addresses for order notifications'),
      metadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Order metadata, at most 8192 JSON bytes'),
      frontImageUrl: z
        .string()
        .optional()
        .describe('URL of the background image for the letter'),
      imageTemplateId: z.number().optional().describe('ID of a saved image template'),
      message: z
        .string()
        .optional()
        .describe('Handwritten message (supports %FIRST_NAME%, etc.)'),
      messageTemplateId: z.number().optional().describe('ID of a saved message template'),
      handwritingStyleId: z.number().optional().describe('Handwriting style ID'),
      handwritingColor: z.string().optional().describe('Ink color'),
      handwritingRealism: z
        .boolean()
        .optional()
        .describe('Enable realism effect for AI fonts'),
      qrcodeUrl: z.string().optional().describe('URL to encode as a QR code'),
      additionalPagesUrl: z.string().optional().describe('URL to a PDF with additional pages'),
      pdfOnlyUrl: z
        .string()
        .optional()
        .describe('URL to a complete PDF (skips cover letter generation)'),
      recipients: z.array(recipientSchema).optional().describe('Inline recipient list'),
      mailingListIds: z.array(z.number()).optional().describe('Mailing list IDs to send to'),
      sendStandardMail: z
        .boolean()
        .optional()
        .describe('Use Standard Mail instead of First Class'),
      returnName: z.string().optional().describe('Return address name'),
      returnAddress: z.string().optional().describe('Return street address'),
      returnCity: z.string().optional().describe('Return city'),
      returnState: z.string().optional().describe('Return state code'),
      returnPostalCode: z.string().optional().describe('Return ZIP code'),
      subAccountId: z.number().optional().describe('Sub-account ID'),
      preview: z.boolean().optional().describe('Set true to preview without sending')
    })
  )
  .output(
    z.object({
      orderId: z.number().optional().describe('Order ID'),
      status: z.string().optional().describe('Order status'),
      totalRecipients: z.number().optional().describe('Estimated number of recipients'),
      authorizationTotal: z.number().optional().describe('Total cost in cents'),
      raw: z.record(z.string(), z.unknown()).optional().describe('Complete provider response'),
      previews: z.array(z.string()).optional().describe('Preview image URLs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ThanksIoClient({ token: ctx.auth.token });

    let recipientsPayload = ctx.input.recipients?.map(r => ({
      name: r.name,
      company: r.company,
      address: r.address,
      address2: r.address2,
      city: r.city,
      province: r.province,
      postal_code: r.postalCode,
      country: r.country,
      email: r.email,
      phone: r.phone,
      custom1: r.custom1,
      custom2: r.custom2,
      custom3: r.custom3,
      custom4: r.custom4
    }));

    let result = await client.sendLetter({
      letterType: ctx.input.letterType,
      creativeId: ctx.input.creativeId,
      radiusSearch: mapRadiusSearch(ctx.input.radiusSearch),
      emailAdditional: ctx.input.notificationEmails,
      metadata: ctx.input.metadata,
      frontImageUrl: ctx.input.frontImageUrl,
      imageTemplate: ctx.input.imageTemplateId,
      message: ctx.input.message,
      messageTemplate: ctx.input.messageTemplateId,
      handwritingStyle: ctx.input.handwritingStyleId,
      handwritingColor: ctx.input.handwritingColor,
      handwritingRealism: ctx.input.handwritingRealism,
      qrcodeUrl: ctx.input.qrcodeUrl,
      additionalPagesUrl: ctx.input.additionalPagesUrl,
      pdfOnlyUrl: ctx.input.pdfOnlyUrl,
      recipients: recipientsPayload,
      mailingLists: ctx.input.mailingListIds,
      sendStandardMail: ctx.input.sendStandardMail,
      returnName: ctx.input.returnName,
      returnAddress: ctx.input.returnAddress,
      returnCity: ctx.input.returnCity,
      returnState: ctx.input.returnState,
      returnPostalCode: ctx.input.returnPostalCode,
      subAccount: ctx.input.subAccountId,
      preview: ctx.input.preview
    });

    let isPreview = ctx.input.preview === true;
    let previewData = result.data as { previews?: string[] } | undefined;
    let previews = isPreview ? previewData?.previews || [] : undefined;
    for (let url of previews || []) {
      await ctx.addAttachment({ type: 'url', url });
    }

    return {
      output: {
        orderId: isPreview ? undefined : (result.id as number),
        status: isPreview ? 'preview' : (result.status as string),
        totalRecipients: result.total_estimated_recipients as number | undefined,
        authorizationTotal: result.authorization_total as number | undefined,
        previews,
        raw: result
      },
      message: isPreview
        ? `Generated **${previews?.length || 0}** letter preview(s).`
        : `Letter order **#${result.id}** created (${ctx.input.letterType} envelope) with status **${result.status}**.`
    };
  })
  .build();
