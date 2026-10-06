import { SlateTool } from 'slates';
import { z } from 'zod';
import { RecruiteeClient } from '../lib/client';
import { entity, fail, integer, type Row } from '../lib/validation';
import { spec } from '../spec';
export let managePipeline = SlateTool.create(spec, {
  name: 'Manage Pipeline',
  key: 'manage_pipeline',
  description:
    'Assign a candidate to an offer or talent pool, change an existing placement stage, disqualify or requalify it, or remove the assignment. Removing a placement does not erase the candidate or its history.',
  instructions: [
    'Use Get Candidate to discover placement IDs. Use Get Job Offer to discover pipeline stage IDs and List Disqualify Reasons for a required reason. Hiring stages may require workLocationId or openingId. These changes can run configured recruiting automations; use an appropriate account and permissions.'
  ],
  tags: { readOnly: false }
})
  .input(
    z.object({
      action: z.enum(['change_stage', 'disqualify', 'remove', 'assign', 'requalify']),
      placementId: z
        .number()
        .optional()
        .describe('Placement ID for all actions except assign'),
      candidateId: z
        .number()
        .optional()
        .describe('Required for assign; optional identity guard for other actions'),
      offerId: z
        .number()
        .optional()
        .describe('Job offer ID for assign, mutually exclusive with talentPoolId'),
      talentPoolId: z
        .number()
        .optional()
        .describe('Talent pool ID for assign, mutually exclusive with offerId'),
      stageId: z.number().optional().describe('Target stage ID for change_stage'),
      proceed: z.boolean().optional().describe('Provider proceed option for change_stage'),
      hiredAt: z.string().optional().describe('Hire date for a hired stage'),
      jobStartsAt: z.string().optional().describe('Job start date when hiring'),
      workLocationId: z
        .number()
        .optional()
        .describe('Work location ID when required by a hiring stage'),
      openingId: z
        .number()
        .optional()
        .describe('Requisition opening ID when required by the job'),
      disqualifyReasonId: z
        .number()
        .optional()
        .describe('Required for disqualify; discover with List Disqualify Reasons')
    })
  )
  .output(
    z.object({
      placementId: z.number(),
      actionPerformed: z.string(),
      success: z.boolean(),
      candidateId: z.number().optional(),
      retainedHistoryPossible: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    const input = ctx.input;
    if (input.action === 'assign') {
      integer(input.candidateId, 'Candidate ID');
      if ((input.offerId === undefined) === (input.talentPoolId === undefined))
        fail('Assign requires exactly one offerId or talentPoolId.');
    } else integer(input.placementId, 'Placement ID');
    if (input.action === 'change_stage') integer(input.stageId, 'Stage ID');
    if (input.action === 'disqualify')
      integer(input.disqualifyReasonId, 'Disqualification reason ID');
    const client = await RecruiteeClient.forContext(ctx);
    if (input.action !== 'assign' && input.candidateId !== undefined) {
      const candidate = (await client.getCandidate(integer(input.candidateId, 'Candidate ID')))
        .candidate;
      if (!candidate.placements.some(p => p.id === input.placementId))
        fail('Placement does not belong to the supplied candidate. No change was attempted.');
    }
    let result: Row;
    if (input.action === 'assign')
      result = await client.createPlacement(
        integer(input.candidateId, 'Candidate ID'),
        input.offerId,
        input.talentPoolId
      );
    else if (input.action === 'change_stage')
      result = await client.changeStage(
        integer(input.placementId, 'Placement ID'),
        integer(input.stageId, 'Stage ID'),
        {
          proceed: input.proceed,
          hiredAt: input.hiredAt,
          jobStartsAt: input.jobStartsAt,
          workLocationId: input.workLocationId,
          openingId: input.openingId
        }
      );
    else if (input.action === 'disqualify')
      result = await client.disqualifyCandidate(
        integer(input.placementId, 'Placement ID'),
        input.disqualifyReasonId
      );
    else if (input.action === 'requalify')
      result = await client.requalifyCandidate(integer(input.placementId, 'Placement ID'));
    else result = await client.deletePlacement(integer(input.placementId, 'Placement ID'));
    const placement = entity(
      result,
      'placement',
      input.action === 'assign' ? undefined : input.placementId
    );
    const candidateId = integer(placement.candidate_id, 'Placement candidate ID');
    if (input.candidateId !== undefined && candidateId !== input.candidateId)
      fail(
        'Changed placement candidate did not match the requested identity. Read the records before retrying.'
      );
    return {
      output: {
        placementId: integer(placement.id, 'Placement ID'),
        actionPerformed: input.action,
        success: true,
        candidateId,
        ...(input.action === 'remove' ? { retainedHistoryPossible: true } : {})
      },
      message: `Confirmed ${input.action} for placement ${placement.id}.`
    };
  })
  .build();
