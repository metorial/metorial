import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let surveyRecipientSchema = z.object({
  email: z.string().describe('Recipient email address'),
  firstName: z.string().optional().describe('Recipient first name'),
  lastName: z.string().optional().describe('Recipient last name'),
  company: z.string().optional().describe('Recipient company name'),
  tags: z.array(z.string()).optional().describe('Tags to assign to the recipient'),
  properties: z
    .array(
      z.object({
        label: z.string().describe('Property label'),
        type: z
          .enum(['string', 'date', 'integer', 'collection', 'boolean'])
          .describe('Property type'),
        value: z.union([z.string(), z.number(), z.boolean()]).describe('Property value')
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
      campaignId: z.string().describe('ID of the transactional campaign to use for sending'),
      delay: z.number().optional().describe('Number of days to delay sending the survey'),
      recipients: z
        .array(surveyRecipientSchema)
        .min(1)
        .describe('List of recipients to survey')
    })
  )
  .output(
    z.object({
      results: z.record(z.string(), z.any()).describe('Map of email addresses to send status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let subscribers = ctx.input.recipients.map(r => ({
      email: r.email,
      first_name: r.firstName,
      last_name: r.lastName,
      company: r.company,
      tags: r.tags,
      properties: normalizeProperties(r.properties)
    }));

    let result = await client.sendSurvey(ctx.input.campaignId, subscribers, ctx.input.delay);
    let count = ctx.input.recipients.length;

    return {
      output: { results: result },
      message: `Survey sent to **${count}** recipient(s)${ctx.input.delay ? ` with a ${ctx.input.delay}-day delay` : ''}.`
    };
  })
  .build();
