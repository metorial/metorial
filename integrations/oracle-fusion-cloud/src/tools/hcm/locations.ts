import { SlateTool } from 'slates';
import { z } from 'zod';
import { OracleFusionClient } from '../../lib/client';
import { adfEquals, adfIdEquals, andFilters } from '../../lib/filters';
import { idField, stringField } from '../../lib/records';
import {
  pageOutputFields,
  paginationInputFields,
  resourceIdSchema,
  resourceKeySchema
} from '../../lib/schemas';
import { spec } from '../../spec';
import {
  dateContext,
  effectiveDateInputSchema,
  effectiveDateOutputFields,
  effectiveRangeOutputFields,
  identifierFilterSchema,
  requiredId,
  selfLinkOutputSchema
} from './common';

const LOCATION_FIELDS =
  'LocationId,LocationCode,LocationName,SetId,ActiveStatus,Country,TownOrCity,EffectiveStartDate,EffectiveEndDate';
const LOCATION_FILTER_FIELDS = [
  'LocationId',
  'LocationCode',
  'LocationName',
  'ActiveStatus'
] as const;

let locationOutputFields = {
  resourceKey: resourceKeySchema.describe(
    'Composite location resource key from its self link. This is separate from locationId or locationCode.'
  ),
  locationId: resourceIdSchema.describe(
    'Stable Oracle work location identifier. This matches locationId on departments and worker assignments.'
  ),
  locationCode: z
    .string()
    .optional()
    .describe('Business code identifying the location within its reference data set.'),
  locationName: z.string().optional().describe('Name of the work location.'),
  setId: resourceIdSchema
    .optional()
    .describe('Identifier of the reference data set to which the location belongs.'),
  activeStatus: z
    .string()
    .optional()
    .describe('Location status, such as A for active or I for inactive.'),
  country: z.string().optional().describe('Country of the work location.'),
  townOrCity: z.string().optional().describe('Town or city of the work location.'),
  ...effectiveRangeOutputFields,
  selfLink: selfLinkOutputSchema
};

export let listLocations = SlateTool.create(spec, {
  name: 'List Locations',
  key: 'list_locations',
  description:
    'List authorized Oracle Fusion HCM work locations as of an effective date, optionally filtered by exact location identifier, code, name, or active status.',
  instructions: [
    'All supplied exact filters are combined using AND. locationId matches locationId on departments and worker assignments; resourceKey is a separate composite resource identifier.',
    'When comparing locations with departments or worker assignments, use the same effectiveDate on each request.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      ...paginationInputFields,
      locationId: identifierFilterSchema.describe(
        'Exact locationId, for example from a department or worker assignment. Represent the identifier as decimal digits.'
      ),
      locationCode: z.string().min(1).max(120).optional().describe('Exact location code.'),
      locationName: z.string().min(1).max(60).optional().describe('Exact location name.'),
      activeStatus: z
        .enum(['A', 'I'])
        .optional()
        .describe('Exact location status: A active or I inactive.'),
      effectiveDate: effectiveDateInputSchema
    })
  )
  .output(
    z.object({
      items: z.array(z.object(locationOutputFields)).describe('Work locations in this page.'),
      ...pageOutputFields,
      ...effectiveDateOutputFields
    })
  )
  .handleInvocation(async ctx => {
    let context = dateContext(ctx.input.effectiveDate);
    let client = new OracleFusionClient(ctx.auth);
    let page = await client.list('hcm', '/locations', {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      q: andFilters(
        adfIdEquals('LocationId', ctx.input.locationId, LOCATION_FILTER_FIELDS),
        ctx.input.locationCode === undefined
          ? undefined
          : adfEquals('LocationCode', ctx.input.locationCode, LOCATION_FILTER_FIELDS),
        ctx.input.locationName === undefined
          ? undefined
          : adfEquals('LocationName', ctx.input.locationName, LOCATION_FILTER_FIELDS),
        ctx.input.activeStatus === undefined
          ? undefined
          : adfEquals('ActiveStatus', ctx.input.activeStatus, LOCATION_FILTER_FIELDS)
      ),
      fields: LOCATION_FIELDS,
      links: 'self',
      orderBy: 'LocationId:asc,EffectiveStartDate:asc,EffectiveEndDate:asc',
      effectiveDate: context.effectiveDate
    });
    return {
      output: {
        ...page,
        items: page.items.map(record => ({
          resourceKey: client.resourceKey(record, 'hcm', '/locations'),
          locationId: requiredId(record, 'LocationId'),
          locationCode: stringField(record, 'LocationCode'),
          locationName: stringField(record, 'LocationName'),
          setId: idField(record, 'SetId'),
          activeStatus: stringField(record, 'ActiveStatus'),
          country: stringField(record, 'Country'),
          townOrCity: stringField(record, 'TownOrCity'),
          effectiveStartDate: stringField(record, 'EffectiveStartDate'),
          effectiveEndDate: stringField(record, 'EffectiveEndDate'),
          selfLink: client.selfLink(record, 'hcm', '/locations')
        })),
        ...context
      },
      message: `Retrieved ${page.count} work locations.`
    };
  })
  .build();
