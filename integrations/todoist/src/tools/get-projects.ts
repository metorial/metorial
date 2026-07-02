import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let projectSchema = z.object({
  projectId: z.string().describe('Project ID'),
  name: z.string().describe('Project name'),
  color: z.string().describe('Project color'),
  parentId: z.string().nullable().describe('Parent project ID'),
  order: z.number().describe('Display order'),
  commentCount: z.number().describe('Number of comments'),
  isShared: z.boolean().describe('Whether project is shared'),
  isFavorite: z.boolean().describe('Whether project is favorited'),
  isInboxProject: z.boolean().describe('Whether this is the inbox'),
  viewStyle: z.string().describe('View style'),
  url: z.string().describe('Project URL')
});

export let getProjects = SlateTool.create(spec, {
  name: 'Get Projects',
  key: 'get_projects',
  description: `List all projects or retrieve a specific project by ID. Includes project metadata, collaborator info, and hierarchy details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().optional().describe('Specific project ID to retrieve')
    })
  )
  .output(
    z.object({
      projects: z.array(projectSchema).describe('Retrieved projects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.projectId) {
      let project = await client.getProject(ctx.input.projectId);
      return {
        output: {
          projects: [
            {
              projectId: project.id,
              name: project.name,
              color: project.color,
              parentId: project.parentId,
              order: project.order,
              commentCount: project.commentCount,
              isShared: project.isShared,
              isFavorite: project.isFavorite,
              isInboxProject: project.isInboxProject,
              viewStyle: project.viewStyle,
              url: project.url
            }
          ]
        },
        message: `Retrieved project **"${project.name}"**.`
      };
    }

    let projects = await client.getProjects();
    return {
      output: {
        projects: projects.map(p => ({
          projectId: p.id,
          name: p.name,
          color: p.color,
          parentId: p.parentId,
          order: p.order,
          commentCount: p.commentCount,
          isShared: p.isShared,
          isFavorite: p.isFavorite,
          isInboxProject: p.isInboxProject,
          viewStyle: p.viewStyle,
          url: p.url
        }))
      },
      message: `Retrieved **${projects.length}** project(s).`
    };
  });
