import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSpaces = SlateTool.create(spec, {
  name: 'List Spaces',
  key: 'list_spaces',
  description: `List all spaces (form groups) in your Paperform account. Spaces are used to organize forms into logical groups.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Number of results to return (max 100, default 20)'),
      skip: z.number().optional().describe('Number of results to skip')
    })
  )
  .output(
    z.object({
      spaces: z.array(
        z.object({
          spaceId: z.string().describe('Unique space ID'),
          name: z.string().describe('Space name')
        })
      ),
      total: z.number().describe('Total number of spaces'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listSpaces({
      limit: ctx.input.limit,
      skip: ctx.input.skip
    });

    let spaces = result.results.map(s => ({
      spaceId: String(s.id),
      name: s.name
    }));

    return {
      output: { spaces, total: result.total, hasMore: result.has_more },
      message: `Found **${result.total}** space(s). Returned **${spaces.length}** result(s).`
    };
  })
  .build();

export let createSpace = SlateTool.create(spec, {
  name: 'Create Space',
  key: 'create_space',
  description: `Create a new space to organize Paperform forms into a group.`
})
  .input(
    z.object({
      name: z.string().describe('Name for the new space')
    })
  )
  .output(
    z.object({
      spaceId: z.string().describe('Unique space ID'),
      name: z.string().describe('Space name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let s = await client.createSpace({ name: ctx.input.name });

    return {
      output: { spaceId: String(s.id), name: s.name },
      message: `Created space **${s.name}**.`
    };
  })
  .build();

export let listSpaceForms = SlateTool.create(spec, {
  name: 'List Space Forms',
  key: 'list_space_forms',
  description: `List all forms within a specific space. Useful to view which forms are organized under a given space.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      spaceId: z.string().describe('The space ID'),
      limit: z
        .number()
        .optional()
        .describe('Number of results to return (max 100, default 20)'),
      skip: z.number().optional().describe('Number of results to skip')
    })
  )
  .output(
    z.object({
      forms: z.array(
        z.object({
          formId: z.string().describe('Unique form ID'),
          slug: z.string().describe('Form slug'),
          title: z.string().nullable().describe('Form title'),
          url: z.string().describe('Form sharing URL'),
          live: z.boolean().describe('Whether the form is accepting submissions'),
          submissionCount: z.number().describe('Total submissions')
        })
      ),
      total: z.number().describe('Total number of forms in the space'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listSpaceForms(ctx.input.spaceId, {
      limit: ctx.input.limit,
      skip: ctx.input.skip
    });

    let forms = result.results.map(f => ({
      formId: f.id,
      slug: f.slug,
      title: f.title,
      url: f.url,
      live: f.live,
      submissionCount: f.submission_count
    }));

    return {
      output: { forms, total: result.total, hasMore: result.has_more },
      message: `Found **${result.total}** form(s) in space. Returned **${forms.length}** result(s).`
    };
  })
  .build();
