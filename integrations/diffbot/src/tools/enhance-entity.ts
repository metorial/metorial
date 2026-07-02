import { SlateTool } from 'slates';
import { z } from 'zod';
import { DiffbotClient } from '../lib/client';
import { spec } from '../spec';

let enhancedEntitySchema = z
  .object({
    diffbotUri: z.string().optional().describe('Unique Diffbot URI for the entity'),
    type: z.string().optional().describe('Entity type'),
    name: z.string().optional().describe('Full name of the entity'),
    summary: z.string().optional().describe('Brief description or summary'),
    types: z.array(z.string()).optional().describe('List of entity types'),
    origin: z.string().optional().describe('Origin URL'),
    nbOrigins: z.number().optional().describe('Number of web sources')
  })
  .passthrough();

export let enhanceEntity = SlateTool.create(spec, {
  name: 'Enhance Entity',
  key: 'enhance_entity',
  description: `Enrich a person or organization record with comprehensive data from the public web. Provide minimal identifiers (name, domain, email, etc.) and receive a complete entity profile with 50+ fields. Optionally combine a person lookup with their current employer data in a single request.`,
  instructions: [
    'For organizations, provide at least a **name** or **url** (domain).',
    'For people, provide at least a **name** combined with an **employer**, **email**, or other identifier.',
    "Set **includeCombined** to true to also return the person's current employer data in one call."
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      entityType: z.enum(['organization', 'person']).describe('Type of entity to look up'),
      name: z.string().optional().describe('Name of the person or organization'),
      url: z.string().optional().describe('Website URL or domain of the organization'),
      email: z.string().optional().describe('Email address of the person'),
      phone: z.string().optional().describe('Phone number of the person'),
      employer: z.string().optional().describe('Current employer name (for person lookup)'),
      title: z.string().optional().describe('Job title of the person'),
      location: z.string().optional().describe('Location of the person or organization'),
      description: z
        .string()
        .optional()
        .describe('Description to help disambiguate the entity'),
      includeCombined: z
        .boolean()
        .optional()
        .default(false)
        .describe("If true, also returns the person's current employer data")
    })
  )
  .output(
    z.object({
      matched: z.boolean().describe('Whether a match was found'),
      entity: enhancedEntitySchema.optional().describe('The enriched entity data'),
      employerEntity: enhancedEntitySchema
        .optional()
        .describe('Employer entity data (only when includeCombined is true)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DiffbotClient({ token: ctx.auth.token });

    let enhanceOptions = {
      entityType: ctx.input.entityType,
      name: ctx.input.name,
      url: ctx.input.url,
      email: ctx.input.email,
      phone: ctx.input.phone,
      employer: ctx.input.employer,
      title: ctx.input.title,
      location: ctx.input.location,
      description: ctx.input.description
    };

    if (ctx.input.includeCombined && ctx.input.entityType === 'person') {
      let result = await client.enhanceCombine(enhanceOptions);
      let entities = result.data || [];
      let personEntity = entities.find((e: any) => e.type === 'Person') || entities[0];
      let orgEntity = entities.find((e: any) => e.type === 'Organization');

      return {
        output: {
          matched: entities.length > 0,
          entity: personEntity || undefined,
          employerEntity: orgEntity || undefined
        },
        message: personEntity
          ? `Found match for **${personEntity.name || 'entity'}**${orgEntity ? ` at **${orgEntity.name}**` : ''}.`
          : 'No matching entity found.'
      };
    }

    let result = await client.enhanceEntity(enhanceOptions);
    let entities = result.data || [];
    let entity = entities[0];

    return {
      output: {
        matched: entities.length > 0,
        entity: entity || undefined
      },
      message: entity
        ? `Found match for **${entity.name || 'entity'}** (${ctx.input.entityType}).`
        : `No matching ${ctx.input.entityType} found.`
    };
  })
  .build();
