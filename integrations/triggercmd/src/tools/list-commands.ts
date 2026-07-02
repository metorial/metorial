import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCommands = SlateTool.create(spec, {
  name: 'List Commands',
  key: 'list_commands',
  description: `Retrieve commands configured on your TRIGGERcmd computers. You can either list commands for a specific computer by providing its ID, or list all commands across all computers. Use the "List Computers" tool first to find computer IDs.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      computerId: z
        .string()
        .optional()
        .describe(
          'ID of a specific computer to list commands for. If omitted, returns commands from all computers.'
        )
    })
  )
  .output(
    z.object({
      commands: z
        .array(
          z.object({
            commandId: z.string().describe('Unique identifier of the command'),
            name: z.string().describe('Name of the command'),
            trigger: z.string().optional().describe('Trigger name for the command'),
            voice: z.string().optional().describe('Voice trigger phrase'),
            voiceReply: z.string().optional().describe('Voice reply after triggering'),
            allowParams: z
              .boolean()
              .optional()
              .describe('Whether the command accepts parameters'),
            computerRef: z
              .string()
              .optional()
              .describe('Reference to the computer this command belongs to'),
            runCount: z
              .number()
              .optional()
              .describe('Number of times this command has been run'),
            lastResult: z.string().optional().describe('Last execution result'),
            createdAt: z.string().optional().describe('When the command was created'),
            updatedAt: z.string().optional().describe('When the command was last updated')
          })
        )
        .describe('List of configured commands')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let commands = ctx.input.computerId
      ? await client.listCommandsForComputer(ctx.input.computerId)
      : await client.listAllCommands();

    let mapped = commands.map(c => ({
      commandId: c._id,
      name: c.name,
      trigger: c.trigger,
      voice: c.voice,
      voiceReply: c.voiceReply,
      allowParams: c.allowParams,
      computerRef: c.computer,
      runCount: c.runCount,
      lastResult: c.lastResult,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt
    }));

    let scope = ctx.input.computerId ? `computer ${ctx.input.computerId}` : 'all computers';

    return {
      output: {
        commands: mapped
      },
      message: `Found **${mapped.length}** command(s) on ${scope}: ${mapped.map(c => `**${c.name}**`).join(', ')}.`
    };
  })
  .build();
