# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a proof-of-concept (POC) for an AI-powered venue search and booking application. The project uses natural language processing to understand user queries about event venues and connects them to external booking APIs.

### Key Components
- **Frontend**: MERN stack (React/Next.js preferred) with responsive design
- **Backend**: Node.js middleware that interfaces with Claude API and venue booking APIs  
- **AI Processing**: Claude (Anthropic) for natural language understanding and entity extraction
- **External Integration**: Third-party venue APIs (MeetingPackage, iVvy, etc.)

### Core Functionality
- Natural language venue search (e.g., "I need a venue for 300 people in Barcelona next month")
- AI-powered entity extraction (location, date, attendee count, event type)
- Real-time venue availability checking
- Booking flow with contact information collection
- Debug interface showing extracted entities with edit capability

## Technical Architecture

### Stack Requirements
- **Frontend**: React/Next.js for fast development
- **Backend**: Node.js server for API middleware
- **Database**: MongoDB (part of MERN stack)
- **Containerization**: Docker with docker-compose for local and cloud deployment
- **Environment**: `.env` files for API keys and configuration

### Security Considerations
- No PII stored beyond session duration
- API keys managed through environment variables
- Secrets never committed to repository

### Performance Targets
- Subsecond responses for small datasets
- 2-5 second response time for venue API requests
- Basic accessibility compliance (screen reader, contrast, keyboard navigation)

## Development Guidelines

### Test-Driven Development (TDD)

This project follows **strict TDD methodology**:

1. **Red-Green-Refactor Cycle**:
   - Write a failing test first (Red)
   - Write minimal code to make the test pass (Green)
   - Refactor code while keeping tests green (Refactor)

2. **TDD Standards**:
   - No production code without a failing test first
   - Write only enough test to fail (compilation failures count as failing)
   - Write only enough production code to make the failing test pass
   - All tests must pass before moving to the next feature

3. **Test Structure**:
   - Unit tests for individual functions and components
   - Integration tests for API endpoints and database interactions
   - End-to-end tests for complete user workflows
   - Mock external dependencies (Claude API, venue APIs)

4. **Testing Tools**:
   - Backend: Jest for Node.js testing
   - Frontend: Jest + React Testing Library
   - API testing: Supertest for endpoint testing
   - E2E: Cypress or Playwright

### API Integration Pattern
1. User query → AI processing via Claude API
2. Entity extraction (location, date, capacity, event type)
3. Map entities to venue provider API schema
4. Query external venue API
5. Parse and return results to frontend
6. Handle booking flow through venue API

### Error Handling
- Clear error display for API failures, extraction issues, and booking problems
- Logging for user queries and API calls (console or file-based)

### Deployment
- Docker containerization required
- `docker compose up` should run the entire application
- Cloud-ready for platforms like Heroku, Render, etc.
- No local Node.js installation should be required for running

## Project Status

This repository currently contains only the PRD (doc.md). The implementation is pending and should follow the specifications outlined in the requirements document.

## Development Commands

*Note: Commands will be added once the project structure is implemented*

### Git Workflow Commands

**cc** - When the user types "cc", Claude should:
1. Stage all changes using `git add .`
2. Create a detailed commit message following conventional commit standards
3. Commit the changes with the detailed message
4. Push to the remote repository with `git push`

The commit message should:
- Follow conventional commit format (feat:, fix:, docs:, etc.)
- Include a clear, descriptive summary
- Mention specific changes made
- Be properly formatted for git standards

## Key Files to Create
- Frontend application (React/Next.js)
- Backend API server (Node.js/Express)
- Docker configuration (Dockerfile, docker-compose.yml)
- Environment configuration (.env.example)
- README with setup and deployment instructions