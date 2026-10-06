import { SlateTool } from 'slates';
import { z } from 'zod';
import { RecruiteeClient } from '../lib/client';
import { list } from '../lib/validation';
import { spec } from '../spec';

let placementSchema = z.object({
  placementId: z.number().describe('Placement ID'),
  offerId: z.number().optional().describe('Offer/job ID when assigned to a job'),
  talentPoolId: z.number().optional().describe('Talent pool ID when assigned to a pool'),
  stageId: z.number().nullable().describe('Current pipeline stage ID'),
  disqualifiedAt: z.string().nullable().describe('When the candidate was disqualified'),
  hiredAt: z.string().nullable().describe('When the candidate was hired'),
  disqualifyKind: z
    .string()
    .nullable()
    .optional()
    .describe('Actual provider disqualification state')
});

export let getCandidate = SlateTool.create(spec, {
  name: 'Get Candidate',
  key: 'get_candidate',
  description: `Retrieve full details of a single candidate by ID, including their profile, placements (job assignments and pipeline stages), tags, sources, and custom fields.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      candidateId: z.number().describe('ID of the candidate to retrieve')
    })
  )
  .output(
    z.object({
      candidateId: z.number().describe('Candidate ID'),
      name: z.string().describe('Full name'),
      emails: z.array(z.string()).describe('Email addresses'),
      phones: z.array(z.string()).describe('Phone numbers'),
      photoUrl: z.string().nullable().describe('Profile photo URL'),
      cvUrl: z.string().nullable().describe('CV file URL'),
      source: z.string().nullable().describe('Primary source'),
      sources: z.array(z.string()).describe('All sources'),
      tags: z.array(z.string()).describe('Tags assigned to the candidate'),
      rating: z.number().nullable().describe('Average rating'),
      coverLetter: z.string().nullable().describe('Cover letter text'),
      placements: z.array(placementSchema).describe('Job/talent pool assignments'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp'),
      adminAppUrl: z.string().optional().describe('URL to view in Recruitee admin'),
      deletedAt: z
        .string()
        .nullable()
        .optional()
        .describe('Actual logical deletion timestamp, when returned'),
      customFields: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Actual returned candidate profile fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = await RecruiteeClient.forContext(ctx);

    let result = await client.getCandidate(ctx.input.candidateId);
    let c = result.candidate;

    return {
      output: {
        candidateId: c.id,
        name: c.name,
        emails: c.emails || [],
        phones: c.phones || [],
        photoUrl: c.photo_url || null,
        cvUrl: c.cv_url || null,
        source: c.source || null,
        sources: c.sources,
        tags: c.tags,
        rating: c.rating ?? null,
        coverLetter: c.cover_letter || null,
        placements: (c.placements || []).map(p => ({
          placementId: p.id,
          offerId: p.offer_id ?? undefined,
          talentPoolId: typeof p.talent_pool_id === 'number' ? p.talent_pool_id : undefined,
          stageId: p.stage_id ?? null,
          disqualifiedAt: p.disqualified_at || null,
          hiredAt: p.hired_at || null,
          disqualifyKind: p.disqualify_kind
        })),
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        adminAppUrl: c.adminapp_url,
        deletedAt:
          typeof c.deleted_at === 'string'
            ? c.deleted_at
            : c.deleted_at === null
              ? null
              : undefined,
        customFields: c.fields === undefined ? undefined : list({ fields: c.fields }, 'fields')
      },
      message: `Retrieved candidate **${c.name}** (ID: ${c.id}).`
    };
  })
  .build();
