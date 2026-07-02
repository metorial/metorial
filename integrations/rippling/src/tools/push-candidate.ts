import { SlateTool } from 'slates';
import { z } from 'zod';
import { RipplingClient } from '../lib/client';
import { spec } from '../spec';

export let pushCandidate = SlateTool.create(spec, {
  name: 'Push ATS Candidate',
  key: 'push_candidate',
  description: `Push a candidate from an applicant tracking system directly into the Rippling onboarding flow. This initiates the onboarding process for a new hire in Rippling.`,
  instructions: [
    'Provide at minimum the first name, last name, and email of the candidate.',
    'Optional fields like title, phone, department, and start date help pre-fill the onboarding flow.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      firstName: z.string().describe('First name of the candidate'),
      lastName: z.string().describe('Last name of the candidate'),
      email: z.string().describe('Email address of the candidate'),
      title: z.string().optional().describe('Job title for the candidate'),
      phone: z.string().optional().describe('Phone number of the candidate'),
      department: z.string().optional().describe('Department the candidate will join'),
      startDate: z.string().optional().describe('Planned start date (YYYY-MM-DD)')
    })
  )
  .output(
    z.object({
      candidateId: z.string().optional().describe('Identifier for the pushed candidate'),
      success: z
        .boolean()
        .describe('Whether the candidate was successfully pushed into onboarding')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RipplingClient({ token: ctx.auth.token });

    let result = await client.pushCandidate({
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      email: ctx.input.email,
      title: ctx.input.title,
      phone: ctx.input.phone,
      department: ctx.input.department,
      startDate: ctx.input.startDate
    });

    return {
      output: {
        candidateId: result?.id || result?.candidateId,
        success: true
      },
      message: `Pushed candidate **${ctx.input.firstName} ${ctx.input.lastName}** (${ctx.input.email}) into Rippling onboarding.`
    };
  })
  .build();
