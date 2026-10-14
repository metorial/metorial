# <img src="logo.png" height="20"> Findymail

Find and verify professional B2B email addresses, phone numbers, and company information. Search for employees, discover leads with natural language queries, track asynchronous search progress, and retrieve paginated results. Retrieve saved contact lists and contacts, and check finder and verifier credit balances.

Start lead discovery with `intellimatch_search`, pass its returned `hash` to `get_intellimatch_status`, then call `get_intellimatch_results` when the status is `success`. Use `currentPage` and `lastPage` to retrieve subsequent pages. The legacy `searchId` output continues to contain the same export hash.

Call `get_contact_lists` to discover list IDs, then `list_contacts` to retrieve saved contacts from a selected list. Omit `listId` to request all contacts; the response includes both the returned count and the provider's total counts.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
