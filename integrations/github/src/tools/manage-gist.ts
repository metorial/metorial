import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';

export let manageGist = SlateTool.create(spec, {
  name: 'Manage Gist',
  key: 'manage_gist',
  description: `Create, read, update, or delete GitHub Gists (code snippets).
- **create**: Create a new gist with one or more files.
- **get**: Retrieve a gist by ID.
- **update**: Update a gist's description or files.
- **delete**: Delete a gist.
- **list**: List gists for the authenticated user.`
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'update', 'delete', 'list'])
        .describe('Action to perform'),
      gistId: z.string().optional().describe('Gist ID (required for get, update, delete)'),
      description: z.string().optional().describe('Gist description (for create/update)'),
      public: z
        .boolean()
        .optional()
        .describe('Whether the gist is public (for create, default: false)'),
      files: z
        .record(
          z.string(),
          z.object({
            content: z.string().optional().describe('File content'),
            filename: z.string().optional().describe('New filename (for rename)')
          })
        )
        .optional()
        .describe(
          'Files to include. For create, content is required. For update, set value to null to delete a file.'
        ),
      perPage: z.number().optional().describe('Results per page (for list)'),
      page: z.number().optional().describe('Page number (for list)')
    })
  )
  .output(
    z.object({
      gistId: z.string().optional().describe('Gist ID'),
      htmlUrl: z.string().optional().describe('URL to the gist'),
      description: z.string().nullable().optional().describe('Gist description'),
      public: z.boolean().optional().describe('Whether the gist is public'),
      files: z
        .array(
          z.object({
            filename: z.string(),
            language: z.string().nullable(),
            size: z.number()
          })
        )
        .optional()
        .describe('Files in the gist'),
      gists: z
        .array(
          z.object({
            gistId: z.string(),
            htmlUrl: z.string(),
            description: z.string().nullable(),
            public: z.boolean(),
            fileCount: z.number(),
            createdAt: z.string(),
            updatedAt: z.string()
          })
        )
        .optional()
        .describe('List of gists'),
      deleted: z.boolean().optional().describe('Whether the gist was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });
    let { action, gistId } = ctx.input;

    if (action === 'list') {
      let gists = await client.listGists({
        perPage: ctx.input.perPage,
        page: ctx.input.page
      });
      return {
        output: {
          gists: gists.map((g: any) => ({
            gistId: g.id,
            htmlUrl: g.html_url,
            description: g.description,
            public: g.public,
            fileCount: Object.keys(g.files).length,
            createdAt: g.created_at,
            updatedAt: g.updated_at
          }))
        },
        message: `Found **${gists.length}** gists.`
      };
    }

    if (action === 'get') {
      if (!gistId) throw new Error('gistId is required for get action.');
      let gist = await client.getGist(gistId);
      return {
        output: {
          gistId: gist.id,
          htmlUrl: gist.html_url,
          description: gist.description,
          public: gist.public,
          files: Object.values(gist.files).map((f: any) => ({
            filename: f.filename,
            language: f.language,
            size: f.size
          }))
        },
        message: `Retrieved gist **${gist.id}** — ${gist.html_url}`
      };
    }

    if (action === 'create') {
      if (!ctx.input.files) throw new Error('files are required for create action.');
      let filesPayload: Record<string, { content: string }> = {};
      for (let [name, file] of Object.entries(ctx.input.files)) {
        let f = file as { content?: string; filename?: string };
        if (f.content) {
          filesPayload[name] = { content: f.content };
        }
      }
      let gist = await client.createGist({
        description: ctx.input.description,
        public: ctx.input.public,
        files: filesPayload
      });
      return {
        output: {
          gistId: gist.id,
          htmlUrl: gist.html_url,
          description: gist.description,
          public: gist.public,
          files: Object.values(gist.files).map((f: any) => ({
            filename: f.filename,
            language: f.language,
            size: f.size
          }))
        },
        message: `Created gist **${gist.id}** — ${gist.html_url}`
      };
    }

    if (action === 'update') {
      if (!gistId) throw new Error('gistId is required for update action.');
      let gist = await client.updateGist(gistId, {
        description: ctx.input.description,
        files: ctx.input.files as any
      });
      return {
        output: {
          gistId: gist.id,
          htmlUrl: gist.html_url,
          description: gist.description,
          public: gist.public,
          files: Object.values(gist.files).map((f: any) => ({
            filename: f.filename,
            language: f.language,
            size: f.size
          }))
        },
        message: `Updated gist **${gist.id}** — ${gist.html_url}`
      };
    }

    if (action === 'delete') {
      if (!gistId) throw new Error('gistId is required for delete action.');
      await client.deleteGist(gistId);
      return {
        output: { deleted: true },
        message: `Deleted gist **${gistId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
