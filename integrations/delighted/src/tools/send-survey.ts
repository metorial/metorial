import { SlateTool } from 'slates';
import { z } from 'zod';
import { rejectUnavailableDelighted, unavailableMessage } from '../lib/unavailable';
import { spec } from '../spec';

export let sendSurvey = SlateTool.create(spec, {
  name: 'Send Survey',
  key: 'send_survey',
  description:
    'DEPRECATED — Delighted customer access ended on July 1, 2026. This legacy tool is retained for compatibility and cannot be executed.',
  instructions: [unavailableMessage],
  tags: {
    deprecated: true,
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Email address of the person to survey'),
      phoneNumber: z
        .string()
        .optional()
        .describe(
          'Phone number in E.164 format (e.g., +17132746524). Required when channel is sms.'
        ),
      name: z.string().optional().describe('Name of the person'),
      channel: z
        .enum(['email', 'sms'])
        .optional()
        .describe('Survey delivery channel. Defaults to email.'),
      delay: z
        .number()
        .optional()
        .describe('Number of seconds to wait before sending the survey'),
      send: z
        .boolean()
        .optional()
        .describe(
          'Set to false to create the person without sending a survey. Defaults to true.'
        ),
      lastSentAt: z
        .number()
        .optional()
        .describe(
          'Unix timestamp to manually set last survey send time for throttling purposes'
        ),
      properties: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Custom metadata key-value pairs. Special keys: locale, question_product_name, delighted_email_subject, delighted_intro_message'
        )
    })
  )
  .output(
    z.object({
      personId: z.string().describe('ID of the person'),
      email: z.string().nullable().describe('Email address'),
      name: z.string().nullable().describe('Name of the person'),
      phoneNumber: z.string().nullable().describe('Phone number'),
      surveyScheduledAt: z
        .number()
        .nullable()
        .describe('Unix timestamp when the survey is scheduled to be sent'),
      properties: z
        .record(z.string(), z.string())
        .describe('Custom properties attached to the person')
    })
  )
  .handleInvocation(async () => rejectUnavailableDelighted())
  .build();
