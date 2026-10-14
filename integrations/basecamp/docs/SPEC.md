# Basecamp API scope

OAuth connects a 37signals identity. Discover accessible Basecamp accounts with `list_accounts`, then pass the selected `accountId` to account-scoped tools. Existing saved account IDs remain a compatibility fallback.

The integration provides project discovery and management, to-do lists and to-dos, message boards, comments, Campfire messages, schedules, people, and the current user's profile. Use `get_project` to find enabled dock tool IDs.

Updates to projects, to-do lists, to-dos, and non-recurring schedule entries read the current resource before sending the update so omitted fields are preserved. Recurring schedule entries require editing in Basecamp. Concurrent edits between the read and update can still overwrite each other. Collection tools currently return the first API page.

Official references:

- [Authentication and account discovery](https://github.com/basecamp/bc-api/blob/master/sections/authentication.md)
- [People and current profile](https://github.com/basecamp/bc-api/blob/master/sections/people.md)
- [Projects](https://github.com/basecamp/bc-api/blob/master/sections/projects.md)
- [To-do lists](https://github.com/basecamp/bc-api/blob/master/sections/todolists.md)
- [To-dos](https://github.com/basecamp/bc-api/blob/master/sections/todos.md)
- [Schedule entries](https://github.com/basecamp/bc-api/blob/master/sections/schedule_entries.md)
- [Messages](https://github.com/basecamp/bc-api/blob/master/sections/messages.md)
- [Comments](https://github.com/basecamp/bc-api/blob/master/sections/comments.md)
- [Campfires](https://github.com/basecamp/bc-api/blob/master/sections/campfires.md)
