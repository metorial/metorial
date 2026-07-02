import { SlateTool } from 'slates';
import { z } from 'zod';
import { ChameleonClient } from '../lib/client';
import { spec } from '../spec';

let experienceSchema = z.object({
  experienceId: z.string().describe('Chameleon experience ID'),
  name: z.string().optional().describe('Experience name'),
  position: z.number().optional().describe('Display order'),
  publishedAt: z.string().nullable().optional().describe('Publication timestamp'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
  tagIds: z.array(z.string()).optional().describe('Associated tag IDs'),
  segmentId: z.string().optional().describe('Associated segment ID'),
  style: z.string().optional().describe('Style or type')
});

let mapExperience = (exp: Record<string, unknown>) => ({
  experienceId: exp.id as string,
  name: exp.name as string | undefined,
  position: exp.position as number | undefined,
  publishedAt: exp.published_at as string | null | undefined,
  createdAt: exp.created_at as string | undefined,
  updatedAt: exp.updated_at as string | undefined,
  tagIds: exp.tag_ids as string[] | undefined,
  segmentId: exp.segment_id as string | undefined,
  style: exp.style as string | undefined
});

export let listExperiences = SlateTool.create(spec, {
  name: 'List Experiences',
  key: 'list_experiences',
  description: `List Chameleon experiences by type: tooltips, launchers, or retrieve a single experience by ID.
Returns experience details including name, publish status, segment targeting, and tags.
Use this for tooltips and launchers; for tours and microsurveys use the dedicated tools.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      experienceType: z.enum(['tooltip', 'launcher']).describe('Type of experience to list'),
      experienceId: z
        .string()
        .optional()
        .describe('Experience ID to retrieve a specific item'),
      limit: z
        .number()
        .min(1)
        .max(500)
        .optional()
        .describe('Number of items to return (1-500, default 50)'),
      before: z.string().optional().describe('Pagination cursor for older items'),
      after: z.string().optional().describe('Pagination cursor for newer items')
    })
  )
  .output(
    z.object({
      experience: experienceSchema
        .optional()
        .describe('Single experience (when fetching by ID)'),
      experiences: z.array(experienceSchema).optional().describe('Array of experiences'),
      cursor: z
        .object({
          limit: z.number().optional(),
          before: z.string().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ChameleonClient(ctx.auth.token);
    let type = ctx.input.experienceType;

    if (ctx.input.experienceId) {
      let result =
        type === 'tooltip'
          ? await client.getTooltip(ctx.input.experienceId)
          : await client.getLauncher(ctx.input.experienceId);
      return {
        output: { experience: mapExperience(result) },
        message: `Retrieved ${type} **${result.name || result.id}**.`
      };
    }

    let result =
      type === 'tooltip'
        ? await client.listTooltips({
            limit: ctx.input.limit,
            before: ctx.input.before,
            after: ctx.input.after
          })
        : await client.listLaunchers({
            limit: ctx.input.limit,
            before: ctx.input.before,
            after: ctx.input.after
          });

    let key = type === 'tooltip' ? 'tooltips' : 'launchers';
    let experiences = (result[key] || []).map(mapExperience);
    return {
      output: { experiences, cursor: result.cursor },
      message: `Returned **${experiences.length}** ${type}s.`
    };
  })
  .build();
