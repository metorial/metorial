import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateCourse = SlateTool.create(spec, {
  name: 'Generate Course with AI',
  key: 'generate_course',
  description: `Programmatically generate a new Coassemble course using AI. Provide a topic prompt along with optional audience, familiarity level, tone, and desired screen count.`,
  constraints: ['Requires Headless course creation access on your workspace.']
})
  .input(
    z.object({
      prompt: z.string().describe('Topic or description for the course to generate'),
      identifier: z.string().describe('User identifier to assign as the course creator'),
      clientIdentifier: z
        .string()
        .optional()
        .describe('Client identifier to associate with the course'),
      audience: z
        .string()
        .optional()
        .describe('Target audience (default: "general audience"; e.g. "new employees")'),
      familiarity: z
        .string()
        .optional()
        .describe('Learner familiarity level (default: "beginner")'),
      tone: z.string().optional().describe('Content tone (default: "professional")'),
      screenCount: z.number().optional().describe('Number of screens to generate (default: 6)')
    })
  )
  .output(
    z.object({
      course: z.record(z.string(), z.any()).describe('The generated course object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      userId: ctx.auth.userId,
      authScheme: ctx.auth.authScheme
    });

    let result = await client.generateCourse({
      prompt: ctx.input.prompt,
      identifier: ctx.input.identifier,
      clientIdentifier: ctx.input.clientIdentifier,
      audience: ctx.input.audience,
      familiarity: ctx.input.familiarity,
      tone: ctx.input.tone,
      screenCount: ctx.input.screenCount
    });

    return {
      output: { course: result },
      message: `Generated AI course for prompt: "${ctx.input.prompt}" assigned to \`${ctx.input.identifier}\`.`
    };
  })
  .build();
