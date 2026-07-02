import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let contactSchema = z.object({
  phone: z.string().describe('Phone number in E.164 format (e.g., +393331234567)'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  email: z.string().optional().describe('Email address'),
  language: z.string().optional().describe('Language code (e.g., "en", "it")'),
  customFields: z.record(z.string(), z.string()).optional().describe('Custom field values')
});

export let startAutomation = SlateTool.create(spec, {
  name: 'Start Automation',
  key: 'start_automation',
  description: `Starts a pre-configured Spoki automation workflow for one or more contacts. This is the **recommended method** for sending messages, as it supports template messages, multi-step flows, and handles large volumes efficiently.
Provide a single contact or multiple contacts to trigger the automation in bulk.`,
  instructions: [
    'Create the automation in Spoki first (Automations > New > Trigger > Integrations > API) and note its ID.',
    'Contact details are automatically created or updated when the automation starts.',
    'For a single contact, use the top-level phone/name/email fields. For bulk, use the contacts array.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      automationId: z.string().describe('ID of the Spoki automation to start'),
      phone: z
        .string()
        .optional()
        .describe('Phone number for a single contact (E.164 format)'),
      firstName: z.string().optional().describe('First name for a single contact'),
      lastName: z.string().optional().describe('Last name for a single contact'),
      email: z.string().optional().describe('Email for a single contact'),
      language: z.string().optional().describe('Language code for a single contact'),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom field values for a single contact'),
      contacts: z
        .array(contactSchema)
        .optional()
        .describe('Array of contacts for bulk automation (overrides single-contact fields)')
    })
  )
  .output(
    z.object({
      automationId: z.string().describe('ID of the automation that was started'),
      contactCount: z.number().describe('Number of contacts the automation was started for'),
      raw: z.any().optional().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result: any;
    let contactCount: number;

    if (ctx.input.contacts && ctx.input.contacts.length > 0) {
      ctx.info(
        `Starting automation ${ctx.input.automationId} for ${ctx.input.contacts.length} contacts`
      );
      result = await client.startAutomationForMany({
        automationId: ctx.input.automationId,
        contacts: ctx.input.contacts
      });
      contactCount = ctx.input.contacts.length;
    } else if (ctx.input.phone) {
      ctx.info(`Starting automation ${ctx.input.automationId} for ${ctx.input.phone}`);
      result = await client.startAutomation({
        automationId: ctx.input.automationId,
        phone: ctx.input.phone,
        firstName: ctx.input.firstName,
        lastName: ctx.input.lastName,
        email: ctx.input.email,
        language: ctx.input.language,
        customFields: ctx.input.customFields
      });
      contactCount = 1;
    } else {
      throw new Error(
        'Either "phone" (for single contact) or "contacts" (for bulk) must be provided.'
      );
    }

    return {
      output: {
        automationId: ctx.input.automationId,
        contactCount,
        raw: result
      },
      message:
        contactCount === 1
          ? `Started automation **${ctx.input.automationId}** for **${ctx.input.phone}**`
          : `Started automation **${ctx.input.automationId}** for **${contactCount}** contacts`
    };
  })
  .build();
