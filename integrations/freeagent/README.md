# FreeAgent

Manage contacts, invoices, estimates, supplier bills, expenses, projects, tasks, and timeslips. Browse bank accounts and transactions, retrieve company information and users, and run Profit & Loss, Balance Sheet, and Trial Balance reports. Identify the connected user and download invoice PDFs.

Connect with OAuth using a FreeAgent developer app. Choose production or sandbox during connection setup; sandbox requires its own app registration. Access follows the connected user's FreeAgent permission level. List tools accept page and perPage; the API defaults to 25 records and allows up to 100 per page.

Invoice transitions and timer actions must be performed separately from ordinary field updates. Updates that return an empty success body are followed by a read of the saved resource. If that read fails, the error explains that the update was accepted so callers can verify it without repeating the write.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
