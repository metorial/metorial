import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlowiseClient } from '../lib/client';
import { spec } from '../spec';

export let listAssistants = SlateTool.create(spec, {
  name: 'List Assistants',
  key: 'list_assistants',
  description: `Retrieve all AI assistants configured in Flowise. Returns each assistant's name, model, instructions, tool assignments, and credential information.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(z.object({}))
  .output(
    z.object({
      assistants: z
        .array(
          z.object({
            assistantId: z.string().describe('Unique identifier of the assistant'),
            details: z
              .any()
              .optional()
              .describe(
                'Assistant configuration details (name, model, instructions, tools, etc.)'
              ),
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
        .describe('List of assistants')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FlowiseClient({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let result = await client.listAssistants();
    let assistants = Array.isArray(result) ? result : [];

    return {
      output: {
        assistants: assistants.map((a: any) => ({
          assistantId: a.id,
          details: a.details,
          credential: a.credential,
          iconSrc: a.iconSrc,
          createdDate: a.createdDate,
          updatedDate: a.updatedDate
        }))
      },
      message: `Found **${assistants.length}** assistant(s).`
    };
  })
  .build();
