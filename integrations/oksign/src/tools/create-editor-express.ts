import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createEditorExpress = SlateTool.create(spec, {
  name: 'Create EditorExpress',
  key: 'create_editor_express',
  description: `Launch an embedded OKSign document editor that allows users to interactively add and position signature and form fields on a document. After editing, use the "Get Form Descriptor" tool to retrieve the updated field configuration for use in the standard signing flow.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      documentId: z.string().describe('Document ID to open in the editor'),
      showAnonymousSigners: z
        .boolean()
        .optional()
        .describe('Show anonymous signer options in the editor'),
      showMeSigner: z.boolean().optional().describe('Show "me" signer option in the editor'),
      showSigningOptions: z
        .boolean()
        .optional()
        .describe('Show signing options panel in the editor'),
      showTeamMembers: z.boolean().optional().describe('Show team members list in the editor')
    })
  )
  .output(
    z.object({
      editorExpressDetails: z
        .any()
        .describe('EditorExpress session details including editor access URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createEditorExpress({
      docid: ctx.input.documentId,
      showAnonymousSigners: ctx.input.showAnonymousSigners,
      showMeSigner: ctx.input.showMeSigner,
      showSigningOptions: ctx.input.showSigningOptions,
      showTeammembers: ctx.input.showTeamMembers
    });

    return {
      output: { editorExpressDetails: result },
      message: `EditorExpress session created for document \`${ctx.input.documentId}\`.`
    };
  })
  .build();

export let getEditorExpress = SlateTool.create(spec, {
  name: 'Get EditorExpress',
  key: 'get_editor_express',
  description: `Retrieve configuration and details of an existing EditorExpress session.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      editorExpressTokenId: z.string().describe('EditorExpress token ID')
    })
  )
  .output(
    z.object({
      editorExpressDetails: z.any().describe('EditorExpress session configuration and status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let editorExpressDetails = await client.retrieveEditorExpress(
      ctx.input.editorExpressTokenId
    );

    return {
      output: { editorExpressDetails },
      message: `EditorExpress session \`${ctx.input.editorExpressTokenId}\` retrieved.`
    };
  })
  .build();

export let removeEditorExpress = SlateTool.create(spec, {
  name: 'Remove EditorExpress',
  key: 'remove_editor_express',
  description: `Delete an EditorExpress session from the OKSign platform.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      editorExpressTokenId: z.string().describe('EditorExpress token ID to remove')
    })
  )
  .output(
    z.object({
      removed: z.boolean().describe('Whether the session was removed successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.removeEditorExpress(ctx.input.editorExpressTokenId);

    return {
      output: { removed: true },
      message: `EditorExpress session \`${ctx.input.editorExpressTokenId}\` removed.`
    };
  })
  .build();
