import { createApiServiceError, getFileUrlTool, SlateTool } from 'slates';
import { z } from 'zod';
import { CardlyClient } from '../lib/client';
import { spec } from '../spec';

let previewInputSchema = z.object({
  artworkId: z.string().describe('UUID of the artwork to preview'),
  templateId: z.string().describe('UUID of the message template to preview'),
  recipient: z
    .object({
      firstName: z.string().describe('Recipient first name'),
      lastName: z.string().describe('Recipient last name'),
      company: z.string().optional().describe('Recipient company'),
      address: z.string().describe('Street address'),
      address2: z.string().optional().describe('Address line 2'),
      city: z.string().describe('City'),
      region: z.string().optional().describe('State/province/region'),
      country: z.string().describe('2-character ISO country code'),
      postcode: z.string().optional().describe('Postal/ZIP code')
    })
    .describe('Recipient details for the preview'),
  sender: z
    .object({
      firstName: z.string().describe('Sender first name'),
      lastName: z.string().describe('Sender last name'),
      company: z.string().optional().describe('Sender company'),
      address: z.string().optional().describe('Sender street address'),
      address2: z.string().optional().describe('Sender address line 2'),
      city: z.string().optional().describe('Sender city'),
      region: z.string().optional().describe('Sender state/province/region'),
      country: z.string().optional().describe('Sender 2-character ISO country code'),
      postcode: z.string().optional().describe('Sender postal/ZIP code')
    })
    .optional()
    .describe('Sender/return address details'),
  variables: z
    .record(z.string(), z.string())
    .optional()
    .describe('Template variable substitutions')
});

let previewDocumentsSchema = z.object({
  preview: z.object({
    expires: z.string().nullish(),
    urls: z.object({ card: z.string(), envelope: z.string().nullish() })
  })
});

let previewReferenceSchema = z.object({
  input: previewInputSchema,
  part: z.enum(['card', 'envelope'])
});

let getDocument = (result: Record<string, unknown>, part: 'card' | 'envelope') => {
  let parsed = previewDocumentsSchema.safeParse(result);
  if (!parsed.success || !parsed.data.preview.urls[part]) {
    throw createApiServiceError(
      `Cardly did not return a valid ${part} preview document. Generate the preview again.`
    );
  }
  let url: URL;
  try {
    url = new URL(parsed.data.preview.urls[part]!);
  } catch {
    throw createApiServiceError(
      'Cardly returned an invalid preview URL. Generate the preview again.'
    );
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw createApiServiceError(
      'Cardly returned an unsupported preview URL. Generate the preview again.'
    );
  }
  // The provider's published examples use HTTP, but its API requires HTTPS.
  if (url.hostname === 'api.card.ly') url.protocol = 'https:';
  let expires = parsed.data.preview.expires;
  let expiresAt =
    expires && Number.isFinite(Date.parse(expires))
      ? new Date(Date.parse(expires) - 30_000).toISOString()
      : undefined;
  return { url: url.toString(), expiresAt };
};

let createPreview = (client: CardlyClient, input: z.infer<typeof previewInputSchema>) =>
  client.generatePreview({
    artwork: input.artworkId,
    template: input.templateId,
    recipient: input.recipient,
    sender: input.sender,
    variables: input.variables
  });

export let getFileUrl = getFileUrlTool(spec, async ctx => {
  let reference = previewReferenceSchema.safeParse(ctx.input.reference);
  if (!reference.success) {
    throw createApiServiceError(
      'The preview reference is invalid. Generate the preview again.'
    );
  }
  let client = new CardlyClient({ token: ctx.auth.token });
  let result = await createPreview(client, reference.data.input);
  let document = getDocument(result, reference.data.part);
  if (!document.expiresAt) {
    throw createApiServiceError(
      'Cardly did not return a preview expiration time. Generate the preview again.'
    );
  }
  let headers: Record<string, string> = {};
  if (new URL(document.url).hostname === 'api.card.ly') headers['API-Key'] = ctx.auth.token;
  return { url: document.url, expiresAt: document.expiresAt, headers };
});

export let generatePreview = SlateTool.create(spec, {
  name: 'Generate Preview',
  key: 'generate_preview',
  description: `Generate a low-quality, watermarked preview PDF of a card and envelope before placing a live order. Use this to verify artwork, template, and recipient details look correct.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(previewInputSchema)
  .output(
    z.object({
      preview: z
        .record(z.string(), z.unknown())
        .describe('Preview data including PDF URL and cost estimate')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CardlyClient({ token: ctx.auth.token });

    let result = await createPreview(client, ctx.input);
    let parsed = previewDocumentsSchema.safeParse(result);
    if (!parsed.success) {
      throw createApiServiceError(
        'Cardly did not return valid preview documents. Generate the preview again.'
      );
    }
    for (let part of ['card', 'envelope'] as const) {
      if (!parsed.data.preview.urls[part]) continue;
      let document = getDocument(result, part);
      await ctx.addAttachment({
        type: 'url',
        url: document.url,
        mimeType: 'application/pdf',
        headers:
          new URL(document.url).hostname === 'api.card.ly'
            ? { 'API-Key': ctx.auth.token }
            : undefined,
        ...(document.expiresAt
          ? {
              refreshAt: document.expiresAt,
              refreshReference: { input: ctx.input, part }
            }
          : {})
      });
    }

    return {
      output: {
        preview: result
      },
      message: `Preview generated successfully for artwork **${ctx.input.artworkId}** with template **${ctx.input.templateId}**.`
    };
  })
  .build();
