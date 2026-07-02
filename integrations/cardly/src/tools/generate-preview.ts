import { SlateTool } from 'slates';
import { z } from 'zod';
import { CardlyClient } from '../lib/client';
import { spec } from '../spec';

export let generatePreview = SlateTool.create(spec, {
  name: 'Generate Preview',
  key: 'generate_preview',
  description: `Generate a low-quality, watermarked preview PDF of a card and envelope before placing a live order. Use this to verify artwork, template, and recipient details look correct.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
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
    })
  )
  .output(
    z.object({
      preview: z
        .record(z.string(), z.unknown())
        .describe('Preview data including PDF URL and cost estimate')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CardlyClient({ token: ctx.auth.token });

    let result = await client.generatePreview({
      artwork: ctx.input.artworkId,
      template: ctx.input.templateId,
      recipient: ctx.input.recipient,
      sender: ctx.input.sender,
      variables: ctx.input.variables
    });

    return {
      output: {
        preview: result
      },
      message: `Preview generated successfully for artwork **${ctx.input.artworkId}** with template **${ctx.input.templateId}**.`
    };
  })
  .build();
