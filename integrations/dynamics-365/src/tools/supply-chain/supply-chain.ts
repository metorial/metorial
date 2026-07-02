import { createGetRecordTool, createListRecordsTool } from './shared';

export let listProducts = createListRecordsTool({
  key: 'list_products',
  name: 'List Supply Chain Products',
  description:
    'List Dynamics 365 Supply Chain Management product master records through Finance and Operations OData.',
  outputKey: 'products',
  entitySetName: 'ProductsV2',
  companyScoped: false,
  idFields: ['ProductNumber', 'ProductRecId'],
  numberFields: ['ProductNumber', 'ItemNumber'],
  nameFields: ['ProductName', 'SearchName', 'Name'],
  statusFields: ['ProductType', 'ProductSubtype']
});

export let listReleasedProducts = createListRecordsTool({
  key: 'list_released_products',
  name: 'List Supply Chain Released Products',
  description:
    'List released products by legal entity, item number, product dimensions, and OData filters.',
  outputKey: 'releasedProducts',
  entitySetName: 'ReleasedProductsV2',
  companyScoped: true,
  idFields: ['ItemNumber', 'ProductNumber'],
  numberFields: ['ItemNumber', 'ProductNumber'],
  nameFields: ['ProductName', 'SearchName', 'Name'],
  statusFields: ['ProductLifecycleStateId', 'ItemModelGroupId']
});

export let getReleasedProduct = createGetRecordTool({
  key: 'get_released_product',
  name: 'Get Supply Chain Released Product',
  description:
    'Retrieve one released product by OData key values. Include dataAreaId when required by metadata.',
  outputKey: 'releasedProduct',
  entitySetName: 'ReleasedProductsV2',
  companyScoped: true,
  idFields: ['ItemNumber', 'ProductNumber'],
  numberFields: ['ItemNumber', 'ProductNumber'],
  nameFields: ['ProductName', 'SearchName', 'Name'],
  statusFields: ['ProductLifecycleStateId', 'ItemModelGroupId']
});

export let listInventoryOnHand = createListRecordsTool({
  key: 'list_inventory_on_hand',
  name: 'List Supply Chain Inventory On Hand',
  description:
    'List inventory on-hand records by item, warehouse, site, legal entity, and OData filters.',
  outputKey: 'inventoryOnHand',
  entitySetName: 'InventoryOnHand',
  companyScoped: true,
  idFields: ['ItemNumber', 'InventorySiteId', 'InventoryWarehouseId'],
  numberFields: ['ItemNumber'],
  nameFields: ['ProductName', 'ItemName'],
  statusFields: ['InventoryStatusId'],
  amountFields: ['AvailableOnHandQuantity', 'OnHandQuantity', 'ReservedOnHandQuantity']
});

export let listWarehouses = createListRecordsTool({
  key: 'list_warehouses',
  name: 'List Supply Chain Warehouses',
  description: 'List warehouses and warehouse master data by legal entity and OData filters.',
  outputKey: 'warehouses',
  entitySetName: 'Warehouses',
  companyScoped: true,
  idFields: ['WarehouseId', 'InventLocationId'],
  numberFields: ['WarehouseId', 'InventLocationId'],
  nameFields: ['WarehouseName', 'Name'],
  statusFields: ['WarehouseType']
});

export let listPurchaseOrders = createListRecordsTool({
  key: 'list_purchase_orders',
  name: 'List Supply Chain Purchase Orders',
  description:
    'List purchase order headers for procurement review by legal entity, vendor, status, and OData filters.',
  outputKey: 'purchaseOrders',
  entitySetName: 'PurchaseOrderHeadersV2',
  companyScoped: true,
  idFields: ['PurchaseOrderNumber', 'PurchId'],
  numberFields: ['PurchaseOrderNumber', 'PurchId'],
  nameFields: ['OrderVendorName', 'PurchaseOrderName'],
  statusFields: ['PurchaseOrderStatus', 'DocumentApprovalStatus'],
  dateFields: ['OrderDate', 'RequestedDeliveryDate', 'ConfirmedDeliveryDate'],
  amountFields: ['TotalPurchaseOrderAmount'],
  currencyFields: ['CurrencyCode']
});

export let listPurchaseOrderLines = createListRecordsTool({
  key: 'list_purchase_order_lines',
  name: 'List Supply Chain Purchase Order Lines',
  description:
    'List purchase order line records for item, quantity, delivery, and receiving review by legal entity and OData filters.',
  outputKey: 'purchaseOrderLines',
  entitySetName: 'PurchaseOrderLinesV2',
  companyScoped: true,
  idFields: [
    'PurchaseOrderNumber',
    'LineNumber',
    'LineCreationSequenceNumber',
    'InventTransId'
  ],
  numberFields: ['PurchaseOrderNumber', 'LineNumber', 'ItemNumber'],
  nameFields: ['LineDescription', 'ProductName', 'ItemName'],
  statusFields: ['PurchaseOrderLineStatus', 'LineStatus'],
  dateFields: ['RequestedDeliveryDate', 'ConfirmedDeliveryDate'],
  amountFields: ['LineAmount', 'OrderedPurchaseQuantity', 'ReceivedPurchaseQuantity'],
  currencyFields: ['CurrencyCode']
});

export let getPurchaseOrder = createGetRecordTool({
  key: 'get_purchase_order',
  name: 'Get Supply Chain Purchase Order',
  description:
    'Retrieve one purchase order header by OData key values. This is read-only and does not confirm, receive, or post the order.',
  outputKey: 'purchaseOrder',
  entitySetName: 'PurchaseOrderHeadersV2',
  companyScoped: true,
  idFields: ['PurchaseOrderNumber', 'PurchId'],
  numberFields: ['PurchaseOrderNumber', 'PurchId'],
  nameFields: ['OrderVendorName', 'PurchaseOrderName'],
  statusFields: ['PurchaseOrderStatus', 'DocumentApprovalStatus'],
  dateFields: ['OrderDate', 'RequestedDeliveryDate', 'ConfirmedDeliveryDate'],
  amountFields: ['TotalPurchaseOrderAmount'],
  currencyFields: ['CurrencyCode']
});

export let listSalesOrders = createListRecordsTool({
  key: 'list_sales_orders',
  name: 'List Supply Chain Sales Orders',
  description:
    'List sales order headers for fulfillment review by legal entity, customer, status, and OData filters.',
  outputKey: 'salesOrders',
  entitySetName: 'SalesOrderHeadersV2',
  companyScoped: true,
  idFields: ['SalesOrderNumber', 'SalesId'],
  numberFields: ['SalesOrderNumber', 'SalesId'],
  nameFields: ['OrderingCustomerName', 'SalesOrderName'],
  statusFields: ['SalesOrderStatus', 'DocumentStatus'],
  dateFields: ['OrderCreationDateTime', 'RequestedReceiptDate', 'RequestedShippingDate'],
  amountFields: ['TotalOrderAmount'],
  currencyFields: ['CurrencyCode']
});

export let listSalesOrderLines = createListRecordsTool({
  key: 'list_sales_order_lines',
  name: 'List Supply Chain Sales Order Lines',
  description:
    'List sales order line records for item, quantity, delivery, shipping, and fulfillment review by legal entity and OData filters.',
  outputKey: 'salesOrderLines',
  entitySetName: 'SalesOrderLines',
  companyScoped: true,
  idFields: ['SalesOrderNumber', 'LineNumber', 'InventTransId'],
  numberFields: ['SalesOrderNumber', 'LineNumber', 'ItemNumber'],
  nameFields: ['LineDescription', 'ProductName', 'ItemName'],
  statusFields: ['SalesOrderLineStatus', 'LineStatus'],
  dateFields: ['RequestedShippingDate', 'RequestedReceiptDate', 'ConfirmedShippingDate'],
  amountFields: ['LineAmount', 'OrderedSalesQuantity', 'DeliveredQuantity'],
  currencyFields: ['CurrencyCode']
});

export let getSalesOrder = createGetRecordTool({
  key: 'get_sales_order',
  name: 'Get Supply Chain Sales Order',
  description:
    'Retrieve one sales order header by OData key values. This is read-only and does not confirm, ship, invoice, or cancel the order.',
  outputKey: 'salesOrder',
  entitySetName: 'SalesOrderHeadersV2',
  companyScoped: true,
  idFields: ['SalesOrderNumber', 'SalesId'],
  numberFields: ['SalesOrderNumber', 'SalesId'],
  nameFields: ['OrderingCustomerName', 'SalesOrderName'],
  statusFields: ['SalesOrderStatus', 'DocumentStatus'],
  dateFields: ['OrderCreationDateTime', 'RequestedReceiptDate', 'RequestedShippingDate'],
  amountFields: ['TotalOrderAmount'],
  currencyFields: ['CurrencyCode']
});

export let listShipments = createListRecordsTool({
  key: 'list_shipments',
  name: 'List Supply Chain Shipments',
  description:
    'List shipment and packing slip header records for outbound fulfillment review.',
  outputKey: 'shipments',
  entitySetName: 'SalesPackingSlipHeaders',
  companyScoped: true,
  idFields: ['PackingSlipId', 'ShipmentId'],
  numberFields: ['PackingSlipId', 'ShipmentId', 'SalesOrderNumber'],
  nameFields: ['DeliveryName', 'CustomerName'],
  statusFields: ['DocumentStatus'],
  dateFields: ['DeliveryDate', 'PackingSlipDate']
});

export let listReceipts = createListRecordsTool({
  key: 'list_receipts',
  name: 'List Supply Chain Receipts',
  description:
    'List receipt and product receipt header records for inbound procurement review.',
  outputKey: 'receipts',
  entitySetName: 'PurchasePackingSlipHeaders',
  companyScoped: true,
  idFields: ['PackingSlipId', 'ProductReceiptNumber'],
  numberFields: ['PackingSlipId', 'ProductReceiptNumber', 'PurchaseOrderNumber'],
  nameFields: ['OrderVendorName', 'VendorName'],
  statusFields: ['DocumentStatus'],
  dateFields: ['DeliveryDate', 'ProductReceiptDate']
});
