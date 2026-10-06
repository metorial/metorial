import { z } from 'zod';
import { collection, pageOutput, pageParams, single } from '../lib/client';
import { remoteTool } from '../lib/tool';
import {
  date,
  fail,
  id,
  jsonObject,
  pageSchema,
  pageSizeSchema,
  paginationOutput,
  type RecordData,
  recordSchema,
  rejectFields,
  required
} from '../lib/validation';
export let manageOffboarding = remoteTool(
  {
    name: 'Manage Offboarding',
    key: 'manage_offboarding',
    description:
      'Read or submit a termination offboarding request. Submission starts provider review; it does not complete termination or guarantee the proposed date. The API requires explicit termination details and risk answers.',
    tags: { destructive: true }
  },
  z.object({
    action: z.enum(['create', 'list', 'get']),
    offboardingId: z.string().optional(),
    employmentId: z.string().optional(),
    terminationDate: z
      .string()
      .optional()
      .describe('Proposed termination date, subject to Remote review.'),
    terminationReason: z.string().optional(),
    additionalComments: z.string().optional(),
    confidential: z.boolean().optional(),
    type: z.string().optional(),
    proposedLastWorkingDate: z
      .string()
      .optional()
      .describe(
        'Legacy unsupported field; the current endpoint accepts a proposed termination date.'
      ),
    status: z.string().optional().describe('Legacy unsupported list filter.'),
    page: pageSchema,
    pageSize: pageSizeSchema,
    terminationDetails: recordSchema
      .optional()
      .describe(
        'Current termination_details fields, including required reason_description, risk_assessment_reasons, will_challenge_termination, confidential, proposed_termination_date, and termination_reason.'
      ),
    includeConfidential: z.boolean().optional()
  }),
  z.object({
    offboarding: recordSchema.optional(),
    offboardings: z.array(recordSchema).optional(),
    ...paginationOutput
  }),
  async (client, input) => {
    if (input.action === 'list') {
      rejectFields(
        input,
        ['status'],
        'The current offboarding list does not document a status filter. Omit status and inspect the returned page.'
      );
      let value = await client.get('/offboardings', {
        ...pageParams(input),
        employment_id: input.employmentId === undefined ? undefined : id(input.employmentId),
        type: input.type,
        include_confidential: input.includeConfidential
      });
      return {
        output: { offboardings: collection(value, 'offboardings'), ...pageOutput(value) },
        message: 'Retrieved an offboarding page.'
      };
    }
    if (input.action === 'get')
      return {
        output: {
          offboarding: await client.entity('/offboardings', 'offboarding', input.offboardingId)
        },
        message: 'Retrieved the current offboarding request.'
      };
    rejectFields(
      input,
      ['proposedLastWorkingDate'],
      'Current termination requests accept a proposed termination date rather than proposedLastWorkingDate. Supply terminationDate or terminationDetails.proposed_termination_date with the required risk answers.'
    );
    if (input.type !== undefined && input.type !== 'termination')
      fail(
        'The current create endpoint supports termination requests only. Resignations use a separate provider workflow.'
      );
    let details: RecordData = input.terminationDetails
      ? { ...jsonObject(input.terminationDetails, 'Termination details') }
      : {};
    for (let [key, value] of [
      ['proposed_termination_date', input.terminationDate],
      ['termination_reason', input.terminationReason],
      ['additional_comments', input.additionalComments],
      ['confidential', input.confidential]
    ] as const)
      if (value !== undefined) {
        if (details[key] !== undefined && details[key] !== value)
          fail(`Conflicting ${key} values. Provide a consistent termination request.`);
        details[key] = value;
      }
    details.proposed_termination_date = date(
      details.proposed_termination_date,
      'Proposed termination date'
    );
    required(details.termination_reason, 'Termination reason');
    required(details.reason_description, 'Termination reason description');
    if (
      typeof details.confidential !== 'boolean' ||
      typeof details.will_challenge_termination !== 'boolean'
    )
      fail(
        'Provide explicit confidential and will_challenge_termination booleans in terminationDetails. Do not infer personnel risk answers.'
      );
    if (
      !Array.isArray(details.risk_assessment_reasons) ||
      !details.risk_assessment_reasons.length ||
      details.risk_assessment_reasons.some(reason => typeof reason !== 'string' || !reason)
    )
      fail(
        'Provide at least one explicit risk_assessment_reasons value in terminationDetails, using the current provider requirements.'
      );
    if (details.will_challenge_termination === true)
      required(details.will_challenge_termination_description, 'Challenge risk description');
    let employmentId = id(input.employmentId, 'Employment ID');
    await client.employment(employmentId);
    let offboarding = single(
      await client.post('/offboardings', {
        type: 'termination',
        employment_id: employmentId,
        termination_details: details
      }),
      'offboarding'
    );
    return {
      output: { offboarding },
      message:
        'Remote accepted the termination request for review. Termination completion and the proposed date are not confirmed.'
    };
  }
);
