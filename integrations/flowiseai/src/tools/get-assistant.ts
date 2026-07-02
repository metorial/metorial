import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlowiseClient } from '../lib/client';
import { spec } from '../spec';

export let getAssistant = SlateTool.create(spec, {
  name: 'Get Assistant',
  key: 'get_assistant',
  description: `Retrieve detailed information about a specific AI assistant by its ID, including model configuration, instructions, and tool assignments.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      assistantId: z.string().describe('ID of the assistant to retrieve')
    })
  )
  .output(
    z.object({
      assistantId: z.string().describe('Unique identifier of the assistant'),
      details: z
        .any()
        .optional()
        .describe('Assistant configuration details (name, model, instructions, tools, etc.)'),
      credential: z
        .string()
        .optional()
        .nullable()
        .describe('Credential ID for LLM provider access'),
      iconSrc: z.string().optional().nullable().describe('Icon source URL'),
      createdDate: z.string().optional().describe('ISO 8601 creation date'),
      updatedDate: z.string().optional().describe('ISO 8601 last update date')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FlowiseClient({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let a = await client.getAssistant(ctx.input.assistantId);

    return {
      output: {
        assistantId: a.id,
        details: a.details,
        credential: a.credential,
        iconSrc: a.iconSrc,
        createdDate: a.createdDate,
        updatedDate: a.updatedDate
      },
      message: `Retrieved assistant \`${a.id}\`.`
    };
  })
  .build();
