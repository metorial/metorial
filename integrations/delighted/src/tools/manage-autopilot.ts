import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAutopilotConfig = SlateTool.create(spec, {
  name: 'Get Autopilot Configuration',
  key: 'get_autopilot_config',
  description: `Retrieve the Autopilot configuration for email or SMS, including active status and survey frequency.`,
  tags: {
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
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let config = await client.getAutopilotConfig(ctx.input.platform);

    let frequencyDays = Math.round(config.frequency / 86400);

    return {
      output: config,
      message: `${ctx.input.platform.toUpperCase()} Autopilot is **${config.active ? 'active' : 'inactive'}** with a frequency of ${frequencyDays} days.`
    };
  })
  .build();

export let addToAutopilot = SlateTool.create(spec, {
  name: 'Add to Autopilot',
  key: 'add_to_autopilot',
  description: `Add a person to Autopilot for recurring surveys. Use email platform for email-based surveys or SMS platform for text-based surveys.`,
  instructions: [
    'For email Autopilot, provide personEmail. For SMS Autopilot, provide personPhoneNumber.'
  ],
  tags: {
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
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.addToAutopilot(ctx.input.platform, {
      personEmail: ctx.input.personEmail,
      personPhoneNumber: ctx.input.personPhoneNumber,
      personId: ctx.input.personId,
      personName: ctx.input.personName,
      properties: ctx.input.properties
    });

    return {
      output: result,
      message: `Added **${ctx.input.personEmail || ctx.input.personPhoneNumber}** to ${ctx.input.platform} Autopilot.`
    };
  })
  .build();

export let listAutopilotMembers = SlateTool.create(spec, {
  name: 'List Autopilot Members',
  key: 'list_autopilot_members',
  description: `List people currently enrolled in Autopilot for email or SMS recurring surveys. Includes next scheduled survey details.`,
  tags: {
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
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let members = await client.listAutopilotMembers(ctx.input.platform, {
      perPage: ctx.input.perPage,
      personId: ctx.input.personId,
      personEmail: ctx.input.personEmail,
      personPhoneNumber: ctx.input.personPhoneNumber
    });

    return {
      output: { members },
      message: `Retrieved **${members.length}** ${ctx.input.platform} Autopilot member(s).`
    };
  })
  .build();

export let removeFromAutopilot = SlateTool.create(spec, {
  name: 'Remove from Autopilot',
  key: 'remove_from_autopilot',
  description: `Remove a person from Autopilot, cancelling their scheduled recurring surveys. Does not delete the person or their existing responses.`,
  tags: {
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
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.removeFromAutopilot(ctx.input.platform, {
      personId: ctx.input.personId,
      personEmail: ctx.input.personEmail,
      personPhoneNumber: ctx.input.personPhoneNumber
    });

    return {
      output: result,
      message: `Removed **${ctx.input.personEmail || ctx.input.personPhoneNumber || ctx.input.personId}** from ${ctx.input.platform} Autopilot.`
    };
  })
  .build();
