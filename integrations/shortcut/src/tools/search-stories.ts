import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let searchResultStorySchema = z.object({
  storyId: z.number().describe('Public ID of the story'),
  name: z.string().describe('Name of the story'),
  storyType: z.string().describe('Type: feature, bug, or chore'),
  appUrl: z.string().describe('URL to view the story'),
  archived: z.boolean().describe('Whether the story is archived'),
  started: z.boolean().describe('Whether the story is started'),
  completed: z.boolean().describe('Whether the story is completed'),
  workflowStateId: z.number().describe('Current workflow state ID'),
  epicId: z.number().nullable().describe('Epic ID if assigned'),
  iterationId: z.number().nullable().describe('Iteration ID if assigned'),
  estimate: z.number().nullable().describe('Story point estimate'),
  deadline: z.string().nullable().describe('Deadline timestamp'),
  ownerIds: z.array(z.string()).describe('UUIDs of story owners'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let searchStories = SlateTool.create(spec, {
  name: 'Search Stories',
  key: 'search_stories',
  description: `Searches for stories using Shortcut's query syntax. Supports operators like \`state:\`, \`owner:\`, \`label:\`, \`epic:\`, \`iteration:\`, \`type:\`, \`is:started\`, \`is:completed\`, \`is:blocked\`, \`is:archived\`, \`estimate:\`, \`created:\`, \`updated:\`, and free text.`,
  instructions: [
    'Use Shortcut search operators to build queries. Examples: `type:bug is:started`, `owner:john label:urgent`, `epic:"Sprint 5" state:"In Progress"`.',
    'Combine multiple operators with spaces for AND logic.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query using Shortcut search syntax'),
      pageSize: z.number().optional().describe('Number of results to return (default 25)'),
      nextCursor: z
        .string()
        .optional()
        .describe('Pagination cursor from a previous search result')
    })
  )
  .output(
    z.object({
      stories: z.array(searchResultStorySchema).describe('Matching stories'),
      nextCursor: z
        .string()
        .nullable()
        .describe('Cursor for fetching the next page of results'),
      totalCount: z.number().nullable().describe('Total matching results if available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.searchStories(
      ctx.input.query,
      ctx.input.pageSize,
      ctx.input.nextCursor
    );

    let stories = (result.data || []).map((s: any) => ({
      storyId: s.id,
      name: s.name,
      storyType: s.story_type,
      appUrl: s.app_url,
      archived: s.archived,
      started: s.started,
      completed: s.completed,
      workflowStateId: s.workflow_state_id,
      epicId: s.epic_id ?? null,
      iterationId: s.iteration_id ?? null,
      estimate: s.estimate ?? null,
      deadline: s.deadline ?? null,
      ownerIds: s.owner_ids || [],
      updatedAt: s.updated_at
    }));

    return {
      output: {
        stories,
        nextCursor: result.next ?? null,
        totalCount: result.total ?? null
      },
      message: `Found **${stories.length}** stories matching query \`${ctx.input.query}\`${result.next ? ' (more results available)' : ''}`
    };
  })
  .build();
