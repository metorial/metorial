import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAutomation = SlateTool.create(spec, {
  name: 'Get Automation',
  key: 'get_automation',
  description: `Retrieve an automation by ID, including its trigger configuration and email sequence.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      automationId: z.number().describe('ID of the automation to retrieve')
    })
  )
  .output(
    z.object({
      automationId: z.number().describe('Automation ID'),
      name: z.string().optional().describe('Automation name'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      rawAutomation: z.any().describe('Full automation object from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let automation = await client.getAutomation(ctx.input.automationId);

    return {
      output: {
        automationId: automation.id,
        name: automation.name,
        createdAt: automation.created_at,
        rawAutomation: automation
      },
      message: `Retrieved automation **${automation.name || automation.id}** (ID: ${automation.id}).`
    };
  })
  .build();
