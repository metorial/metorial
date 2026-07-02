import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let textToFlowDiagram = SlateTool.create(spec, {
  name: 'Text to Flow Diagram',
  key: 'text_to_flow_diagram',
  description: `Convert text descriptions into interactive flow diagrams and visual representations. Describe a process, workflow, system architecture, or any concept in plain text and receive a structured diagram.

Useful for creating process flows, decision trees, system diagrams, and organizational charts from textual descriptions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      instructions: z
        .string()
        .describe(
          'Text description of the diagram to generate, e.g. "User login flow: start -> enter credentials -> validate -> if valid go to dashboard, else show error and retry"'
        )
    })
  )
  .output(
    z.object({
      diagram: z.any().describe('Generated flow diagram data or visual representation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.progress('Generating flow diagram...');

    let result = await client.textToFlowDiagram({
      instructions: ctx.input.instructions
    });

    return {
      output: {
        diagram: result
      },
      message: `Successfully generated a flow diagram from the provided text description.`
    };
  })
  .build();
