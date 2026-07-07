import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import {
  getSharePointHostnameFromWebUrl,
  SharePointClient,
  type SharePointRestField
} from '../lib/client';
import { spec } from '../spec';

let columnOutputSchema = z.object({
  columnId: z.string().describe('Column ID'),
  columnName: z.string().describe('Internal name of the column'),
  displayName: z.string().describe('Display name of the column'),
  columnDescription: z.string().optional().describe('Column description'),
  columnType: z
    .string()
    .optional()
    .describe('Column type (text, number, boolean, dateTime, choice, etc.)'),
  required: z.boolean().optional().describe('Whether the column is required'),
  readOnly: z.boolean().optional().describe('Whether the column is read-only'),
  hidden: z.boolean().optional().describe('Whether the column is hidden'),
  choices: z.array(z.string()).optional().describe('Available choices (for choice columns)'),
  isPicture: z
    .boolean()
    .optional()
    .describe('Whether a hyperlinkOrPicture column displays the URL as an image')
});

let serviceError = (message: string, reason: string) =>
  createApiServiceError(message, { reason });

let requireField = (value: string | undefined, fieldName: string, action: string) => {
  if (value) return value;

  throw serviceError(
    `${fieldName} is required for ${action}.`,
    `sharepoint_${fieldName.toLowerCase()}_required`
  );
};

let isSharePointUrlField = (field: SharePointRestField | undefined) =>
  field?.typeAsString.toLowerCase() === 'url' || field?.fieldTypeKind === 11;

let addFieldLookup = (
  fieldLookup: Map<string, SharePointRestField>,
  key: string | undefined,
  field: SharePointRestField
) => {
  if (!key) return;

  fieldLookup.set(key, field);
  fieldLookup.set(key.toLowerCase(), field);
};

let buildFieldLookup = (fields: SharePointRestField[]) => {
  let fieldLookup = new Map<string, SharePointRestField>();

  for (let field of fields) {
    addFieldLookup(fieldLookup, field.internalName, field);
    addFieldLookup(fieldLookup, field.staticName, field);
    addFieldLookup(fieldLookup, field.title, field);
  }

  return fieldLookup;
};

export let manageColumns = SlateTool.create(spec, {
  name: 'Manage Columns',
  key: 'manage_columns',
  description: `List, create, update, or delete column definitions (fields) on a SharePoint list. Columns define the schema and metadata structure of a list; this tool does not set values on list items. Supports various column types including text, number, boolean, dateTime, choice, currency, personOrGroup, and hyperlinkOrPicture.`,
  instructions: [
    'Set **action** to "list" to view all columns, "create" to add a new column, "update" to modify an existing column, or "delete" to remove a column.',
    'For "create", provide **columnName**, **columnType**, and optionally **choices** (for choice columns) or **isPicture** (for hyperlinkOrPicture columns).',
    'For "update", provide **columnId** and the column metadata fields to update.',
    'Use manage_list_items instead when the user wants to set or change the value of a column on a specific list item.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'update', 'delete'])
        .describe('Column action to perform'),
      siteId: z.string().describe('SharePoint site ID'),
      listId: z.string().describe('SharePoint list ID'),
      columnId: z.string().optional().describe('Column ID (required for update, delete)'),
      columnName: z.string().optional().describe('Column name (for create)'),
      columnDescription: z
        .string()
        .optional()
        .describe('Column description (for create, update)'),
      columnType: z
        .enum([
          'text',
          'number',
          'boolean',
          'dateTime',
          'choice',
          'currency',
          'personOrGroup',
          'hyperlinkOrPicture'
        ])
        .optional()
        .describe('Column type (for create)'),
      required: z
        .boolean()
        .optional()
        .describe('Whether the column is required (for create, update)'),
      choices: z
        .array(z.string())
        .optional()
        .describe('Available choices for choice columns (for create)'),
      isPicture: z
        .boolean()
        .optional()
        .describe(
          'Whether a hyperlinkOrPicture column displays URL values as images. Defaults to false.'
        )
    })
  )
  .output(
    z.object({
      column: columnOutputSchema.optional().describe('Column details (for create, update)'),
      columns: z
        .array(columnOutputSchema)
        .optional()
        .describe('List of columns (for list action)'),
      deleted: z.boolean().optional().describe('Whether the column was deleted')
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
      columnId,
      columnName,
      columnDescription,
      columnType,
      required,
      choices,
      isPicture
    } = ctx.input;

    let detectType = (
      col: any,
      restField?: SharePointRestField,
      fallbackType?: string
    ): string => {
      if (col.text) return 'text';
      if (col.number) return 'number';
      if (col.boolean) return 'boolean';
      if (col.dateTime) return 'dateTime';
      if (col.choice) return 'choice';
      if (col.currency) return 'currency';
      if (col.personOrGroup) return 'personOrGroup';
      if (col.hyperlinkOrPicture) return 'hyperlinkOrPicture';
      if (col.lookup) return 'lookup';
      if (col.calculated) return 'calculated';
      if (isSharePointUrlField(restField)) return 'hyperlinkOrPicture';
      if (fallbackType) return fallbackType;
      return 'unknown';
    };

    let mapColumn = (
      col: any,
      restField?: SharePointRestField,
      fallbackType?: string,
      fallbackIsPicture?: boolean
    ) => ({
      columnId: col.id,
      columnName: col.name,
      displayName: col.displayName || col.name,
      columnDescription: col.description,
      columnType: detectType(col, restField, fallbackType),
      required: col.required,
      readOnly: col.readOnly,
      hidden: col.hidden,
      choices: col.choice?.choices,
      isPicture:
        col.hyperlinkOrPicture?.isPicture ??
        (isSharePointUrlField(restField) && restField?.displayFormat !== undefined
          ? restField.displayFormat === 1
          : undefined) ??
        (fallbackType === 'hyperlinkOrPicture' ? (fallbackIsPicture ?? false) : undefined)
    });

    let mapRestColumn = (field: SharePointRestField, fallbackIsPicture?: boolean) => ({
      columnId: field.id ?? field.internalName,
      columnName: field.internalName,
      displayName: field.title || field.internalName,
      columnDescription: field.description,
      columnType: isSharePointUrlField(field) ? 'hyperlinkOrPicture' : field.typeAsString,
      required: field.required,
      readOnly: field.readOnly,
      hidden: field.hidden,
      isPicture:
        field.displayFormat !== undefined
          ? field.displayFormat === 1
          : isSharePointUrlField(field)
            ? (fallbackIsPicture ?? false)
            : undefined
    });

    let getRestSiteWebUrl = async (operation: string) => {
      if (!sharepointToken) {
        throw serviceError(
          `SharePoint REST access token is missing. Reconnect SharePoint auth so ${operation} can use the SharePoint REST API.`,
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

    let getRestFieldLookup = async () => {
      if (!sharepointToken) return undefined;

      let webUrl: string;
      try {
        webUrl = await getRestSiteWebUrl('list columns');
      } catch {
        return undefined;
      }

      return buildFieldLookup(await client.listSharePointRestFields(webUrl, listId));
    };

    switch (action) {
      case 'list': {
        let data = await client.listColumns(siteId, listId);
        let restFieldLookup = await getRestFieldLookup();
        let columns = (data.value || []).map((column: any) => {
          let restField =
            restFieldLookup?.get(column.name) ??
            restFieldLookup?.get(String(column.name || '').toLowerCase());

          return mapColumn(column, restField);
        });
        return {
          output: { columns },
          message: `Found **${columns.length}** column(s) on the list.`
        };
      }

      case 'create': {
        columnName = requireField(columnName, 'columnName', 'create');
        let resolvedColumnType = requireField(
          columnType,
          'columnType',
          'create'
        ) as NonNullable<typeof columnType>;

        if (resolvedColumnType === 'hyperlinkOrPicture') {
          let siteWebUrl = await getRestSiteWebUrl('Hyperlink column creation');
          let field = await client.createSharePointRestUrlField(siteWebUrl, listId, {
            name: columnName,
            description: columnDescription,
            required,
            isPicture
          });

          return {
            output: { column: mapRestColumn(field, isPicture) },
            message: `Created column **${columnName}** (${resolvedColumnType}).`
          };
        }

        let column = await client.createColumn(siteId, listId, {
          name: columnName,
          description: columnDescription,
          type: resolvedColumnType,
          required,
          choices,
          isPicture
        });
        return {
          output: { column: mapColumn(column, undefined, resolvedColumnType, isPicture) },
          message: `Created column **${columnName}** (${resolvedColumnType}).`
        };
      }

      case 'update': {
        columnId = requireField(columnId, 'columnId', 'update');
        let updates: { description?: string; required?: boolean } = {};
        if (columnDescription !== undefined) updates.description = columnDescription;
        if (required !== undefined) updates.required = required;
        let column = await client.updateColumn(siteId, listId, columnId, updates);
        return {
          output: { column: mapColumn(column) },
          message: `Updated column \`${columnId}\`.`
        };
      }

      case 'delete': {
        columnId = requireField(columnId, 'columnId', 'delete');
        await client.deleteColumn(siteId, listId, columnId);
        return {
          output: { deleted: true },
          message: `Deleted column \`${columnId}\`.`
        };
      }
    }
  })
  .build();
