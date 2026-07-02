import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendMimeEmail = SlateTool.create(spec, {
  name: 'Send MIME Email',
  key: 'send_mime_email',
  description: `Send a pre-composed MIME-formatted email via SMTP2GO. Use this when you have a complete MIME string built by a MIME library, including headers, body, and attachments.`,
  instructions: ['The MIME email string must be Base64-encoded before sending.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      mimeEmail: z.string().describe('Base64-encoded MIME email string')
    })
  )
  .output(
    z.object({
      succeeded: z.number().describe('Number of emails successfully queued'),
      failed: z.number().describe('Number of emails that failed'),
      failures: z.array(z.string()).describe('Details of any failures'),
      emailId: z.string().describe('Unique identifier for the sent email')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.sendMimeEmail(ctx.input);
    let data = result.data || result.email_response || result;

    return {
      output: {
        succeeded: data.succeeded ?? 0,
        failed: data.failed ?? 0,
        failures: data.failures ?? [],
        emailId: data.email_id ?? ''
      },
      message: `MIME email sent. ${data.succeeded ?? 0} succeeded, ${data.failed ?? 0} failed.`
    };
  })
  .build();
