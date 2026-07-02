import { SlateTool } from 'slates';
import { z } from 'zod';
import { ImejisClient } from '../lib/client';
import { spec } from '../spec';

export let aiDesignAssistantTool = SlateTool.create(spec, {
  name: 'AI Design Assistant',
  key: 'ai_design_assistant',
  description: `Create a new design or update an existing one using natural language prompts. The AI Design Assistant interprets your description and generates or modifies an Imejis.io design template accordingly.
Useful for quickly creating templates without manual editing — describe the layout, style, colors, and content in plain text.`,
  instructions: [
    'Provide a clear, descriptive prompt explaining the desired design (e.g., "Create a social media post template with a bold headline, product image placeholder, and a red call-to-action button").',
    'To update an existing design, include the designId of the template to modify.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      prompt: z
        .string()
        .describe(
          'Natural language description of the design to create or how to modify an existing design.'
        ),
      designId: z
        .string()
        .optional()
        .describe(
          'ID of an existing design to update. Omit to create a new design from scratch.'
        )
    })
  )
  .output(
    z.object({
      designId: z.string().describe('ID of the created or updated design template.'),
      name: z.string().optional().describe('Name assigned to the design.'),
      description: z.string().optional().describe('Description of the design.'),
      thumbnailUrl: z.string().optional().describe('URL of the design thumbnail preview.'),
      url: z
        .string()
        .optional()
        .describe('URL to view or edit the design in the Imejis.io platform.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ImejisClient({ token: ctx.auth.token });

    let result = await client.aiDesignAssistant({
      prompt: ctx.input.prompt,
      designId: ctx.input.designId
    });

    let action = ctx.input.designId ? 'Updated' : 'Created';

    return {
      output: result,
      message: `${action} design \`${result.designId}\`${result.name ? ` ("${result.name}")` : ''} using AI assistant.`
    };
  })
  .build();
