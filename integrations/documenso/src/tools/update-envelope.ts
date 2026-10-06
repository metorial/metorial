import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { clientConfig } from '../lib/validation';
import { spec } from '../spec';

export let updateEnvelopeTool = SlateTool.create(spec, {
  name: 'Update Envelope',
  key: 'update_envelope',
  description: `Update an existing envelope's title or metadata (subject, message, signing order, redirect URL, language, etc.). Provider permissions and envelope status determine which changes are accepted.`
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
    const client = new Client(clientConfig(ctx));
    const meta = {
      subject: ctx.input.subject,
      message: ctx.input.emailMessage,
      signingOrder: ctx.input.signingOrder,
      redirectUrl: ctx.input.redirectUrl,
      language: ctx.input.language,
      timezone: ctx.input.timezone,
      dateFormat: ctx.input.dateFormat
    };
    await client.updateEnvelope(ctx.input.envelopeId, { title: ctx.input.title, meta });
    return {
      output: { success: true },
      message: 'Documenso acknowledged the envelope update.'
    };
  })
  .build();
