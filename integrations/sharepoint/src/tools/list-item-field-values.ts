import { createApiServiceError } from 'slates';

export type SharePointHyperlinkFieldValue = {
  Url: string;
  Description: string;
};

export type SplitSharePointListItemFields = {
  graphFields: Record<string, unknown>;
  hyperlinkFields: Record<string, SharePointHyperlinkFieldValue>;
};

export type SharePointHyperlinkFieldMetadata = {
  internalName: string;
  staticName?: string;
  title?: string;
  typeAsString: string;
  fieldTypeKind?: number;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

let optionalStringProperty = (
  record: Record<string, unknown>,
  keys: string[],
  fieldName: string
) => {
  for (let key of keys) {
    if (!(key in record) || record[key] === undefined || record[key] === null) {
      continue;
    }

    let value = record[key];
    if (typeof value !== 'string') {
      throw createApiServiceError(`fields.${fieldName}.${key} must be a string.`, {
        reason: 'sharepoint_hyperlink_value_invalid'
      });
    }

    return value;
  }

  return undefined;
};

export let isSharePointHyperlinkFieldValueInput = (value: unknown) =>
  isRecord(value) && ['url', 'Url', 'webUrl'].some(key => typeof value[key] === 'string');

export let normalizeSharePointHyperlinkFieldValue = (
  fieldName: string,
  value: unknown
): SharePointHyperlinkFieldValue => {
  if (!isRecord(value)) {
    throw createApiServiceError(
      `fields.${fieldName} must be an object with a URL value for a SharePoint Hyperlink column.`,
      { reason: 'sharepoint_hyperlink_value_invalid' }
    );
  }

  let url = optionalStringProperty(value, ['url', 'Url', 'webUrl'], fieldName)?.trim();
  if (!url) {
    throw createApiServiceError(
      `fields.${fieldName} must include url, Url, or webUrl for a SharePoint Hyperlink column.`,
      { reason: 'sharepoint_hyperlink_url_required' }
    );
  }

  try {
    new URL(url);
  } catch (error) {
    throw createApiServiceError(`fields.${fieldName} URL must be an absolute URL.`, {
      reason: 'sharepoint_hyperlink_url_invalid',
      parent: error
    });
  }

  let description =
    optionalStringProperty(value, ['description', 'Description'], fieldName) ?? '';

  return {
    Url: url,
    Description: description
  };
};

export let splitSharePointListItemFields = (
  fields: Record<string, unknown>
): SplitSharePointListItemFields => {
  let graphFields: Record<string, unknown> = {};
  let hyperlinkFields: Record<string, SharePointHyperlinkFieldValue> = {};

  for (let [fieldName, fieldValue] of Object.entries(fields)) {
    if (isSharePointHyperlinkFieldValueInput(fieldValue)) {
      hyperlinkFields[fieldName] = normalizeSharePointHyperlinkFieldValue(
        fieldName,
        fieldValue
      );
      continue;
    }

    graphFields[fieldName] = fieldValue;
  }

  return { graphFields, hyperlinkFields };
};

let isSharePointUrlField = (field: SharePointHyperlinkFieldMetadata) =>
  field.typeAsString.toLowerCase() === 'url' || field.fieldTypeKind === 11;

let addFieldLookup = (
  fieldLookup: Map<string, SharePointHyperlinkFieldMetadata>,
  key: string | undefined,
  field: SharePointHyperlinkFieldMetadata
) => {
  if (!key) return;

  fieldLookup.set(key, field);
  fieldLookup.set(key.toLowerCase(), field);
};

let buildFieldLookup = (fields: SharePointHyperlinkFieldMetadata[]) => {
  let fieldLookup = new Map<string, SharePointHyperlinkFieldMetadata>();

  for (let field of fields) {
    addFieldLookup(fieldLookup, field.internalName, field);
    addFieldLookup(fieldLookup, field.staticName, field);
    addFieldLookup(fieldLookup, field.title, field);
  }

  return fieldLookup;
};

export let resolveSharePointHyperlinkFieldValues = (
  fields: SharePointHyperlinkFieldMetadata[],
  hyperlinkFields: Record<string, SharePointHyperlinkFieldValue>
) => {
  let fieldLookup = buildFieldLookup(fields);
  let resolvedFields: Record<string, SharePointHyperlinkFieldValue> = {};

  for (let [fieldName, fieldValue] of Object.entries(hyperlinkFields)) {
    let field = fieldLookup.get(fieldName) ?? fieldLookup.get(fieldName.toLowerCase());
    if (!field) {
      throw createApiServiceError(
        `fields.${fieldName} uses a SharePoint Hyperlink value shape, but no matching SharePoint field was found on the list.`,
        { reason: 'sharepoint_hyperlink_field_not_found' }
      );
    }

    if (!isSharePointUrlField(field)) {
      throw createApiServiceError(
        `fields.${fieldName} uses a SharePoint Hyperlink value shape, but the matching SharePoint field is type ${field.typeAsString || 'unknown'}.`,
        { reason: 'sharepoint_hyperlink_field_type_mismatch' }
      );
    }

    if (Object.hasOwn(resolvedFields, field.internalName)) {
      throw createApiServiceError(
        `Multiple Hyperlink field inputs resolve to SharePoint field ${field.internalName}. Provide each SharePoint field only once.`,
        { reason: 'sharepoint_hyperlink_field_duplicate' }
      );
    }

    resolvedFields[field.internalName] = fieldValue;
  }

  return resolvedFields;
};
