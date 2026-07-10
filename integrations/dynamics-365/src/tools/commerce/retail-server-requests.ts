import {
  buildCommerceActionPath,
  buildCommerceProjectionDomain,
  buildCommerceQueryResultSettings,
  buildCommerceRequest,
  type CommerceId,
  type CommercePaginationInput,
  commerceServiceError,
  getCommerceCollection,
  requireCommerceArray,
  requireCommerceId,
  requireCommerceString
} from '@slates/dynamics-commerce-recipes';

type ProductSearchInput = {
  searchText?: string;
  categoryId?: CommerceId;
  channelId?: CommerceId;
  catalogId?: CommerceId;
  refiners?: unknown[];
} & CommercePaginationInput;

let requireCommerceInteger = (value: unknown, label: string) => {
  if (!Number.isInteger(value)) {
    throw commerceServiceError(`${label} is required.`);
  }

  return value as number;
};

let hasSearchText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export let buildDocumentedSearchProductsRequest = (input: ProductSearchInput) => {
  let hasText = hasSearchText(input.searchText);
  let hasCategory = input.categoryId !== undefined;
  let hasRefiners = Array.isArray(input.refiners) && input.refiners.length > 0;

  if (hasText && hasCategory) {
    throw commerceServiceError(
      'Provide searchText or categoryId for product search, not both.'
    );
  }

  if (!hasText && !hasCategory) {
    throw commerceServiceError('searchText or categoryId is required for product search.');
  }

  let path =
    hasRefiners && hasCategory
      ? buildCommerceActionPath('Products', 'RefineSearchByCategory')
      : hasRefiners
        ? buildCommerceActionPath('Products', 'RefineSearchByText')
        : hasCategory
          ? buildCommerceActionPath('Products', 'SearchByCategory')
          : buildCommerceActionPath('Products', 'SearchByText');

  return buildCommerceRequest({
    method: 'POST',
    path,
    operation: 'search products',
    body: {
      channelId: input.channelId,
      catalogId: input.catalogId,
      searchText: hasText ? input.searchText?.trim() : undefined,
      categoryId: input.categoryId,
      refinementCriteria: hasRefiners ? input.refiners : undefined,
      queryResultSettings: buildCommerceQueryResultSettings(input)
    }
  });
};

export let buildDocumentedGetProductRequest = (input: {
  productId?: CommerceId;
  channelId?: CommerceId;
}) =>
  buildCommerceRequest({
    method: 'POST',
    path: buildCommerceActionPath('Products', 'GetById'),
    operation: 'get product',
    body: {
      recordId: requireCommerceId(input.productId, 'productId'),
      channelId: input.channelId
    }
  });

export let buildDocumentedGetProductsByIdsRequest = (
  input: {
    productIds?: CommerceId[];
    channelId?: CommerceId;
  } & CommercePaginationInput
) =>
  buildCommerceRequest({
    method: 'POST',
    path: buildCommerceActionPath('Products', 'GetByIds'),
    operation: 'get products by ids',
    body: {
      channelId: input.channelId,
      productIds: requireCommerceArray(input.productIds, 'productIds'),
      queryResultSettings: buildCommerceQueryResultSettings(input)
    }
  });

export let buildDocumentedGetActivePricesRequest = (
  input: {
    productIds?: CommerceId[];
    channelId?: CommerceId;
    catalogId?: CommerceId;
    locale?: string;
    currencyCode?: string;
    customerAccountNumber?: string;
    activeDate?: string;
    affiliationLoyaltyTiers?: unknown[];
    includeSimpleDiscountsInContextualPrice?: boolean;
  } & CommercePaginationInput
) =>
  buildCommerceRequest({
    method: 'POST',
    path: buildCommerceActionPath('Products', 'GetActivePrices'),
    operation: 'get active prices',
    body: {
      projectDomain: buildCommerceProjectionDomain(input),
      productIds: requireCommerceArray(input.productIds, 'productIds'),
      activeDate: input.activeDate,
      customerId: input.customerAccountNumber,
      affiliationLoyaltyTiers: input.affiliationLoyaltyTiers,
      includeSimpleDiscountsInContextualPrice: input.includeSimpleDiscountsInContextualPrice,
      queryResultSettings: buildCommerceQueryResultSettings(input)
    }
  });

export let buildDocumentedGetProductAvailabilitiesRequest = (
  input: {
    itemIds?: string[];
    channelId?: CommerceId;
  } & CommercePaginationInput
) =>
  buildCommerceRequest({
    method: 'POST',
    path: buildCommerceActionPath('Products', 'GetProductAvailabilities'),
    operation: 'get product availabilities',
    body: {
      itemIds: requireCommerceArray(input.itemIds, 'itemIds'),
      channelId: input.channelId,
      queryResultSettings: buildCommerceQueryResultSettings(input)
    }
  });

export let buildDocumentedGetEstimatedAvailabilityRequest = (input: {
  productIds?: CommerceId[];
  itemIds?: string[];
  channelId?: CommerceId;
  warehouseIds?: string[];
  inventoryLocationIds?: string[];
  deliveryMode?: string;
}) => {
  if (!input.productIds?.length && !input.itemIds?.length) {
    throw commerceServiceError(
      'productIds or itemIds is required for estimated availability.'
    );
  }

  return buildCommerceRequest({
    method: 'POST',
    path: buildCommerceActionPath('Products', 'GetEstimatedAvailability'),
    operation: 'get estimated availability',
    body: {
      searchCriteria: {
        ProductIds: input.productIds,
        ItemIds: input.itemIds,
        ChannelId: input.channelId,
        WarehouseIds: input.warehouseIds,
        InventoryLocationIds: input.inventoryLocationIds,
        DeliveryMode: input.deliveryMode
      }
    }
  });
};

export let buildDocumentedGetCustomersByAccountNumbersRequest = (
  input: {
    accountNumbers?: string[];
    searchLocationValue?: number;
  } & CommercePaginationInput
) =>
  buildCommerceRequest({
    method: 'POST',
    path: buildCommerceActionPath('Customers', 'GetByAccountNumbers'),
    operation: 'get customers by account numbers',
    body: {
      accountNumbers: requireCommerceArray(input.accountNumbers, 'accountNumbers'),
      searchLocationValue: requireCommerceInteger(
        input.searchLocationValue,
        'searchLocationValue'
      ),
      queryResultSettings: buildCommerceQueryResultSettings(input)
    }
  });

export let buildDocumentedGetCustomerOrderHistoryRequest = (
  input: {
    accountNumber?: CommerceId;
  } & CommercePaginationInput
) =>
  buildCommerceRequest({
    method: 'POST',
    path: buildCommerceActionPath('Customers', 'GetOrderHistory'),
    operation: 'get customer order history',
    body: {
      accountNumber: requireCommerceId(input.accountNumber, 'accountNumber'),
      queryResultSettings: buildCommerceQueryResultSettings(input)
    }
  });

export let buildDocumentedAddCartLinesRequest = (input: {
  cartId?: string;
  cartLines?: unknown[];
  cartVersion?: number;
}) =>
  buildCommerceRequest({
    method: 'POST',
    path: buildCommerceActionPath('Carts', 'AddCartLines'),
    operation: 'add cart lines',
    body: {
      ID: requireCommerceString(input.cartId, 'cartId'),
      cartLines: requireCommerceArray(input.cartLines, 'cartLines'),
      cartVersion: input.cartVersion
    }
  });

// UpdateCartLines takes only (ID, cartLines); unlike AddCartLines and Checkout
// there is no cartVersion parameter in the CSU consumer API.
export let buildDocumentedUpdateCartLinesRequest = (input: {
  cartId?: string;
  cartLines?: unknown[];
}) =>
  buildCommerceRequest({
    method: 'POST',
    path: buildCommerceActionPath('Carts', 'UpdateCartLines'),
    operation: 'update cart lines',
    body: {
      ID: requireCommerceString(input.cartId, 'cartId'),
      cartLines: requireCommerceArray(input.cartLines, 'cartLines')
    }
  });

export let buildDocumentedCheckoutCartRequest = (input: {
  cartId?: string;
  receiptEmail?: string;
  tokenizedPaymentCard?: unknown;
  receiptNumberSequence?: string;
  cartTenderLines?: unknown[];
  cartVersion?: number;
}) =>
  buildCommerceRequest({
    method: 'POST',
    path: buildCommerceActionPath('Carts', 'Checkout'),
    operation: 'checkout cart',
    body: {
      ID: requireCommerceString(input.cartId, 'cartId'),
      receiptEmail: input.receiptEmail,
      tokenizedPaymentCard: input.tokenizedPaymentCard,
      receiptNumberSequence: input.receiptNumberSequence,
      cartTenderLines: input.cartTenderLines,
      cartVersion: input.cartVersion
    }
  });

export let buildDocumentedGetOrderByTransactionIdRequest = (input: {
  transactionId?: string;
  searchLocationValue?: number;
}) =>
  buildCommerceRequest({
    method: 'POST',
    path: buildCommerceActionPath('SalesOrders', 'GetSalesOrderDetailsByTransactionId'),
    operation: 'get order by transaction id',
    body: {
      transactionId: requireCommerceString(input.transactionId, 'transactionId'),
      searchLocationValue: requireCommerceInteger(
        input.searchLocationValue,
        'searchLocationValue'
      )
    }
  });

export let buildDocumentedGetOrderBySalesIdRequest = (input: { salesId?: string }) =>
  buildCommerceRequest({
    method: 'POST',
    path: buildCommerceActionPath('SalesOrders', 'GetSalesOrderDetailsBySalesId'),
    operation: 'get order by sales id',
    body: {
      salesId: requireCommerceString(input.salesId, 'salesId')
    }
  });

export let findCatalogById = (response: unknown, catalogId: CommerceId) => {
  let expected = String(requireCommerceId(catalogId, 'catalogId'));

  return getCommerceCollection(response).find(record => {
    if (typeof record !== 'object' || record === null || Array.isArray(record)) {
      return false;
    }

    let candidate = record as Record<string, unknown>;
    for (let key of ['RecordId', 'recordId', 'CatalogId', 'catalogId', 'Id', 'id']) {
      let value = candidate[key];
      if (
        (typeof value === 'string' || typeof value === 'number') &&
        String(value) === expected
      ) {
        return true;
      }
    }

    return false;
  });
};
