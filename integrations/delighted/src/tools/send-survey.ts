import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendSurvey = SlateTool.create(spec, {
  name: 'Send Survey',
  key: 'send_survey',
  description: `Send a survey to a person by creating or updating their record in Delighted. Supports email and SMS channels with configurable delay, locale, and custom properties. You can also create a person without sending a survey by setting \`send\` to false.`,
  instructions: [
    'Provide either an email or phoneNumber (required for SMS channel).',
    'Use properties to attach metadata like location or customer type for filtering on the dashboard.',
    'Special properties like locale, question_product_name, delighted_email_subject, delighted_intro_message customize the survey experience.'
  ],
  constraints: [
    'Survey throttling may prevent a survey from being sent if the person was recently surveyed.'
  ],
  tags: {
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
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createPerson({
      email: ctx.input.email,
      phoneNumber: ctx.input.phoneNumber,
      name: ctx.input.name,
      channel: ctx.input.channel,
      delay: ctx.input.delay,
      send: ctx.input.send,
      lastSentAt: ctx.input.lastSentAt,
      properties: ctx.input.properties
    });

    return {
      output: {
        personId: result.personId,
        email: result.email,
        name: result.name,
        phoneNumber: result.phoneNumber,
        surveyScheduledAt: result.surveyScheduledAt,
        properties: result.properties
      },
      message: result.surveyScheduledAt
        ? `Survey scheduled for **${result.email || result.phoneNumber}** at ${new Date(result.surveyScheduledAt * 1000).toISOString()}.`
        : `Person **${result.email || result.phoneNumber}** created${ctx.input.send === false ? ' without sending a survey' : ''}.`
    };
  })
  .build();
