import { SlateTool } from 'slates';
import { z } from 'zod';
import { BugherdClient } from '../lib/client';
import { spec } from '../spec';

let memberSchema = z.object({
  userId: z.number().describe('User ID'),
  email: z.string().describe('User email'),
  displayName: z.string().describe('User display name')
});

export let getProject = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description: `Retrieve detailed information about a specific BugHerd project, including its members and guests.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.number().describe('The ID of the project to retrieve')
    })
  )
  .output(
    z.object({
      projectId: z.number().describe('Project ID'),
      name: z.string().describe('Project name'),
      devurl: z.string().describe('Website URL associated with the project'),
      isActive: z.boolean().describe('Whether the project is active'),
      isPublic: z.boolean().describe('Whether public feedback is enabled'),
      hasCustomColumns: z.boolean().describe('Whether the project has custom Kanban columns'),
      guestsSeeGuests: z.boolean().describe('Whether guests can see other guests'),
      members: z.array(memberSchema).describe('Team members on this project'),
      guests: z.array(memberSchema).describe('Guests/clients on this project')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BugherdClient(ctx.auth.token);
    let p = await client.getProject(ctx.input.projectId);

    let mapUsers = (users?: Array<{ id: number; email: string; display_name: string }>) =>
      (users ?? []).map(u => ({
        userId: u.id,
        email: u.email,
        displayName: u.display_name
      }));

    return {
      output: {
        projectId: p.id,
        name: p.name,
        devurl: p.devurl,
        isActive: p.is_active,
        isPublic: p.is_public,
        hasCustomColumns: p.has_custom_columns,
        guestsSeeGuests: p.guests_see_guests,
        members: mapUsers(p.members),
        guests: mapUsers(p.guests)
      },
      message: `Retrieved project **${p.name}** (ID: ${p.id}) with ${(p.members ?? []).length} member(s) and ${(p.guests ?? []).length} guest(s).`
    };
  })
  .build();
