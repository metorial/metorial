import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let memberSchema = z
  .object({
    assistantId: z.string().optional().describe('Assistant ID for this squad member'),
    assistant: z.any().optional().describe('Inline assistant configuration for this member'),
    assistantDestinations: z
      .array(
        z.object({
          type: z.string().optional().describe('Destination type (e.g. assistant)'),
          assistantName: z
            .string()
            .optional()
            .describe('Name of the assistant to transfer to'),
          message: z.string().optional().describe('Message to say when transferring'),
          description: z.string().optional().describe('Description of when to transfer')
        })
      )
      .optional()
      .describe('Transfer destinations from this member')
  })
  .describe('Squad member configuration');

export let manageSquad = SlateTool.create(spec, {
  name: 'Manage Squad',
  key: 'manage_squad',
  description: `Create, update, retrieve, or delete a Vapi squad. Squads orchestrate multiple assistants with context-preserving transfers, enabling workflows where specialized assistants handle different parts of a conversation.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'get', 'delete']).describe('Action to perform'),
      squadId: z.string().optional().describe('Squad ID (required for get, update, delete)'),
      name: z.string().optional().describe('Name of the squad'),
      members: z
        .array(memberSchema)
        .optional()
        .describe('Squad members with their assistants and transfer destinations')
    })
  )
  .output(
    z.object({
      squadId: z.string().optional().describe('ID of the squad'),
      name: z.string().optional().describe('Name of the squad'),
      members: z.any().optional().describe('Squad members configuration'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      deleted: z.boolean().optional().describe('Whether the squad was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { action, squadId } = ctx.input;

    if (action === 'get') {
      if (!squadId) throw new Error('squadId is required for get action');
      let squad = await client.getSquad(squadId);
      return {
        output: {
          squadId: squad.id,
          name: squad.name,
          members: squad.members,
          createdAt: squad.createdAt,
          updatedAt: squad.updatedAt
        },
        message: `Retrieved squad **${squad.name || squad.id}**.`
      };
    }

    if (action === 'delete') {
      if (!squadId) throw new Error('squadId is required for delete action');
      await client.deleteSquad(squadId);
      return {
        output: { squadId, deleted: true },
        message: `Deleted squad **${squadId}**.`
      };
    }

    let body: Record<string, any> = {};
    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.members) body.members = ctx.input.members;

    if (action === 'create') {
      if (!ctx.input.members || ctx.input.members.length === 0) {
        throw new Error('members are required for creating a squad');
      }
      let squad = await client.createSquad(body);
      return {
        output: {
          squadId: squad.id,
          name: squad.name,
          members: squad.members,
          createdAt: squad.createdAt,
          updatedAt: squad.updatedAt
        },
        message: `Created squad **${squad.name || squad.id}** with ${squad.members?.length || 0} member(s).`
      };
    }

    if (action === 'update') {
      if (!squadId) throw new Error('squadId is required for update action');
      let squad = await client.updateSquad(squadId, body);
      return {
        output: {
          squadId: squad.id,
          name: squad.name,
          members: squad.members,
          createdAt: squad.createdAt,
          updatedAt: squad.updatedAt
        },
        message: `Updated squad **${squad.name || squad.id}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
