# Simplesat integration

Simplesat collects and analyzes customer feedback through CSAT, NPS, CES, and other survey metrics.

## Authentication

Create an API key in **Settings > API keys**. The integration sends the key in the `X-Simplesat-Token` header. Select the permissions required for your workflows:

- `read surveys` for survey discovery.
- `read questions` for question discovery.
- `read answers` and `read responses` for feedback retrieval.
- `read customers` for customer discovery and detail.
- `write customers` for customer upserts.
- `read team members` for team-member detail.
- `write surveys` for event-based survey email requests.

The API base URL is `https://api.simplesat.io/api/v1`.

## Tools

- `list_surveys`: list active surveys, including their IDs, types, and tokens. Archived surveys are excluded by the API.
- `list_questions`: list questions, optionally filtered by survey ID. Returns question type, choices, and rating-scale status. The legacy numeric `ratingScale` output is retained when the API supplies a number; current boolean values are exposed as `isRatingScale`.
- `get_answers`: retrieve individual feedback answers using optional date filters.
- `get_responses`: retrieve submissions with customer, ticket, and answer information using optional date filters.
- `list_customers`: list customer records with pagination and optional creation, modification, and subscription filters.
- `get_customer`: retrieve a customer by the ID discovered through `list_customers`.
- `upsert_customer`: create or update a customer by email. Supplying custom attributes replaces the customer's existing custom attributes.
- `send_survey_email`: request an email for an `event_based_email` survey token discovered through `list_surveys`. A successful API response indicates acceptance or scheduling, rather than confirmed email delivery.
- `get_team_member`: retrieve a team member by ID.
- `list_team_members`: retain the existing team-member listing route for compatibility. This route is not described in the current public reference and was not verified live.

List tools retrieve one page per invocation. Existing list tools accept page sizes up to 100; `list_customers` accepts up to 250. Date filters accept ISO 8601 timestamps or `YYYY-MM-DD` dates. Date-only upper bounds include the full UTC end date.

The existing custom-attribute inputs accept string values. The API also documents array-valued customer attributes, which are not yet exposed by these inputs.

## API reference

- [API overview and authentication](https://developer.simplesat.io/api)
- [List surveys](https://developer.simplesat.io/api/operations/listSurveys)
- [List questions](https://developer.simplesat.io/api/operations/listQuestions)
- [Search answers](https://developer.simplesat.io/api/operations/searchAnswers)
- [Search responses](https://developer.simplesat.io/api/operations/searchResponses)
- [List customers](https://developer.simplesat.io/api/operations/listCustomers)
- [Get customer](https://developer.simplesat.io/api/operations/getCustomerById)
- [Create or update customer](https://developer.simplesat.io/api/operations/createOrUpdateCustomer)
- [Send survey email](https://developer.simplesat.io/api/operations/sendSurveyByEmail)
- [Get team member](https://developer.simplesat.io/api/operations/getTeamMemberById)
