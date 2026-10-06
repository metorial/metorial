import { SlateTool } from 'slates';
import { z } from 'zod';
import { AshbyClient } from '../lib/client';
import {
  contactType,
  email,
  id,
  optionalString,
  pageSchema,
  row,
  socialLinks,
  str,
  text,
  warningsSchema
} from '../lib/contracts';
import { spec } from '../spec';

export let createCandidateTool = SlateTool.create(spec, {
  name: 'Create Candidate',
  key: 'create_candidate',
  description: `Creates a candidate with a full name and primary personal email/phone. Social links are set with a separate documented update; these operations are not atomic. Other legacy contact types are rejected before writes.`,
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
      createdAt: z.string().describe('Creation timestamp'),
      warnings: warningsSchema,
      pageInfo: pageSchema.optional(),
      completedActions: z.array(z.string()).optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = new AshbyClient(ctx.auth);
    const name = `${text(ctx.input.firstName, 'First name')} ${text(ctx.input.lastName, 'Last name')}`;
    contactType(ctx.input.emailType, ctx.input.email, 'email');
    contactType(ctx.input.phoneType, ctx.input.phone, 'phoneNumber');
    const links =
      ctx.input.socialLinks === undefined ? undefined : socialLinks(ctx.input.socialLinks);
    const body = {
      name,
      email: ctx.input.email === undefined ? undefined : email(ctx.input.email),
      phoneNumber: ctx.input.phone === undefined ? undefined : text(ctx.input.phone, 'Phone')
    };
    let candidate: Record<string, unknown> = {};
    const steps = [
      {
        label: 'candidate.create',
        run: async () => {
          candidate = row((await client.post('/candidate.create', body)).results);
          id(candidate.id, 'Created candidate ID');
        }
      }
    ];
    if (links !== undefined)
      steps.push({
        label: 'candidate.update.socialLinks',
        run: async () => {
          candidate = row(
            (
              await client.exact(
                '/candidate.update',
                {
                  candidateId: str(candidate.id),
                  socialLinks: links,
                  sendNotifications: false
                },
                str(candidate.id)
              )
            ).results
          );
        }
      });
    const completedActions = await client.sequence(steps, () => ({
      candidateId: str(candidate.id)
    }));
    return {
      output: {
        candidateId: str(candidate.id),
        name: str(candidate.name),
        primaryEmail:
          candidate.primaryEmailAddress === null
            ? undefined
            : optionalString(row(candidate.primaryEmailAddress).value),
        primaryPhone:
          candidate.primaryPhoneNumber === null
            ? undefined
            : optionalString(row(candidate.primaryPhoneNumber).value),
        createdAt: str(candidate.createdAt),
        warnings: client.warnings,
        completedActions
      },
      message:
        'Candidate creation accepted. Review any warning codes; recruiting history may be retained.'
    };
  })
  .build();
