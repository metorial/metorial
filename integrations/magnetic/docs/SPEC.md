# Magnetic Integration Specification

Magnetic combines CRM, project management, time tracking, and invoicing for professional services firms.

## Authentication

Connect with a Magnetic API token. Generate or view the token in the signed-in [Magnetic API portal](https://app.magnetichq.com/Magnetic/API.do). API requests use the `token` query parameter.

## Available tools

- Create contacts and activity records on existing contacts.
- List contacts and companies to discover IDs for related operations.
- Create opportunities or jobs linked to contacts, companies, and owners.
- Create tasks and search them by name or description.
- Add a positive number of minutes to an existing task's tracked time.
- Retrieve the connected user's profile, account users, and notifications.

The contact and company lists return the records supplied by the API; their counts describe the returned results.

## Events

This integration currently exposes no event triggers.

## Provider reference

- [Magnetic API portal](https://app.magnetichq.com/Magnetic/API.do), which requires sign-in to view endpoint documentation.
- [Magnetic's API-token integration instructions](https://support.magnetichq.com/support/solutions/articles/3000062078-slack-integration).
