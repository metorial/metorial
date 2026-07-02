import { z } from 'zod';

export let pictureSchema = z
  .object({
    thumb20: z.string().optional(),
    thumb24: z.string().optional(),
    thumb32: z.string().optional(),
    thumb48: z.string().optional(),
    thumb64: z.string().optional(),
    thumb128: z.string().optional(),
    thumb256: z.string().optional()
  })
  .optional();

export let userSchema = z.object({
  userId: z.number().describe('Unique identifier for the user'),
  email: z.string().describe('Email address of the user'),
  firstName: z.string().optional().describe('First name of the user'),
  lastName: z.string().optional().describe('Last name of the user'),
  name: z.string().optional().describe('Full name of the user'),
  role: z
    .string()
    .optional()
    .describe('Role of the user (admin, agent, collaborator, customer)'),
  agent: z.boolean().optional().describe('Whether the user is an agent'),
  imageUrl: z.string().optional().describe('Thumbnail URL of the user avatar')
});

export let labelSchema = z.object({
  name: z.string().describe('Label name'),
  color: z.string().optional().describe('Label color hex code')
});

export let contentSchema = z.object({
  text: z.string().optional().describe('Plain text content'),
  html: z.string().optional().describe('HTML content'),
  attachments: z.array(z.any()).optional().describe('File attachments')
});

export let ticketRequesterSchema = z.object({
  userId: z.number().optional().describe('Requester user ID'),
  email: z.string().optional().describe('Requester email address'),
  name: z.string().optional().describe('Requester name')
});

export let ticketSchema = z.object({
  ticketId: z.number().describe('Unique ticket identifier'),
  subject: z.string().describe('Ticket subject line'),
  repliesCount: z.number().optional().describe('Number of replies on the ticket'),
  commentsCount: z.number().optional().describe('Number of internal comments'),
  archived: z.boolean().optional().describe('Whether the ticket is archived'),
  spam: z.boolean().optional().describe('Whether the ticket is marked as spam'),
  trash: z.boolean().optional().describe('Whether the ticket is trashed'),
  starred: z.boolean().optional().describe('Whether the ticket is starred'),
  unanswered: z.boolean().optional().describe('Whether the ticket is unanswered'),
  createdAt: z.string().optional().describe('Ticket creation timestamp'),
  lastActivityAt: z.string().optional().describe('Timestamp of last activity on the ticket'),
  requester: ticketRequesterSchema.optional().describe('The person who submitted the ticket'),
  currentUserAssignee: userSchema
    .optional()
    .nullable()
    .describe('User assigned to the ticket'),
  currentTeamAssignee: z
    .object({
      teamId: z.number().describe('Assigned team ID'),
      name: z.string().optional().describe('Assigned team name')
    })
    .optional()
    .nullable()
    .describe('Team assigned to the ticket'),
  labels: z.array(labelSchema).optional().describe('Labels applied to the ticket'),
  content: contentSchema.optional().describe('Ticket body content')
});

export let replySchema = z.object({
  replyId: z.number().describe('Unique reply identifier'),
  createdAt: z.string().optional().describe('Reply creation timestamp'),
  summary: z.string().optional().describe('Summary of the reply content'),
  cc: z.array(z.string()).optional().describe('CC recipients'),
  bcc: z.array(z.string()).optional().describe('BCC recipients'),
  replier: userSchema.optional().describe('Agent or customer who posted the reply'),
  content: contentSchema.optional().describe('Reply body content')
});

export let commentSchema = z.object({
  commentId: z.number().describe('Unique comment identifier'),
  createdAt: z.string().optional().describe('Comment creation timestamp'),
  commenter: userSchema.optional().describe('Agent who posted the comment'),
  content: contentSchema.optional().describe('Comment body content')
});

export let teamSchema = z.object({
  teamId: z.number().describe('Unique team identifier'),
  name: z.string().describe('Team name')
});

export let snippetSchema = z.object({
  snippetId: z.number().describe('Unique snippet identifier'),
  name: z.string().describe('Snippet name/title'),
  tags: z.string().optional().describe('Comma-separated tags for the snippet'),
  createdAt: z.string().optional().describe('Snippet creation timestamp'),
  content: z
    .object({
      text: z.string().optional().describe('Plain text content'),
      html: z.string().optional().describe('HTML content')
    })
    .optional()
    .describe('Snippet body content')
});

export let emailSchema = z.object({
  emailId: z.number().describe('Unique email address identifier'),
  email: z.string().describe('The email address'),
  name: z.string().optional().describe('Display name for the email'),
  isDefault: z.boolean().optional().describe('Whether this is the default email'),
  createdAt: z.string().optional().describe('Email creation timestamp')
});

export type Ticket = z.infer<typeof ticketSchema>;
export type Reply = z.infer<typeof replySchema>;
export type Comment = z.infer<typeof commentSchema>;
export type User = z.infer<typeof userSchema>;
export type Team = z.infer<typeof teamSchema>;
export type Label = z.infer<typeof labelSchema>;
export type Snippet = z.infer<typeof snippetSchema>;
export type Email = z.infer<typeof emailSchema>;
