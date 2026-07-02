import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addMember = SlateTool.create(spec, {
  name: 'Add Member',
  key: 'add_member',
  description: `Add a new team member (agent or sub-manager) to GoDial. Members are assigned to one or more teams and given a role. **Sub Managers** can access the Web Dashboard and manage their team. **Agents** can only access the Team app for dialing. Use the **List Teams** tool to get available team IDs.`,
  instructions: [
    'The role must be either "SubManager" or "Agent".',
    'At least one team ID is required in the teamsId array.'
  ]
})
  .input(
    z.object({
      teamsId: z.array(z.string()).describe('Team ID(s) to assign the member to'),
      name: z.string().describe('Full name of the member'),
      username: z.string().describe('Login username for the member'),
      password: z.string().describe('Login password for the member'),
      role: z
        .enum(['SubManager', 'Agent'])
        .describe('Role of the member: "SubManager" or "Agent"'),
      email: z.string().optional().describe('Email address of the member')
    })
  )
  .output(
    z.object({
      member: z.any().describe('The created member record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.addMember({
      teamsId: ctx.input.teamsId,
      name: ctx.input.name,
      username: ctx.input.username,
      password: ctx.input.password,
      role: ctx.input.role,
      email: ctx.input.email
    });

    return {
      output: { member: result },
      message: `Member **${ctx.input.name}** added as **${ctx.input.role}**.`
    };
  })
  .build();
