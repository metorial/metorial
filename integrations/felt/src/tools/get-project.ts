import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProject = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description:
    'Retrieve a Felt project and its maps. Call list_projects to discover project IDs, then use the returned map IDs with map tools.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({ projectId: z.string().describe('Project ID from list_projects') }))
  .output(
    z.object({
      projectId: z.string(),
      name: z.string(),
      visibility: z.string(),
      maxInheritedPermission: z.string(),
      maps: z.array(
        z.object({
          mapId: z.string(),
          title: z.string(),
          url: z.string(),
          publicAccess: z.string(),
          projectId: z.string(),
          folderId: z.string().nullable(),
          createdAt: z.string(),
          visitedAt: z.string().nullable(),
          thumbnailUrl: z.string().nullable()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let project = await new Client({ token: ctx.auth.token }).getProject(ctx.input.projectId);
    return {
      output: {
        projectId: project.id,
        name: project.name,
        visibility: project.visibility,
        maxInheritedPermission: project.max_inherited_permission,
        maps: project.maps.map(
          (map: {
            id: string;
            title: string;
            url: string;
            public_access: string;
            project_id: string;
            folder_id: string | null;
            created_at: string;
            visited_at: string | null;
            thumbnail_url: string | null;
          }) => ({
            mapId: map.id,
            title: map.title,
            url: map.url,
            publicAccess: map.public_access,
            projectId: map.project_id,
            folderId: map.folder_id,
            createdAt: map.created_at,
            visitedAt: map.visited_at,
            thumbnailUrl: map.thumbnail_url
          })
        )
      },
      message: `Retrieved project **${project.name}** with ${project.maps.length} map(s).`
    };
  })
  .build();
