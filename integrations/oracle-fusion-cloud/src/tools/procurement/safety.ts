import { createApiServiceError } from 'slates';
import type { OracleCollectionPath, OracleFusionClient } from '../../lib/client';
import {
  booleanField,
  changeIndicator,
  type OracleRecord,
  stringField
} from '../../lib/records';
import {
  assertParent,
  draftOrderFields,
  draftOrderLineFields,
  requireId,
  requisitionFields,
  requisitionLineFields
} from './models';

const ineligible = (message: string) =>
  createApiServiceError(message, { reason: 'oracle_fusion_procurement_ineligible' });
const requireNull = (record: OracleRecord, fields: readonly string[]) =>
  fields.every(field => Object.hasOwn(record, field) && record[field] === null);
const knownUncanceled = (record: OracleRecord) =>
  Object.hasOwn(record, 'CancelFlag') &&
  (record.CancelFlag === null || booleanField(record, 'CancelFlag') === false);
export const requireRequisitionEligibility = (record: OracleRecord) => {
  if (
    stringField(record, 'DocumentStatusCode') !== 'INCOMPLETE' ||
    !requireNull(record, ['SubmissionDate', 'ApprovedDate'])
  ) {
    throw ineligible(
      'Only original incomplete requisitions with known empty submission and approval dates can be changed or deleted. Read get_purchase_requisition and review its current state.'
    );
  }
};
export const requireDraftOrderEligibility = (record: OracleRecord) => {
  // The original-order POST examples use explicit null for each change-order indicator.
  if (
    stringField(record, 'StatusCode') !== 'INCOMPLETE' ||
    !knownUncanceled(record) ||
    !requireNull(record, [
      'ChangeOrderNumber',
      'ChangeOrderStatusCode',
      'ChangeOrderTypeCode',
      'ChangeOrderInitiatingParty'
    ])
  ) {
    throw ineligible(
      'Only original incomplete purchase orders with known uncanceled state and empty change-order indicators can be changed or deleted. Read get_draft_purchase_order; unknown states and change orders are not eligible.'
    );
  }
};
export const requireLineEligibility = (
  record: OracleRecord,
  collection: '/purchaseRequisitions' | '/draftPurchaseOrders'
) => {
  if (collection === '/purchaseRequisitions') {
    if (
      stringField(record, 'LineStatus') !== 'INCOMPLETE' ||
      !requireNull(record, ['CancelDate', 'OriginalSubmittedDate', 'OriginalApprovalDate'])
    )
      throw ineligible(
        'Only original incomplete requisition lines with known empty cancellation, submission, and approval dates can be edited.'
      );
  } else if (!knownUncanceled(record))
    throw ineligible(
      'Only known uncanceled lines on an original incomplete purchase order can be edited.'
    );
};
export const requireExpectedIndicator = (record: OracleRecord, expected: string): string => {
  const indicator = changeIndicator(record);
  if (!indicator)
    throw ineligible(
      'Oracle did not return a change indicator. Read the document or line again before requesting a change.'
    );
  if (indicator !== expected)
    throw ineligible(
      'The document or line changed after it was read. Read its latest change indicator and review the new state before requesting the operation again.'
    );
  return indicator;
};
export const readEligibleHeader = async (
  client: OracleFusionClient,
  collection: '/purchaseRequisitions' | '/draftPurchaseOrders',
  key: string
) => {
  const record = await client.get('fscm', collection, key, {
    fields: collection === '/purchaseRequisitions' ? requisitionFields : draftOrderFields,
    links: 'self'
  });
  if (client.resourceKey(record, 'fscm', collection) !== key)
    throw ineligible('Oracle returned a different document resource key than requested.');
  if (collection === '/purchaseRequisitions') requireRequisitionEligibility(record);
  else requireDraftOrderEligibility(record);
  return record;
};
export const readEligibleLine = async (
  client: OracleFusionClient,
  collection: '/purchaseRequisitions' | '/draftPurchaseOrders',
  parentKey: string,
  lineKey: string,
  expectedParentIndicator: string,
  expectedLineIndicator: string
): Promise<{ record: OracleRecord; collection: OracleCollectionPath; indicator: string }> => {
  const firstParent = await readEligibleHeader(client, collection, parentKey);
  const parentIndicator = requireExpectedIndicator(firstParent, expectedParentIndicator);
  const child = client.childCollectionPath(collection, parentKey, 'lines');
  const line = await client.get('fscm', child, lineKey, {
    fields:
      collection === '/purchaseRequisitions' ? requisitionLineFields : draftOrderLineFields,
    links: 'self'
  });
  assertParent(
    line,
    collection === '/purchaseRequisitions' ? 'RequisitionHeaderId' : 'POHeaderId',
    requireId(
      firstParent,
      collection === '/purchaseRequisitions' ? 'RequisitionHeaderId' : 'POHeaderId'
    )
  );
  if (client.resourceKey(line, 'fscm', child) !== lineKey)
    throw ineligible('Oracle returned a different line resource key than requested.');
  requireLineEligibility(line, collection);
  const indicator = requireExpectedIndicator(line, expectedLineIndicator);
  // A line read can race a header lifecycle transition; observe the header again immediately before mutation.
  const currentParent = await readEligibleHeader(client, collection, parentKey);
  requireExpectedIndicator(currentParent, parentIndicator);
  return { record: line, collection: child, indicator };
};
export const readCatalogGoods = async (
  client: OracleFusionClient,
  itemKey: string,
  lineTypeKey: string,
  organizationId: string
) => {
  const item = await client.get('fscm', '/itemsV2', itemKey, {
    fields: 'ItemId,OrganizationId,ItemNumber,ItemDescription,PrimaryUOMValue',
    links: 'self'
  });
  if (client.resourceKey(item, 'fscm', '/itemsV2') !== itemKey)
    throw ineligible('Oracle returned a different catalog item resource key than requested.');
  assertParent(item, 'OrganizationId', organizationId);
  const uom = stringField(item, 'PrimaryUOMValue');
  if (!uom || uom.length > 25)
    throw ineligible(
      'The catalog item must provide an Oracle primary unit of measure name of at most 25 characters.'
    );
  const type = await client.get('fscm', '/purchasingLineTypesLOV', lineTypeKey, {
    fields: 'LineTypeId,LineType,PurchaseBasisCode,PurchaseBasis,ProductTypeCode,CreditFlag',
    links: 'self'
  });
  if (client.resourceKey(type, 'fscm', '/purchasingLineTypesLOV') !== lineTypeKey)
    throw ineligible(
      'Oracle returned a different purchasing line type resource key than requested.'
    );
  if (
    stringField(type, 'ProductTypeCode') !== 'GOODS' ||
    stringField(type, 'PurchaseBasisCode') !== 'GOODS' ||
    booleanField(type, 'CreditFlag') === true
  )
    throw ineligible(
      'Creation supports only a discovered catalog goods line type with a Quantity purchase basis that is not enabled as a credit line type.'
    );
  const lineType = stringField(type, 'LineType');
  if (!lineType)
    throw ineligible('Oracle did not return the selected purchasing line type name.');
  return {
    itemId: requireId(item, 'ItemId'),
    itemDescription: stringField(item, 'ItemDescription'),
    lineTypeId: requireId(type, 'LineTypeId'),
    lineType,
    uom
  };
};
export const readStandardDocumentStyle = async (client: OracleFusionClient, key: string) => {
  const style = await client.get('fscm', '/purchasingDocumentStylesLOV', key, {
    fields: 'StyleId,StyleName,DocumentSubtype,EnabledFlag',
    links: 'self'
  });
  if (client.resourceKey(style, 'fscm', '/purchasingDocumentStylesLOV') !== key)
    throw ineligible(
      'Oracle returned a different document style resource key than requested.'
    );
  if (
    stringField(style, 'DocumentSubtype') !== 'STANDARD' ||
    booleanField(style, 'EnabledFlag') !== true
  )
    throw ineligible(
      'Creation supports only an enabled standard purchase order document style discovered by list_purchasing_document_styles.'
    );
  return requireId(style, 'StyleId');
};
