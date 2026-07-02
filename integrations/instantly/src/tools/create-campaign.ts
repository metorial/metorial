import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let scheduleSchema = z.object({
  name: z.string().optional().describe('Schedule name'),
  timing: z
    .object({
      from: z.string().describe('Start time, e.g. "09:00"'),
      to: z.string().describe('End time, e.g. "17:00"')
    })
    .describe('Sending window'),
  days: z
    .record(z.string(), z.boolean())
    .describe('Days of week enabled. Keys: "0" (Sun) through "6" (Sat).'),
  timezone: z.string().describe('Timezone, e.g. "America/New_York"')
});

export let createCampaign = SlateTool.create(spec, {
  name: 'Create Campaign',
  key: 'create_campaign',
  description: `Create a new cold email campaign. At minimum, provide a name and schedule. Sequences (email steps) can be added at creation or later.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Campaign name.'),
      schedules: z
        .array(scheduleSchema)
        .min(1)
        .describe('One or more sending schedules for the campaign.'),
      sequences: z
        .array(z.any())
        .optional()
        .describe(
          'Email sequences with steps. Each step includes subject, body, and optional variants.'
        )
    })
  )
  .output(
    z.object({
      campaignId: z.string().describe('ID of the created campaign'),
      name: z.string().describe('Campaign name'),
      status: z.number().describe('Campaign status'),
      timestampCreated: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createCampaign({
      name: ctx.input.name,
      campaignSchedule: {
        schedules: ctx.input.schedules
      },
      sequences: ctx.input.sequences
    });

    return {
      output: {
        campaignId: result.id,
        name: result.name,
        status: result.status,
        timestampCreated: result.timestamp_created
      },
      message: `Created campaign **${result.name}** (ID: ${result.id}).`
    };
  })
  .build();
