# <img src="https://provider-logos.metorial-cdn.com/freshdesk.svg" height="20"> Freshdesk

Manage customer support tickets, contacts, companies, and agents. Create, update, filter, merge, and delete support tickets with custom fields, tags, priorities, and assignments. Add replies, notes, and forward emails on ticket conversations. Manage contacts and companies with search, filter, import, and export capabilities. Maintain a knowledge base of articles organized in categories and folders. Run community discussion forums with topics and comments. Track time entries on tickets, configure SLA policies, and set up automation rules with webhook triggers. Manage canned response templates, custom objects, email mailboxes, collaboration threads, and agent groups with auto-assignment. Send outbound WhatsApp messages and handle satisfaction surveys and ratings. Support field service management with service tasks and technician scheduling.

## Tools

### Add Ticket Reply

Sends a reply on a ticket visible to the requester. Can also add internal notes for agent-only collaboration. Use \

### Create Company

Creates a new company in Freshdesk. Companies group contacts and can be associated with tickets. Supports domains for automatic contact association, industry classification, and custom fields.

### Create Contact

Creates a new contact in Freshdesk. Contacts represent customers who submit support tickets. Supports email, phone, company association, tags, and custom fields.

### Create Ticket

Creates a new support ticket in Freshdesk. Supports setting subject, description, requester, priority, status, assignee, tags, and custom fields. Can also create outbound email tickets to initiate customer conversations.

### Delete Ticket

Deletes a ticket from Freshdesk. The ticket is moved to trash and can be restored from the Freshdesk UI within 30 days.

### Get Company

Retrieves full details of a company by its ID including domains, health score, account tier, and custom fields.

### Get Contact

Retrieves a contact's full details by their ID, including email, phone, company association, tags, and custom fields.

### Get Ticket

Retrieves a single ticket by ID with full details. Optionally includes conversations, requester info, company info, and stats (resolution/response times).

### List Agents

Lists agents in the Freshdesk helpdesk. Can filter by email or state. Returns agent details including contact information, roles, and group memberships.

### List Companies

Lists all companies in Freshdesk with pagination support.

### List Contacts

Lists contacts from Freshdesk with optional filtering by email, phone, company, or state. Returns paginated results.

### List Conversations

Lists all conversations (replies, notes, forwards) on a ticket. Returns the full conversation history including public replies and private agent notes.

### List Groups

Lists all agent groups in Freshdesk. Groups are used for ticket assignment and routing.

### List Tickets

Lists tickets from Freshdesk with optional filtering, ordering, and pagination. Can filter by updated timestamp and include related data. Returns up to 30 tickets per page.

### List Knowledge Base

Browses the knowledge base hierarchy. Lists categories, or folders within a category, or articles within a folder depending on the parameters provided.

### List Time Entries

Lists all time entries logged on a specific ticket. Shows agent, hours spent, billable status, and notes.

### Search Contacts

Searches contacts using Freshdesk's filter query language. Supports filtering by name, email, phone, company, and custom fields. Example queries: \

### Search Tickets

Searches tickets using Freshdesk's filter query language. Supports filtering by standard and custom fields with logical operators. Example queries: \

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
