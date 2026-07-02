import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlowiseClient } from '../lib/client';
import { spec } from '../spec';

export let createAssistant = SlateTool.create(spec, {
  name: 'Create Assistant',
  key: 'create_assistant',
  description: `Create a new AI assistant in Flowise. Provide details as a JSON string containing the assistant's name, model, instructions, temperature, and tool assignments.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      details: z
        .string()
        .describe(
          'JSON string with assistant configuration: name, model, instructions, temperature, top_p, tools (array of tool types like "function", "code_interpreter", "file_search"), tool_resources'
        ),
      credential: z.string().optional().describe('Credential ID for LLM provider access'),
      iconSrc: z.string().optional().describe('Icon source URL')
    })
  )
  .output(
    z.object({
      assistantId: z.string().describe('ID of the newly created assistant'),
      details: z.any().optional().describe('Assistant configuration details'),
      credential: z.string().optional().nullable().describe('Assigned credential ID'),
      createdDate: z.string().optional().describe('ISO 8601 creation date')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FlowiseClient({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let result = await client.createAssistant({
      details: ctx.input.details,
      credential: ctx.input.credential,
      iconSrc: ctx.input.iconSrc
    });

    return {
      output: {
        assistantId: result.id,
        details: result.details,
        credential: result.credential,
        createdDate: result.createdDate
      },
      message: `Created assistant \`${result.id}\`.`
    };
  })
  .build();
