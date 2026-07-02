import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { netlifyServiceError } from '../lib/errors';
import { spec } from '../spec';

let snippetOutputSchema = z.object({
  snippetId: z.string().describe('Unique snippet identifier'),
  title: z.string().describe('Snippet title'),
  general: z.string().optional().describe('Code injected on all pages'),
  generalPosition: z
    .string()
    .optional()
    .describe('Injection position for general code (head or footer)'),
  goal: z.string().optional().describe('Code injected on form thank-you pages'),
  goalPosition: z
    .string()
    .optional()
    .describe('Injection position for goal code (head or footer)'),
  siteId: z.string().optional().describe('Site this snippet belongs to')
});

let mapSnippet = (snippet: any) => {
  if (!snippet || snippet.id === undefined || snippet.id === null) {
    throw netlifyServiceError('Netlify did not return a snippet resource');
  }

  return {
    snippetId: String(snippet.id),
    title: snippet.title || '',
    general: snippet.general ?? undefined,
    generalPosition: snippet.general_position ?? undefined,
    goal: snippet.goal ?? undefined,
    goalPosition: snippet.goal_position ?? undefined,
    siteId: snippet.site_id ?? undefined
  };
};

let findSnippetByTitle = async (client: Client, siteId: string, title: string) => {
  let snippets = await client.listSnippets(siteId);
  return snippets.find((snippet: any) => snippet?.title === title);
};

export let listSnippets = SlateTool.create(spec, {
  name: 'List Snippets',
  key: 'list_snippets',
  description: `List all JavaScript/HTML code snippets injected into a Netlify site's pages. Shows both general page snippets and form thank-you page snippets.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      siteId: z.string().describe('The site ID to list snippets for')
    })
  )
  .output(
    z.object({
      snippets: z.array(snippetOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let snippets = await client.listSnippets(ctx.input.siteId);

    let mapped = snippets.map(mapSnippet);

    return {
      output: { snippets: mapped },
      message: `Found **${mapped.length}** snippet(s) for site **${ctx.input.siteId}**.`
    };
  })
  .build();

export let createSnippet = SlateTool.create(spec, {
  name: 'Create Snippet',
  key: 'create_snippet',
  description: `Add a JavaScript or HTML snippet to a Netlify site. Snippets can be injected into the head or footer of all pages, and optionally into form thank-you pages.`
})
  .input(
    z.object({
      siteId: z.string().describe('The site ID to add the snippet to'),
      title: z.string().describe('Title for the snippet'),
      general: z.string().describe('Code to inject on all pages'),
      generalPosition: z.enum(['head', 'footer']).describe('Where to inject the general code'),
      goal: z.string().optional().describe('Code to inject on form thank-you pages'),
      goalPosition: z
        .enum(['head', 'footer'])
        .optional()
        .describe('Where to inject the goal code')
    })
  )
  .output(snippetOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: any = {
      title: ctx.input.title,
      general: ctx.input.general,
      general_position: ctx.input.generalPosition
    };
    if (ctx.input.goal) body.goal = ctx.input.goal;
    if (ctx.input.goalPosition) body.goal_position = ctx.input.goalPosition;

    let snippet =
      (await client.createSnippet(ctx.input.siteId, body)) ??
      (await findSnippetByTitle(client, ctx.input.siteId, ctx.input.title));

    return {
      output: mapSnippet(snippet),
      message: `Created snippet **${ctx.input.title}** on site **${ctx.input.siteId}**.`
    };
  })
  .build();

export let updateSnippet = SlateTool.create(spec, {
  name: 'Update Snippet',
  key: 'update_snippet',
  description: `Update an existing code snippet on a Netlify site. Modify the title, code content, or injection position.`
})
  .input(
    z.object({
      siteId: z.string().describe('The site ID the snippet belongs to'),
      snippetId: z.string().describe('The snippet ID to update'),
      title: z.string().optional().describe('New title'),
      general: z.string().optional().describe('New code for all pages'),
      generalPosition: z
        .enum(['head', 'footer'])
        .optional()
        .describe('New injection position for general code'),
      goal: z.string().optional().describe('New code for thank-you pages'),
      goalPosition: z
        .enum(['head', 'footer'])
        .optional()
        .describe('New injection position for goal code')
    })
  )
  .output(snippetOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, any> = {};
    if (ctx.input.title !== undefined) body.title = ctx.input.title;
    if (ctx.input.general !== undefined) body.general = ctx.input.general;
    if (ctx.input.generalPosition !== undefined)
      body.general_position = ctx.input.generalPosition;
    if (ctx.input.goal !== undefined) body.goal = ctx.input.goal;
    if (ctx.input.goalPosition !== undefined) body.goal_position = ctx.input.goalPosition;

    let snippet =
      (await client.updateSnippet(ctx.input.siteId, ctx.input.snippetId, body)) ??
      (await client.getSnippet(ctx.input.siteId, ctx.input.snippetId));

    return {
      output: mapSnippet(snippet),
      message: `Updated snippet **${ctx.input.snippetId}** on site **${ctx.input.siteId}**.`
    };
  })
  .build();

export let deleteSnippet = SlateTool.create(spec, {
  name: 'Delete Snippet',
  key: 'delete_snippet',
  description: `Remove a code snippet from a Netlify site.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      siteId: z.string().describe('The site ID the snippet belongs to'),
      snippetId: z.string().describe('The snippet ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the snippet was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteSnippet(ctx.input.siteId, ctx.input.snippetId);

    return {
      output: { deleted: true },
      message: `Deleted snippet **${ctx.input.snippetId}** from site **${ctx.input.siteId}**.`
    };
  })
  .build();
