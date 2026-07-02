import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let fileSchema = z.object({
  fileId: z.string().describe('Unique ID of the file'),
  name: z.string().describe('Name of the file'),
  projectId: z.string().optional().describe('ID of the project this file belongs to'),
  createdAt: z.string().optional().describe('When the file was created'),
  modifiedAt: z.string().optional().describe('When the file was last modified'),
  isShared: z.boolean().optional().describe('Whether the file is a shared library')
});

export let listFilesTool = SlateTool.create(spec, {
  name: 'List Files',
  key: 'list_files',
  description: `List design files by project, recent files by team, shared library files, or search files by name. Use **source** to choose the listing mode.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      source: z
        .enum(['project', 'recent', 'shared', 'search'])
        .describe(
          'How to list files: "project" lists files in a project, "recent" lists recently accessed files in a team, "shared" lists shared libraries in a team, "search" searches files by name in a team'
        ),
      projectId: z.string().optional().describe('Project ID (required for "project" source)'),
      teamId: z
        .string()
        .optional()
        .describe('Team ID (required for "recent", "shared", "search" sources)'),
      searchTerm: z
        .string()
        .optional()
        .describe('Search query (optional, for "search" source)')
    })
  )
  .output(
    z.object({
      files: z.array(fileSchema).describe('List of files')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    let { source, projectId, teamId, searchTerm } = ctx.input;
    let rawFiles: any[];

    switch (source) {
      case 'project': {
        if (!projectId) throw new Error('projectId is required for project source');
        rawFiles = await client.getProjectFiles(projectId);
        break;
      }
      case 'recent': {
        if (!teamId) throw new Error('teamId is required for recent source');
        rawFiles = await client.getTeamRecentFiles(teamId);
        break;
      }
      case 'shared': {
        if (!teamId) throw new Error('teamId is required for shared source');
        rawFiles = await client.getTeamSharedFiles(teamId);
        break;
      }
      case 'search': {
        if (!teamId) throw new Error('teamId is required for search source');
        rawFiles = await client.searchFiles(teamId, searchTerm);
        break;
      }
    }

    let files = rawFiles.map((f: any) => ({
      fileId: f.id,
      name: f.name,
      projectId: f['project-id'] ?? f.projectId,
      createdAt: f['created-at'] ?? f.createdAt,
      modifiedAt: f['modified-at'] ?? f.modifiedAt,
      isShared: f['is-shared'] ?? f.isShared
    }));

    return {
      output: { files },
      message: `Found **${files.length}** file(s).`
    };
  })
  .build();
