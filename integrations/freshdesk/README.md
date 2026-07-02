# <img src="https://provider-logos.metorial-cdn.com/freshdesk.svg" height="20"> Freshdesk

Manage Freshdesk support tickets, contacts, companies, conversations, knowledge base articles, time entries, and helpdesk metadata. Create, update, search, and delete the core records agents use every day, inspect field definitions and routing metadata, and read account, SLA, business-hour, product, satisfaction-rating, and canned-response information.

## Tools

### Add Ticket Reply

Sends a reply on a ticket visible to the requester. Can also add internal notes for agent-only collaboration.

### Create Article

Creates a new knowledge base article in a specified folder.

### Create Company

Creates a new company in Freshdesk. Companies group contacts and can be associated with tickets. Supports domains for automatic contact association, industry classification, and custom fields.

### Create Contact

Creates a new contact in Freshdesk. Contacts represent customers who submit support tickets. Supports email, phone, company association, tags, and custom fields.

### Create Ticket

Creates a new support ticket in Freshdesk. Supports setting subject, description, requester, priority, status, assignee, tags, and custom fields. Can also create outbound email tickets to initiate customer conversations.

### Delete Company

Deletes a company from Freshdesk.

### Delete Contact

Soft deletes a Freshdesk contact.

### Delete Ticket

Deletes a ticket from Freshdesk. The ticket is moved to trash and can be restored from the Freshdesk UI within 30 days.

### Get Account

Retrieves Freshdesk account details for the connected helpdesk.

### Get Article

Retrieves a single knowledge base article by ID.

### Get Company

Retrieves full details of a company by its ID including domains, health score, account tier, and custom fields.

### Get Contact

Retrieves a contact's full details by their ID, including email, phone, company association, tags, and custom fields.

### Get Current Agent

Retrieves the currently authenticated Freshdesk agent.

### Get Helpdesk Settings

Retrieves Freshdesk helpdesk-level settings.

### Get Ticket

Retrieves a single ticket by ID with full details. Optionally includes conversations, requester info, company info, and stats (resolution/response times).

### List Business Hours

Lists Freshdesk business-hour schedules.

### List Canned Response Folders

Lists folders that organize Freshdesk canned responses.

### List Canned Responses

Lists canned responses in a Freshdesk canned response folder.

### List Agents

Lists agents in the Freshdesk helpdesk. Can filter by email or state. Returns agent details including contact information, roles, and group memberships.

### List Companies

Lists all companies in Freshdesk with pagination support.

### List Contacts

Lists contacts from Freshdesk with optional filtering by email, phone, company, or state. Returns paginated results.

### List Conversations

Lists all conversations (replies, notes, forwards) on a ticket. Returns the full conversation history including public replies and private agent notes.

### List Fields

Lists Freshdesk field definitions for tickets, contacts, or companies.

### List Groups

Lists all agent groups in Freshdesk. Groups are used for ticket assignment and routing.

### List Tickets

Lists tickets from Freshdesk with optional filtering, ordering, and pagination. Can filter by updated timestamp and include related data. Returns up to 30 tickets per page.

### List Knowledge Base

Browses the knowledge base hierarchy. Lists categories, or folders within a category, or articles within a folder depending on the parameters provided.

### List Products

Lists Freshdesk products configured for the helpdesk.

### List Satisfaction Ratings

Lists Freshdesk satisfaction ratings across tickets.

### List SLA Policies

Lists Freshdesk SLA policies.

### List Time Entries

Lists all time entries logged on a specific ticket. Shows agent, hours spent, billable status, and notes.

### Create Time Entry

Logs a time entry on a ticket.

### Update Time Entry

Updates a Freshdesk time entry.

### Delete Time Entry

Deletes a Freshdesk time entry from a ticket.

### Search Companies

Searches companies using Freshdesk's filter query language.

### Search Contacts

Searches contacts using Freshdesk's filter query language. Supports filtering by name, email, phone, company, and custom fields.

### Search Tickets

Searches tickets using Freshdesk's filter query language. Supports filtering by standard and custom fields with logical operators.

### Update Company

Updates an existing company's details. Only provide the fields you want to change.

### Update Contact

Updates an existing contact's details. Only provide the fields you want to change.

### Update Ticket

Updates an existing ticket's properties such as status, priority, assignee, subject, tags, type, and custom fields. Only provide the fields you want to change.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
