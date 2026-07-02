import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClassroomClient } from '../lib/client';
import { googleClassroomActionScopes } from '../scopes';
import { spec } from '../spec';

let topicSchema = z.object({
  topicId: z.string().optional().describe('ID of the topic'),
  courseId: z.string().optional().describe('Course ID'),
  name: z.string().optional().describe('Name of the topic'),
  updateTime: z.string().optional().describe('When the topic was last updated')
});

export let manageTopics = SlateTool.create(spec, {
  name: 'Manage Topics',
  key: 'manage_topics',
  description: `Create, list, update, or delete topics in a Google Classroom course. Topics organize coursework and materials within a course.`,
  tags: {
    destructive: false
  }
})
  .scopes(googleClassroomActionScopes.manageTopics)
  .input(
    z.object({
      courseId: z.string().describe('ID of the course'),
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('The action to perform'),
      topicId: z.string().optional().describe('Topic ID (required for get, update, delete)'),
      name: z
        .string()
        .optional()
        .describe('Name of the topic (required for create, optional for update)'),
      pageSize: z.number().optional().describe('Maximum results to return (for list)'),
      pageToken: z.string().optional().describe('Token for next page (for list)')
    })
  )
  .output(
    z.object({
      topic: topicSchema.optional().describe('The topic'),
      topics: z.array(topicSchema).optional().describe('List of topics'),
      nextPageToken: z.string().optional().describe('Token for the next page'),
      success: z.boolean().optional().describe('Whether the action succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClassroomClient({ token: ctx.auth.token });
    let { courseId, action, topicId, name } = ctx.input;

    let mapTopic = (t: any) => ({
      topicId: t.topicId,
      courseId: t.courseId,
      name: t.name,
      updateTime: t.updateTime
    });

    if (action === 'list') {
      let result = await client.listTopics(courseId, ctx.input.pageSize, ctx.input.pageToken);
      let topics = (result.topic || []).map(mapTopic);
      return {
        output: { topics, nextPageToken: result.nextPageToken, success: true },
        message: `Found **${topics.length}** topic(s).`
      };
    }

    if (action === 'get') {
      if (!topicId) throw new Error('topicId is required');
      let result = await client.getTopic(courseId, topicId);
      return {
        output: { topic: mapTopic(result), success: true },
        message: `Retrieved topic **${result.name}**.`
      };
    }

    if (action === 'create') {
      if (!name) throw new Error('name is required for creating a topic');
      let result = await client.createTopic(courseId, name);
      return {
        output: { topic: mapTopic(result), success: true },
        message: `Created topic **${result.name}**.`
      };
    }

    if (action === 'update') {
      if (!topicId) throw new Error('topicId is required');
      if (!name) throw new Error('name is required for updating a topic');
      let result = await client.updateTopic(courseId, topicId, name);
      return {
        output: { topic: mapTopic(result), success: true },
        message: `Updated topic to **${result.name}**.`
      };
    }

    if (action === 'delete') {
      if (!topicId) throw new Error('topicId is required');
      await client.deleteTopic(courseId, topicId);
      return {
        output: { success: true },
        message: `Deleted topic \`${topicId}\`.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
