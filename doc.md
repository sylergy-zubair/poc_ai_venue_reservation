<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" class="logo" width="120"/>

# I am going to build this with claude code. Can you make an appropriate PRD

Here’s a Product Requirements Document (PRD) tailored for building your AI-driven venue search and booking proof-of-concept (POC) using Claude (Anthropic) as your AI engine. The goal is to give clear specifications for delivery, targeting a developer with strong frontend (MERN) skills but new to Docker/cloud—so the language will clarify backend/infra where appropriate.

# Product Requirements Document (PRD): AI-Powered Event Venue Search \& Booking POC

## 1. **Objective and Value**

Enable end-users to find and book suitable event venues using **natural language queries**—leveraging Claude Code for language understanding and a venue-booking API for real-time availability.

**Outcomes:**

- Simplify venue searches for users (no forms required)
- Automate the link between user intent and external booking APIs
- Provide a working demo that’s cloud/deployment-ready


## 2. **User Stories**

- **Searcher:** As a user, I want to type a venue request in natural English (e.g., "I need a venue for 300 people in Barcelona next month") and instantly see available venues that match.
- **Booker:** As a user, I want to click ‘Book’ on a chosen venue and, after entering my contact info, receive a booking confirmation or next steps.
- **Admin (Developer):** As a developer, I want to view debug outputs to ensure entity extraction and API mapping are correct, and easily redeploy the app in Docker/cloud.


## 3. **Core Features**

### A. **Frontend**

- Clean, responsive input field for freeform user queries.
- Results display: venues (name, city, capacity, date(s) available), rendered as cards/list.
- “Book” button for each result triggers the booking flow.


### B. **AI Processing (Backend/Middleware)**

- Integrate with Claude’s code LLM API (Anthropic) via server, using function-calling or extraction prompt.
    - Extract: location, date, attendee count, (optionally) event type.
- Map these entities to your venue partner’s API schema (e.g., city → `location`, integer → `attendees`).


### C. **Venue API Integration**

- On valid entity extraction, call venue provider API (MeetingPackage, iVvy, etc.) for search.
- Parse responses; send relevant details back to frontend.
- On “Book” action: POST booking details (plus simple contact form) to venue API.


### D. **Debug \& UX Enhancements**

- Show users a summary of AI-extracted fields, and allow edits before search.
- Display errors clearly (API, extraction, booking).


## 4. **Technical Requirements**

- **Stack:**
    - MERN for frontend (React/Next.js preferred for speed).
    - Node.js backend middleware to interface with Claude API and venue API.
- **Deployment:** Containerized using Docker; provide `Dockerfile` and Compose config for running locally or in the cloud.
- **Secrets:** Use `.env` files for API keys, don’t hardcode.
- **Logging:** Console or file, enough for tracing user queries and API calls.
- **Documentation:** Markdown readme explaining architecture, setup, and deployment steps.


## 5. **Non-Functional Requirements**

- **Performance:** Subsecond responses for small dataset, ~2–5s for venue API requests.
- **Security:** No PII stored longer than session, secrets NOT committed to repo.
- **Scalability:** Ready for deployment on local Docker or cloud platform (Heroku, Render, etc.).
- **Accessibility:** Basic compliance (screen reader support, contrast, keyboard navigation).


## 6. **Acceptance Criteria**

- User can enter an English query and see at least 3 realistic venue options with correct details for a real location/date.
- Successful bookings return a confirmation in the UI.
- AI-extracted data is viewable and editable before search.
- Project can be built and run via Docker commands (“docker compose up”) without local Node or Python installed.
- README explains how MERN, Claude Code, and the venue API interact.


## 7. **Open Items / Assumptions**

- Venue booking API provider account and test keys are set up in advance.
- Claude API access is provisioned and operational.
- Venue results are limited to what the external API supports (availability, fields shown).
- For POC, payment/advanced attendee registration is **out of scope**.

**Summary:**
This POC demonstrates a true natural-language-to-booking workflow from end to end, using Claude for AI, a third-party venue API, and standards/tools (Docker, Node.js) ready for cloud deployment by a developer transitioning from frontend to full-stack/cloud.

If you need detailed example code snippets, Dockerfiles, or diagrams for any stage, let me know!

