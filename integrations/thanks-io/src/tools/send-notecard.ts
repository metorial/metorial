import { SlateTool } from 'slates';
import { z } from 'zod';
import { ThanksIoClient } from '../lib/client';
import { spec } from '../spec';

let recipientSchema = z.object({
  name: z.string().optional().describe('Recipient full name'),
  company: z.string().optional().describe('Recipient company name'),
  address: z.string().describe('Street address'),
  address2: z.string().optional().describe('Address line 2'),
  city: z.string().describe('City'),
  province: z.string().describe('State/province code'),
  postalCode: z.string().describe('ZIP/postal code'),
  country: z.string().optional().describe('Country code (US or CA)'),
  custom1: z.string().optional().describe('Custom field 1'),
  custom2: z.string().optional().describe('Custom field 2'),
  custom3: z.string().optional().describe('Custom field 3'),
  custom4: z.string().optional().describe('Custom field 4')
});

export let sendNotecard = SlateTool.create(spec, {
  name: 'Send Notecard',
  key: 'send_notecard',
  description: `Send a folded 4.25x5.5 handwritten notecard in an envelope. Provide an exterior image and an interior handwritten message.
Recipients can be specified inline, via mailing list IDs, or via radius search. Supports personalization tags and QR codes.
Set **preview** to true to generate a visual preview without placing an order.`,
  instructions: [
    'Either frontImageUrl or imageTemplateId must be provided for the exterior.',
    'Either message or messageTemplateId should be provided for the interior.'
  ],
  constraints: ['Only US and Canadian addresses are accepted.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      frontImageUrl: z.string().optional().describe('URL of the exterior image'),
      imageTemplateId: z
        .number()
        .optional()
        .describe('ID of a saved image template for the exterior'),
      message: z
        .string()
        .optional()
        .describe('Handwritten interior message (supports %FIRST_NAME%, etc.)'),
      messageTemplateId: z.number().optional().describe('ID of a saved message template'),
      handwritingStyleId: z.number().optional().describe('Handwriting style ID'),
      handwritingColor: z
        .string()
        .optional()
        .describe('Ink color: blue, black, green, purple, red, or hex'),
      handwritingRealism: z
        .boolean()
        .optional()
        .describe('Enable realism effect for AI fonts'),
      useCustomBackground: z
        .boolean()
        .optional()
        .describe('Enable custom interior background'),
      customBackgroundImage: z
        .string()
        .optional()
        .describe('URL of the interior background image (1650x2475px)'),
      qrcodeUrl: z.string().optional().describe('URL to encode as a QR code'),
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
      custom1: r.custom1,
      custom2: r.custom2,
      custom3: r.custom3,
      custom4: r.custom4
    }));

    let result = await client.sendNotecard({
      frontImageUrl: ctx.input.frontImageUrl,
      imageTemplate: ctx.input.imageTemplateId,
      message: ctx.input.message,
      messageTemplate: ctx.input.messageTemplateId,
      handwritingStyle: ctx.input.handwritingStyleId,
      handwritingColor: ctx.input.handwritingColor,
      handwritingRealism: ctx.input.handwritingRealism,
      useCustomBackground: ctx.input.useCustomBackground,
      customBackgroundImage: ctx.input.customBackgroundImage,
      qrcodeUrl: ctx.input.qrcodeUrl,
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
    let previews = isPreview ? ((result.data as any)?.previews as string[]) || [] : undefined;

    return {
      output: {
        orderId: isPreview ? undefined : (result.id as number),
        status: isPreview ? 'preview' : (result.status as string),
        totalRecipients: result.total_estimated_recipients as number | undefined,
        authorizationTotal: result.authorization_total as number | undefined,
        previews
      },
      message: isPreview
        ? `Generated **${previews?.length || 0}** notecard preview(s).`
        : `Notecard order **#${result.id}** created with status **${result.status}**.`
    };
  })
  .build();
