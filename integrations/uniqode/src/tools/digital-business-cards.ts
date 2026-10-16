import { SlateTool } from 'slates';
import { z } from 'zod';
import { BeaconstacClient } from '../lib/client';
import { resolveOrganizationId } from '../lib/organization';
import { spec } from '../spec';

let organizationId = z
  .number()
  .int()
  .positive()
  .optional()
  .describe(
    'Organization ID from list_organizations. Uses the configured default when omitted.'
  );
let cardId = z.number().int().positive().describe('Card ID from list_digital_business_cards');
let objectSchema = z.record(z.string(), z.unknown());
let customizations = z
  .object({
    background_color: z.string().describe('Background color'),
    user_info_color: z.string().describe('User information color'),
    secondary_color: z.string().describe('Secondary color'),
    typography: z
      .object({
        font_type: z.enum(['google', 'custom']),
        font_family: z.string().min(1),
        personal_info: objectSchema,
        company_details: objectSchema,
        contact_details: objectSchema,
        bio: objectSchema,
        button: objectSchema
      })
      .passthrough()
      .describe(
        'Typography settings including font_type, font_family, personal_info, company_details, contact_details, bio, and button'
      )
  })
  .passthrough();
let cardFields = {
  organizationId,
  firstName: z.string().min(1).describe('First name displayed on the card'),
  customizations: customizations.describe(
    'Required card colors and typography. Copy settings from an existing card or provide the documented typography structure.'
  ),
  lastName: z.string().optional(),
  company: z.string().optional(),
  designation: z.string().optional(),
  summary: z.string().optional(),
  cardTemplateId: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Optional organization card template ID'),
  fields: objectSchema
    .optional()
    .describe(
      'Additional documented card fields in provider spelling, such as phone_v2, email_v2, website_v2, social_links, layout, and lead_collection. Explicit tool fields take precedence.'
    )
};
let cardOutput = z.object({ card: objectSchema.describe('Complete provider card object') });

export let listDigitalBusinessCards = SlateTool.create(spec, {
  key: 'list_digital_business_cards',
  name: 'List Digital Business Cards',
  description:
    'List digital business cards with organization, state, owner, and page filters.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      organizationId,
      page: z.number().int().positive().optional(),
      pageSize: z.number().int().positive().optional(),
      state: z
        .enum(['A', 'S'])
        .optional()
        .describe('A for active cards, S for sleeping cards'),
      cardOwnerId: z.number().int().positive().optional()
    })
  )
  .output(
    z.object({
      raw: z
        .unknown()
        .describe('Complete provider list response, including pagination and card objects')
    })
  )
  .handleInvocation(async ctx => {
    let organization = resolveOrganizationId(
      ctx.input.organizationId,
      ctx.config.organizationId
    );
    let client = new BeaconstacClient(ctx.auth);
    let raw = await client.listCards({
      organization,
      page: ctx.input.page,
      page_size: ctx.input.pageSize,
      state: ctx.input.state,
      card_owner__is: ctx.input.cardOwnerId
    });
    return { output: { raw }, message: 'Retrieved digital business cards.' };
  })
  .build();

export let getDigitalBusinessCard = SlateTool.create(spec, {
  key: 'get_digital_business_card',
  name: 'Get Digital Business Card',
  description:
    'Retrieve a digital business card, including its contact fields, design, owner, and state.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({ cardId, organizationId }))
  .output(cardOutput)
  .handleInvocation(async ctx => {
    let organization = resolveOrganizationId(
      ctx.input.organizationId,
      ctx.config.organizationId
    );
    let card = await new BeaconstacClient(ctx.auth).getCard(ctx.input.cardId, organization);
    return { output: { card }, message: 'Retrieved the digital business card.' };
  })
  .build();

let buildCardData = (
  input: z.infer<z.ZodObject<typeof cardFields>>,
  organization: number
) => ({
  ...input.fields,
  organization,
  first_name: input.firstName,
  customizations: input.customizations,
  ...(input.lastName === undefined ? {} : { last_name: input.lastName }),
  ...(input.company === undefined ? {} : { company: input.company }),
  ...(input.designation === undefined ? {} : { designation: input.designation }),
  ...(input.summary === undefined ? {} : { summary: input.summary }),
  ...(input.cardTemplateId === undefined ? {} : { card_template: input.cardTemplateId })
});

export let createDigitalBusinessCard = SlateTool.create(spec, {
  key: 'create_digital_business_card',
  name: 'Create Digital Business Card',
  description:
    'Create a digital business card with contact information and required design settings.',
  tags: { readOnly: false, destructive: false }
})
  .input(z.object(cardFields))
  .output(cardOutput)
  .handleInvocation(async ctx => {
    let organization = resolveOrganizationId(
      ctx.input.organizationId,
      ctx.config.organizationId
    );
    let card = await new BeaconstacClient(ctx.auth).createCard(
      buildCardData(ctx.input, organization),
      organization
    );
    return { output: { card }, message: 'Created the digital business card.' };
  })
  .build();

export let updateDigitalBusinessCard = SlateTool.create(spec, {
  key: 'update_digital_business_card',
  name: 'Update Digital Business Card',
  description:
    'Update a digital business card. Uniqode requires first name and customizations in every update; retrieve the existing card first to retain its settings.',
  tags: { readOnly: false, destructive: false }
})
  .input(z.object({ cardId, ...cardFields }))
  .output(cardOutput)
  .handleInvocation(async ctx => {
    let organization = resolveOrganizationId(
      ctx.input.organizationId,
      ctx.config.organizationId
    );
    let card = await new BeaconstacClient(ctx.auth).updateCard(
      ctx.input.cardId,
      buildCardData(ctx.input, organization),
      organization
    );
    return { output: { card }, message: 'Updated the digital business card.' };
  })
  .build();

export let deleteDigitalBusinessCard = SlateTool.create(spec, {
  key: 'delete_digital_business_card',
  name: 'Delete Digital Business Card',
  description: 'Permanently delete a digital business card.',
  tags: { readOnly: false, destructive: true }
})
  .input(z.object({ cardId, organizationId }))
  .output(z.object({ raw: z.unknown().describe('Provider deletion response') }))
  .handleInvocation(async ctx => {
    let organization = resolveOrganizationId(
      ctx.input.organizationId,
      ctx.config.organizationId
    );
    let raw = await new BeaconstacClient(ctx.auth).deleteCard(ctx.input.cardId, organization);
    return { output: { raw }, message: 'Uniqode returned the card deletion response.' };
  })
  .build();

export let setDigitalBusinessCardState = SlateTool.create(spec, {
  key: 'set_digital_business_card_state',
  name: 'Set Digital Business Card State',
  description:
    'Activate or deactivate a digital business card. Uniqode rejects requests for a card already in the requested state.',
  tags: { readOnly: false, destructive: false }
})
  .input(z.object({ cardId, organizationId, active: z.boolean() }))
  .output(z.object({ raw: z.unknown().describe('Provider state-change response') }))
  .handleInvocation(async ctx => {
    let organization = resolveOrganizationId(
      ctx.input.organizationId,
      ctx.config.organizationId
    );
    let raw = await new BeaconstacClient(ctx.auth).setCardState(
      ctx.input.cardId,
      organization,
      ctx.input.active
    );
    return { output: { raw }, message: 'Uniqode returned the card state-change response.' };
  })
  .build();

export let digitalBusinessCardTools = [
  listDigitalBusinessCards,
  getDigitalBusinessCard,
  createDigitalBusinessCard,
  updateDigitalBusinessCard,
  deleteDigitalBusinessCard,
  setDigitalBusinessCardState
];
