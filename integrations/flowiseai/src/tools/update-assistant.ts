import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlowiseClient } from '../lib/client';
import { spec } from '../spec';

export let updateAssistant = SlateTool.create(spec, {
  name: 'Update Assistant',
  key: 'update_assistant',
  description: `Update an existing AI assistant's configuration, including details (name, model, instructions, tools), credentials, or icon.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      assistantId: z.string().describe('ID of the assistant to update'),
      details: z
        .string()
        .optional()
        .describe(
          'Updated JSON string with assistant config (name, model, instructions, temperature, tools, etc.)'
        ),
      credential: z.string().optional().describe('Updated credential ID'),
      iconSrc: z.string().optional().describe('Updated icon source URL')
    })
  )
  .output(
    z.object({
      assistantId: z.string().describe('ID of the updated assistant'),
      details: z.any().optional().describe('Updated assistant configuration'),
      credential: z.string().optional().nullable().describe('Credential ID'),
      updatedDate: z.string().optional().describe('ISO 8601 last update date')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FlowiseClient({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let { assistantId, ...updateData } = ctx.input;
    let result = await client.updateAssistant(assistantId, updateData);

    return {
      output: {
        assistantId: result.id,
        details: result.details,
        credential: result.credential,
        updatedDate: result.updatedDate
      },
      message: `Updated assistant \`${result.id}\`.`
    };
  })
  .build();
