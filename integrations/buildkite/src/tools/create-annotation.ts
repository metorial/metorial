import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createAnnotation = SlateTool.create(spec, {
  name: 'Create Annotation',
  key: 'create_annotation',
  description: `Add an annotation to a Buildkite build. Annotations display additional context on the build page and support Markdown/HTML. Useful for attaching test summaries, deployment links, or status information.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      pipelineSlug: z.string().describe('Slug of the pipeline'),
      buildNumber: z.number().describe('Build number to annotate'),
      body: z.string().describe('Annotation content (supports Markdown and HTML)'),
      context: z
        .string()
        .optional()
        .describe(
          'A unique context identifier for the annotation. Updating with the same context replaces the annotation.'
        ),
      style: z
        .enum(['success', 'info', 'warning', 'error'])
        .optional()
        .describe('Visual style of the annotation'),
      append: z
        .boolean()
        .optional()
        .describe(
          'If true, appends to an existing annotation with the same context instead of replacing it'
        )
    })
  )
  .output(
    z.object({
      annotationId: z.string().describe('UUID of the created annotation'),
      context: z.string().describe('Context identifier for the annotation'),
      style: z.string().nullable().describe('Style of the annotation'),
      createdAt: z.string().describe('When the annotation was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationSlug: ctx.config.organizationSlug
    });

    let a = await client.createAnnotation(ctx.input.pipelineSlug, ctx.input.buildNumber, {
      body: ctx.input.body,
      context: ctx.input.context,
      style: ctx.input.style,
      append: ctx.input.append
    });

    return {
      output: {
        annotationId: a.id,
        context: a.context ?? '',
        style: a.style ?? null,
        createdAt: a.created_at
      },
      message: `Added annotation to build **#${ctx.input.buildNumber}**.`
    };
  });
