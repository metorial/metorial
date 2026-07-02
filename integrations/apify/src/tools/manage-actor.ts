import { SlateTool } from 'slates';
import { z } from 'zod';
import { ApifyClient } from '../lib/client';
import { spec } from '../spec';
import {
  ensureAtLeastOne,
  jsonObjectSchema,
  mapActor,
  pickDefined,
  requireString,
  validateRunOptions
} from './shared';

let defaultRunOptionsSchema = z.object({
  build: z.string().optional().describe('Default build tag or number'),
  timeout: z.number().optional().describe('Default timeout in seconds'),
  memory: z.number().optional().describe('Default memory in MB')
});

let toDefaultRunOptions = (options: z.infer<typeof defaultRunOptionsSchema> | undefined) => {
  if (!options) return undefined;
  validateRunOptions(options);
  return pickDefined({
    build: options.build,
    timeoutSecs: options.timeout,
    memoryMbytes: options.memory
  });
};

export let manageActor = SlateTool.create(spec, {
  name: 'Manage Actor',
  key: 'manage_actor',
  description: `Get, create, update, or delete an Apify Actor owned by the authenticated account. Use Manage Actor Version for source-code versions.`,
  instructions: [
    'Use action=get with actorId to inspect an Actor.',
    'Use action=create with name to create an Actor shell.',
    'Use action=update with actorId and at least one mutable field.',
    'Use action=delete only for disposable Actors you own.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['get', 'create', 'update', 'delete']).describe('Action to perform'),
      actorId: z.string().optional().describe('Actor ID or full name for get/update/delete'),
      name: z.string().optional().describe('Actor name; required for create'),
      title: z.string().optional().describe('Human-readable Actor title'),
      description: z.string().optional().describe('Actor description'),
      isPublic: z.boolean().optional().describe('Whether the Actor is public'),
      categories: z
        .array(z.string())
        .optional()
        .describe('Store categories for public Actors'),
      restartOnError: z.boolean().optional().describe('Default restart-on-error setting'),
      defaultRunOptions: defaultRunOptionsSchema.optional().describe('Default run options'),
      metadata: jsonObjectSchema.optional().describe('Optional Actor metadata')
    })
  )
  .output(
    z.object({
      actorId: z.string().optional().describe('Actor ID'),
      name: z.string().optional().describe('Actor name'),
      username: z.string().optional().describe('Actor owner username'),
      title: z.string().optional().describe('Actor title'),
      description: z.string().optional().describe('Actor description'),
      isPublic: z.boolean().optional().describe('Whether the Actor is public'),
      createdAt: z.string().optional().describe('ISO creation timestamp'),
      modifiedAt: z.string().optional().describe('ISO last modification timestamp'),
      defaultRunOptions: z.record(z.string(), z.any()).optional(),
      versions: z.array(z.record(z.string(), z.any())).optional(),
      stats: z.record(z.string(), z.any()).optional(),
      deleted: z.boolean().optional().describe('Whether the Actor was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ApifyClient({ token: ctx.auth.token });

    if (ctx.input.action === 'get') {
      let actorId = requireString(ctx.input.actorId, 'actorId', 'get');
      let actor = await client.getActor(actorId);
      return {
        output: mapActor(actor),
        message: `Retrieved Actor **${actor.name ?? actorId}** (\`${actor.id ?? actorId}\`).`
      };
    }

    if (ctx.input.action === 'create') {
      let name = requireString(ctx.input.name, 'name', 'create');
      let body = pickDefined({
        name,
        title: ctx.input.title,
        description: ctx.input.description,
        isPublic: ctx.input.isPublic,
        categories: ctx.input.categories,
        restartOnError: ctx.input.restartOnError,
        defaultRunOptions: toDefaultRunOptions(ctx.input.defaultRunOptions),
        metadata: ctx.input.metadata
      });
      let actor = await client.createActor(body);
      return {
        output: mapActor(actor),
        message: `Created Actor **${actor.name ?? name}** (\`${actor.id}\`).`
      };
    }

    if (ctx.input.action === 'update') {
      let actorId = requireString(ctx.input.actorId, 'actorId', 'update');
      let body = pickDefined({
        name: ctx.input.name,
        title: ctx.input.title,
        description: ctx.input.description,
        isPublic: ctx.input.isPublic,
        categories: ctx.input.categories,
        restartOnError: ctx.input.restartOnError,
        defaultRunOptions: toDefaultRunOptions(ctx.input.defaultRunOptions),
        metadata: ctx.input.metadata
      });
      ensureAtLeastOne(body, 'update the Actor');
      let actor = await client.updateActor(actorId, body);
      return {
        output: mapActor(actor),
        message: `Updated Actor **${actor.name ?? actorId}** (\`${actor.id ?? actorId}\`).`
      };
    }

    let actorId = requireString(ctx.input.actorId, 'actorId', 'delete');
    await client.deleteActor(actorId);
    return {
      output: { actorId, deleted: true },
      message: `Deleted Actor \`${actorId}\`.`
    };
  })
  .build();
