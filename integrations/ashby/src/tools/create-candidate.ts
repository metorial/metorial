import { SlateTool } from 'slates';
import { z } from 'zod';
import { AshbyClient } from '../lib/client';
import { spec } from '../spec';

export let createCandidateTool = SlateTool.create(spec, {
  name: 'Create Candidate',
  key: 'create_candidate',
  description: `Creates a new candidate in Ashby with name, email, phone, and social links. Returns the created candidate's ID and basic profile information.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      firstName: z.string().describe('First name of the candidate'),
      lastName: z.string().describe('Last name of the candidate'),
      email: z.string().optional().describe('Email address of the candidate'),
      emailType: z
        .enum(['Personal', 'Work', 'Other'])
        .optional()
        .default('Personal')
        .describe('Type of the email address'),
      phone: z.string().optional().describe('Phone number of the candidate'),
      phoneType: z
        .enum(['Personal', 'Work', 'Other', 'Mobile'])
        .optional()
        .default('Personal')
        .describe('Type of the phone number'),
      socialLinks: z
        .array(
          z.object({
            type: z.string().describe('Type of social link (e.g. LinkedIn, GitHub, Twitter)'),
            url: z.string().describe('URL of the social profile')
          })
        )
        .optional()
        .describe('Array of social profile links for the candidate')
    })
  )
  .output(
    z.object({
      candidateId: z.string().describe('Unique ID of the created candidate'),
      name: z.string().describe('Full name of the candidate'),
      primaryEmail: z.string().optional().describe('Primary email address of the candidate'),
      primaryPhone: z.string().optional().describe('Primary phone number of the candidate'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AshbyClient({ token: ctx.auth.token });

    let params: Record<string, any> = {
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName
    };

    if (ctx.input.email !== undefined) {
      params.primaryEmailAddress = {
        value: ctx.input.email,
        type: ctx.input.emailType || 'Personal',
        isPrimary: true
      };
    }

    if (ctx.input.phone !== undefined) {
      params.primaryPhoneNumber = {
        value: ctx.input.phone,
        type: ctx.input.phoneType || 'Personal',
        isPrimary: true
      };
    }

    if (ctx.input.socialLinks !== undefined) {
      params.socialLinks = ctx.input.socialLinks;
    }

    let result = await client.createCandidate(params as any);
    let candidate = result.results;

    let output = {
      candidateId: candidate.id,
      name: candidate.name || `${ctx.input.firstName} ${ctx.input.lastName}`,
      primaryEmail: candidate.primaryEmailAddress?.value || ctx.input.email,
      primaryPhone: candidate.primaryPhoneNumber?.value || ctx.input.phone,
      createdAt: candidate.createdAt
    };

    return {
      output,
      message: `Created candidate **${output.name}**${output.primaryEmail ? ` (${output.primaryEmail})` : ''}`
    };
  })
  .build();
