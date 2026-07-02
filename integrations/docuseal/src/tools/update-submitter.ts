import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateSubmitter = SlateTool.create(spec, {
  name: 'Update Submitter',
  key: 'update_submitter',
  description: `Update a submitter's details, pre-fill or modify field values, mark as completed for auto-signing, or re-send notification emails/SMS. Can also change email, name, phone, and configure 2FA requirements.`,
  instructions: [
    'Set "completed" to true to programmatically complete signing (auto-sign/counter-sign).',
    'Set "sendEmail" to true to re-send the signing notification email.',
    'Use "values" to pre-fill or update field values.'
  ]
})
  .input(
    z.object({
      submitterId: z.number().describe('ID of the submitter to update'),
      name: z.string().optional().describe('Updated submitter name'),
      email: z.string().optional().describe('Updated email address'),
      phone: z.string().optional().describe('Updated phone in E.164 format'),
      values: z
        .record(z.string(), z.any())
        .optional()
        .describe('Field values to pre-fill or update (field name -> value)'),
      externalId: z.string().optional().describe('Updated external ID'),
      sendEmail: z.boolean().optional().describe('Re-send signing notification email'),
      sendSms: z.boolean().optional().describe('Re-send signing notification SMS'),
      completed: z
        .boolean()
        .optional()
        .describe('Set true to auto-complete signing for this submitter'),
      metadata: z.record(z.string(), z.any()).optional().describe('Updated custom metadata'),
      completedRedirectUrl: z.string().optional().describe('Redirect URL after completion'),
      requirePhone2fa: z.boolean().optional().describe('Require phone 2FA'),
      requireEmail2fa: z.boolean().optional().describe('Require email 2FA'),
      message: z
        .object({
          subject: z.string().optional().describe('Custom email subject'),
          body: z.string().optional().describe('Custom email body')
        })
        .optional()
        .describe('Custom email message for re-sent notifications')
    })
  )
  .output(
    z.object({
      submitterId: z.number().describe('Updated submitter ID'),
      email: z.string().optional().describe('Submitter email'),
      name: z.string().nullable().optional().describe('Submitter name'),
      status: z.string().optional().describe('Submitter status'),
      updatedAt: z.string().optional().describe('Last updated timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.updateSubmitter(ctx.input.submitterId, {
      name: ctx.input.name,
      email: ctx.input.email,
      phone: ctx.input.phone,
      values: ctx.input.values,
      externalId: ctx.input.externalId,
      sendEmail: ctx.input.sendEmail,
      sendSms: ctx.input.sendSms,
      completed: ctx.input.completed,
      metadata: ctx.input.metadata,
      completedRedirectUrl: ctx.input.completedRedirectUrl,
      requirePhone2fa: ctx.input.requirePhone2fa,
      requireEmail2fa: ctx.input.requireEmail2fa,
      message: ctx.input.message
    });

    return {
      output: {
        submitterId: result.id,
        email: result.email,
        name: result.name,
        status: result.status,
        updatedAt: result.updated_at
      },
      message: `Updated submitter **${result.email || result.id}** (status: ${result.status || 'unknown'}).`
    };
  })
  .build();
