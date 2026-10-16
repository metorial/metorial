import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { programIdInput } from '../lib/schemas';
import { spec } from '../spec';

export let programSchema = z.object({
  raw: z.record(z.string(), z.any()).optional().describe('Complete provider resource'),
  programId: programIdInput,
  name: z.string().describe('Name of the program'),
  accountId: z.string().optional().describe('Account ID the program belongs to'),
  live: z.boolean().optional().describe('Whether the program is in live mode'),
  activeCard: z.boolean().optional().describe('Whether the program has an active card'),
  status: z.string().optional().describe('Current status of the program'),
  created: z.string().optional().describe('ISO 8601 date when the program was created'),
  updated: z.string().optional().describe('ISO 8601 date when the program was last updated'),
  metadata: z
    .record(z.string(), z.any())
    .optional()
    .describe('Custom metadata attached to the program')
});

export let createProgram = SlateTool.create(spec, {
  name: 'Create Program',
  key: 'create_program',
  description: `Creates a new Program in Fidel API. A Program is the parent object of the card-linked structure that groups locations, cards, webhooks, and transactions. Use this to set up a new loyalty or rewards scheme.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the program to create'),
      icon: z
        .string()
        .optional()
        .describe(
          'Program emoji shortcode in :emoji-name: format, 4–200 characters (for example, :avocado:)'
        ),
      iconBackground: z.string().optional().describe('Program icon background color'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom metadata to attach to the program')
    })
  )
  .output(programSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let program = await client.createProgram({
      name: ctx.input.name,
      icon: ctx.input.icon,
      iconBackground: ctx.input.iconBackground,
      metadata: ctx.input.metadata
    });

    return {
      output: {
        raw: program,
        programId: program.id,
        name: program.name,
        accountId: program.accountId ?? undefined,
        live: program.live,
        activeCard: program.activeCard,
        status: program.status ?? undefined,
        created: program.created,
        updated: program.updated,
        metadata: program.metadata ?? undefined
      },
      message: `Program **${program.name}** created successfully with ID \`${program.id}\`.`
    };
  })
  .build();

export let getProgram = SlateTool.create(spec, {
  name: 'Get Program',
  key: 'get_program',
  description: `Retrieves details of a specific Program by its ID, including its name, status, and metadata.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      programId: programIdInput
    })
  )
  .output(programSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let program = await client.getProgram(ctx.input.programId);

    return {
      output: {
        raw: program,
        programId: program.id,
        name: program.name,
        accountId: program.accountId ?? undefined,
        live: program.live,
        activeCard: program.activeCard,
        status: program.status ?? undefined,
        created: program.created,
        updated: program.updated,
        metadata: program.metadata ?? undefined
      },
      message: `Retrieved program **${program.name}** (\`${program.id}\`).`
    };
  })
  .build();

export let listPrograms = SlateTool.create(spec, {
  name: 'List Programs',
  key: 'list_programs',
  description: `Lists all Programs in your Fidel API account. Supports pagination to navigate through large sets of programs.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z
        .string()
        .optional()
        .describe('JSON.stringify(last) from the previous page. Do not URL-encode it.'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort by creation date'),
      start: z.number().optional().describe('Offset for pagination (number of items to skip)'),
      limit: z.number().optional().describe('Maximum number of programs to return')
    })
  )
  .output(
    z.object({
      programs: z.array(programSchema).describe('List of programs'),
      last: z
        .any()
        .optional()
        .describe('Provider continuation key; serialize it as JSON for cursor'),
      raw: z.record(z.string(), z.any()).optional().describe('Complete provider response'),
      count: z.number().optional().describe('Number of returned programs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.listPrograms({
      start: ctx.input.start,
      cursor: ctx.input.cursor,
      order: ctx.input.order,
      limit: ctx.input.limit
    });

    let items = data?.items ?? [];
    let programs = items.map((p: any) => ({
      raw: p,
      programId: p.id,
      name: p.name,
      accountId: p.accountId ?? undefined,
      live: p.live,
      activeCard: p.activeCard,
      status: p.status ?? undefined,
      created: p.created,
      updated: p.updated,
      metadata: p.metadata ?? undefined
    }));

    return {
      output: {
        programs,
        count: data?.count,
        last: data?.last,
        raw: data.rawResponse ?? data
      },
      message: `Found **${programs.length}** program(s).`
    };
  })
  .build();

export let updateProgram = SlateTool.create(spec, {
  name: 'Update Program',
  key: 'update_program',
  description: `Updates an existing Program's name or metadata.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      programId: programIdInput,
      name: z.string().optional().describe('New name for the program'),
      icon: z
        .string()
        .optional()
        .describe(
          'Program emoji shortcode in :emoji-name: format, 4–200 characters (for example, :avocado:)'
        ),
      iconBackground: z.string().optional().describe('Program icon background color'),
      status: z
        .string()
        .optional()
        .describe('Set syncing to request program location synchronization'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated metadata for the program')
    })
  )
  .output(programSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let program = await client.updateProgram(ctx.input.programId, {
      status: ctx.input.status,
      name: ctx.input.name,
      icon: ctx.input.icon,
      iconBackground: ctx.input.iconBackground,
      metadata: ctx.input.metadata
    });

    return {
      output: {
        raw: program,
        programId: program.id,
        name: program.name,
        accountId: program.accountId ?? undefined,
        live: program.live,
        activeCard: program.activeCard,
        status: program.status ?? undefined,
        created: program.created,
        updated: program.updated,
        metadata: program.metadata ?? undefined
      },
      message: `Program **${program.name}** (\`${program.id}\`) updated successfully.`
    };
  })
  .build();
