# Finmei

Manage invoices and expenses for the business connected to an API token. Create, retrieve, replace, list, and delete invoices; download invoice PDFs; upload expense receipts, update expense details or receipt files, and retrieve original receipts. Read the connected business profile. Existing customer, product, payment, and currency tools remain available, although the current public API reference does not document those routes.

Generate a token in Finmei under Settings → Integrations. Each token belongs to one business. Invoice updates require complete invoice details; retrieve the current invoice before replacing it. Expense creation requires a PDF or image receipt.

See [API coverage and limitations](./docs/SPEC.md) and the [official API reference](https://documenter.getpostman.com/view/835227/2s9YXh5NRs).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
