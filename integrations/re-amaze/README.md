# <img src="logo.png" height="20"> Re:amaze

Retrieve complete customer support threads across email, chat, social media, and SMS. Read customer messages, staff replies, and internal notes; manage conversations, contacts and identities, contact notes, knowledge base articles, response templates, staff, and status page incidents. Access reports and satisfaction ratings.

## Complete conversation history

1. Use `list_conversations` to discover conversation slugs. Its date filters refer to the latest customer message, not the conversation creation time; use `filter: "all"` when archived conversations are needed.
2. Call `list_messages` with `conversationSlug` and `page: 1`. Follow `nextPage` until `hasMore` is false. Provider counts can omit the initial message, so use `hasMore`/`nextPage` rather than stopping at `totalCount` or `pageCount`; a final page may be empty. Each call returns one page in newest-first order; reverse the complete collected history when chronological presentation is needed.
3. Keep sender, timestamps, conversation references, and `originId` with each message. `visibility: 1` identifies internal notes, `0` regular messages, and `2` collision-detected messages. Visibility does not identify whether a regular message was written by staff or a customer.
4. Use `filter: "staff"` to retrieve agents' answers, or `filter: "customer"` for customer messages. Leave it unset to retrieve the complete thread visible to your account. Internal notes should remain distinguished when preparing knowledge-base material.

Omit `conversationSlug` to search messages across the brand. Supported filters include sender, tags, channel, numeric origin, and message creation dates. `includeOriginalBody` requests original HTML when available. Attachments are described by metadata; file downloads are not performed.

`get_conversation` returns a conversation summary, the initial message body, and the latest customer/staff message summaries. Use `list_messages` for the rest of the thread.

## Authentication and compatibility

Connect using the account login email, API token, and brand subdomain (the label before `.reamaze.io`). API permissions follow the token's user. Existing tool keys and input field types are preserved in version 0.2.0; the refresh adds eight tools for 34 total.

`delete_contact_note` now accepts `contactIdentifier`, required by the provider's contact-scoped endpoint. Pass the email or phone number used to list the notes and the returned `noteIdentifier`. Note and status-page IDs can be UUIDs: use `noteIdentifier`, `incidentIdentifier`, `systemIdentifier`, and `incidentSystemIdentifier` for follow-up operations. Legacy numeric ID fields are still accepted and are returned only when the provider ID is safely numeric. Reports and satisfaction ratings default to all account brands unless a `brand` filter is supplied.

Creating a contact identity can transfer that identity's messages and data from another contact. Creating staff may affect subscription costs; it sends no invitation email and accepts an optional initial password.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
