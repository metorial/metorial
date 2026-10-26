import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { createHighLevelClient } from '../lib/client';
import { highLevelScope } from '../lib/scopes';
import { spec } from '../spec';

const templateSchema = z.object({
  id: z.string(),
  name: z.string(),
  editorType: z.enum(['html', 'text']),
  isPlainText: z.boolean(),
  parentFolderId: z.string().optional(),
  fromName: z.string().optional(),
  fromEmail: z.string().optional(),
  subjectLine: z.string().optional(),
  previewText: z.string().optional(),
  previewUrl: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  traceId: z.string().optional()
});
type EmailTemplate = z.infer<typeof templateSchema>;

export const emailsCreateTemplate = SlateTool.create(spec, {
  key: 'emails_create_template',
  name: 'Create Email Template',
  description:
    'Create an HTML or plain-text email template, or import a public Mailchimp or ActiveCampaign template URL. This does not send email.',
  tags: { readOnly: false }
})
  .scopes(highLevelScope('emails/templates.write'))
  .input(
    z.object({
      mode: z
        .enum(['content', 'import'])
        .describe(
          'content creates a template from HTML/text; import retrieves a public provider template URL.'
        ),
      name: z
        .string()
        .min(1)
        .optional()
        .describe('Template name. Required for content mode; optional for import mode.'),
      editorType: z
        .enum(['html', 'text'])
        .optional()
        .describe(
          'Required in content mode; html uses the code editor and text creates plain text.'
        ),
      editorContent: z
        .string()
        .optional()
        .describe('Optional initial HTML or plain-text content. Only valid in content mode.'),
      subjectLine: z.string().optional().describe('Subject line. Only valid in content mode.'),
      fromName: z
        .string()
        .optional()
        .describe('Sender display name. Only valid in content mode.'),
      fromEmail: z
        .string()
        .email()
        .optional()
        .describe('Sender email address. Only valid in content mode.'),
      previewText: z
        .string()
        .optional()
        .describe('Inbox preview text. Only valid in content mode.'),
      importProvider: z
        .enum(['mailchimp', 'active_campaign'])
        .optional()
        .describe('Required in import mode; provider hosting the public template.'),
      importUrl: z
        .string()
        .url()
        .optional()
        .describe(
          'Required in import mode; public HTTP(S) template URL for the selected provider.'
        ),
      parentFolderId: z
        .string()
        .min(1)
        .optional()
        .describe(
          'Destination folder ID. Use emails_fetch_template with include=folders to discover folders.'
        ),
      userId: z
        .string()
        .min(1)
        .optional()
        .describe(
          'ID of the HighLevel user performing the action, if required by your account.'
        )
    })
  )
  .output(z.object({ locationId: z.string(), template: templateSchema }))
  .handleInvocation(async ctx => {
    const input = ctx.input;
    const client = createHighLevelClient(ctx.auth);
    let body: Record<string, unknown>;
    let path = `/emails/locations/${encodeURIComponent(client.locationId)}/templates`;
    if (input.mode === 'content') {
      if (!input.name || !input.editorType) {
        throw createApiServiceError(
          'Content mode requires name and editorType (html or text).'
        );
      }
      if (input.importProvider !== undefined || input.importUrl !== undefined) {
        throw createApiServiceError(
          'Remove importProvider and importUrl when using content mode.'
        );
      }
      body = pickDefined({
        name: input.name,
        editorType: input.editorType,
        editorContent: input.editorContent,
        subjectLine: input.subjectLine,
        fromName: input.fromName,
        fromEmail: input.fromEmail,
        previewText: input.previewText,
        parentFolderId: input.parentFolderId,
        userId: input.userId
      });
    } else {
      if (!input.importProvider || !input.importUrl) {
        throw createApiServiceError(
          'Import mode requires importProvider (mailchimp or active_campaign) and a public importUrl.'
        );
      }
      if (
        [
          input.editorType,
          input.editorContent,
          input.subjectLine,
          input.fromName,
          input.fromEmail,
          input.previewText
        ].some(value => value !== undefined)
      ) {
        throw createApiServiceError(
          'Remove editorType, editorContent, subjectLine, fromName, fromEmail, and previewText when using import mode.'
        );
      }
      const url = new URL(input.importUrl);
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
        throw createApiServiceError(
          'Use a public HTTP(S) import URL without embedded credentials.'
        );
      }
      path += '/import';
      body = pickDefined({
        importProvider: input.importProvider,
        importUrl: input.importUrl,
        name: input.name,
        parentFolderId: input.parentFolderId,
        userId: input.userId
      });
    }
    const template = await client.request<EmailTemplate>({
      method: 'POST',
      path,
      scope: 'emails/templates.write',
      body
    });
    return {
      output: { locationId: client.locationId, template },
      message: `Email template ${template.id} ${input.mode === 'import' ? 'imported' : 'created'}. No email was sent.`
    };
  })
  .build();

const templateListItem = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['template', 'folder']),
  editorType: z.string().optional(),
  isPlainText: z.boolean().optional(),
  parentFolderId: z.string().nullable().optional(),
  subjectLine: z.string().optional(),
  previewUrl: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});
export const emailsFetchTemplate = SlateTool.create(spec, {
  key: 'emails_fetch_template',
  name: 'List Email Templates',
  description:
    'Retrieve one bounded page of email templates or folders in the connected sub-account, including IDs for later use.',
  tags: { readOnly: true }
})
  .scopes(highLevelScope('emails/templates.readonly'))
  .input(
    z.object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(20)
        .default(10)
        .describe('Maximum number of items, from 1 to 20.'),
      offset: z.number().int().min(0).default(0).describe('Number of matching items to skip.'),
      search: z.string().optional().describe('Search text for template and folder names.'),
      sortBy: z
        .literal('updatedAt')
        .optional()
        .describe('Sort by the last modification timestamp.'),
      sortOrder: z
        .enum(['asc', 'desc'])
        .optional()
        .describe('Ascending or descending sort order.'),
      archived: z.boolean().default(false).describe('Whether to retrieve archived templates.'),
      folderId: z
        .string()
        .optional()
        .describe(
          'Parent folder ID, or root for the root folder. Discover folder IDs with include=folders.'
        ),
      include: z
        .enum(['all', 'templates', 'folders'])
        .default('templates')
        .describe('Whether to include templates, folders, or both.')
    })
  )
  .output(
    z.object({
      locationId: z.string(),
      items: z.array(templateListItem),
      total: z.number(),
      limit: z.number(),
      offset: z.number(),
      nextOffset: z.number().optional(),
      traceId: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = createHighLevelClient(ctx.auth);
    const result = await client.request<{
      items: z.infer<typeof templateListItem>[];
      total: number;
      traceId?: string;
    }>({
      method: 'GET',
      path: `/emails/locations/${encodeURIComponent(client.locationId)}/templates`,
      scope: 'emails/templates.readonly',
      query: pickDefined(ctx.input)
    });
    const { offset, limit } = ctx.input;
    return {
      output: {
        locationId: client.locationId,
        items: result.items,
        total: result.total,
        limit,
        offset,
        nextOffset: offset + limit < result.total ? offset + limit : undefined,
        traceId: result.traceId
      },
      message: `Returned ${result.items.length} email template or folder records.`
    };
  })
  .build();

export const emailsTools = [emailsCreateTemplate, emailsFetchTemplate];
