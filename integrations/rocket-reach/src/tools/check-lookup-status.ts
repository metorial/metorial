import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let profileStatusSchema = z.object({
  profileId: z.number().optional().describe('RocketReach profile ID'),
  status: z
    .string()
    .optional()
    .describe('Lookup status: complete, progress, searching, failed, waiting, or not queued'),
  name: z.string().nullable().optional().describe('Full name'),
  currentTitle: z.string().nullable().optional().describe('Current job title'),
  currentEmployer: z.string().nullable().optional().describe('Current employer'),
  recommendedEmail: z
    .string()
    .nullable()
    .optional()
    .describe('Best recommended email address'),
  emails: z
    .array(
      z.object({
        email: z.string().optional(),
        smtpValid: z.string().nullable().optional(),
        type: z.string().nullable().optional(),
        grade: z.string().nullable().optional()
      })
    )
    .optional()
    .describe('Email addresses (available when status is complete)'),
  phones: z
    .array(
      z.object({
        number: z.string().optional(),
        type: z.string().nullable().optional(),
        validity: z.string().nullable().optional()
      })
    )
    .optional()
    .describe('Phone numbers (available when status is complete)')
});

export let checkLookupStatus = SlateTool.create(spec, {
  name: 'Check Lookup Status',
  key: 'check_lookup_status',
  description: `Check the status of one or more person lookups that are still processing. Returns the current status and any available contact data for each profile ID.

Use this after a person lookup returns a status of "searching" or "progress" to poll for completion.`,
  instructions: [
    'Provide one or more profileIds from a previous lookup that returned a non-complete status.',
    'Possible statuses: "complete" (finished), "failed" (error), "waiting" (in queue), "searching" (in progress), "progress" (partial data available).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      profileIds: z
        .array(z.number())
        .describe('List of RocketReach profile IDs to check status for')
    })
  )
  .output(
    z.object({
      profiles: z
        .array(profileStatusSchema)
        .describe('Status and data for each requested profile')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.checkPersonLookupStatus(ctx.input.profileIds);

    let profiles = (Array.isArray(result) ? result : [result]).map((p: any) => ({
      profileId: p.id,
      status: p.status,
      name: p.name,
      currentTitle: p.current_title,
      currentEmployer: p.current_employer,
      recommendedEmail: p.recommended_email,
      emails: (p.emails || []).map((e: any) => ({
        email: e.email,
        smtpValid: e.smtp_valid,
        type: e.type,
        grade: e.grade
      })),
      phones: (p.phones || []).map((ph: any) => ({
        number: ph.number,
        type: ph.type,
        validity: ph.validity
      }))
    }));

    let completeCount = profiles.filter(p => p.status === 'complete').length;
    let searchingCount = profiles.filter(
      p => p.status === 'searching' || p.status === 'progress' || p.status === 'waiting'
    ).length;
    let failedCount = profiles.filter(p => p.status === 'failed').length;

    return {
      output: { profiles },
      message: `Checked ${profiles.length} profile(s): ${completeCount} complete, ${searchingCount} still processing, ${failedCount} failed.`
    };
  })
  .build();
