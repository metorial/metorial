import { SlateTool } from 'slates';
import { z } from 'zod';
import { DatabricksClient } from '../lib/client';
import { spec } from '../spec';

export let manageNotebook = SlateTool.create(spec, {
  name: 'Manage Notebook',
  key: 'manage_notebook',
  description: `Import, export, or delete notebooks and create workspace directories.
Use **import** to upload notebook content (base64-encoded). Use **export** to download a notebook. Use **delete** to remove a notebook or folder.`,
  instructions: [
    'Content must be base64-encoded when importing.',
    'Supported formats: SOURCE, HTML, JUPYTER, DBC.',
    'Supported languages: PYTHON, SCALA, SQL, R.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['import', 'export', 'delete', 'mkdirs']).describe('Action to perform'),
      path: z.string().describe('Workspace path for the notebook or directory'),
      content: z.string().optional().describe('Base64-encoded content (required for import)'),
      language: z
        .enum(['PYTHON', 'SCALA', 'SQL', 'R'])
        .optional()
        .describe('Notebook language (for import)'),
      format: z
        .enum(['SOURCE', 'HTML', 'JUPYTER', 'DBC'])
        .optional()
        .describe('Import/export format (default: SOURCE)'),
      overwrite: z.boolean().optional().describe('Overwrite existing notebook on import'),
      recursive: z.boolean().optional().describe('Recursively delete a directory')
    })
  )
  .output(
    z.object({
      path: z.string().describe('The workspace path acted upon'),
      content: z.string().optional().describe('Base64-encoded content (for export)'),
      fileType: z.string().optional().describe('File type of the exported object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DatabricksClient({
      workspaceUrl: ctx.config.workspaceUrl,
      token: ctx.auth.token
    });

    switch (ctx.input.action) {
      case 'import': {
        if (!ctx.input.content) throw new Error('content is required for import');
        await client.importNotebook({
          path: ctx.input.path,
          content: ctx.input.content,
          language: ctx.input.language,
          format: ctx.input.format,
          overwrite: ctx.input.overwrite
        });
        return {
          output: { path: ctx.input.path },
          message: `Imported notebook to \`${ctx.input.path}\`.`
        };
      }
      case 'export': {
        let result = await client.exportNotebook(ctx.input.path, ctx.input.format);
        return {
          output: {
            path: ctx.input.path,
            content: result.content,
            fileType: result.file_type
          },
          message: `Exported notebook from \`${ctx.input.path}\`.`
        };
      }
      case 'delete': {
        await client.deleteWorkspaceItem(ctx.input.path, ctx.input.recursive);
        return {
          output: { path: ctx.input.path },
          message: `Deleted \`${ctx.input.path}\`${ctx.input.recursive ? ' (recursive)' : ''}.`
        };
      }
      case 'mkdirs': {
        await client.mkdirsWorkspace(ctx.input.path);
        return {
          output: { path: ctx.input.path },
          message: `Created directory \`${ctx.input.path}\`.`
        };
      }
    }
  })
  .build();
