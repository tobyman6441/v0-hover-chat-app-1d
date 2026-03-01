# Hover Ninja - Complete Project Reference

## Project Overview

Hover Ninja is a Next.js application that integrates with the Hover API to provide AI-powered job management, measurements, and CRM pipeline functionality for roofing/exterior contractors.

GitHub: https://github.com/tobyman6441/v0-hover-chat-app-1d
Supabase Project ID: eibvnutwywsztzhlncht


## Hover API Documentation Links

- Hover API Docs (v2): https://hover.to/docs/api/v2/
- Hover API Docs (v3): https://hover.to/docs/api/v3/
- Hover Marketplace/Integrations: https://hover.to/integrations
- Hover Developer Portal: https://hover.to/developers


## Hover API Base URLs

Production API v2: https://hover.to/api/v2/
Production API v3: https://hover.to/api/v3/


## Hover OAuth Authentication

1. Redirect user to: https://hover.to/oauth/authorize?client_id={CLIENT_ID}&redirect_uri={REDIRECT_URI}&response_type=code&scope=read
2. Exchange authorization code for tokens at: POST https://hover.to/oauth/token
3. Store access_token and refresh_token in database
4. Include in all API requests: Authorization: Bearer {access_token}

Token Refresh:
POST https://hover.to/oauth/token
Content-Type: application/x-www-form-urlencoded
grant_type=refresh_token&refresh_token={refresh_token}&client_id={CLIENT_ID}&client_secret={CLIENT_SECRET}


## Hover API Endpoints

List Jobs: GET /api/v2/jobs
- Query params: page, per_page, sort, order, search, state
- Response: { results: HoverJob[], pagination: {...} }

Get Job Details: GET /api/v3/jobs/{job_id}
- Response: Full job details including inspections array

Get Job Photos: GET /api/v2/jobs/{job_id}/photos
- Response: { images: [...], design_images: [...], inspection_images: [...] }

Get Job Measurements: GET /api/v2/jobs/{job_id}/measurements
- Response: Structured measurements by category (roof, siding, windows, etc.)


## Hover External URLs (For Linking Out)

Job Page: https://hover.to/wr/jobs/{job_id}
Inspection Page: https://hover.to/wr/inspections/{inspection_id}

IMPORTANT: These use /wr/ path, NOT /jobs/ directly.


## Hover Image Handling

Problem: Hover image URLs require authentication. Direct img src returns 403 Forbidden.

Solution: Create an image proxy API route at /api/hover/image that adds the Bearer token, then use in components as:
<img src={`/api/hover/image?url=${encodeURIComponent(hoverImageUrl)}`} />


## Hover Webhook Events

Configure webhook URL: https://your-domain.com/api/hover/webhook

Event Types:
- job.created
- job.updated
- job.state_changed
- job.measurements_ready
- inspection.created
- inspection.completed


## Hover API Rate Limits

- 100 requests per minute per access token
- Implement exponential backoff on 429 responses
- Cache responses where appropriate (especially measurements)


## Hover API Error Handling

401: Token expired - Refresh token and retry
403: Forbidden - Check scopes, re-authenticate
404: Job not found - Handle gracefully in UI
429: Rate limited - Exponential backoff
500: Server error - Retry with backoff


## Database Schema

orgs (Organizations):
- id (uuid, PK)
- name (text)
- hover_access_token, hover_refresh_token (text)
- hover_connected_at (timestamptz)
- onboarding_complete (boolean)
- llm_provider, llm_api_key_encrypted (text)

members:
- id (uuid, PK)
- user_id, org_id (uuid, FK)
- role (text) - 'admin' or 'member'

profiles:
- id (uuid, PK - matches auth.users.id)
- full_name (text)

stages (Pipeline columns):
- id (uuid, PK)
- org_id (uuid, FK)
- name (text)
- sort_order (integer)
- pipeline_type (text) - 'sales' or 'production'
- probability (integer) - 0-100 for sales pipeline
- is_default (boolean)
- linked_stage_id (uuid) - Links sales "Approved" to production "Approved"

job_stages (Links Hover jobs to pipeline stages):
- id (uuid, PK)
- org_id (uuid, FK)
- hover_job_id (integer) - From Hover API
- stage_id (uuid, FK to stages)

chats, messages, chat_folders: AI chat history
invitations: Team member invitations
webhook_events: Hover webhook event log


## Database RPC Functions

update_job_stage(p_org_id, p_hover_job_id, p_stage_id):
- Updates or creates a job_stage record
- Used when changing a job's pipeline stage

get_or_create_job_stage(p_org_id, p_hover_job_id):
- Returns existing job_stage or creates one with first stage as default


## Default Pipeline Stages

Sales Pipeline:
1. Pre-appointment (10%)
2. Appointment scheduled (30%)
3. Waiting (40%)
4. Approved (90%) - linked to Production
5. Final invoice (100%)
6. Closed-lost (0%)

Production Pipeline:
1. Approved - linked to Sales
2. Install scheduled
3. In progress
4. Install complete


## Key File Structure

app/
  actions/hover.ts - Hover API integration
  api/hover/image/route.ts - Image proxy for authenticated Hover images
  api/hover/oauth/route.ts - OAuth callback
  api/hover/webhook/route.ts - Webhook handler
  api/chat/route.ts - AI chat endpoint
  chat/page.tsx - AI chat interface
  sales/page.tsx - Sales pipeline kanban
  production/page.tsx - Production pipeline kanban
  jobs/[jobId]/page.tsx - Job detail page
  settings/page.tsx - Organization settings
  dashboard/page.tsx - Dashboard overview
  marketing/page.tsx - Marketing pipeline

components/
  kanban/kanban-board.tsx - Main kanban with drag-and-drop
  kanban/kanban-column.tsx - Pipeline stage column
  kanban/kanban-card.tsx - Job card (draggable)
  chat/ - Chat UI components
  onboarding/ - Onboarding wizard

lib/
  actions/stages.ts - Stage CRUD
  actions/orgs.ts - Organization actions
  supabase/ - Supabase client utilities


## Environment Variables

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
HOVER_CLIENT_ID=
HOVER_CLIENT_SECRET=
HOVER_WEBHOOK_SECRET=
NEXT_PUBLIC_HOVER_REDIRECT_URI=https://your-domain.com/api/hover/oauth
OPENAI_API_KEY=


## Pending Jobs Page Improvements

1. Remove "View Photos" and "Get Measurements" buttons - these sections display directly on the page
2. Make photos expandable - clicking "+X more photos" expands to show all
3. Make all sections collapsible (Photos, Measurements, Inspections, Design Images, Customer)
4. Always show Inspections section - even with no inspections, show "No inspections on this job"
5. Display measurements like chat - categorized sections (Roof, Siding, Windows, etc.)
6. Fix broken images - route through /api/hover/image proxy
7. Fix stage dropdown - uses update_job_stage RPC
8. Inspection buttons link to https://hover.to/wr/inspections/{inspection_id}
9. Open in Hover URL: https://hover.to/wr/jobs/{job_id}


## Kanban Features Implemented

- Drag-and-drop jobs between stages (entire card is draggable)
- Stage deletion with confirmation dialog (moves jobs to adjacent stage)
- Column reordering via drag handles on column headers
- Add new stages inline
- Dual pipelines: Sales (6 stages) and Production (4 stages)
- Linked stages: Sales "Approved" links to Production "Approved"


## Roadmap: Account Customization System

Goal: Allow organizations to hide/show specific tabs and features from settings without losing backend data.

Add org_settings table with hidden_features jsonb column.
Add "Account Customization" section at bottom of Settings page.
Feature toggles for:
- Navigation (Dashboard, Marketing, Sales, Production tabs)
- Job Page Sections (Photos, Measurements, Inspections, Design Images)
- AI Features (AI Chat availability)
Backend data retained when hidden, can re-enable anytime.


## Roadmap: Improved Onboarding Flow

Goal: Enhance onboarding wizard with account customization and recommendations.

1. Allow skipping steps - "Skip for now" on each CRM setup step
2. Smart CTAs based on skipped steps - surface "Complete your setup" prompts
3. CRM guidance content:
   - No CRM yet? Use Hover Ninja's built-in CRM features
   - Want more options? See Hover marketplace: https://hover.to/integrations
   - Have existing CRM? Configure Hover Ninja for AI Chat only
4. Personalized recommendations based on user workflow preferences


## Measurements Display Format

Display measurements in categorized collapsible sections (same format as chat):

Roof: Total Area, Pitch, Facets, Ridges, Valleys, Eaves, Rakes
Siding: Total Area, Walls
Windows: Count, Total Area
Doors: Count
Gutters: Linear Feet
Soffit: Area
Fascia: Linear Feet