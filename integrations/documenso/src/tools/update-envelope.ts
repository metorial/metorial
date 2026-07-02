import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateEnvelopeTool = SlateTool.create(spec, {
  name: 'Update Envelope',
  key: 'update_envelope',
  description: `Update an existing envelope's title or metadata (subject, message, signing order, redirect URL, language, etc.). Can only be applied to envelopes in DRAFT status.`
})
  .input(
    z.object({
      envelopeId: z.string().describe('ID of the envelope to update'),
      title: z.string().optional().describe('New title for the envelope'),
      subject: z.string().optional().describe('Email subject line'),
      emailMessage: z.string().optional().describe('Email message body'),
      signingOrder: z.enum(['PARALLEL', 'SEQUENTIAL']).optional().describe('Signing order'),
      redirectUrl: z.string().optional().describe('Redirect URL after signing'),
      language: z.string().optional().describe('Language code'),
      timezone: z.string().optional().describe('Timezone for dates'),
      dateFormat: z.string().optional().describe('Date format string')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let meta: Record<string, unknown> = {};
    if (ctx.input.subject) meta.subject = ctx.input.subject;
    if (ctx.input.emailMessage) meta.message = ctx.input.emailMessage;
    if (ctx.input.signingOrder) meta.signingOrder = ctx.input.signingOrder;
    if (ctx.input.redirectUrl) meta.redirectUrl = ctx.input.redirectUrl;
    if (ctx.input.language) meta.language = ctx.input.language;
    if (ctx.input.timezone) meta.timezone = ctx.input.timezone;
    if (ctx.input.dateFormat) meta.dateFormat = ctx.input.dateFormat;

    await client.updateEnvelope(ctx.input.envelopeId, {
      title: ctx.input.title,
      meta: Object.keys(meta).length > 0 ? meta : undefined
    });

    return {
      output: { success: true },
      message: `Updated envelope \`${ctx.input.envelopeId}\`.`
    };
  })
  .build();
