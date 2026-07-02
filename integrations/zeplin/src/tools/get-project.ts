import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZeplinClient } from '../lib/client';
import { spec } from '../spec';

export let getProject = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description: `Retrieve detailed information about a specific Zeplin project including its metadata, resource counts, linked styleguide, and workflow status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to retrieve')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('Unique project identifier'),
      name: z.string().describe('Project name'),
      description: z.string().optional().describe('Project description'),
      platform: z.string().optional().describe('Target platform'),
      thumbnail: z.string().optional().describe('Project thumbnail URL'),
      status: z.string().optional().describe('Project status'),
      created: z.number().optional().describe('Creation timestamp'),
      updated: z.number().optional().describe('Last update timestamp'),
      numberOfMembers: z.number().optional().describe('Number of project members'),
      numberOfScreens: z.number().optional().describe('Number of screens'),
      numberOfComponents: z.number().optional().describe('Number of components'),
      numberOfConnectedComponents: z
        .number()
        .optional()
        .describe('Number of connected components'),
      numberOfTextStyles: z.number().optional().describe('Number of text styles'),
      numberOfColors: z.number().optional().describe('Number of colors'),
      numberOfSpacingTokens: z.number().optional().describe('Number of spacing tokens'),
      organizationId: z.string().optional().describe('Parent organization ID'),
      organizationName: z.string().optional().describe('Parent organization name'),
      linkedStyleguideId: z.string().optional().describe('Linked styleguide ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZeplinClient(ctx.auth.token);

    let p = (await client.getProject(ctx.input.projectId)) as any;

    return {
      output: {
        projectId: p.id,
        name: p.name,
        description: p.description,
        platform: p.platform,
        thumbnail: p.thumbnail,
        status: p.status,
        created: p.created,
        updated: p.updated,
        numberOfMembers: p.number_of_members,
        numberOfScreens: p.number_of_screens,
        numberOfComponents: p.number_of_components,
        numberOfConnectedComponents: p.number_of_connected_components,
        numberOfTextStyles: p.number_of_text_styles,
        numberOfColors: p.number_of_colors,
        numberOfSpacingTokens: p.number_of_spacing_tokens,
        organizationId: p.organization?.id,
        organizationName: p.organization?.name,
        linkedStyleguideId: p.linked_styleguide?.id
      },
      message: `Retrieved project **${p.name}** (${p.platform || 'unknown platform'}, ${p.status || 'unknown status'}).`
    };
  })
  .build();
