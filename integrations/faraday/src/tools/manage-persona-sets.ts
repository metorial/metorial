import { SlateTool } from 'slates';
import { z } from 'zod';
import { FaradayClient } from '../lib/client';
import { spec } from '../spec';

let personaSetSchema = z.object({
  personaSetId: z.string().describe('Unique identifier of the persona set'),
  name: z.string().describe('Human-readable name of the persona set'),
  status: z
    .string()
    .optional()
    .describe('Current status: new, starting, running, ready, or error'),
  cohortId: z.string().optional().describe('UUID of the cohort being segmented'),
  personaCount: z.number().optional().describe('Number of persona clusters'),
  createdAt: z.string().optional().describe('Timestamp when the persona set was created'),
  updatedAt: z.string().optional().describe('Timestamp when the persona set was last updated')
});

export let listPersonaSets = SlateTool.create(spec, {
  name: 'List Persona Sets',
  key: 'list_persona_sets',
  description: `Retrieve all persona sets in your Faraday account. Persona sets segment cohorts into AI-generated persona clusters, with each individual assigned to a persona along with trait breakdowns.`,
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      personaSets: z.array(personaSetSchema).describe('List of all persona sets')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FaradayClient({ token: ctx.auth.token });
    let personaSets = await client.listPersonaSets();

    let mapped = personaSets.map((p: any) => ({
      personaSetId: p.id,
      name: p.name,
      status: p.status,
      cohortId: p.cohort_id,
      personaCount: p.persona_count,
      createdAt: p.created_at,
      updatedAt: p.updated_at
    }));

    return {
      output: { personaSets: mapped },
      message: `Found **${mapped.length}** persona set(s).`
    };
  })
  .build();

export let getPersonaSet = SlateTool.create(spec, {
  name: 'Get Persona Set',
  key: 'get_persona_set',
  description: `Retrieve detailed information about a specific persona set, including its personas, trait breakdowns, and processing status.`,
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      personaSetId: z.string().describe('UUID of the persona set to retrieve')
    })
  )
  .output(
    personaSetSchema.extend({
      personas: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Individual persona details with trait breakdowns')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FaradayClient({ token: ctx.auth.token });
    let p = await client.getPersonaSet(ctx.input.personaSetId);

    return {
      output: {
        personaSetId: p.id,
        name: p.name,
        status: p.status,
        cohortId: p.cohort_id,
        personaCount: p.persona_count,
        personas: p.personas,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      },
      message: `Persona set **${p.name}** is **${p.status}** with ${p.persona_count ?? 'unknown'} personas.`
    };
  })
  .build();

export let createPersonaSet = SlateTool.create(spec, {
  name: 'Create Persona Set',
  key: 'create_persona_set',
  description: `Create a new persona set to segment a cohort into AI-generated persona clusters. Each individual in the cohort will be assigned to a persona.`,
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      name: z.string().describe('Unique human-readable name for the persona set'),
      cohortId: z.string().describe('UUID of the cohort to segment'),
      personaCount: z.number().optional().describe('Desired number of persona clusters')
    })
  )
  .output(personaSetSchema)
  .handleInvocation(async ctx => {
    let client = new FaradayClient({ token: ctx.auth.token });

    let body: Record<string, any> = {
      name: ctx.input.name,
      cohort_id: ctx.input.cohortId
    };
    if (ctx.input.personaCount !== undefined) body.persona_count = ctx.input.personaCount;

    let p = await client.createPersonaSet(body);

    return {
      output: {
        personaSetId: p.id,
        name: p.name,
        status: p.status,
        cohortId: p.cohort_id,
        personaCount: p.persona_count,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      },
      message: `Created persona set **${p.name}** (${p.id}).`
    };
  })
  .build();
