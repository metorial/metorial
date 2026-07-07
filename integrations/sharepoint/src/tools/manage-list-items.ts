import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { getSharePointHostnameFromWebUrl, SharePointClient } from '../lib/client';
import { spec } from '../spec';
import {
  resolveSharePointHyperlinkFieldValues,
  splitSharePointListItemFields
} from './list-item-field-values';

let listItemOutputSchema = z.object({
  itemId: z.string().describe('List item ID'),
  webUrl: z.string().optional().describe('URL of the list item'),
  createdDateTime: z.string().optional().describe('When the item was created'),
  lastModifiedDateTime: z.string().optional().describe('When the item was last modified'),
  createdBy: z.string().optional().describe('User who created the item'),
  lastModifiedBy: z.string().optional().describe('User who last modified the item'),
  fields: z
    .record(z.string(), z.any())
    .optional()
    .describe('Custom field values of the list item')
});

let serviceError = (message: string, reason: string, parent?: unknown) =>
  createApiServiceError(message, { reason, parent });

let requireField = (value: string | undefined, fieldName: string, action: string) => {
  if (value) return value;

  throw serviceError(
    `${fieldName} is required for ${action} action.`,
    `sharepoint_${fieldName.toLowerCase()}_required`
  );
};

let hasFields = (
  fields: Record<string, unknown> | undefined
): fields is Record<string, unknown> => fields !== undefined && Object.keys(fields).length > 0;

export let manageListItems = SlateTool.create(spec, {
  name: 'Manage List Items',
  key: 'manage_list_items',
  description: `Full CRUD operations on SharePoint list items. Use this tool to create, read, update, delete, or list items in a SharePoint list, including setting or changing column values on a specific item. Supports OData filtering and ordering when listing items. Field values match the list's column schema, including Hyperlink/URL column values.`,
  instructions: [
    'Set **action** to "get", "list", "create", "update", or "delete".',
    'When creating or updating, pass **fields** as a key-value object matching the list column names.',
    'Use this tool, not manage_columns, when the user wants to set a value such as a transcript URL on an existing list item.',
    'For SharePoint Hyperlink columns during "update", pass the field value as `{ "Url": "https://...", "Description": "Display text" }`, `{ "url": "https://...", "description": "Display text" }`, or `{ "webUrl": "https://...", "description": "Display text" }`.',
    'When listing, use **filter** for OData filter expressions (e.g. "fields/Status eq \'Active\'") and **orderBy** for sorting.',
    'For pagination, set **top** to limit page size. If the response includes **nextLink**, pass it as **skipToken** in the next request to get the next page (do not use $skip — SharePoint Lists API does not support it).',
    'SharePoint requires columns referenced in **filter** or **orderBy** to be indexed. If a query fails with "Field X cannot be referenced in filter or orderby as it is not indexed", either index the column in SharePoint (Site Settings → List settings → Indexed columns) or retry with **allowUnindexedQuery: true** to send the "Prefer: HonorNonIndexedQueriesWarningMayFailRandomly" header (may fail on lists with >5000 items).'
  ],
  constraints: ['Maximum of 5000 items can be returned in a single list request.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['get', 'list', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      siteId: z.string().describe('SharePoint site ID'),
      listId: z.string().describe('SharePoint list ID'),
      itemId: z
        .string()
        .optional()
        .describe('List item ID (required for get, update, delete)'),
      fields: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Field values for create or update, keyed by column name. For a Hyperlink/URL column update, pass an object like { "Url": "https://...", "Description": "Display text" }.'
        ),
      filter: z.string().optional().describe('OData filter expression for list action'),
      orderBy: z.string().optional().describe('OData orderby expression for list action'),
      top: z
        .number()
        .optional()
        .describe('Maximum number of items to return (for list action)'),
      skipToken: z
        .string()
        .optional()
        .describe(
          "Pagination token from a previous response's **nextLink** field; pass this instead of repeating filter/orderBy/top to fetch the next page."
        ),
      allowUnindexedQuery: z
        .boolean()
        .optional()
        .describe(
          'Set true to send "Prefer: HonorNonIndexedQueriesWarningMayFailRandomly" — lets you filter/orderBy on non-indexed columns. May fail on lists with >5000 items. Prefer indexing the column in SharePoint instead.'
        )
    })
  )
  .output(
    z.object({
      item: listItemOutputSchema
        .optional()
        .describe('Single list item (for get, create, update)'),
      items: z
        .array(listItemOutputSchema)
        .optional()
        .describe('List of items (for list action)'),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether the item was deleted (for delete action)'),
      totalCount: z.number().optional().describe('Number of items returned (for list action)'),
      nextLink: z
        .string()
        .optional()
        .describe('Pagination token — pass as **skipToken** to get the next page')
    })
  )
  .handleInvocation(async ctx => {
    let sharepointToken =
      typeof ctx.auth.sharepointToken === 'string' ? ctx.auth.sharepointToken : undefined;
    let sharepointHostname =
      typeof ctx.auth.sharepointHostname === 'string'
        ? ctx.auth.sharepointHostname
        : undefined;
    let client = new SharePointClient({
      graphToken: ctx.auth.token,
      sharepointToken
    });
    let {
      action,
      siteId,
      listId,
      itemId,
      fields,
      filter,
      orderBy,
      top,
      skipToken,
      allowUnindexedQuery
    } = ctx.input;

    let mapItem = (item: any) => ({
      itemId: item.id,
      webUrl: item.webUrl,
      createdDateTime: item.createdDateTime,
      lastModifiedDateTime: item.lastModifiedDateTime,
      createdBy: item.createdBy?.user?.displayName,
      lastModifiedBy: item.lastModifiedBy?.user?.displayName,
      fields: item.fields
    });

    let getRestSiteWebUrl = async (): Promise<string> => {
      if (!sharepointToken) {
        throw serviceError(
          'SharePoint REST access token is missing. Reconnect SharePoint auth so Hyperlink list item fields can be updated.',
          'sharepoint_rest_token_missing'
        );
      }

      let site = await client.getSite(siteId);
      let webUrl = typeof site.webUrl === 'string' ? site.webUrl : undefined;
      if (!webUrl) {
        throw serviceError(
          'Microsoft Graph did not return a webUrl for the requested SharePoint site.',
          'sharepoint_site_web_url_missing'
        );
      }

      let siteHostname = getSharePointHostnameFromWebUrl(webUrl);
      if (
        sharepointHostname &&
        siteHostname.toLowerCase() !== sharepointHostname.toLowerCase()
      ) {
        throw serviceError(
          `The SharePoint REST token is scoped to ${sharepointHostname}, but the requested site is on ${siteHostname}. Reconnect using an account/tenant configuration for the requested SharePoint host.`,
          'sharepoint_rest_hostname_mismatch'
        );
      }

      return webUrl;
    };

    let resolveHyperlinkFields = async (
      siteWebUrl: string,
      hyperlinkFields: Record<string, { Url: string; Description: string }>
    ) => {
      let restFields = await client.listSharePointRestFields(siteWebUrl, listId);
      return resolveSharePointHyperlinkFieldValues(restFields, hyperlinkFields);
    };

    switch (action) {
      case 'get': {
        itemId = requireField(itemId, 'itemId', 'get');
        let item = await client.getListItem(siteId, listId, itemId);
        return {
          output: { item: mapItem(item) },
          message: `Retrieved list item \`${itemId}\`.`
        };
      }

      case 'list': {
        let data: any;
        try {
          data = await client.listListItems(siteId, listId, {
            expand: 'fields',
            filter,
            orderby: orderBy,
            top,
            skipToken,
            allowUnindexedQuery
          });
        } catch (err: any) {
          let apiMsg =
            err?.response?.data?.error?.message ?? err?.response?.data?.message ?? '';
          let combined = `${err?.message || ''} ${apiMsg}`;
          let notIndexed = /is not indexed|HonorNonIndexedQueriesWarningMayFailRandomly/i.test(
            combined
          );
          if (notIndexed && !allowUnindexedQuery) {
            let fieldMatch = combined.match(/Field '([^']+)'/);
            let fieldName = fieldMatch?.[1];
            let status = err?.response?.status;
            let baseMsg = `HTTP ${status ?? 400}: ${apiMsg || err?.message || 'Unindexed column referenced in filter/orderby'}`;
            throw serviceError(
              `${baseMsg}\n\nTo resolve, either:\n` +
                `  1. Index the column${fieldName ? ` '${fieldName}'` : ''} in SharePoint: Site Settings → List settings → Indexed columns → Create a new index. This is the recommended long-term fix.\n` +
                `  2. Retry this tool with **allowUnindexedQuery: true** to send the "Prefer: HonorNonIndexedQueriesWarningMayFailRandomly" header. Works for lists with <5000 items; may fail on larger lists.`,
              'sharepoint_list_query_unindexed_column',
              err
            );
          }
          throw err;
        }
        let items = (data.value || []).map(mapItem);
        let nextLink: string | undefined = data['@odata.nextLink'];
        return {
          output: { items, totalCount: items.length, nextLink },
          message: `Found **${items.length}** item(s) in the list.${nextLink ? ' More pages available.' : ''}`
        };
      }

      case 'create': {
        if (!hasFields(fields)) {
          throw serviceError(
            'fields are required for create action.',
            'sharepoint_fields_required'
          );
        }
        let item = await client.createListItem(siteId, listId, fields);
        return {
          output: { item: mapItem(item) },
          message: `Created new list item \`${item.id}\`.`
        };
      }

      case 'update': {
        itemId = requireField(itemId, 'itemId', 'update');
        if (!hasFields(fields)) {
          throw serviceError(
            'fields are required for update action.',
            'sharepoint_fields_required'
          );
        }
        let { graphFields, hyperlinkFields } = splitSharePointListItemFields(fields);
        let hyperlinkFieldNames = Object.keys(hyperlinkFields);
        let siteWebUrl: string | undefined;
        let resolvedHyperlinkFields:
          | Record<string, { Url: string; Description: string }>
          | undefined;

        if (hyperlinkFieldNames.length > 0) {
          siteWebUrl = await getRestSiteWebUrl();
          resolvedHyperlinkFields = await resolveHyperlinkFields(siteWebUrl, hyperlinkFields);
        }

        if (Object.keys(graphFields).length > 0) {
          await client.updateListItem(siteId, listId, itemId, graphFields);
        }
        if (hyperlinkFieldNames.length > 0) {
          if (!siteWebUrl || !resolvedHyperlinkFields) {
            throw serviceError(
              'SharePoint Hyperlink field preflight did not complete.',
              'sharepoint_hyperlink_preflight_missing'
            );
          }

          await client.updateSharePointRestListItemUrlFields(
            siteWebUrl,
            listId,
            itemId,
            resolvedHyperlinkFields
          );
        }

        let item = await client.getListItem(siteId, listId, itemId);
        return {
          output: { item: mapItem(item) },
          message: `Updated list item \`${itemId}\`.`
        };
      }

      case 'delete': {
        itemId = requireField(itemId, 'itemId', 'delete');
        await client.deleteListItem(siteId, listId, itemId);
        return {
          output: { deleted: true },
          message: `Deleted list item \`${itemId}\`.`
        };
      }
    }
  })
  .build();
