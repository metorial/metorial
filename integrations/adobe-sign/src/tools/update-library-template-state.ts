import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateLibraryTemplateState = SlateTool.create(spec, {
  name: 'Update Library Template State',
  key: 'update_library_template_state',
  description: `Update the state of an Adobe Acrobat Sign library template, including activating, returning to authoring, or removing a template.`,
  instructions: ['Use REMOVED to retire a suite-owned or obsolete template.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      libraryDocumentId: z.string().describe('ID of the library template to update'),
      state: z
        .enum(['AUTHORING', 'ACTIVE', 'REMOVED'])
        .describe('Target state for the library template')
    })
  )
  .output(
    z.object({
      libraryDocumentId: z.string().describe('ID of the updated library template'),
      state: z.string().describe('Requested new state')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiBaseUrl: ctx.auth.apiBaseUrl,
      shard: ctx.auth.shard
    });

    await client.updateLibraryDocumentState(ctx.input.libraryDocumentId, ctx.input.state);

    return {
      output: {
        libraryDocumentId: ctx.input.libraryDocumentId,
        state: ctx.input.state
      },
      message: `Library template \`${ctx.input.libraryDocumentId}\` state update requested: **${ctx.input.state}**.`
    };
  });
