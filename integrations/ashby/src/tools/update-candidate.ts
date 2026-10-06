import { SlateTool } from 'slates';
import { z } from 'zod';
import { AshbyClient } from '../lib/client';
import {
  contactType,
  email,
  id,
  invalid,
  pageSchema,
  row,
  socialLinks,
  str,
  text,
  warningsSchema
} from '../lib/contracts';
import { spec } from '../spec';

export let updateCandidateTool = SlateTool.create(spec, {
  name: 'Update Candidate',
  key: 'update_candidate',
  description: `Updates a candidate's profile in Ashby. Supports changing name, email, phone, social links, adding tags, creating notes, and assigning to projects. Multiple operations can be performed in a single call.`,
  instructions: [
    'Provide candidateId along with the fields you want to update.',
    'To add a tag, provide tagId. To add a note, provide note text. To add to a project, provide projectId.',
    'Profile fields (name, email, phone, socialLinks) are updated in a single API call.',
    'Tag, note, and project operations are performed as separate actions.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      candidateId: z.string().describe('Candidate ID to update'),
      name: z.string().optional().describe('New full name for the candidate'),
      email: z.string().optional().describe('Email address to set as primary'),
      emailType: z
        .enum(['Personal', 'Work', 'Other'])
        .optional()
        .describe('Type of email address'),
      phone: z.string().optional().describe('Phone number to set as primary'),
      phoneType: z
        .enum(['Personal', 'Work', 'Other', 'Mobile'])
        .optional()
        .describe('Type of phone number'),
      socialLinks: z
        .array(
          z.object({
            type: z.string().describe('Social link type (e.g., LinkedIn, GitHub, Twitter)'),
            url: z.string().describe('Social link URL')
          })
        )
        .optional()
        .describe('Social links to set on the candidate profile'),
      tagId: z.string().optional().describe('Tag ID to add to the candidate'),
      note: z.string().optional().describe('Note text to add to the candidate'),
      projectId: z.string().optional().describe('Project ID to add the candidate to'),
      sendNotifications: z
        .boolean()
        .optional()
        .describe(
          'Whether profile-update subscribers should be notified. The provider defaults to true; notes are created without subscriber notifications.'
        )
    })
  )
  .output(
    z.object({
      candidateId: z.string().describe('Candidate ID'),
      name: z.string().describe('Candidate full name'),
      updatedAt: z.string().describe('Last updated timestamp'),
      warnings: warningsSchema,
      pageInfo: pageSchema.optional(),
      completedActions: z.array(z.string()).optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = new AshbyClient(ctx.auth),
      input = ctx.input;
    const candidateId = id(input.candidateId, 'Candidate ID');
    contactType(input.emailType, input.email, 'email');
    contactType(input.phoneType, input.phone, 'phoneNumber');
    const profile = {
      name: input.name === undefined ? undefined : text(input.name, 'Name'),
      email: input.email === undefined ? undefined : email(input.email),
      phoneNumber: input.phone === undefined ? undefined : text(input.phone, 'Phone'),
      socialLinks:
        input.socialLinks === undefined ? undefined : socialLinks(input.socialLinks),
      sendNotifications: input.sendNotifications
    };
    const tagId = input.tagId === undefined ? undefined : id(input.tagId, 'Tag ID'),
      projectId =
        input.projectId === undefined ? undefined : id(input.projectId, 'Project ID'),
      note = input.note === undefined ? undefined : text(input.note, 'Note');
    const steps: { label: string; run: () => Promise<unknown> }[] = [];
    if (
      Object.entries(profile).some(
        ([key, value]) => key !== 'sendNotifications' && value !== undefined
      )
    )
      steps.push({
        label: 'candidate.update',
        run: () => client.exact('/candidate.update', { candidateId, ...profile }, candidateId)
      });
    if (tagId !== undefined)
      steps.push({
        label: 'candidate.addTag',
        run: () => client.post('/candidate.addTag', { candidateId, tagId })
      });
    if (note !== undefined)
      steps.push({
        label: 'candidate.createNote',
        run: () =>
          client.post('/candidate.createNote', { candidateId, note, sendNotifications: false })
      });
    if (projectId !== undefined)
      steps.push({
        label: 'candidate.addProject',
        run: () => client.post('/candidate.addProject', { candidateId, projectId })
      });
    if (!steps.length) invalid('Provide at least one profile, tag, note or project change.');
    let candidate: Record<string, unknown> = {};
    const completedActions = await client.sequence([
      ...steps,
      {
        label: 'candidate.readback',
        run: async () => {
          candidate = row((await client.getCandidate(candidateId)).results);
        }
      }
    ]);
    return {
      output: {
        candidateId: str(candidate.id),
        name: str(candidate.name),
        updatedAt: str(candidate.updatedAt),
        warnings: client.warnings,
        completedActions
      },
      message:
        'Candidate operations accepted and exact state read back. Operations are not atomic; notes and recruiting history may be retained.'
    };
  })
  .build();
