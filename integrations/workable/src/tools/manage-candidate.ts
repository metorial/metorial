import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { WorkableClient } from '../lib/client';
import { requireWorkableArray, requireWorkableString } from '../lib/errors';
import { buildCandidateUpdateBody, compact, unwrapCandidate } from '../lib/shapes';
import { spec } from '../spec';

let requisitionReservationSchema = z.object({
  code: z.string().optional().describe('Reserved requisition code'),
  startDate: z.string().optional().describe('Requisition start date'),
  salaryAmount: z.number().optional().describe('Salary amount'),
  salaryFrequency: z.string().optional().describe('Salary frequency'),
  salaryCurrencyIso: z.string().optional().describe('Salary currency ISO code')
});

export let manageCandidateTool = SlateTool.create(spec, {
  name: 'Manage Candidate',
  key: 'manage_candidate',
  description: `Update a Workable candidate or run a candidate lifecycle action: move, copy, relocate, disqualify, revert disqualification, comment, set tags, or add a rating.`,
  instructions: [
    'Use "update" to patch candidate profile fields.',
    'Use "move" with memberId and stageSlug to move the candidate within the current job.',
    'Use "copy" or "relocate" with memberId and targetJobShortcode for cross-job workflows.',
    'Use "setTags" with the complete replacement tag list.',
    'Use "addComment" or "addRating" with memberId to record timeline feedback.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      candidateId: z.string().describe('The candidate ID'),
      action: z
        .enum([
          'update',
          'move',
          'copy',
          'relocate',
          'disqualify',
          'revertDisqualification',
          'addComment',
          'setTags',
          'addRating'
        ])
        .describe('The action to perform on the candidate'),
      memberId: z
        .string()
        .optional()
        .describe('Workable member ID required by most candidate lifecycle actions'),
      stageSlug: z
        .string()
        .optional()
        .describe('Target stage slug for move, copy, or relocate'),
      targetJobShortcode: z
        .string()
        .optional()
        .describe('Target job shortcode for copy and relocate'),
      fillReservedRequisition: z
        .boolean()
        .optional()
        .describe('Whether moving to hired should fill a reserved requisition'),
      requisition: requisitionReservationSchema
        .optional()
        .describe('Reserved requisition payload for move-to-hired workflows'),
      name: z.string().optional().describe('Updated candidate full name'),
      firstname: z.string().optional().describe('Updated first name'),
      lastname: z.string().optional().describe('Updated last name'),
      email: z.string().optional().describe('Updated email'),
      phone: z.string().optional().describe('Updated phone'),
      headline: z.string().optional().describe('Updated headline'),
      summary: z.string().optional().describe('Updated summary'),
      address: z.string().optional().describe('Updated address'),
      coverLetter: z.string().optional().describe('Updated cover letter'),
      resumeUrl: z.string().optional().describe('Updated resume URL'),
      skills: z.array(z.string()).optional().describe('Updated skills'),
      answers: z.array(z.any()).optional().describe('Updated answers in Workable shape'),
      customFields: z
        .array(z.any())
        .optional()
        .describe('Updated custom fields in Workable shape'),
      socialProfiles: z
        .array(z.any())
        .optional()
        .describe('Replacement social profiles in Workable API shape'),
      educationEntries: z
        .array(z.any())
        .optional()
        .describe('Replacement education entries in Workable API shape'),
      experienceEntries: z
        .array(z.any())
        .optional()
        .describe('Replacement experience entries in Workable API shape'),
      tags: z.array(z.string()).optional().describe('Complete replacement tag list'),
      disqualificationReasonId: z.string().optional().describe('Disqualification reason ID'),
      disqualificationReason: z
        .string()
        .optional()
        .describe('Deprecated disqualification reason text'),
      disqualificationNote: z.string().optional().describe('Disqualification note'),
      withdrew: z.boolean().optional().describe('Whether the candidate withdrew'),
      comment: z.string().optional().describe('Comment body for addComment'),
      policy: z
        .array(z.string())
        .optional()
        .describe('Comment visibility policy values accepted by Workable'),
      attachment: z
        .object({
          name: z.string().describe('Attachment file name'),
          data: z.string().describe('Base64-encoded attachment content')
        })
        .optional()
        .describe('Optional comment attachment'),
      ratingComment: z.string().optional().describe('Rating comment'),
      ratingGrade: z.number().optional().describe('Rating grade'),
      ratingScale: z.enum(['thumbs', 'stars', 'numbers']).optional().describe('Rating scale'),
      scoreCard: z.any().optional().describe('Optional Workable score card payload')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was successful'),
      actionPerformed: z.string().describe('Description of the action performed'),
      candidateId: z.string().describe('The candidate ID'),
      newCandidateId: z.string().optional().describe('New candidate ID for copy/relocate'),
      candidateUrl: z.string().optional().describe('Candidate URL returned by Workable')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WorkableClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let { candidateId, action } = ctx.input;
    let actionDescription = '';
    let newCandidateId: string | undefined;
    let candidateUrl: string | undefined;

    switch (action) {
      case 'update': {
        let candidateFields = compact(buildCandidateUpdateBody(ctx.input).candidate);
        if (Object.keys(candidateFields).length === 0) {
          throw createApiServiceError('Provide at least one candidate field for update.');
        }

        await client.updateCandidate(candidateId, { candidate: candidateFields });
        actionDescription = 'Updated candidate';
        break;
      }
      case 'move': {
        let memberId = requireWorkableString(ctx.input.memberId, 'memberId', 'move');
        let stageSlug = requireWorkableString(ctx.input.stageSlug, 'stageSlug', 'move');
        await client.moveCandidate(
          candidateId,
          compact({
            member_id: memberId,
            target_stage: stageSlug,
            fill_reserved_requisition: ctx.input.fillReservedRequisition,
            requisition: ctx.input.requisition
              ? compact({
                  code: ctx.input.requisition.code,
                  start_date: ctx.input.requisition.startDate,
                  salary: ctx.input.requisition.salaryAmount,
                  salary_frequency: ctx.input.requisition.salaryFrequency,
                  salary_currency_iso: ctx.input.requisition.salaryCurrencyIso
                })
              : undefined
          })
        );
        actionDescription = `Moved candidate to stage "${stageSlug}"`;
        break;
      }
      case 'copy': {
        let memberId = requireWorkableString(ctx.input.memberId, 'memberId', 'copy');
        let targetJobShortcode = requireWorkableString(
          ctx.input.targetJobShortcode,
          'targetJobShortcode',
          'copy'
        );
        let result = await client.copyCandidate(
          candidateId,
          compact({
            member_id: memberId,
            target_job_shortcode: targetJobShortcode,
            target_stage: ctx.input.stageSlug
          })
        );
        let candidate = unwrapCandidate(result);
        newCandidateId = candidate.id;
        candidateUrl = candidate.url;
        actionDescription = `Copied candidate to job ${targetJobShortcode}`;
        break;
      }
      case 'relocate': {
        let memberId = requireWorkableString(ctx.input.memberId, 'memberId', 'relocate');
        let targetJobShortcode = requireWorkableString(
          ctx.input.targetJobShortcode,
          'targetJobShortcode',
          'relocate'
        );
        let result = await client.relocateCandidate(
          candidateId,
          compact({
            member_id: memberId,
            target_job_shortcode: targetJobShortcode,
            target_stage: ctx.input.stageSlug
          })
        );
        let candidate = unwrapCandidate(result);
        newCandidateId = candidate.id;
        candidateUrl = candidate.url;
        actionDescription = `Relocated candidate to job ${targetJobShortcode}`;
        break;
      }
      case 'disqualify': {
        let memberId = requireWorkableString(ctx.input.memberId, 'memberId', 'disqualify');
        await client.disqualifyCandidate(
          candidateId,
          compact({
            member_id: memberId,
            disqualify_reason_id: ctx.input.disqualificationReasonId,
            disqualify_note: ctx.input.disqualificationNote,
            withdrew: ctx.input.withdrew,
            disqualification_reason: ctx.input.disqualificationReason
          })
        );
        actionDescription = 'Disqualified candidate';
        break;
      }
      case 'revertDisqualification': {
        let memberId = requireWorkableString(
          ctx.input.memberId,
          'memberId',
          'revertDisqualification'
        );
        await client.revertDisqualification(candidateId, { member_id: memberId });
        actionDescription = 'Reverted candidate disqualification';
        break;
      }
      case 'addComment': {
        let memberId = requireWorkableString(ctx.input.memberId, 'memberId', 'addComment');
        let comment = requireWorkableString(ctx.input.comment, 'comment', 'addComment');
        await client.addCandidateComment(candidateId, {
          member_id: memberId,
          comment: compact({
            body: comment,
            policy: ctx.input.policy,
            attachment: ctx.input.attachment
          })
        });
        actionDescription = 'Added comment to candidate';
        break;
      }
      case 'setTags': {
        let tags = requireWorkableArray(ctx.input.tags, 'tags', 'setTags');
        await client.setCandidateTags(candidateId, tags);
        actionDescription = `Set ${tags.length} candidate tag(s)`;
        break;
      }
      case 'addRating': {
        let memberId = requireWorkableString(ctx.input.memberId, 'memberId', 'addRating');
        let comment = requireWorkableString(
          ctx.input.ratingComment,
          'ratingComment',
          'addRating'
        );
        if (ctx.input.ratingGrade === undefined) {
          throw createApiServiceError('ratingGrade is required for addRating.');
        }

        await client.addCandidateRating(
          candidateId,
          compact({
            member_id: memberId,
            comment,
            grade: ctx.input.ratingGrade,
            scale: ctx.input.ratingScale,
            score_card: ctx.input.scoreCard
          })
        );
        actionDescription = 'Added rating to candidate';
        break;
      }
    }

    return {
      output: {
        success: true,
        actionPerformed: actionDescription,
        candidateId,
        newCandidateId,
        candidateUrl
      },
      message: `${actionDescription} (candidate ${candidateId}).`
    };
  })
  .build();
