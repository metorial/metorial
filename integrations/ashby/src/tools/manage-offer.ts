import { SlateTool } from 'slates';
import { z } from 'zod';
import { AshbyClient } from '../lib/client';
import {
  id,
  invalid,
  mapOffer,
  pageInput,
  pageOutput,
  pageSchema,
  row,
  rows,
  str,
  text,
  unexpected,
  warningsSchema
} from '../lib/contracts';
import { spec } from '../spec';

let offerSchema = z.object({
  offerId: z.string().describe('Unique ID of the offer'),
  status: z.string().describe('Current status of the offer'),
  applicationId: z.string().optional().describe('Associated application ID'),
  createdAt: z
    .string()
    .optional()
    .describe(
      'Legacy top-level timestamp when the provider supplies it; native offer versions expose their own creation time.'
    ),
  updatedAt: z
    .string()
    .optional()
    .describe('Legacy top-level update time when supplied by the provider'),
  acceptanceStatus: z.string().optional(),
  latestVersion: z
    .object({
      offerVersionId: z.string(),
      createdAt: z.string(),
      approvalStatus: z.string().nullable().optional(),
      fileHandles: z.array(z.record(z.string(), z.unknown())).nullable().optional()
    })
    .nullable()
    .optional()
});

export let manageOfferTool = SlateTool.create(spec, {
  name: 'Manage Offer',
  key: 'manage_offer',
  description: `Reads/lists offers, submits native offer forms, starts a version in an existing prepared process, or force-approves the exact latest version. Process, form, application and version IDs are distinct; no approval or delivery is implied by form submission.`,
  instructions: [
    'Create requires an existing prepared offerProcessId, offerFormId and offerFields keyed by native form field paths. Starting an offer process is a separate provider prerequisite.',
    'To **get** an offer, set action to "get" and provide offerId.',
    'To **list** offers, set action to "list" with optional pagination parameters.',
    'To **update** an offer, set action to "update" and provide offerId and offerFields.',
    'To **approve** an offer, set action to "approve" and provide offerId.',
    'Start requires offerProcessId and returns offerFormId and formDefinition for a new version; it does not create or send an offer.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'list', 'update', 'approve', 'start'])
        .describe('The offer action to perform'),
      offerId: z
        .string()
        .optional()
        .describe(
          'Offer record ID (required for get, update and force approval; distinct from process/form/version IDs)'
        ),
      applicationId: z
        .string()
        .optional()
        .describe(
          'Application filter for list; not a substitute for the process/form IDs required by create'
        ),
      offerProcessId: z
        .string()
        .optional()
        .describe(
          'Prepared offer-process ID; required for create/start. This is distinct from an application or offer-version ID.'
        ),
      offerFormId: z
        .string()
        .optional()
        .describe('Offer form instance ID returned by start; required for create.'),
      offerVersionId: z
        .string()
        .optional()
        .describe(
          'Optional exact latest-version guard for force approval. Read the offer before selecting it.'
        ),
      syncToken: z.string().optional(),
      offerFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Offer form field values (for create and update)'),
      cursor: z.string().optional().describe('Pagination cursor (for list action)'),
      perPage: z.number().optional().describe('Number of results per page (for list action)')
    })
  )
  .output(
    z.object({
      offer: offerSchema
        .optional()
        .describe('Single offer result (for create, get, update, approve, start)'),
      offers: z.array(offerSchema).optional().describe('List of offers (for list action)'),
      nextCursor: z.string().optional().describe('Pagination cursor for the next page'),
      offerFormId: z.string().optional(),
      formDefinition: z.record(z.string(), z.unknown()).optional(),
      warnings: warningsSchema,
      pageInfo: pageSchema.optional(),
      completedActions: z.array(z.string()).optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = new AshbyClient(ctx.auth),
      input = ctx.input;
    pageInput(input);
    const offerId = input.offerId === undefined ? undefined : id(input.offerId, 'Offer ID');
    if (input.action === 'list') {
      const result = await client.list('/offer.list', input, {
        applicationId:
          input.applicationId === undefined
            ? undefined
            : id(input.applicationId, 'Application ID')
      });
      return {
        output: {
          offers: rows(result.results).map(mapOffer),
          ...pageOutput(result),
          warnings: client.warnings
        },
        message: 'Retrieved one offer page with native status and version identity.'
      };
    }
    if (input.cursor !== undefined || input.syncToken !== undefined)
      invalid('Pagination and sync tokens apply only to offer list.');
    if (input.action === 'start') {
      if (input.offerProcessId === undefined)
        invalid(
          'Starting an offer version requires offerProcessId from an existing offer process. offerId identifies an offer record and is not a substitute. Prepare the process in Ashby, then pass its documented ID.'
        );
      if (offerId !== undefined || input.applicationId !== undefined)
        invalid(
          'Use offerProcessId for start; offerId/applicationId cannot identify a new form instance.'
        );
      const result = await client.post('/offer.start', {
          offerProcessId: id(input.offerProcessId, 'Offer process ID')
        }),
        form = row(result.results);
      return {
        output: {
          offerFormId: str(form.id),
          formDefinition: row(form.formDefinition),
          warnings: client.warnings
        },
        message:
          'Created an offer-version form instance. Complete its fields and use its offerFormId with the same process when creating the offer.'
      };
    }
    if (input.action === 'create') {
      if (input.offerProcessId === undefined || input.offerFormId === undefined)
        invalid(
          'Offer creation requires offerProcessId and offerFormId from the prepared process and offer.start. applicationId alone cannot create an offer.'
        );
      if (input.applicationId !== undefined || offerId !== undefined)
        invalid(
          'Create routes by the explicit offerProcessId/offerFormId; omit legacy applicationId/offerId rather than guessing their relationship to a process.'
        );
    } else if (offerId === undefined) invalid('This action requires the exact offerId.');
    if (input.action === 'get') {
      return {
        output: {
          offer: mapOffer((await client.getOffer(offerId!)).results),
          warnings: client.warnings
        },
        message: 'Retrieved the exact offer and native version metadata.'
      };
    }
    if (input.action === 'approve') {
      const before = row((await client.getOffer(offerId!)).results),
        latest =
          before.latestVersion === null || before.latestVersion === undefined
            ? undefined
            : row(before.latestVersion);
      if (!latest)
        invalid(
          'The selected offer has no latest version to approve. Prepare the offer version first.'
        );
      const version = id(latest.id, 'Offer version ID');
      if (
        input.offerVersionId !== undefined &&
        id(input.offerVersionId, 'Offer version ID') !== version
      )
        invalid(
          'offerVersionId does not match the selected offer latest version. Read the exact offer and select the intended version.'
        );
      const result = await client.post('/offer.approve', { offerVersionId: version });
      const offer = mapOffer(result.results);
      if (offer.offerId !== offerId || offer.latestVersion?.offerVersionId !== version)
        invalid(
          'Force approval may have completed, but the returned latest offer version differs from the selected version. Read the exact offer before retrying; approval history may be retained.'
        );
      return {
        output: { offer, warnings: client.warnings },
        message:
          'Force approval accepted for the exact latest offer version. This overrides the offer approval process.'
      };
    }
    if (input.offerFields === undefined || !Object.keys(input.offerFields).length)
      invalid(
        'Provide nonempty offerFields keyed by documented form paths. Values are sent as fieldSubmissions, not routing fields.'
      );
    const fieldSubmissions = Object.entries(input.offerFields).map(([path, value]) => ({
      path: text(path, 'Offer field path'),
      value
    }));
    const body =
      input.action === 'create'
        ? {
            offerProcessId: id(input.offerProcessId, 'Offer process ID'),
            offerFormId: id(input.offerFormId, 'Offer form ID'),
            offerForm: { fieldSubmissions }
          }
        : { offerId, offerForm: { fieldSubmissions } };
    const result = await client.post(
        input.action === 'create' ? '/offer.create' : '/offer.update',
        body
      ),
      offer = mapOffer(result.results);
    if (input.action === 'update' && offer.offerId !== offerId) unexpected();
    return {
      output: { offer, warnings: client.warnings },
      message:
        'Offer form submission accepted. Review the returned native status; approval, acceptance and delivery are separate operations.'
    };
  })
  .build();
