import { SlateTool } from 'slates';
import { z } from 'zod';
import { ProAbonoClient } from '../lib/client';
import { spec } from '../spec';

let offerFeatureSchema = z
  .object({
    referenceFeature: z.string().optional(),
    titleLocalized: z.string().optional(),
    descriptionLocalized: z.string().optional(),
    isIncluded: z.boolean().optional(),
    isEnabled: z.boolean().optional(),
    quantityIncluded: z.number().optional(),
    quantityCurrent: z.number().optional()
  })
  .describe('Feature included in an offer');

let offerSchema = z.object({
  offerId: z.number().optional().describe('ProAbono internal offer ID'),
  referenceOffer: z.string().optional().describe('Offer reference identifier'),
  titleLocalized: z.string().optional().describe('Localized offer title'),
  descriptionLocalized: z.string().optional().describe('Localized offer description'),
  isVisible: z.boolean().optional().describe('Whether offer is visible'),
  currency: z.string().optional().describe('Currency code'),
  amountUpFront: z.number().optional().describe('Setup/initial fee in cents'),
  amountTrial: z.number().optional().describe('Trial period charge in cents'),
  amountRecurrence: z.number().optional().describe('Recurring amount in cents'),
  durationRecurrence: z.number().optional().describe('Billing cycle duration'),
  unitRecurrence: z.string().optional().describe('Billing cycle unit (Day, Month, Year)'),
  amountTermination: z.number().optional().describe('Termination fee in cents'),
  features: z.array(offerFeatureSchema).optional().describe('Features included in the offer'),
  links: z.array(z.any()).optional().describe('Navigation and subscription links')
});

export let manageOffers = SlateTool.create(spec, {
  name: 'Get Offers',
  key: 'get_offers',
  description: `Retrieve offers (pricing plans) configured in ProAbono.
Returns pricing details, features, trial info, and localized labels.
Can retrieve offers for a specific customer (with personalized links), or list upgrade-eligible offers.`,
  instructions: [
    'Use "get" with referenceOffer to retrieve a single offer.',
    'Use "list" to browse all offers; pass referenceCustomer to get customer-specific links.',
    'Set upgradeMode=true with referenceCustomer to get upgrade-eligible offers only.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      action: z.enum(['get', 'list']).describe('Action to perform'),
      referenceOffer: z.string().optional().describe('Offer reference for single retrieval'),
      referenceCustomer: z
        .string()
        .optional()
        .describe('Customer reference for personalized offers'),
      referenceSegment: z.string().optional().describe('Segment reference filter'),
      language: z.string().optional().describe('Override language (ISO 639-1)'),
      isVisible: z.boolean().optional().describe('Filter by visibility'),
      upgradeMode: z
        .boolean()
        .optional()
        .describe('Show only upgrade-eligible offers (requires referenceCustomer)'),
      includeHtml: z.boolean().optional().describe('Return HTML-formatted descriptions'),
      ignoreFeatures: z.boolean().optional().describe('Exclude feature details from response'),
      page: z.number().optional().describe('Page number'),
      sizePage: z.number().optional().describe('Items per page')
    })
  )
  .output(
    z.object({
      offer: offerSchema.optional().describe('Single offer details'),
      offers: z.array(offerSchema).optional().describe('List of offers'),
      totalItems: z.number().optional().describe('Total items for list'),
      page: z.number().optional().describe('Current page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ProAbonoClient({
      token: ctx.auth.token,
      apiEndpoint: ctx.config.apiEndpoint
    });

    let { action } = ctx.input;

    if (action === 'get') {
      if (!ctx.input.referenceOffer) throw new Error('referenceOffer is required for get');
      let result = await client.getOffer({
        ReferenceOffer: ctx.input.referenceOffer,
        ReferenceCustomer: ctx.input.referenceCustomer,
        Language: ctx.input.language,
        Html: ctx.input.includeHtml
      });
      let offer = mapOffer(result);
      return {
        output: { offer },
        message: `Retrieved offer **${offer.referenceOffer}** — ${offer.titleLocalized || 'untitled'} (${offer.amountRecurrence != null ? `${offer.amountRecurrence} cents` : 'free'} / ${offer.unitRecurrence || 'n/a'})`
      };
    }

    if (action === 'list') {
      let result = await client.listOffers({
        ReferenceCustomer: ctx.input.referenceCustomer,
        ReferenceSegment: ctx.input.referenceSegment || ctx.config.defaultSegment,
        IsVisible: ctx.input.isVisible,
        Language: ctx.input.language,
        Html: ctx.input.includeHtml,
        IgnoreFeatures: ctx.input.ignoreFeatures,
        UpgradeMode: ctx.input.upgradeMode,
        Page: ctx.input.page,
        SizePage: ctx.input.sizePage
      });
      let items = result?.Items || [];
      let offers = items.map(mapOffer);
      return {
        output: {
          offers,
          totalItems: result?.TotalItems,
          page: result?.Page
        },
        message: `Found **${offers.length}** offers (total: ${result?.TotalItems || 0})`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();

let mapOffer = (raw: any) => ({
  offerId: raw?.Id,
  referenceOffer: raw?.ReferenceOffer,
  titleLocalized: raw?.TitleLocalized,
  descriptionLocalized: raw?.DescriptionLocalized,
  isVisible: raw?.IsVisible,
  currency: raw?.Currency,
  amountUpFront: raw?.AmountUpFront,
  amountTrial: raw?.AmountTrial,
  amountRecurrence: raw?.AmountRecurrence,
  durationRecurrence: raw?.DurationRecurrence,
  unitRecurrence: raw?.UnitRecurrence,
  amountTermination: raw?.AmountTermination,
  features: raw?.Features?.map((f: any) => ({
    referenceFeature: f?.ReferenceFeature,
    titleLocalized: f?.TitleLocalized,
    descriptionLocalized: f?.DescriptionLocalized,
    isIncluded: f?.IsIncluded,
    isEnabled: f?.IsEnabled,
    quantityIncluded: f?.QuantityIncluded,
    quantityCurrent: f?.QuantityCurrent
  })),
  links: raw?.Links
});
