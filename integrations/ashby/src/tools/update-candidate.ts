import { SlateTool } from 'slates';
import { z } from 'zod';
import { AshbyClient } from '../lib/client';
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
      projectId: z.string().optional().describe('Project ID to add the candidate to')
    })
  )
  .output(
    z.object({
      candidateId: z.string().describe('Candidate ID'),
      name: z.string().describe('Candidate full name'),
      updatedAt: z.string().describe('Last updated timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AshbyClient({ token: ctx.auth.token });
    let {
      candidateId,
      name,
      email,
      emailType,
      phone,
      phoneType,
      socialLinks,
      tagId,
      note,
      projectId
    } = ctx.input;

    // Update profile fields if any are provided
    if (
      name !== undefined ||
      email !== undefined ||
      phone !== undefined ||
      socialLinks !== undefined
    ) {
      let updateParams: Record<string, any> = {};

      if (name !== undefined) updateParams.name = name;

      if (email !== undefined) {
        updateParams.primaryEmailAddress = {
          value: email,
          type: emailType || 'Personal',
          isPrimary: true
        };
      }

      if (phone !== undefined) {
        updateParams.primaryPhoneNumber = {
          value: phone,
          type: phoneType || 'Personal',
          isPrimary: true
        };
      }

      if (socialLinks !== undefined) {
        updateParams.socialLinks = socialLinks;
      }

      await client.updateCandidate(candidateId, updateParams);
    }

    // Add tag if provided
    if (tagId) {
      await client.addCandidateTag(candidateId, tagId);
    }

    // Create note if provided
    if (note) {
      await client.createCandidateNote(candidateId, note);
    }

    // Add to project if provided
    if (projectId) {
      await client.addCandidateProject(candidateId, projectId);
    }

    // Fetch the final candidate state
    let result = await client.getCandidate(candidateId);
    let candidate = result.results;

    let candidateName =
      candidate.name ||
      [candidate.firstName, candidate.lastName].filter(Boolean).join(' ') ||
      'Unknown';

    return {
      output: {
        candidateId: candidate.id,
        name: candidateName,
        updatedAt: candidate.updatedAt || new Date().toISOString()
      },
      message: `Updated candidate **${candidateName}** (\`${candidate.id}\`).`
    };
  })
  .build();
