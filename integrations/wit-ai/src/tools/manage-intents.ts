import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let intentSchema = z.object({
  intentId: z.string().optional().describe('Unique intent ID'),
  name: z.string().describe('Intent name'),
  entities: z
    .array(
      z.object({
        entityId: z.string().optional().describe('Entity ID'),
        name: z.string().optional().describe('Entity name')
      })
    )
    .optional()
    .describe('Entities associated with the intent')
});

export let listIntents = SlateTool.create(spec, {
  name: 'List Intents',
  key: 'list_intents',
  description: `List all intents configured in the Wit.ai app. Returns intent names and IDs. Use this to explore available intents before analyzing text.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      intents: z.array(intentSchema).describe('List of intents')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let intents = await client.listIntents();

    return {
      output: {
        intents: (intents ?? []).map((i: Record<string, unknown>) => ({
          intentId: i.id,
          name: i.name
        }))
      },
      message: `Found **${(intents ?? []).length}** intent(s).`
    };
  })
  .build();

export let getIntent = SlateTool.create(spec, {
  name: 'Get Intent',
  key: 'get_intent',
  description: `Get detailed information about a specific intent, including its associated entities.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      intentName: z.string().describe('Name of the intent to retrieve')
    })
  )
  .output(intentSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let intent = await client.getIntent(ctx.input.intentName);

    return {
      output: {
        intentId: intent.id,
        name: intent.name,
        entities: (intent.entities ?? []).map((e: Record<string, unknown>) => ({
          entityId: e.id,
          name: e.name
        }))
      },
      message: `Retrieved intent **${intent.name}**.`
    };
  })
  .build();

export let createIntent = SlateTool.create(spec, {
  name: 'Create Intent',
  key: 'create_intent',
  description: `Create a new intent in the Wit.ai app. After creation, train the intent by adding utterances.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the new intent')
    })
  )
  .output(intentSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let intent = await client.createIntent(ctx.input.name);

    return {
      output: {
        intentId: intent.id,
        name: intent.name
      },
      message: `Created intent **${intent.name}**.`
    };
  })
  .build();

export let deleteIntent = SlateTool.create(spec, {
  name: 'Delete Intent',
  key: 'delete_intent',
  description: `Permanently delete an intent from the Wit.ai app. This cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      intentName: z.string().describe('Name of the intent to delete')
    })
  )
  .output(
    z.object({
      deleted: z.string().describe('Name of the deleted intent')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    await client.deleteIntent(ctx.input.intentName);

    return {
      output: {
        deleted: ctx.input.intentName
      },
      message: `Deleted intent **${ctx.input.intentName}**.`
    };
  })
  .build();
