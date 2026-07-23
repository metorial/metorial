import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlackClient } from '../lib/client';
import { slackServiceError } from '../lib/errors';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let arbitraryObjectSchema = z.record(z.string(), z.unknown());

let descriptionBlocksSchema = z.union([
  z.string(),
  arbitraryObjectSchema,
  z.array(arbitraryObjectSchema)
]);

export let createSlackList = SlateTool.create(spec, {
  name: 'Create Slack List',
  key: 'create_slack_list',
  description:
    'Create a Slack List for structured team tracking, such as an action register, project tracker, or task list.',
  instructions: [
    'Use schema to define the List columns. Each schema entry must be a Slack List column-definition object.',
    'Use descriptionBlocks for the List description; a plain string is converted to Slack rich text.',
    'Set todoMode only when the List should use Slack task-list behavior.',
    'Use the column IDs from the returned schema when creating or updating List items.'
  ],
  constraints: [
    'Slack Lists are available only on supported paid workspace plans.',
    'The exact supported column types and rich-text block shapes are determined by Slack.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(slackActionScopes.listsWrite)
  .input(
    z.object({
      name: z.string().trim().min(1).describe('Name of the Slack List'),
      descriptionBlocks: descriptionBlocksSchema
        .optional()
        .describe('List description as a string, one rich-text block, or rich-text blocks'),
      schema: z
        .array(arbitraryObjectSchema)
        .optional()
        .describe('Slack List column-definition objects'),
      todoMode: z.boolean().optional().describe('Whether to enable Slack task-list behavior')
    })
  )
  .output(
    z.object({
      listId: z.string().describe('ID of the created Slack List'),
      name: z.string().optional().describe('Created List name'),
      title: z.string().optional().describe('Created List title when returned by Slack'),
      description: z.unknown().optional().describe('Created List description'),
      schema: z
        .array(arbitraryObjectSchema)
        .optional()
        .describe('Created List schema, including column IDs when returned by Slack'),
      todoMode: z.boolean().optional().describe('Whether task-list behavior is enabled')
    })
  )
  .handleInvocation(async ctx => {
    ctx.input.schema?.forEach((column, index) => {
      if (Object.keys(column).length === 0) {
        throw slackServiceError(
          `schema[${index}] must be a non-empty column-definition object`
        );
      }
    });

    let list = await new SlackClient(ctx.auth.token).createSlackList({
      name: ctx.input.name,
      descriptionBlocks: ctx.input.descriptionBlocks,
      schema: ctx.input.schema,
      todoMode: ctx.input.todoMode
    });

    return {
      output: {
        listId: list.id,
        name: list.name ?? ctx.input.name,
        title: list.title,
        description: list.description,
        schema: list.schema ?? ctx.input.schema,
        todoMode: list.todo_mode ?? ctx.input.todoMode
      },
      message: `Created Slack List **${list.name ?? ctx.input.name}** (\`${list.id}\`).`
    };
  })
  .build();
