import { SlateTool } from 'slates';
import { z } from 'zod';
import { EgnyteClient } from '../lib/client';
import { spec } from '../spec';

export let setMetadataTool = SlateTool.create(spec, {
  name: 'Set Metadata',
  key: 'set_metadata',
  description: `Set custom metadata key-value pairs on a file or folder in Egnyte within a specific namespace. Multiple properties can be set at once. Setting a value to null removes that property. Works with files (by group ID) or folders (by folder ID).`,
  instructions: [
    'Use file group ID or folder ID, not file paths',
    'Setting a property value to null will remove that property',
    'The namespace must already exist — create namespaces through the Egnyte admin UI'
  ]
})
  .input(
    z.object({
      targetType: z
        .enum(['file', 'folder'])
        .describe('Whether the target is a file or folder'),
      targetId: z.string().describe('Group ID for files or folder ID for folders'),
      namespace: z.string().describe('Metadata namespace name'),
      properties: z
        .record(z.string(), z.unknown())
        .describe('Key-value pairs to set (set a value to null to remove it)')
    })
  )
  .output(
    z.object({
      targetType: z.string(),
      targetId: z.string(),
      namespace: z.string(),
      updated: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new EgnyteClient({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    if (ctx.input.targetType === 'file') {
      await client.setFileMetadataProperties(
        ctx.input.targetId,
        ctx.input.namespace,
        ctx.input.properties
      );
    } else {
      await client.setFolderMetadataProperties(
        ctx.input.targetId,
        ctx.input.namespace,
        ctx.input.properties
      );
    }

    return {
      output: {
        targetType: ctx.input.targetType,
        targetId: ctx.input.targetId,
        namespace: ctx.input.namespace,
        updated: true
      },
      message: `Set ${Object.keys(ctx.input.properties).length} metadata property(ies) on ${ctx.input.targetType} **${ctx.input.targetId}** in namespace "${ctx.input.namespace}"`
    };
  })
  .build();
