import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createDeal = SlateTool.create(spec, {
  name: 'Create Deal',
  key: 'create_deal',
  description: `Create a new deal in the Bonsai sales pipeline. Deals track potential revenue and can be associated with a client, assigned a pipeline stage, and given a monetary value.`,
  instructions: [
    'A **title** is required to create a deal.',
    'Associate the deal with a client by providing their **email** via clientEmail.',
    'Set the **pipelineStage** to position the deal in your sales pipeline.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Title of the deal'),
      clientEmail: z
        .string()
        .optional()
        .describe('Email of the client associated with this deal'),
      pipelineStage: z
        .string()
        .optional()
        .describe(
          'Pipeline stage for the deal (e.g., "lead", "proposal", "negotiation", "won", "lost")'
        ),
      value: z.number().optional().describe('Monetary value of the deal'),
      ownerEmail: z.string().optional().describe('Email of the team member who owns this deal')
    })
  )
  .output(
    z.object({
      dealId: z.string().describe('ID of the created deal'),
      title: z.string().describe('Title of the deal'),
      clientEmail: z.string().optional().describe('Client email'),
      clientId: z.string().optional().describe('Client ID'),
      pipelineStage: z.string().optional().describe('Pipeline stage'),
      value: z.number().optional().describe('Deal value'),
      ownerEmail: z.string().optional().describe('Owner email')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createDeal({
      title: ctx.input.title,
      clientEmail: ctx.input.clientEmail,
      pipelineStage: ctx.input.pipelineStage,
      value: ctx.input.value,
      ownerEmail: ctx.input.ownerEmail
    });

    let valueStr = result.value !== undefined ? ` worth **${result.value}**` : '';

    return {
      output: {
        dealId: result.id,
        title: result.title,
        clientEmail: result.clientEmail,
        clientId: result.clientId,
        pipelineStage: result.pipelineStage,
        value: result.value,
        ownerEmail: result.ownerEmail
      },
      message: `Created deal **${result.title}** (\`${result.id}\`)${valueStr}${result.pipelineStage ? ` in stage "${result.pipelineStage}"` : ''}.`
    };
  })
  .build();
