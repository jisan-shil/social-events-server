# Social Events API

Express + MongoDB backend for the Social Development Events Platform.

## Endpoints
- GET /events: upcoming events (public)
- GET /events/:id: event details (public)
- POST /events: create event (JWT)
- GET /events/mine: my events (JWT)
- PUT /events/:id: update own event (JWT)
- DELETE /events/:id: delete own event (JWT)
- POST /events/:id/join: join an event (JWT)
- GET /joined-events: my joined events (JWT)

## Setup
1. `npm install`
2. Copy `.env.example` to `.env` and fill in the values
3. `npm run dev`