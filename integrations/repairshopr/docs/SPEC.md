# RepairShopr Integration

Manage customers and contacts, service tickets and comments, invoices and payments,
estimates, leads, products, customer assets, and appointments. Read the connected
user with `who_am_i`, discover technician IDs with `list_users`, and convert an
estimate into an invoice with `convert_estimate_to_invoice`.

## Authentication

Generate an API token in **More > Admin > API - API Tokens**. Give the token the
permissions required for the operations you intend to use. Supply the account
subdomain from your RepairShopr dashboard URL, such as `myshop` from
`myshop.repairshopr.com`. Requests use the account's API v1 endpoint and Bearer
authentication. Tokens can have an expiration date; replace expired tokens.

## Request and response details

- Ticket assignments use the technician's numeric user ID. `list_users` returns
  IDs and names. Ticket type names are resolved through ticket settings;
  `ticketTypeId` can supply an explicit ID. A new ticket's description becomes its
  initial comment, without sending a notification email.
- Payment `amount` uses major currency units, such as `12.50`. Requests convert
  this amount to integer cents. Payment results expose all linked invoice IDs
  and the provider's acceptance status.
- Invoice and estimate notes use the provider's `note` field. Invoice balances
  use `balance_due`. Null optional values are omitted from normalized results,
  and zero monetary values are retained.
- Product cost, categories, SKUs, and storage location use the provider's
  `price_cost`, `category_ids`, `product_skus_attributes`, and `physical_location`
  fields. Setting a category replaces the product's category list with that ID.
- Searches return a page of provider results and any pagination metadata the
  provider supplies. Existing legacy filter fields remain accepted; the current
  API specification does not document every historical filter.

## Compatibility limits

Existing employee clock tools retain their historical endpoint contract. The
current public API specification documents `/timelogs`, but does not document
`/employee_clock_entries` or arbitrary entry creation/deletion. Their provider
behavior has not been verified during this refresh.

The current specification also omits several accepted legacy fields, including
invoice search customer/date/sort filters, payment search customer/invoice/date
filters, invoice status updates, ticket description updates, payment date/notes,
and estimate creation line-item prices/tax flags. These remain available for
compatibility, with provider acceptance unverified. Invoice creation documents
`number` and `date` as required, and product writes document `description` as
required; supply these fields even though the existing tool schemas retain their
optional status for compatibility.

## Official sources

- [API documentation](https://api-docs.repairshopr.com/)
- [OpenAPI specification](https://api-docs.repairshopr.com/swagger.json)
- [API setup and authentication](https://repair.uservoice.com/knowledgebase/articles/376312-repairshopr-re)
