# <img src="logo.svg" height="20"> YNAB

Read budgets, accounts, transactions, categories, payees, scheduled transactions, and monthly summaries. Discover the connected user and budget IDs before working with a particular budget. The existing `budgetId` inputs and `last-used`/`default` shortcuts remain supported; current YNAB API calls use plan routes.

Use OAuth for full access, OAuth Read Only for reads, or a personal access token from YNAB Developer Settings. Full-access OAuth omits a scope parameter; read-only OAuth requests `read-only`.

Money uses signed integer milliunits: 100000 represents 100 currency units. Supply safe integers without rounding. List tools and `get_budget` accept `lastKnowledgeOfServer` on documented delta endpoints and return `serverKnowledge`; merge changed records and deletion tombstones into the prior snapshot using the same budget and filters. Transaction lists accept `sinceDate` and `untilDate`; YNAB normally defaults the start date to one year ago.

Transactions support creation of splits and conversion of an ordinary transaction into a split. The API cannot replace existing split parts or change a split parent’s date, amount, or category. Import IDs deduplicate within an account and may match existing transactions, so a saved ID does not necessarily identify a newly created record. After an unconfirmed write, read the affected account before retrying with the same import ID.

Scheduled partial updates preserve fresh account, date, amount, payee, category, memo, flag, and recurrence fields. Category targets accept current supported target amount, target date, recurring frequency, and rollover options. Legacy `goalType` and `goalDay` writes receive remediation instead of being silently ignored. Loan and credit-card category targets have provider restrictions.

Supported account creation types are checking, savings, cash, creditCard, otherAsset, and otherLiability. Account, payee, category, and category-group creation leaves retained records because YNAB exposes no delete API for them. Bank imports can leave transaction and matching history. The integration does not provide a downloadable budget export or standalone payee-location tools.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
