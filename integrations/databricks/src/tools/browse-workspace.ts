import { SlateTool } from 'slates';
import { z } from 'zod';
import { DatabricksClient } from '../lib/client';
import { spec } from '../spec';

export let browseWorkspace = SlateTool.create(spec, {
  name: 'Browse Workspace',
  key: 'browse_workspace',
  description: `List notebooks, folders, and other objects in a workspace directory. Can also get the status (metadata) of a specific workspace object.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      path: z
        .string()
        .describe('Workspace path to list or get status for (e.g., "/Users/me@example.com")')
    })
  )
  .output(
    z.object({
      objects: z
        .array(
          z.object({
            objectType: z.string().describe('Type: NOTEBOOK, DIRECTORY, LIBRARY, FILE, REPO'),
            path: z.string().describe('Full workspace path'),
            language: z
              .string()
              .optional()
              .describe('Language of the notebook (PYTHON, SCALA, SQL, R)'),
            objectId: z.string().optional().describe('Unique object ID')
          })
        )
        .describe('Items in the workspace directory')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DatabricksClient({
      workspaceUrl: ctx.config.workspaceUrl,
      token: ctx.auth.token
    });

    let objects = await client.listWorkspace(ctx.input.path);

    let mapped = objects.map((o: any) => ({
      objectType: o.object_type ?? 'UNKNOWN',
      path: o.path ?? '',
      language: o.language,
      objectId: o.object_id ? String(o.object_id) : undefined
    }));

    return {
      output: { objects: mapped },
      message: `Found **${mapped.length}** item(s) at \`${ctx.input.path}\`.`
    };
  })
  .build();
