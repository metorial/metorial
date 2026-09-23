import { SlateTool } from 'slates';
import { z } from 'zod';
import {
  GOOGLE_DRIVE_LABELS_MAX_PAGE_SIZE,
  GoogleDriveLabelsClient,
  resolveDriveLabelName
} from '../lib/labels-client';
import { googleDriveActionScopes } from '../scopes';
import { spec } from '../spec';

let labelChoiceSchema = z.object({
  choiceId: z.string().optional().describe('Selection choice ID'),
  displayName: z.string().optional().describe('Choice display name'),
  description: z.string().optional().describe('Choice description'),
  lifecycleState: z.string().optional().describe('Choice lifecycle state')
});

let labelFieldSchema = z.object({
  fieldId: z.string().optional().describe('Field ID, unique within the label'),
  queryKey: z
    .string()
    .optional()
    .describe('Key to use in Drive search queries for this field, e.g. labels/{id}.{fieldId}'),
  displayName: z.string().optional().describe('Field display name'),
  required: z.boolean().optional().describe('Whether the field must be set when applying'),
  type: z
    .enum(['text', 'integer', 'date', 'selection', 'user'])
    .optional()
    .describe('Field value type'),
  lifecycleState: z.string().optional().describe('Field lifecycle state'),
  hasUnpublishedChanges: z
    .boolean()
    .optional()
    .describe('Whether the field has draft changes that are not published yet'),
  choices: z.array(labelChoiceSchema).optional().describe('Choices for a selection field')
});

let driveLabelSchema = z.object({
  labelName: z.string().describe('Label resource name, labels/{id} or labels/{id}@{revision}'),
  labelId: z.string().optional().describe('Globally unique label ID'),
  revisionId: z.string().optional().describe('Label revision ID'),
  labelType: z.string().optional().describe('Label type: SHARED, ADMIN, or GOOGLE_APP'),
  title: z.string().optional().describe('Label title'),
  description: z.string().optional().describe('Label description'),
  lifecycleState: z
    .string()
    .optional()
    .describe('Lifecycle state: UNPUBLISHED_DRAFT, PUBLISHED, DISABLED, or DELETED'),
  hasUnpublishedChanges: z
    .boolean()
    .optional()
    .describe('Whether the label has draft changes that are not published yet'),
  disabledPolicy: z
    .object({
      hideInSearch: z.boolean().optional(),
      showInApply: z.boolean().optional()
    })
    .optional()
    .describe('How a disabled label is shown in Drive search and apply menus'),
  customer: z.string().optional().describe('Customer that owns the label'),
  learnMoreUri: z.string().optional().describe('Custom help URL shown to users'),
  creatorPerson: z
    .string()
    .optional()
    .describe('People API resource name of the label creator, e.g. people/12345'),
  createTime: z.string().optional().describe('Label creation time'),
  revisionCreateTime: z.string().optional().describe('Creation time of this revision'),
  publisherPerson: z
    .string()
    .optional()
    .describe('People API resource name of the user who published the label'),
  publishTime: z.string().optional().describe('Time the label was published'),
  disablerPerson: z
    .string()
    .optional()
    .describe('People API resource name of the user who disabled the label'),
  disableTime: z.string().optional().describe('Time the label was disabled'),
  canApply: z
    .boolean()
    .optional()
    .describe('Whether the user can apply this label to Drive items'),
  canRead: z.boolean().optional().describe('Whether the user can read label values on items'),
  canUpdateSchema: z
    .boolean()
    .optional()
    .describe('Whether the user can change this label definition'),
  canDeleteSchema: z.boolean().optional().describe('Whether the user can delete this label'),
  canDisableSchema: z.boolean().optional().describe('Whether the user can disable this label'),
  canEnableSchema: z.boolean().optional().describe('Whether the user can enable this label'),
  fields: z
    .array(labelFieldSchema)
    .optional()
    .describe('Label fields in priority order; returned for the full view')
});

let viewSchema = z
  .enum(['LABEL_VIEW_BASIC', 'LABEL_VIEW_FULL'])
  .optional()
  .describe(
    'LABEL_VIEW_FULL (default) returns fields, lifecycle, and capabilities; LABEL_VIEW_BASIC returns only the ID, revision, type, and title'
  );

let languageCodeSchema = z
  .string()
  .trim()
  .min(1)
  .optional()
  .describe('BCP-47 language code for localized field labels, e.g. "en"');

export let listDriveLabelsTool = SlateTool.create(spec, {
  name: 'List Drive Labels',
  key: 'list_drive_labels',
  description:
    "List the Google Drive label definitions (taxonomies) the user can see, including each label's fields and selection choices. Use the returned field query keys to search or apply labels on files.",
  instructions: [
    'Set publishedOnly to true to return only published revisions; by default the latest (possibly draft) revision of labels you can edit is returned.',
    'minimumRole limits results to labels where the user has at least that role (READER by default).',
    'Pagination: reuse the same filters with nextPageToken.'
  ],
  constraints: ['Labels require a Google Workspace edition that supports Drive labels.'],
  tags: {
    readOnly: true
  }
})
  .scopes(googleDriveActionScopes.listDriveLabels)
  .input(
    z.object({
      publishedOnly: z
        .boolean()
        .optional()
        .describe(
          'true returns only published revisions; false (the default) returns the latest revision, which may be an unpublished draft'
        ),
      minimumRole: z
        .enum(['READER', 'APPLIER', 'ORGANIZER', 'EDITOR'])
        .optional()
        .describe('Only return labels where the user has at least this role'),
      customer: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Customer to scope the request to, e.g. customers/abcd1234'),
      view: viewSchema,
      languageCode: languageCodeSchema,
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(GOOGLE_DRIVE_LABELS_MAX_PAGE_SIZE)
        .optional()
        .describe('Maximum labels per page (1-200, default 50)'),
      pageToken: z.string().trim().min(1).optional().describe('Token for the next page')
    })
  )
  .output(
    z.object({
      labels: z.array(driveLabelSchema).describe('Labels on this page'),
      nextPageToken: z.string().optional().describe('Token for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleDriveLabelsClient(ctx.auth.token);
    let result = await client.listLabels({
      publishedOnly: ctx.input.publishedOnly,
      minimumRole: ctx.input.minimumRole,
      customer: ctx.input.customer,
      view: ctx.input.view ?? 'LABEL_VIEW_FULL',
      languageCode: ctx.input.languageCode,
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken
    });

    return {
      output: result,
      message: `Found **${result.labels.length}** Drive label(s)${result.nextPageToken ? ' (more pages available)' : ''}.`
    };
  })
  .build();

export let getDriveLabelTool = SlateTool.create(spec, {
  name: 'Get Drive Label',
  key: 'get_drive_label',
  description:
    'Get one Google Drive label definition by ID or resource name, including its fields, selection choices, lifecycle state, and what the user can do with it.',
  instructions: [
    'Call list_drive_labels to discover label IDs.',
    'Append @published, @latest, or @{revisionId} to label to read a specific revision; the default is the latest revision.'
  ],
  constraints: ['Labels require a Google Workspace edition that supports Drive labels.'],
  tags: {
    readOnly: true
  }
})
  .scopes(googleDriveActionScopes.getDriveLabel)
  .input(
    z.object({
      label: z
        .string()
        .trim()
        .min(1)
        .describe(
          'Label ID or labels/{id} resource name, optionally with @latest, @published, or @{revisionId}. Call list_drive_labels to discover labels.'
        ),
      view: viewSchema,
      languageCode: languageCodeSchema
    })
  )
  .output(driveLabelSchema)
  .handleInvocation(async ctx => {
    let client = new GoogleDriveLabelsClient(ctx.auth.token);
    let label = await client.getLabel(resolveDriveLabelName(ctx.input.label), {
      view: ctx.input.view ?? 'LABEL_VIEW_FULL',
      languageCode: ctx.input.languageCode
    });

    return {
      output: label,
      message: `Retrieved Drive label **${label.title ?? label.labelName}** (${label.lifecycleState ?? 'unknown state'}).`
    };
  })
  .build();
