import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let extractRelationshipsTool = SlateTool.create(spec, {
  name: 'Extract Relationships',
  key: 'extract_relationships',
  description: `Extracts relationships between entities in text. Identifies the grammatical and semantic connections between two entities, recognizing the action or predicate that connects them. Uses a combination of deep learning and semantic rules.`,
  constraints: ['Maximum payload size is 600KB with a maximum of 50,000 characters.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      content: z.string().describe('The text to extract relationships from'),
      language: z
        .string()
        .optional()
        .describe('ISO 639-3 language code. Auto-detected if not specified.')
    })
  )
  .output(
    z.object({
      relationships: z
        .array(
          z.object({
            predicate: z.string().describe('The action/verb connecting the entities'),
            arg1: z.string().describe('The first entity/argument in the relationship'),
            arg2: z
              .string()
              .optional()
              .describe('The second entity/argument in the relationship'),
            arg3: z.string().optional().describe('Optional third argument'),
            adjuncts: z
              .array(z.string())
              .optional()
              .describe('Additional modifiers or context'),
            locatives: z.array(z.string()).optional().describe('Location-related modifiers'),
            temporals: z.array(z.string()).optional().describe('Time-related modifiers'),
            confidence: z.number().optional().describe('Confidence score')
          })
        )
        .describe('Extracted relationships between entities')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.extractRelationships(ctx.input.content, ctx.input.language);

    let relationships = result.relationships ?? [];

    return {
      output: {
        relationships
      },
      message: `Extracted **${relationships.length}** relationship${relationships.length === 1 ? '' : 's'} from the text.`
    };
  })
  .build();
