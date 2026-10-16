import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { PlacesClient } from '../lib/places-client';
import {
  coordinateFields,
  coordinates,
  currentPlaceId,
  integerRange,
  rawResponseSchema
} from '../lib/places-schemas';
import { spec } from '../spec';

export let suggestPlaceChanges = SlateTool.create(spec, {
  key: 'suggest_place_changes',
  name: 'Suggest Place Changes',
  description:
    'Suggest edits, removal, merging duplicates, or incorrect fields for a current Foursquare place. Changes are suggestions and may require review.',
  instructions: [
    'Requires a Places Service API Key. Use action edit for corrections, remove for a removal suggestion, merge for duplicate places, or flag for incorrect fields without replacement values.',
    'Set dryRun true to preview instead of submitting. When omitted, the provider submits the suggestion.',
    'The complete response includes actual suggested edit IDs/statuses when returned. Use get_suggestion_status to inspect those IDs.'
  ],
  tags: { destructive: false }
})
  .input(
    z.object({
      fsqPlaceId: currentPlaceId,
      action: z.enum(['edit', 'remove', 'merge', 'flag']),
      dryRun: z.boolean().optional(),
      name: z.string().optional().describe('edit only'),
      description: z.string().max(300).optional().describe('edit only'),
      address: z.string().optional().describe('edit only'),
      locality: z.string().optional().describe('edit only'),
      region: z.string().optional().describe('edit only'),
      postcode: z.string().optional().describe('edit only'),
      countryCode: z.string().optional().describe('edit only; two-letter country code'),
      ...coordinateFields,
      tel: z.string().optional().describe('edit only'),
      website: z.string().optional().describe('edit only'),
      menu: z.string().optional().describe('edit only; menu URL'),
      hours: z
        .string()
        .optional()
        .describe('edit only; semicolon-separated day,start,end segments'),
      parentId: z.string().optional().describe('edit only; empty string removes the parent'),
      isPrivatePlace: z.boolean().optional().describe('edit only'),
      addCategoryIds: z
        .string()
        .optional()
        .describe('edit only; comma-separated category IDs'),
      removeCategoryIds: z
        .string()
        .optional()
        .describe('edit only; comma-separated category IDs'),
      primaryCategoryId: z.string().optional().describe('edit only'),
      addChainIds: z.string().optional().describe('edit only; comma-separated chain IDs'),
      removeChainIds: z.string().optional().describe('edit only; comma-separated chain IDs'),
      primaryChainId: z.string().optional().describe('edit only'),
      addAttributes: z
        .string()
        .optional()
        .describe('edit only; comma-separated provider attribute keys'),
      removeAttributes: z
        .string()
        .optional()
        .describe('edit only; comma-separated provider attribute keys'),
      unsetFields: z
        .string()
        .optional()
        .describe('edit only; comma-separated fields to unset'),
      reason: z
        .enum(['CLOSED', 'DOESNT_EXIST', 'INAPPROPRIATE', 'NOT_CLOSED', 'OTHER', 'PRIVATE'])
        .optional()
        .describe('Required for remove'),
      duplicatePlaceIds: z
        .string()
        .optional()
        .describe('Required for merge; comma-separated duplicate fsq_place_id values'),
      fields: z
        .string()
        .optional()
        .describe('Required for flag; comma-separated incorrect fields'),
      comment: z.string().optional().describe('remove or flag only')
    })
  )
  .output(rawResponseSchema)
  .handleInvocation(async ctx => {
    let input = ctx.input;
    let params: Record<string, string | number | boolean | undefined> = {
      dry_run: input.dryRun
    };
    if (input.action === 'edit') {
      coordinates(input);
      if (input.countryCode !== undefined && input.countryCode.length !== 2) {
        throw createApiServiceError('countryCode must contain two letters.');
      }
      Object.assign(params, {
        name: input.name,
        description: input.description,
        address: input.address,
        locality: input.locality,
        region: input.region,
        postcode: input.postcode,
        country_code: input.countryCode,
        latitude: input.latitude,
        longitude: input.longitude,
        tel: input.tel,
        website: input.website,
        menu: input.menu,
        hours: input.hours,
        parent_id: input.parentId,
        is_private_place: input.isPrivatePlace,
        add_fsq_category_ids: input.addCategoryIds,
        remove_fsq_category_ids: input.removeCategoryIds,
        primary_fsq_category_id: input.primaryCategoryId,
        add_fsq_chain_ids: input.addChainIds,
        remove_fsq_chain_ids: input.removeChainIds,
        primary_fsq_chain_id: input.primaryChainId,
        add_attributes: input.addAttributes,
        remove_attributes: input.removeAttributes,
        unset_fields: input.unsetFields
      });
      if (
        !Object.entries(params).some(
          ([key, value]) => key !== 'dry_run' && value !== undefined
        )
      ) {
        throw createApiServiceError('Provide at least one edit field.');
      }
    } else if (input.action === 'remove') {
      if (!input.reason) throw createApiServiceError('reason is required for remove.');
      Object.assign(params, { reason: input.reason, comment: input.comment });
    } else if (input.action === 'merge') {
      if (!input.duplicatePlaceIds?.trim())
        throw createApiServiceError('duplicatePlaceIds is required for merge.');
      params.duplicate_fsq_place_ids = input.duplicatePlaceIds;
    } else {
      if (!input.fields?.trim()) throw createApiServiceError('fields is required for flag.');
      Object.assign(params, { fields: input.fields, comment: input.comment });
    }
    let { data } = await new PlacesClient(ctx.auth).request(
      'POST',
      `/places/${encodeURIComponent(input.fsqPlaceId)}/suggest/${input.action}`,
      params
    );
    return {
      output: { response: data },
      message: input.dryRun
        ? 'Retrieved suggestion preview; inspect the provider response.'
        : 'Received suggestion response; inspect its edit statuses and errors.'
    };
  })
  .build();

export let getSuggestionStatus = SlateTool.create(spec, {
  key: 'get_suggestion_status',
  name: 'Get Suggestion Status',
  description:
    'Monitor current place edit suggestions by their IDs, or list suggestions made by the calling service key.',
  instructions: [
    'Requires a Places Service API Key. Use actual IDs returned by suggest_place_changes or suggest_new_place. Omitting IDs returns edits suggested by the calling token.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      suggestedEditIds: z.string().optional().describe('Comma-separated suggested edit IDs'),
      limit: z.number().optional().describe('Integer limit 0–50; provider default 10')
    })
  )
  .output(rawResponseSchema)
  .handleInvocation(async ctx => {
    integerRange(ctx.input.limit, 'limit', 0, 50);
    let { data } = await new PlacesClient(ctx.auth).request('GET', '/places/suggest/status', {
      suggested_edit_ids: ctx.input.suggestedEditIds,
      limit: ctx.input.limit
    });
    return { output: { response: data }, message: 'Retrieved suggestion statuses.' };
  })
  .build();

export let suggestNewPlace = SlateTool.create(spec, {
  key: 'suggest_new_place',
  name: 'Suggest New Place',
  description:
    'Suggest a place missing from the current database. Foursquare first attempts to match an existing place before creating a new suggestion.',
  instructions: [
    'Requires a Places Service API Key. Set dryRun true to preview. Omitted dryRun submits the suggestion; review actual errors, match, and status in the response.'
  ],
  tags: { destructive: false }
})
  .input(
    z.object({
      name: z.string().min(1),
      categoryIds: z.string().optional(),
      address: z.string().optional(),
      locality: z.string().optional(),
      region: z.string().optional(),
      postcode: z.string().optional(),
      countryCode: z.string().length(2).optional(),
      ...coordinateFields,
      chainIds: z.string().optional(),
      parentId: z.string().optional(),
      isPrivatePlace: z.boolean().optional(),
      tel: z.string().optional(),
      website: z.string().optional(),
      email: z.string().optional(),
      hours: z.string().optional(),
      attributes: z.string().optional(),
      dryRun: z.boolean().optional()
    })
  )
  .output(rawResponseSchema)
  .handleInvocation(async ctx => {
    coordinates(ctx.input);
    let input = ctx.input;
    let { data } = await new PlacesClient(ctx.auth).request('POST', '/places/suggest/place', {
      name: input.name,
      categories: input.categoryIds,
      address: input.address,
      locality: input.locality,
      region: input.region,
      postcode: input.postcode,
      country_code: input.countryCode,
      latitude: input.latitude,
      longitude: input.longitude,
      chains: input.chainIds,
      parent_id: input.parentId,
      is_private_place: input.isPrivatePlace,
      tel: input.tel,
      website: input.website,
      email: input.email,
      hours: input.hours,
      attributes: input.attributes,
      dry_run: input.dryRun
    });
    return {
      output: { response: data },
      message: input.dryRun
        ? 'Retrieved new-place preview.'
        : 'Received new-place suggestion response; inspect its match, status, and errors.'
    };
  })
  .build();
