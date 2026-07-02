import { createTextAttachment, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getModelReadme = SlateTool.create(spec, {
  name: 'Get Model README',
  key: 'get_model_readme',
  description: `Get a model's README content as a Markdown attachment.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      owner: z.string().describe('Model owner username'),
      modelName: z.string().describe('Model name')
    })
  )
  .output(
    z.object({
      owner: z.string().describe('Model owner'),
      modelName: z.string().describe('Model name'),
      contentType: z.string().describe('Attachment MIME type'),
      characterCount: z.number().describe('Number of README characters'),
      attachmentCount: z.number().describe('Number of attachments returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let readme = await client.getModelReadme(ctx.input.owner, ctx.input.modelName);

    return {
      output: {
        owner: ctx.input.owner,
        modelName: ctx.input.modelName,
        contentType: 'text/markdown',
        characterCount: readme.length,
        attachmentCount: 1
      },
      attachments: [createTextAttachment(readme, 'text/markdown')],
      message: `Retrieved README for **${ctx.input.owner}/${ctx.input.modelName}**.`
    };
  })
  .build();

export let listModelExamples = SlateTool.create(spec, {
  name: 'List Model Examples',
  key: 'list_model_examples',
  description: `List example predictions saved by a model author to demonstrate a model's capabilities.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      owner: z.string().describe('Model owner username'),
      modelName: z.string().describe('Model name'),
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      examples: z.array(
        z.object({
          predictionId: z.string().describe('Prediction ID'),
          model: z.string().optional().describe('Model identifier'),
          version: z.string().optional().describe('Version ID'),
          status: z.string().describe('Prediction status'),
          input: z.any().optional().describe('Example input'),
          output: z.any().optional().describe('Example output'),
          createdAt: z.string().describe('Creation timestamp'),
          completedAt: z.string().optional().nullable().describe('Completion timestamp'),
          urls: z.record(z.string(), z.string()).optional().describe('Related URLs')
        })
      ),
      nextCursor: z.string().optional().nullable().describe('Cursor for next page'),
      previousCursor: z.string().optional().nullable().describe('Cursor for previous page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listModelExamples(ctx.input.owner, ctx.input.modelName, {
      cursor: ctx.input.cursor
    });
    let examples = (result.results || []).map((prediction: any) => ({
      predictionId: prediction.id,
      model: prediction.model,
      version: prediction.version,
      status: prediction.status,
      input: prediction.input,
      output: prediction.output,
      createdAt: prediction.created_at,
      completedAt: prediction.completed_at,
      urls: prediction.urls
    }));
    let nextCursor = result.next ? new URL(result.next).searchParams.get('cursor') : null;
    let previousCursor = result.previous
      ? new URL(result.previous).searchParams.get('cursor')
      : null;

    return {
      output: { examples, nextCursor, previousCursor },
      message: `Found **${examples.length}** examples for **${ctx.input.owner}/${ctx.input.modelName}**.`
    };
  })
  .build();
