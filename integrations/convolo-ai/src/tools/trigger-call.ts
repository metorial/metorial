import { SlateTool } from 'slates';
import { z } from 'zod';
import { SpeedToLeadClient } from '../lib/client';
import { spec } from '../spec';

let agentSchema = z.object({
  name: z.string().describe('Agent name'),
  phone: z.string().describe('Agent phone number')
});

export let triggerCall = SlateTool.create(spec, {
  name: 'Trigger Call to Lead',
  key: 'trigger_call',
  description: `Initiate a phone call to a lead using the Speed To Lead product. The call is routed to the first available agent in the widget's call queue, or to specific agents if provided. Supports custom parameters for passing additional lead data.`,
  instructions: [
    'Phone numbers should include the country code (e.g., +14083726197).',
    'If agents are specified, they override the regular call queue.',
    'Custom parameters are prefixed with lc_param_ automatically if not already prefixed.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      leadPhone: z.string().describe('The lead phone number to call (e.g., +14083726197)'),
      leadName: z.string().optional().describe('Name of the lead'),
      leadEmail: z.string().optional().describe('Email address of the lead'),
      message: z.string().optional().describe('Custom message to include with the call'),
      secondaryPhone: z.string().optional().describe('Secondary phone number for the lead'),
      country: z
        .string()
        .optional()
        .describe('Two-letter ISO country code for phone number formatting (e.g., US, GB)'),
      agents: z
        .array(agentSchema)
        .optional()
        .describe('Specific agents to route the call to, overriding the regular call queue'),
      customParams: z
        .record(z.string(), z.string())
        .optional()
        .describe('Additional custom parameters to attach to the call (key-value pairs)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the call was successfully triggered'),
      rawResponse: z.any().optional().describe('Raw response from the Convolo API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SpeedToLeadClient({
      widgetKey: ctx.auth.widgetKey,
      apiKey: ctx.auth.token
    });

    let result = await client.triggerCall({
      leadPhone: ctx.input.leadPhone,
      leadName: ctx.input.leadName,
      leadEmail: ctx.input.leadEmail,
      message: ctx.input.message,
      secondaryPhone: ctx.input.secondaryPhone,
      country: ctx.input.country,
      agents: ctx.input.agents,
      customParams: ctx.input.customParams
    });

    ctx.info({ message: 'Call triggered successfully', result });

    return {
      output: {
        success: true,
        rawResponse: result
      },
      message: `Call triggered to **${ctx.input.leadPhone}**${ctx.input.leadName ? ` (${ctx.input.leadName})` : ''}. The call is being routed to ${ctx.input.agents ? `${ctx.input.agents.length} specified agent(s)` : 'the next available agent'}.`
    };
  })
  .build();
