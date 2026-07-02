import { SlateTool } from 'slates';
import { z } from 'zod';
import { ApifyClient } from '../lib/client';
import { spec } from '../spec';

export let manageActor = SlateTool.create(spec, {
  name: 'Manage Actor',
  key: 'manage_actor',
  description: `Get, create, update, or delete an Actor. Use this to manage Actor configurations including name, description, versions, memory settings, and build options.`,
  instructions: [
    'To get an Actor, provide the actorId with action "get".',
    'To create a new Actor, use action "create" and provide name and other settings.',
    'To update an Actor, provide the actorId with action "update" and the fields to change.',
    'To delete an Actor, provide the actorId with action "delete".'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['get', 'create', 'update', 'delete']).describe('Action to perform'),
      actorId: z
        .string()
        .optional()
        .describe('Actor ID or full name (required for get/update/delete)'),
      name: z.string().optional().describe('Actor name (required for create)'),
      title: z.string().optional().describe('Human-readable title'),
      description: z.string().optional().describe('Actor description'),
      isPublic: z.boolean().optional().describe('Whether the Actor is public'),
      defaultRunOptions: z
        .object({
          build: z.string().optional().describe('Build tag'),
          timeout: z.number().optional().describe('Default timeout in seconds'),
          memory: z.number().optional().describe('Default memory in MB')
        })
        .optional()
        .describe('Default run configuration')
    })
  )
  .output(
    z.object({
      actorId: z.string().optional().describe('Actor ID'),
      name: z.string().optional().describe('Actor name'),
      title: z.string().optional().describe('Actor title'),
      description: z.string().optional().describe('Actor description'),
      isPublic: z.boolean().optional().describe('Whether the Actor is public'),
      createdAt: z.string().optional().describe('ISO creation timestamp'),
      modifiedAt: z.string().optional().describe('ISO last modification timestamp'),
      defaultRunOptions: z
        .record(z.string(), z.any())
        .optional()
        .describe('Default run options'),
      deleted: z.boolean().optional().describe('Whether the Actor was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ApifyClient({ token: ctx.auth.token });

    if (ctx.input.action === 'get') {
      let actor = await client.getActor(ctx.input.actorId!);
      return {
        output: {
          actorId: actor.id,
          name: actor.name,
          title: actor.title,
          description: actor.description,
          isPublic: actor.isPublic,
          createdAt: actor.createdAt,
          modifiedAt: actor.modifiedAt,
          defaultRunOptions: actor.defaultRunOptions
        },
        message: `Retrieved Actor **${actor.name}** (\`${actor.id}\`).`
      };
    }

    if (ctx.input.action === 'create') {
      let body: Record<string, any> = { name: ctx.input.name };
      if (ctx.input.title !== undefined) body.title = ctx.input.title;
      if (ctx.input.description !== undefined) body.description = ctx.input.description;
      if (ctx.input.isPublic !== undefined) body.isPublic = ctx.input.isPublic;
      if (ctx.input.defaultRunOptions !== undefined) {
        body.defaultRunOptions = {};
        if (ctx.input.defaultRunOptions.build !== undefined)
          body.defaultRunOptions.build = ctx.input.defaultRunOptions.build;
        if (ctx.input.defaultRunOptions.timeout !== undefined)
          body.defaultRunOptions.timeoutSecs = ctx.input.defaultRunOptions.timeout;
        if (ctx.input.defaultRunOptions.memory !== undefined)
          body.defaultRunOptions.memoryMbytes = ctx.input.defaultRunOptions.memory;
      }

      let actor = await client.createActor(body);
      return {
        output: {
          actorId: actor.id,
          name: actor.name,
          title: actor.title,
          description: actor.description,
          isPublic: actor.isPublic,
          createdAt: actor.createdAt,
          modifiedAt: actor.modifiedAt,
          defaultRunOptions: actor.defaultRunOptions
        },
        message: `Created Actor **${actor.name}** (\`${actor.id}\`).`
      };
    }

    if (ctx.input.action === 'update') {
      let body: Record<string, any> = {};
      if (ctx.input.name !== undefined) body.name = ctx.input.name;
      if (ctx.input.title !== undefined) body.title = ctx.input.title;
      if (ctx.input.description !== undefined) body.description = ctx.input.description;
      if (ctx.input.isPublic !== undefined) body.isPublic = ctx.input.isPublic;
      if (ctx.input.defaultRunOptions !== undefined) {
        body.defaultRunOptions = {};
        if (ctx.input.defaultRunOptions.build !== undefined)
          body.defaultRunOptions.build = ctx.input.defaultRunOptions.build;
        if (ctx.input.defaultRunOptions.timeout !== undefined)
          body.defaultRunOptions.timeoutSecs = ctx.input.defaultRunOptions.timeout;
        if (ctx.input.defaultRunOptions.memory !== undefined)
          body.defaultRunOptions.memoryMbytes = ctx.input.defaultRunOptions.memory;
      }

      let actor = await client.updateActor(ctx.input.actorId!, body);
      return {
        output: {
          actorId: actor.id,
          name: actor.name,
          title: actor.title,
          description: actor.description,
          isPublic: actor.isPublic,
          createdAt: actor.createdAt,
          modifiedAt: actor.modifiedAt,
          defaultRunOptions: actor.defaultRunOptions
        },
        message: `Updated Actor **${actor.name}** (\`${actor.id}\`).`
      };
    }

    // delete
    await client.deleteActor(ctx.input.actorId!);
    return {
      output: { actorId: ctx.input.actorId, deleted: true },
      message: `Deleted Actor \`${ctx.input.actorId}\`.`
    };
  })
  .build();
