import { SlateTool } from 'slates';
import { z } from 'zod';
import { rejectUnavailableDelighted, unavailableMessage } from '../lib/unavailable';
import { spec } from '../spec';

export let getAutopilotConfig = SlateTool.create(spec, {
  name: 'Get Autopilot Configuration',
  key: 'get_autopilot_config',
  description:
    'DEPRECATED — Delighted customer access ended on July 1, 2026. This legacy tool is retained for compatibility and cannot be executed.',
  instructions: [unavailableMessage],
  tags: {
    deprecated: true,
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      platform: z.enum(['email', 'sms']).describe('Autopilot platform to query')
    })
  )
  .output(
    z.object({
      platformId: z.string().describe('Platform identifier (email or sms)'),
      active: z.boolean().describe('Whether Autopilot is currently active'),
      frequency: z.number().describe('Seconds between recurring surveys'),
      createdAt: z.number().describe('Unix timestamp when Autopilot was created'),
      updatedAt: z.number().describe('Unix timestamp when Autopilot was last updated')
    })
  )
  .handleInvocation(async () => rejectUnavailableDelighted())
  .build();

export let addToAutopilot = SlateTool.create(spec, {
  name: 'Add to Autopilot',
  key: 'add_to_autopilot',
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
      platform: z.enum(['email', 'sms']).describe('Autopilot platform to add the person to'),
      personEmail: z
        .string()
        .optional()
        .describe('Email address (required for email Autopilot)'),
      personPhoneNumber: z
        .string()
        .optional()
        .describe('Phone number in E.164 format (required for SMS Autopilot)'),
      personId: z.string().optional().describe('Person ID if already known'),
      personName: z.string().optional().describe('Name of the person'),
      properties: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom properties (e.g., locale, question_product_name)')
    })
  )
  .output(
    z.object({
      person: z.any().nullable().describe('Person details'),
      properties: z
        .record(z.string(), z.string())
        .describe('Properties associated with the membership')
    })
  )
  .handleInvocation(async () => rejectUnavailableDelighted())
  .build();

export let listAutopilotMembers = SlateTool.create(spec, {
  name: 'List Autopilot Members',
  key: 'list_autopilot_members',
  description:
    'DEPRECATED — Delighted customer access ended on July 1, 2026. This legacy tool is retained for compatibility and cannot be executed.',
  instructions: [unavailableMessage],
  tags: {
    deprecated: true,
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      platform: z.enum(['email', 'sms']).describe('Autopilot platform to list members for'),
      perPage: z.number().optional().describe('Results per page (max 100, default 20)'),
      personId: z.string().optional().describe('Filter by person ID'),
      personEmail: z.string().optional().describe('Filter by person email'),
      personPhoneNumber: z
        .string()
        .optional()
        .describe('Filter by phone number in E.164 format')
    })
  )
  .output(
    z.object({
      members: z
        .array(
          z.object({
            createdAt: z.number().describe('Unix timestamp when added to Autopilot'),
            updatedAt: z.number().describe('Unix timestamp of last update'),
            person: z.any().nullable().describe('Person details'),
            nextSurveyRequest: z
              .any()
              .nullable()
              .describe('Next scheduled survey request details')
          })
        )
        .describe('List of Autopilot members')
    })
  )
  .handleInvocation(async () => rejectUnavailableDelighted())
  .build();

export let removeFromAutopilot = SlateTool.create(spec, {
  name: 'Remove from Autopilot',
  key: 'remove_from_autopilot',
  description:
    'DEPRECATED — Delighted customer access ended on July 1, 2026. This legacy tool is retained for compatibility and cannot be executed.',
  instructions: [unavailableMessage],
  tags: {
    deprecated: true,
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      platform: z
        .enum(['email', 'sms'])
        .describe('Autopilot platform to remove the person from'),
      personId: z.string().optional().describe('Person ID'),
      personEmail: z.string().optional().describe('Person email address'),
      personPhoneNumber: z.string().optional().describe('Phone number in E.164 format')
    })
  )
  .output(
    z.object({
      person: z.any().nullable().describe('Removed person details')
    })
  )
  .handleInvocation(async () => rejectUnavailableDelighted())
  .build();
