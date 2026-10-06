import { pickDefined } from 'slates';
import type { RedditAdsClient } from './client';
import {
  enumValue,
  id,
  integer,
  invalid,
  micro,
  type Row,
  required,
  row,
  strings,
  text,
  timestamp
} from './contracts';
import { REPORT_BREAKDOWNS, REPORT_FIELDS } from './report-fields';

const name = (value: unknown) => {
  const result = text(value, 'name');
  if (result.length < 3 || result.length > 500) invalid('name must contain 3–500 characters.');
  return result;
};
const status = (value: unknown) =>
  enumValue(value, ['ACTIVE', 'PAUSED', 'ARCHIVED', 'DELETED'], 'status');
const objectives = [
  'APP_INSTALLS',
  'BRAND_AWARENESS',
  'CATALOG_SALES',
  'CLICKS',
  'CONVERSIONS',
  'IMPRESSIONS',
  'LEAD_GENERATION',
  'SALES',
  'VIDEO_VIEWABLE_IMPRESSIONS'
];
const bids = ['CPC', 'CPM', 'CPV', 'CPV6', 'CPV15'];
const strategies = ['BIDLESS', 'MANUAL_BIDDING', 'MAXIMIZE_VOLUME', 'TARGET_CPX'];
const dates = (input: Row, payload: Row, prior: Row = {}) => {
  if (input.startDate !== undefined)
    payload.start_time = timestamp(input.startDate, 'startDate');
  if (input.endDate !== undefined) payload.end_time = timestamp(input.endDate, 'endDate');
  const start = payload.start_time ?? prior.start_time;
  const end = payload.end_time ?? prior.end_time;
  if (
    end !== undefined &&
    end !== null &&
    (start === undefined ||
      start === null ||
      Date.parse(text(end, 'endDate')) <= Date.parse(text(start, 'startDate')))
  )
    invalid('endDate requires an earlier startDate.');
};
export const campaignPayload = async (client: RedditAdsClient, input: Row) => {
  const prior =
    input.campaignId === undefined
      ? {}
      : await client.getResource('campaign', id(input.campaignId));
  const create = input.campaignId === undefined;
  if (create) required(input, ['name', 'objective', 'status']);
  const payload: Row = {};
  if (input.name !== undefined) payload.name = name(input.name);
  if (input.status !== undefined) payload.configured_status = status(input.status);
  if (input.objective !== undefined)
    payload.objective = enumValue(
      input.objective,
      objectives,
      'objective (legacy TRAFFIC, VIDEO_VIEWS, REACH and ENGAGEMENT have no documented API mapping)'
    );
  if (input.isCampaignBudgetOptimization !== undefined) {
    if (typeof input.isCampaignBudgetOptimization !== 'boolean')
      invalid('isCampaignBudgetOptimization must be boolean.');
    if (
      !create &&
      prior.is_campaign_budget_optimization !== input.isCampaignBudgetOptimization
    )
      invalid(
        'Campaign budget optimization cannot be changed after publishing. Create a separate campaign with the intended mode.'
      );
    if (create) payload.is_campaign_budget_optimization = input.isCampaignBudgetOptimization;
  }
  const cbo = create
    ? input.isCampaignBudgetOptimization === true
    : prior.is_campaign_budget_optimization === true;
  if (input.budgetType !== undefined) {
    enumValue(input.budgetType, ['DAILY', 'LIFETIME'], 'budgetType');
    if (cbo) {
      const goal = input.budgetType === 'DAILY' ? 'DAILY_SPEND' : 'LIFETIME_SPEND';
      if (!create && prior.goal_type !== goal)
        invalid(
          'The campaign budget type is immutable. Create a new campaign for a different goal type.'
        );
      if (create) payload.goal_type = goal;
    } else if (input.budgetType !== 'LIFETIME')
      invalid(
        'A daily campaign budget requires explicit isCampaignBudgetOptimization=true and the documented CBO fields. For non-CBO campaigns set ad-group budgets.'
      );
  }
  if (input.budgetCents !== undefined)
    payload[cbo ? 'goal_value' : 'spend_cap'] = micro(input.budgetCents, 'budgetCents');
  if (!cbo && (input.startDate !== undefined || input.endDate !== undefined))
    invalid(
      'Campaign scheduling is supported only for CBO campaigns. Schedule non-CBO delivery at the ad-group level.'
    );
  if (cbo) dates(input, payload, prior);
  for (const [source, target] of [
    ['fundingInstrumentId', 'funding_instrument_id'],
    ['conversionPixelId', 'conversion_pixel_id'],
    ['appId', 'app_id']
  ] as const) {
    if (input[source] !== undefined) {
      if (!create && source !== 'fundingInstrumentId')
        invalid(`${source} cannot be changed on an existing campaign by this API.`);
      if (source === 'conversionPixelId' && !cbo)
        invalid(
          'conversionPixelId is a campaign-level field only for CBO. Set it on non-CBO ad groups.'
        );
      payload[target] = id(input[source], source);
    }
  }
  if (input.bidType !== undefined)
    payload.bid_type = enumValue(input.bidType, ['CPC', 'CPM', 'CPV6', 'CPV15'], 'bidType');
  if (input.optimizationStrategy !== undefined)
    payload.bid_strategy = enumValue(
      input.optimizationStrategy,
      ['BIDLESS', 'MAXIMIZE_VOLUME', 'TARGET_CPX'],
      'optimizationStrategy'
    );
  if (input.bidCents !== undefined) payload.bid_value = micro(input.bidCents, 'bidCents');
  if (input.optimizationGoal !== undefined) {
    if (!create) invalid('optimizationGoal cannot be changed after publishing.');
    payload.optimization_goal = text(input.optimizationGoal, 'optimizationGoal');
  }
  if (
    !cbo &&
    ['bidType', 'optimizationStrategy', 'bidCents', 'optimizationGoal'].some(
      field => input[field] !== undefined
    )
  )
    invalid('Campaign-level bidding requires CBO. Configure non-CBO bidding on an ad group.');
  if (create && cbo) {
    required(payload, [
      'goal_type',
      'start_time',
      'bid_type',
      'bid_strategy',
      'conversion_pixel_id'
    ]);
    if (payload.goal_value === undefined) invalid('CBO creation requires budgetCents.');
    if (payload.goal_type === 'LIFETIME_SPEND' && payload.end_time === undefined)
      invalid('Lifetime CBO creation requires endDate.');
  }
  if (
    (payload.bid_strategy ?? prior.bid_strategy) === 'BIDLESS' &&
    input.bidCents !== undefined
  )
    invalid('BIDLESS uses no cost cap. Omit bidCents.');
  return pickDefined(payload);
};
export const adGroupPayload = async (client: RedditAdsClient, input: Row) => {
  const create = input.adGroupId === undefined;
  if (create) required(input, ['campaignId', 'name', 'status']);
  const prior = create ? {} : await client.getResource('adGroup', id(input.adGroupId));
  if (!create && input.campaignId !== undefined && prior.campaign_id !== input.campaignId)
    invalid('An ad group cannot be moved between campaigns. Create a new ad group.');
  const campaign = await client.getResource(
    'campaign',
    id(create ? input.campaignId : prior.campaign_id, 'Campaign ID')
  );
  const payload: Row = {};
  if (create) payload.campaign_id = id(input.campaignId);
  if (input.name !== undefined) payload.name = name(input.name);
  if (input.status !== undefined) payload.configured_status = status(input.status);
  if (
    input.bidStrategy !== undefined &&
    input.bidType !== undefined &&
    input.bidStrategy !== input.bidType
  )
    invalid('bidStrategy and bidType disagree; legacy bidStrategy specifies the bid type.');
  const bidType = input.bidType ?? input.bidStrategy;
  if (bidType !== undefined)
    payload.bid_type = enumValue(
      bidType,
      bids,
      'bid type (CPA is not supported by the current API)'
    );
  if (input.optimizationStrategy !== undefined)
    payload.bid_strategy =
      input.optimizationStrategy === null
        ? null
        : enumValue(input.optimizationStrategy, strategies, 'optimizationStrategy');
  if (input.bidCents !== undefined) payload.bid_value = micro(input.bidCents, 'bidCents');
  if (input.goalCents !== undefined) payload.goal_value = micro(input.goalCents, 'goalCents');
  if (input.goalType !== undefined) {
    const goal = enumValue(input.goalType, ['DAILY_SPEND', 'LIFETIME_SPEND'], 'goalType');
    if (!create && prior.goal_type !== goal)
      invalid('Changing ad-group goalType is unsupported. Create a separate ad group.');
    if (create) payload.goal_type = goal;
  }
  if (input.conversionPixelId !== undefined)
    payload.conversion_pixel_id = id(input.conversionPixelId, 'conversionPixelId');
  if (input.optimizationGoal !== undefined) {
    if (!create && prior.optimization_goal !== input.optimizationGoal)
      invalid('The optimization goal is immutable. Create a separate ad group.');
    if (create) payload.optimization_goal = text(input.optimizationGoal, 'optimizationGoal');
  }
  dates(input, payload, prior);
  const targeting: Row = {};
  for (const [source, target, limit] of [
    ['targetSubreddits', 'communities', 1000],
    ['targetInterests', 'interests', 200],
    ['targetKeywords', 'keywords', 1000]
  ] as const)
    if (input[source] !== undefined) targeting[target] = strings(input[source], source, limit);
  if (input.placements !== undefined)
    targeting.locations = strings(input.placements, 'placements').map(value =>
      enumValue(value, ['FEED', 'CONVERSATIONS'], 'placements') === 'CONVERSATIONS'
        ? 'COMMENTS_PAGE'
        : 'FEED'
    );
  if (Object.keys(targeting).length)
    payload.targeting = {
      ...(prior.targeting == null ? {} : row(prior.targeting)),
      ...targeting
    };
  if (campaign.is_campaign_budget_optimization === true) {
    if (input.bidCents !== undefined || input.goalCents !== undefined)
      invalid('CBO ad groups inherit bids and budgets. Change campaign-level values instead.');
    if (
      (bidType !== undefined && bidType !== campaign.bid_type) ||
      (input.goalType !== undefined && input.goalType !== campaign.goal_type) ||
      (input.optimizationGoal !== undefined &&
        input.optimizationGoal !== campaign.optimization_goal)
    )
      invalid(
        'CBO ad-group bid type, goal type and optimization goal must match the parent campaign.'
      );
    if (input.optimizationStrategy !== undefined && input.optimizationStrategy !== null)
      invalid(
        'CBO ad groups inherit the campaign strategy. Set optimizationStrategy=null or omit it.'
      );
    if (create) {
      payload.bid_type = text(campaign.bid_type, 'Parent bid type');
      payload.bid_strategy = null;
      payload.bid_value = null;
      payload.goal_value = null;
      payload.goal_type = campaign.goal_type;
    }
    if (
      input.conversionPixelId !== undefined &&
      input.conversionPixelId !== campaign.conversion_pixel_id
    )
      invalid('A CBO ad group must use its parent campaign Pixel.');
    if (create && payload.conversion_pixel_id === undefined)
      payload.conversion_pixel_id = id(
        campaign.conversion_pixel_id,
        'Parent conversion Pixel'
      );
  } else if (create) required(payload, ['bid_type', 'bid_strategy', 'conversion_pixel_id']);
  if (
    (payload.bid_strategy ?? prior.bid_strategy) === 'BIDLESS' &&
    input.bidCents !== undefined
  )
    invalid('BIDLESS uses no bid cost cap; omit bidCents.');
  return pickDefined(payload);
};
export const adPayload = async (client: RedditAdsClient, input: Row) => {
  for (const field of ['headline', 'body', 'callToAction', 'thumbnailUrl', 'videoUrl'])
    if (input[field] !== undefined)
      invalid(
        `${field} is not accepted by the current Ad endpoint. Create the creative in Ads Manager and supply its postId; direct creative generation is unsupported by this tool.`
      );
  const create = input.adId === undefined;
  if (create) required(input, ['adGroupId', 'name', 'status', 'postId']);
  const prior = create ? {} : await client.getResource('ad', id(input.adId));
  if (!create && input.adGroupId !== undefined && input.adGroupId !== prior.ad_group_id)
    invalid('Moving an ad between ad groups is unsupported by this tool. Create a new ad.');
  await client.getResource(
    'adGroup',
    id(create ? input.adGroupId : prior.ad_group_id, 'Ad group ID')
  );
  const payload: Row = {};
  if (create) payload.ad_group_id = id(input.adGroupId);
  if (input.name !== undefined) payload.name = name(input.name);
  if (input.status !== undefined) payload.configured_status = status(input.status);
  if (input.postId !== undefined) payload.post_id = id(input.postId, 'postId');
  if (input.clickUrl !== undefined) {
    let url: URL;
    try {
      url = new URL(text(input.clickUrl, 'clickUrl'));
    } catch {
      return invalid('clickUrl must be an absolute HTTP or HTTPS URL.');
    }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
      invalid('clickUrl must be an HTTP or HTTPS URL without embedded credentials.');
    payload.click_url = input.clickUrl;
  }
  return payload;
};
export const audiencePayload = (input: Row) => {
  if (input.audienceId !== undefined)
    invalid(
      'The current Reddit Ads API does not support updating custom-audience metadata. Create a separate audience, or use manage_audience_users for customer-list membership.'
    );
  if (input.description !== undefined)
    invalid(
      'Audience description is not accepted by the current API. Omit it and provide name plus the audience configuration.'
    );
  required(input, ['name', 'audienceType']);
  const type = enumValue(
    input.audienceType,
    ['CUSTOMER_LIST', 'WEBSITE', 'ENGAGEMENT', 'LOOKALIKE'],
    'audienceType'
  );
  if (type === 'LOOKALIKE')
    invalid(
      'LOOKALIKE creation is not documented by the current API. Create it in Ads Manager; existing lookalike audiences remain readable.'
    );
  const payload: Row = {
    name: name(input.name),
    type:
      type === 'WEBSITE'
        ? 'PIXEL_RETARGETING'
        : type === 'ENGAGEMENT'
          ? 'ENGAGEMENT_RETARGETING'
          : type
  };
  if (type === 'CUSTOMER_LIST' && input.originClientId !== undefined)
    payload.customer_list_config = {
      origin_client_id: enumValue(
        input.originClientId,
        [
          'UNSPECIFIED',
          'LIVE_RAMP',
          'MPARTICLE',
          'TEALIUM',
          'OTHER',
          'LIVE_RAMP_ADVERTISER_DIRECT',
          'BOMBORA'
        ],
        'originClientId'
      )
    };
  if (type === 'WEBSITE') {
    const days = integer(input.lookbackWindowDays, 'lookbackWindowDays', 1);
    if (days > 90) invalid('Website lookbackWindowDays must be at most 90.');
    const targetings = strings(input.trackingTypes, 'trackingTypes').map(value =>
      enumValue(
        value,
        [
          'PAGE_VISIT',
          'VIEW_CONTENT',
          'SEARCH',
          'ADD_TO_CART',
          'ADD_TO_WISHLIST',
          'PURCHASE',
          'LEAD',
          'SIGN_UP',
          'CUSTOM'
        ],
        'trackingTypes'
      )
    );
    if (!targetings.length || targetings.includes('CUSTOM'))
      invalid(
        'Provide nonempty standard trackingTypes. Custom website audience matching is unsupported by this tool.'
      );
    payload.pixel_audience_config = {
      targetings,
      lookback_window_days: days,
      pixel_ids: [id(input.pixelId, 'pixelId')]
    };
  }
  if (type === 'ENGAGEMENT') {
    const days = integer(input.lookbackWindowDays, 'lookbackWindowDays', 1);
    if (days > 180) invalid('Engagement lookbackWindowDays must be at most 180.');
    const tracking = strings(input.trackingTypes, 'trackingTypes').map(value =>
      enumValue(
        value,
        [
          'IMPRESSIONS',
          'CLICKS',
          'UPVOTES',
          'COMMENT_SUBMISSIONS',
          'VIDEO_WATCHED_50_PERCENT',
          'VIDEO_WATCHED_100_PERCENT',
          'VIDEO_STARTED'
        ],
        'trackingTypes'
      )
    );
    const campaignIds = strings(input.campaignIds, 'campaignIds', 500).map(value => id(value));
    if (!tracking.length || !campaignIds.length)
      invalid('Engagement audiences require nonempty trackingTypes and campaignIds.');
    payload.engagement_audience_config = {
      tracking_types: tracking,
      lookback_window_days: days,
      campaign_ids: campaignIds
    };
  }
  return payload;
};
export const reportPayload = (input: Row) => {
  const date = (value: unknown, label: string) => {
    const result = text(value, label);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(result) ||
      !Number.isFinite(Date.parse(result)) ||
      new Date(result).toISOString().slice(0, 10) !== result
    )
      invalid(`${label} must be a valid YYYY-MM-DD date.`);
    return `${result}T00:00:00Z`;
  };
  const start = date(input.startDate, 'startDate');
  const end = date(input.endDate, 'endDate');
  if (Date.parse(end) <= Date.parse(start))
    invalid(
      'endDate must be later than startDate; dates become UTC midnight boundaries without adding a day.'
    );
  const level: Record<string, string> = {
    account: 'AD_ACCOUNT_ID',
    campaign: 'CAMPAIGN_ID',
    adGroup: 'AD_GROUP_ID',
    ad: 'AD_ID'
  };
  const field = (value: string) =>
    enumValue(value.toUpperCase(), REPORT_FIELDS, 'Report field');
  const fields = strings(input.metrics ?? ['IMPRESSIONS', 'CLICKS', 'SPEND'], 'metrics').map(
    field
  );
  if (!fields.length) invalid('Provide at least one report metric.');
  const dimensions = [
    ...new Set([
      level[text(input.level, 'level')] ?? invalid('Unsupported report level.'),
      ...strings(input.breakdowns ?? [], 'breakdowns').map(value =>
        enumValue(value.toUpperCase(), REPORT_BREAKDOWNS, 'breakdown')
      )
    ])
  ];
  if (
    dimensions.length >
    (dimensions.includes('COUNTRY') && dimensions.includes('REGION') ? 4 : 3)
  )
    invalid(
      'Choose at most three breakdowns (four when COUNTRY and REGION are both selected), including the reporting level.'
    );
  const filters: string[] = [];
  for (const [key, entity] of [
    ['campaignIds', 'campaign'],
    ['adGroupIds', 'ad_group'],
    ['adIds', 'ad']
  ] as const)
    for (const value of strings(input[key] ?? [], key))
      filters.push(`${entity}:id==${id(value)}`);
  return pickDefined({
    starts_at: start,
    ends_at: end,
    fields,
    breakdowns: dimensions,
    filter: filters.length ? filters.join(',') : undefined,
    time_zone_id:
      input.timeZoneId === undefined ? undefined : text(input.timeZoneId, 'timeZoneId')
  });
};
