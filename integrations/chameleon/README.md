# <img src="https://provider-logos.metorial-cdn.com/chameleon.png" height="20"> Chameleon

Manage in-app product adoption experiences for SaaS applications. Create and manage product tours, microsurveys, tooltips, launchers (checklists), embeddables, and HelpBar content. Send and update user profiles and company data, track tour interactions and microsurvey responses, manage audience segments for targeting experiences, and configure webhooks for real-time data exchange. Import user data in bulk, manage approved domains and environments, and access delivery and interaction analytics for tours and surveys.

## Tools

### Delete Company

Permanently delete a Chameleon company by its Chameleon ID or external UID. Optionally cascade the deletion to remove all associated user profiles.

### Delete User Profile

Permanently delete or reset a Chameleon user profile. Use **clear** mode to reset a profile (clears browser metrics, survey responses, events) while keeping the profile record. Use **forget** mode to permanently remove all user data with no recovery (backup retained for 3 months).

### Get User Profile

Retrieve a single Chameleon user profile by its Chameleon profile ID, external UID, or email address. Returns the full user profile including all custom properties.

### List Companies

List and search Chameleon companies (accounts). Supports filtering with segmentation filter expressions. Can also retrieve a specific company by Chameleon ID or external UID.

### List Experiences

List Chameleon experiences by type: tooltips, launchers, or retrieve a single experience by ID. Returns experience details including name, publish status, segment targeting, and tags. Use this for tooltips and launchers; for tours and microsurveys use the dedicated tools.

### List Microsurveys

List all microsurveys in your Chameleon account, or retrieve a specific microsurvey by ID. Returns microsurvey details including name, status, segment targeting, and response statistics.

### List Segments

List audience segments used for targeting Chameleon experiences, or retrieve a specific segment with its filter expressions. Optionally list experiences (tours, surveys, launchers) connected to a segment.

### List Microsurvey Responses

Retrieve responses for a specific Chameleon microsurvey. Returns response details including button clicks, text inputs, dropdown selections, and the page URL. Optionally expand profile and company data for each response.

### List Tags

List all tags in your Chameleon account, or retrieve a specific tag by ID. Tags are used to group and categorize experiences (e.g., "Upsell", "Feature", "Onboarding").

### List Tour Interactions

Retrieve user interactions for a specific Chameleon tour. Shows how users interacted with the tour, including started, completed, exited, and displayed states. Optionally expand user profile and company data.

### List Tours

List all product tours in your Chameleon account, or retrieve a specific tour by ID. Returns tour details including name, status, segment targeting, and interaction statistics.

### Manage Deliveries

Create, list, or delete experience deliveries in Chameleon. Deliveries trigger tours or microsurveys directly to specific users with configurable time windows. Use this to schedule or send experiences to individual users on demand.

### Manage Domains

List, create, or update approved domains where Chameleon experiences can be displayed. Domains must be approved before Chameleon content appears on them.

### Manage Environments

List, create, or update Chameleon environments (URL groups). Environments group domains and are used to control which experiences show in which environments (e.g., production, staging, development).

### Manage Webhooks

List, create, or delete Chameleon outgoing webhook subscriptions. Webhooks receive POST requests when specified events occur (tour/microsurvey interactions, HelpBar events, etc.). Available topics include: tour.started, tour.completed, tour.exited, tour.snoozed, tour.button.clicked, survey.started, survey.completed, survey.exited, survey.snoozed, survey.button.clicked, response.finished, helpbar.search, helpbar.answer, helpbar.item.action, helpbar.item.error, and more.

### Search User Profiles

Search and list Chameleon user profiles using filters or segment targeting. Supports filtering by user properties, tour interactions, survey responses, and more. Can also count matching profiles without returning full data.

### Update Experience

Update a Chameleon tooltip or launcher. Publish/unpublish, add/remove environment associations, and manage tags. For tours and microsurveys, use the dedicated update tools instead.

### Update Microsurvey

Update a Chameleon microsurvey's settings. You can publish/unpublish, add/remove environments, and manage tags. To add an environment or tag, prefix the ID with "+". To remove, prefix with "-".

### Update Tour

Update a Chameleon product tour's settings. You can publish/unpublish, add/remove environment associations, and add/remove tags. To add an environment or tag, prefix the ID with "+". To remove, prefix with "-".

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
