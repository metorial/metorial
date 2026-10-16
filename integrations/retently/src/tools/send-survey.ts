import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let surveyRecipientSchema = z.object({
  email: z.string().describe('Recipient email address'),
  firstName: z.string().optional().describe('Recipient first name'),
  lastName: z.string().optional().describe('Recipient last name'),
  company: z.string().optional().describe('Recipient company name'),
  tags: z.array(z.string()).optional().describe('Tags to assign to the recipient'),
  unsetProperties: z
    .array(z.string())
    .optional()
    .describe('Property names or labels to remove'),
  unsetTags: z.array(z.string()).optional().describe('Tag names to remove'),
  properties: z
    .array(
      z.object({
        label: z.string().describe('Property label'),
        type: z
          .enum(['string', 'date', 'integer', 'collection', 'boolean'])
          .describe('Property type'),
        value: z
          .union([z.string(), z.number(), z.boolean()])
          .describe('Property value. For collection properties, use comma-separated text.')
      })
    )
    .optional()
    .describe('Custom properties for the recipient')
});

let normalizeProperties = (
  properties?: Array<{
    label: string;
    type: 'string' | 'date' | 'integer' | 'collection' | 'boolean';
    value?: string | number | boolean;
  }>
) => {
  if (!properties) return undefined;
  let normalized = properties
    .filter(p => p.value !== undefined)
    .map(p => ({
      label: p.label,
      type: p.type,
      value: p.value as string | number | boolean
    }));
  return normalized.length > 0 ? normalized : undefined;
};

export let sendSurvey = SlateTool.create(spec, {
  name: 'Send Survey',
  key: 'send_survey',
  description: `Send a transactional survey (NPS, CSAT, CES, or 5-Star) to one or more customers via a specified campaign.
The campaign must be a transactional campaign and must be active. Optionally delay sending by a specified number of days.
Recipients that don't exist will be automatically created as customers.`,
  constraints: [
    'Maximum 100 recipients per request',
    'Campaign must be transactional and active'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      campaignId: z
        .string()
        .describe('Transactional campaign ID. Call get_campaigns to find active campaigns.'),
      delay: z
        .number()
        .optional()
        .describe(
          'Number of days to delay sending. Overrides campaign scheduling; omit to respect its sending time frame.'
        ),
      recipients: z
        .array(surveyRecipientSchema)
        .min(1)
        .describe('List of recipients to survey')
    })
  )
  .output(
    z.object({
      results: z
        .record(z.string(), z.any())
        .describe(
          'Provider result, including queue status or per-recipient results when available'
        )
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.recipients.length > 100)
      throw createApiServiceError('Send surveys to at most 100 recipients per request.');
    if (
      ctx.input.delay !== undefined &&
      (!Number.isInteger(ctx.input.delay) || ctx.input.delay < 0)
    ) {
      throw createApiServiceError('Survey delay must be a non-negative whole number of days.');
    }
    let client = new Client(ctx.auth.token);

    let subscribers = ctx.input.recipients.map(r => ({
      email: r.email,
      first_name: r.firstName,
      last_name: r.lastName,
      company: r.company,
      tags: r.tags,
      unset_properties: r.unsetProperties,
      unset_tags: r.unsetTags,
      properties: normalizeProperties(r.properties)
    }));

    let result = await client.sendSurvey(ctx.input.campaignId, subscribers, ctx.input.delay);
    let count = ctx.input.recipients.length;

    return {
      output: { results: result },
      message: `Survey request accepted for **${count}** recipient(s)${ctx.input.delay ? ` with a ${ctx.input.delay}-day delay` : ''}.`
    };
  })
  .build();
