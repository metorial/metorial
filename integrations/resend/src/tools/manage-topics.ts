import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let topicOutputSchema = z.object({
  topicId: z.string().describe('Topic ID.'),
  name: z.string().describe('Topic name.'),
  description: z.string().optional().nullable().describe('Topic description.'),
  defaultSubscription: z
    .enum(['opt_in', 'opt_out'])
    .optional()
    .describe('Default subscription for new contacts.'),
  visibility: z.string().optional().describe('Topic visibility.'),
  createdAt: z.string().optional().describe('Creation timestamp.')
});

export let createTopic = SlateTool.create(spec, {
  name: 'Create Topic',
  key: 'create_topic',
  description: `Create a Resend topic for contact subscription preferences.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Topic name. Max 50 characters.'),
      description: z.string().optional().describe('Topic description. Max 200 characters.'),
      defaultSubscription: z
        .enum(['opt_in', 'opt_out'])
        .optional()
        .describe('Default subscription status for new contacts.')
    })
  )
  .output(
    z.object({
      topicId: z.string().describe('ID of the created topic.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createTopic({
      name: ctx.input.name,
      description: ctx.input.description,
      defaultSubscription: ctx.input.defaultSubscription
    });

    return {
      output: { topicId: result.id },
      message: `Topic **${ctx.input.name}** created with ID \`${result.id}\`.`
    };
  })
  .build();

export let getTopic = SlateTool.create(spec, {
  name: 'Get Topic',
  key: 'get_topic',
  description: `Retrieve a Resend topic by ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      topicId: z.string().describe('Topic ID.')
    })
  )
  .output(topicOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let topic = await client.getTopic(ctx.input.topicId);

    return {
      output: {
        topicId: topic.id,
        name: topic.name,
        description: topic.description,
        defaultSubscription: topic.default_subscription,
        visibility: topic.visibility,
        createdAt: topic.created_at
      },
      message: `Topic **${topic.name}** retrieved.`
    };
  })
  .build();

export let updateTopic = SlateTool.create(spec, {
  name: 'Update Topic',
  key: 'update_topic',
  description: `Update a Resend topic name or description.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      topicId: z.string().describe('Topic ID.'),
      name: z.string().optional().describe('Updated topic name.'),
      description: z.string().optional().describe('Updated topic description.')
    })
  )
  .output(
    z.object({
      topicId: z.string().describe('ID of the updated topic.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.updateTopic(ctx.input.topicId, {
      name: ctx.input.name,
      description: ctx.input.description
    });

    return {
      output: { topicId: result.id },
      message: `Topic \`${result.id}\` updated.`
    };
  })
  .build();

export let listTopics = SlateTool.create(spec, {
  name: 'List Topics',
  key: 'list_topics',
  description: `List Resend topics in the authenticated team.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Max results (default 20, max 100).'),
      after: z.string().optional().describe('Cursor for forward pagination.'),
      before: z.string().optional().describe('Cursor for backward pagination.')
    })
  )
  .output(
    z.object({
      topics: z.array(topicOutputSchema).describe('List of topics.'),
      hasMore: z.boolean().describe('Whether more results are available.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listTopics({
      limit: ctx.input.limit,
      after: ctx.input.after,
      before: ctx.input.before
    });
    let topics = (result.data || []).map((topic: any) => ({
      topicId: topic.id,
      name: topic.name,
      description: topic.description,
      defaultSubscription: topic.default_subscription,
      visibility: topic.visibility,
      createdAt: topic.created_at
    }));

    return {
      output: {
        topics,
        hasMore: result.has_more ?? false
      },
      message: `Found **${topics.length}** topic(s).`
    };
  })
  .build();

export let deleteTopic = SlateTool.create(spec, {
  name: 'Delete Topic',
  key: 'delete_topic',
  description: `Delete a Resend topic. Contact records are not deleted.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      topicId: z.string().describe('Topic ID.')
    })
  )
  .output(
    z.object({
      topicId: z.string().describe('Deleted topic ID.'),
      deleted: z.boolean().describe('Whether the topic was deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deleteTopic(ctx.input.topicId);

    return {
      output: {
        topicId: result.id,
        deleted: result.deleted ?? true
      },
      message: `Topic \`${result.id}\` has been **deleted**.`
    };
  })
  .build();
