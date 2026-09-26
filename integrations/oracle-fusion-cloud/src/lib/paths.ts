import { createApiServiceError } from 'slates';
import { encodeResourceKey } from './urls';

export type OracleApi = 'fscm' | 'hcm';

const FSCM_RESOURCES = {
  finBusinessUnitsLOV: {},
  suppliers: { sites: {} },
  purchaseOrders: { lines: { schedules: { distributions: {} } } },
  invoices: {
    invoiceLines: { invoiceDistributions: {} },
    invoiceInstallments: {},
    attachments: {}
  },
  invoiceHolds: {},
  receivablesCustomerAccountActivities: { standardReceipts: {} },
  receivablesCustomerAccountSiteActivities: {},
  receivablesInvoices: { receivablesInvoiceLines: {}, receivablesInvoiceInstallments: {} },
  purchaseRequisitions: { lines: { distributions: {} } },
  draftPurchaseOrders: { lines: { schedules: { distributions: {} } } },
  procurementBusinessUnitsLOV: {},
  procurementPersonsLOV: {},
  buyersLOV: {},
  purchasingLineTypesLOV: {},
  purchasingDocumentStylesLOV: {},
  requisitionPreferences: { favoriteChargeAccounts: {} },
  inventoryOrganizations: {},
  itemsV2: {},
  inventoryOutboundItemQuantitiesSummaries: {},
  inventoryReservations: {},
  salesOrdersForOrderHub: { lines: {} },
  receivingTransactionsHistory: {}
} as const;

const HCM_RESOURCES = {
  workers: { workRelationships: { assignments: { managers: {} } } },
  organizations: {},
  jobs: {},
  locations: {}
} as const;

export type OracleCollection =
  | `/${keyof typeof FSCM_RESOURCES}`
  | `/${keyof typeof HCM_RESOURCES}`;
declare const collectionPathBrand: unique symbol;
export type OracleCollectionPath =
  | OracleCollection
  | (string & { readonly [collectionPathBrand]: true });
export type OracleChildCollection =
  | 'sites'
  | 'invoiceLines'
  | 'invoiceDistributions'
  | 'invoiceInstallments'
  | 'attachments'
  | 'standardReceipts'
  | 'receivablesInvoiceLines'
  | 'receivablesInvoiceInstallments'
  | 'lines'
  | 'schedules'
  | 'distributions'
  | 'favoriteChargeAccounts'
  | 'workRelationships'
  | 'assignments'
  | 'managers';

type ResourceTree = { readonly [child: string]: ResourceTree };

let invalidPath = () =>
  createApiServiceError('The Oracle resource path is not supported.', {
    reason: 'oracle_fusion_invalid_path'
  });

let collectionTree = (collection: OracleCollectionPath) => {
  if (typeof collection !== 'string') throw invalidPath();
  let [leading, root, ...segments] = collection.split('/');
  if (leading !== '' || !root || segments.length % 3 !== 0) throw invalidPath();
  let api: OracleApi;
  let roots: ResourceTree;
  if (Object.hasOwn(FSCM_RESOURCES, root)) {
    api = 'fscm';
    roots = FSCM_RESOURCES;
  } else if (Object.hasOwn(HCM_RESOURCES, root)) {
    api = 'hcm';
    roots = HCM_RESOURCES;
  } else {
    throw invalidPath();
  }
  let rootTree = roots[root];
  if (!rootTree) throw invalidPath();
  let tree: ResourceTree = rootTree;
  for (let index = 0; index < segments.length; index += 3) {
    let encodedKey = segments[index];
    let marker = segments[index + 1];
    let child = segments[index + 2];
    if (!encodedKey || marker !== 'child' || !child || !Object.hasOwn(tree, child)) {
      throw invalidPath();
    }
    try {
      if (encodeResourceKey(decodeURIComponent(encodedKey)) !== encodedKey) {
        throw invalidPath();
      }
    } catch {
      throw invalidPath();
    }
    let nested: ResourceTree | undefined = tree[child];
    if (!nested) throw invalidPath();
    tree = nested;
  }
  return { api, tree };
};

export let validateCollection = (api: OracleApi, collection: OracleCollectionPath) => {
  if (collectionTree(collection).api !== api) throw invalidPath();
  return collection;
};

export let childCollectionPath = (
  parent: OracleCollectionPath,
  parentKey: string,
  child: OracleChildCollection
): OracleCollectionPath => {
  let { tree } = collectionTree(parent);
  if (!Object.hasOwn(tree, child)) {
    throw createApiServiceError(
      'The nested Oracle resource is not supported for this parent.',
      {
        reason: 'oracle_fusion_invalid_path'
      }
    );
  }
  return `${parent}/${encodeResourceKey(parentKey)}/child/${child}` as OracleCollectionPath;
};
