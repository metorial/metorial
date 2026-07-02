import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let programSchema = z.object({
  programId: z.string().describe('Unique identifier of the program'),
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
      metadata: ctx.input.metadata
    });

    return {
      output: {
        programId: program.id,
        name: program.name,
        accountId: program.accountId,
        live: program.live,
        activeCard: program.activeCard,
        status: program.status,
        created: program.created,
        updated: program.updated,
        metadata: program.metadata
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
      programId: z.string().describe('ID of the program to retrieve')
    })
  )
  .output(programSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let program = await client.getProgram(ctx.input.programId);

    return {
      output: {
        programId: program.id,
        name: program.name,
        accountId: program.accountId,
        live: program.live,
        activeCard: program.activeCard,
        status: program.status,
        created: program.created,
        updated: program.updated,
        metadata: program.metadata
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
      start: z.number().optional().describe('Offset for pagination (number of items to skip)'),
      limit: z.number().optional().describe('Maximum number of programs to return')
    })
  )
  .output(
    z.object({
      programs: z.array(programSchema).describe('List of programs'),
      count: z.number().optional().describe('Total number of programs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.listPrograms({
      start: ctx.input.start,
      limit: ctx.input.limit
    });

    let items = data?.items ?? [];
    let programs = items.map((p: any) => ({
      programId: p.id,
      name: p.name,
      accountId: p.accountId,
      live: p.live,
      activeCard: p.activeCard,
      status: p.status,
      created: p.created,
      updated: p.updated,
      metadata: p.metadata
    }));

    return {
      output: {
        programs,
        count: data?.resource?.total ?? programs.length
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
      programId: z.string().describe('ID of the program to update'),
      name: z.string().optional().describe('New name for the program'),
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
      name: ctx.input.name,
      metadata: ctx.input.metadata
    });

    return {
      output: {
        programId: program.id,
        name: program.name,
        accountId: program.accountId,
        live: program.live,
        activeCard: program.activeCard,
        status: program.status,
        created: program.created,
        updated: program.updated,
        metadata: program.metadata
      },
      message: `Program **${program.name}** (\`${program.id}\`) updated successfully.`
    };
  })
  .build();
