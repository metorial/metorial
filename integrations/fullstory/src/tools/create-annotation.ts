import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createAnnotation = SlateTool.create(spec, {
  name: 'Create Annotation',
  key: 'create_annotation',
  description: `Add an annotation to FullStory. Annotations appear on metric visualizations and are useful for marking deployments, incidents, A/B test starts, or other notable events. Commonly used in CI/CD pipelines.`,
  instructions: [
    'If startTime is omitted, it defaults to the current server time.',
    'If endTime is omitted, it defaults to startTime (point-in-time annotation).',
    'The source field is displayed on the visualization alongside the annotation text.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      text: z
        .string()
        .describe('Annotation text (e.g., "v2.3.1 deployed", "Incident resolved")'),
      startTime: z
        .string()
        .optional()
        .describe('Start time in ISO 8601 format. Defaults to current time.'),
      endTime: z
        .string()
        .optional()
        .describe(
          'End time in ISO 8601 format. Must be after startTime. Defaults to startTime.'
        ),
      source: z
        .string()
        .optional()
        .describe(
          'Source label displayed on the visualization (e.g., "Deploy Pipeline", "Incident Manager")'
        )
    })
  )
  .output(
    z.object({
      text: z.string().describe('Annotation text'),
      startTime: z.string().optional().describe('Annotation start time'),
      endTime: z.string().optional().describe('Annotation end time'),
      source: z.string().optional().describe('Source label')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let annotation = await client.createAnnotation({
      text: ctx.input.text,
      startTime: ctx.input.startTime,
      endTime: ctx.input.endTime,
      source: ctx.input.source
    });

    return {
      output: annotation,
      message: `Annotation **"${annotation.text}"** created${annotation.source ? ` from ${annotation.source}` : ''}.`
    };
  })
  .build();
