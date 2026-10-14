# Firmao Integration

## Authentication

Enable the API in **Company → Settings → API** and obtain the API login and generated password. Requests use HTTP Basic authentication. The organization identifier is the URL segment shown after signing in to Firmao and is supplied in the connection configuration.

## Available operations

- Customers: list, get, create, update, and soft-delete.
- Contacts: list and create contact persons linked to customers.
- Projects and tasks: list, create, and update.
- Products: list, create, and update purchase/sale pricing and supported stock fields.
- Financial documents: list transactions and offers; create transactions, offers, orders, and agreements.
- Sales pipeline: list and create opportunities and sales notes.
- Work time: list and create entries, then finish an existing entry using `end_time_entry`.
- Mail and files: list stored email summaries and document metadata.
- Warehouse: list warehouse document summaries.
- Numbering: `list_numbering_series` returns series IDs and templates; `get_next_document_number` retrieves a suggested number for a selected series, document type, and mode.

List tools support offset pagination (`start`, `limit`), sorting, and their documented filters. Pages default to 50 records. Returned relationship names use Firmao's labels when names are absent. Optional values omitted by Firmao are omitted from the result.

## Financial line items

Use `productId` to link an existing product, or `productName` for an unlinked free-text item. Firmao receives either value in its `product` field. Prices and quantities retain the provider's net-price and VAT meanings.

The `create_transaction` flag `createCustomerIfNeeded` maps to Firmao's `createNewCustomerIfNeeded` field. Correction line items can include `baseEntryId`, `recordId`, and `invalidRecordId` to link original, before, and after positions. Follow the provider's correction-invoice payload rules.

Suggested document numbers must still be unique at creation time. The next-number tool preserves the provider response because the official reference does not specify its response envelope.

## Reference

- [English API documentation](https://firmao.io/API-Documentation_EN.pdf)
- [Current Polish API documentation](https://firmao.pl/API%20Firmao.pdf)
- [Provider technical documentation page](https://firmao.pl/dokumentacja-techniczna/)
