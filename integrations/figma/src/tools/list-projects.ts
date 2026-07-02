import { SlateTool } from 'slates';
import { z } from 'zod';
import { FigmaClient } from '../lib/client';
import { spec } from '../spec';

export let listTeamProjects = SlateTool.create(spec, {
  name: 'List Team Projects',
  key: 'list_team_projects',
  description: `List all projects within a Figma team. Returns project names and IDs that can be used to browse files within each project.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: z.string().describe('The ID of the Figma team')
    })
  )
  .output(
    z.object({
      teamName: z.string().optional().describe('Name of the team'),
      projects: z
        .array(
          z.object({
            projectId: z.string().describe('Unique project identifier'),
            name: z.string().describe('Project name')
          })
        )
        .describe('List of projects in the team')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FigmaClient(ctx.auth.token);
    let result = await client.getTeamProjects(ctx.input.teamId);

    let projects = (result.projects || []).map((p: any) => ({
      projectId: String(p.id),
      name: p.name
    }));

    return {
      output: {
        teamName: result.name,
        projects
      },
      message: `Found **${projects.length}** project(s) in team`
    };
  })
  .build();

export let listProjectFiles = SlateTool.create(spec, {
  name: 'List Project Files',
  key: 'list_project_files',
  description: `List all files within a Figma project. Returns file metadata including name, last modified date, and thumbnail URL.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('The ID of the Figma project'),
      branchData: z.boolean().optional().describe('Include branch metadata if true')
    })
  )
  .output(
    z.object({
      projectName: z.string().optional().describe('Name of the project'),
      files: z
        .array(
          z.object({
            fileKey: z.string().describe('Unique file key'),
            name: z.string().describe('File name'),
            thumbnailUrl: z.string().optional().describe('URL of the file thumbnail'),
            lastModified: z.string().describe('Last modified timestamp')
          })
        )
        .describe('List of files in the project')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FigmaClient(ctx.auth.token);
    let result = await client.getProjectFiles(ctx.input.projectId, {
      branchData: ctx.input.branchData
    });

    let files = (result.files || []).map((f: any) => ({
      fileKey: f.key,
      name: f.name,
      thumbnailUrl: f.thumbnail_url,
      lastModified: f.last_modified
    }));

    return {
      output: {
        projectName: result.name,
        files
      },
      message: `Found **${files.length}** file(s) in project`
    };
  })
  .build();
