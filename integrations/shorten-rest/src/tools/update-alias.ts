import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let destinationSchema = z.object({
  url: z.string().describe('The destination URL to redirect to.'),
  country: z.string().optional().describe('Two-letter country code for geo-targeting.'),
  os: z
    .string()
    .optional()
    .describe('Operating system for OS-targeting (e.g., "iOS", "Android", "Windows").')
});

let metatagSchema = z.object({
  name: z.string().describe('Meta tag name.'),
  content: z.string().describe('Meta tag content value.')
});

let snippetSchema = z.object({
  snippetId: z.string().describe('Snippet identifier for the tracking pixel provider.'),
  parameters: z
    .record(z.string(), z.string())
    .optional()
    .describe('Key-value parameters for the pixel provider.')
});

export let updateAlias = SlateTool.create(spec, {
  name: 'Update Short URL',
  key: 'update_alias',
  description: `Updates an existing shortened URL's destinations, meta tags, or tracking snippets. Provide only the fields you want to change; omitted fields remain unchanged.`,
  instructions: [
    'When updating destinations, provide the complete list of destinations (including unchanged ones), as the update replaces the entire destinations array.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      aliasName: z.string().describe('The alias path to update.'),
      domainName: z
        .string()
        .optional()
        .describe('The domain the alias belongs to. Defaults to "short.fyi" if omitted.'),
      destinations: z
        .array(destinationSchema)
        .optional()
        .describe('Updated list of destination URLs with optional geo/OS targeting.'),
      metatags: z
        .array(metatagSchema)
        .optional()
        .describe('Updated meta tags for social sharing.'),
      snippets: z.array(snippetSchema).optional().describe('Updated tracking pixel snippets.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful.'),
      aliasName: z.string().describe('The alias that was updated.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    await client.updateAlias({
      aliasName: ctx.input.aliasName,
      domainName: ctx.input.domainName,
      destinations: ctx.input.destinations,
      metatags: ctx.input.metatags,
      snippets: ctx.input.snippets?.map(s => ({
        id: s.snippetId,
        parameters: s.parameters
      }))
    });

    return {
      output: {
        success: true,
        aliasName: ctx.input.aliasName
      },
      message: `Successfully updated alias \`${ctx.input.aliasName}\`.`
    };
  })
  .build();
