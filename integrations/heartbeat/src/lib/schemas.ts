import { z } from 'zod';

// The official component schemas have no required-property lists. Keep omitted
// fields optional and preserve additional provider metadata without inventing values.
let groupReference = z
  .object({ id: z.string().optional(), name: z.string().optional() })
  .passthrough();

export let memberSchema = z
  .object({
    id: z.string().optional(),
    email: z.string().optional(),
    name: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    role: z.string().optional(),
    isAdmin: z.boolean().optional(),
    groups: z.array(groupReference).optional(),
    lastLogin: z.string().nullable().optional(),
    bio: z.string().optional(),
    avatar: z.string().optional()
  })
  .passthrough();

export let groupSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    color: z.string().optional(),
    parentGroupID: z.string().nullable().optional(),
    archived: z.boolean().optional(),
    users: z
      .array(
        z
          .object({
            id: z.string().optional(),
            name: z.string().optional(),
            email: z.string().optional()
          })
          .passthrough()
      )
      .optional()
  })
  .passthrough();

export let channelSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    emoji: z.string().optional(),
    type: z.string().optional(),
    isDraft: z.boolean().optional()
  })
  .passthrough();

export let commentSchema = z
  .object({
    id: z.string().optional(),
    userID: z.string().optional(),
    content: z.string().optional(),
    createdAt: z.string().optional(),
    images: z.array(z.string()).optional(),
    files: z.array(z.string()).optional()
  })
  .passthrough();

export let threadSchema = z
  .object({
    id: z.string().optional(),
    channelID: z.string().optional(),
    userID: z.string().optional(),
    content: z.string().optional(),
    createdAt: z.string().optional(),
    url: z.string().optional(),
    files: z.array(z.string()).optional(),
    comments: z.array(commentSchema).optional()
  })
  .passthrough();

export let eventSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    recurring: z.boolean().optional(),
    createdAt: z.string().optional(),
    createdBy: z.string().optional(),
    invitedUsers: z.array(z.string()).optional(),
    invitedGroups: z.array(z.string()).optional(),
    coverImage: z.string().nullable().optional()
  })
  .passthrough();

export let roleSchema = groupReference;

export let invitationSchema = z
  .object({
    id: z.string().optional(),
    code: z.string().optional(),
    role: roleSchema.optional(),
    groups: z.array(groupReference).optional()
  })
  .passthrough();

export let mutationSchema = z.object({
  httpStatus: z.number().describe('The actual HTTP status returned by Heartbeat'),
  response: z
    .unknown()
    .optional()
    .describe('The complete response returned by Heartbeat, if any')
});

export type Member = z.infer<typeof memberSchema>;
export type Group = z.infer<typeof groupSchema>;
export type Channel = z.infer<typeof channelSchema>;
export type Thread = z.infer<typeof threadSchema>;
export type Comment = z.infer<typeof commentSchema>;
export type Event = z.infer<typeof eventSchema>;
export type Role = z.infer<typeof roleSchema>;
export type Invitation = z.infer<typeof invitationSchema>;
