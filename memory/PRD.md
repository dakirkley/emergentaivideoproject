# AI Creative Studio - Product Requirements Document

## Original Problem Statement
Build a webapp similar to creati.studio - an AI Creative Studio that allows users to connect APIs from multiple AI agents (Kling AI, Fal.ai, OpenAI, ElevenLabs) for image, video, and voice generation. Include a settings section to input API keys for various apps.

## User Personas
1. **Content Creators** - Need quick AI-generated images, videos, and voiceovers for social media
2. **Designers** - Want to prototype visual concepts rapidly using AI
3. **Marketers** - Create promotional content with AI assistance
4. **Developers** - Test and integrate various AI APIs in one place
5. **Filmmakers/Directors** - Plan and visualize cinematic storyboards scene-by-scene

## Core Requirements (Static)
1. Multi-provider AI generation (OpenAI, Fal.ai, Kling AI, ElevenLabs)
2. Image generation from text prompts
3. Video generation from text/images
4. Voice synthesis and text-to-speech
5. User authentication (Google OAuth via Emergent Auth)
6. API key management stored in database per user
7. Gallery to save and view generated content
8. Dark/Light theme toggle
9. Responsive design
10. Storyboard Studio for visual narrative planning

## What's Been Implemented (January 7-8, 2026)
### Authentication
- [x] Google OAuth integration via Emergent Auth
- [x] Session management with secure cookies
- [x] Protected routes with auth guards

### Core Features
- [x] Landing page with hero, features, and CTA
- [x] Dashboard with tool navigation
- [x] Image generation (OpenAI with Emergent Key support, Fal.ai)
- [x] Video generation (Kling AI, Fal.ai) with async status polling
- [x] Voice generation (ElevenLabs, Fal.ai)
- [x] Gallery page with filtering and deletion
- [x] Settings page with API key management

### NEW - Advanced Video Features (Jan 8, 2026)
- [x] File upload for image-to-video generation
- [x] Kling AI Avatar generation (talking head from portrait + audio)
- [x] Kling AI Motion Control (transfer motion from reference video)
- [x] Tabbed interface for video generation modes

### NEW - Voice Cloning (Jan 8, 2026)
- [x] ElevenLabs Instant Voice Cloning (IVC)
- [x] Upload multiple audio samples for voice cloning
- [x] Manage cloned voices (list, use, delete)
- [x] Use cloned voices in text-to-speech

### NEW - Prompt Templates Library (Jan 8, 2026)
- [x] 13 system templates (5 image, 4 video, 4 voice)
- [x] Create custom templates with name, description, prompt
- [x] Edit and delete user's own templates
- [x] Public/Private template visibility
- [x] Template categories and tags
- [x] Search and filter templates
- [x] Use template to auto-fill prompts in generation pages
- [x] Copy prompt to clipboard
- [x] **Favorites/Bookmarks** - Heart icon to favorite any template
- [x] **Favorites Tab** - Dedicated tab to view all favorited templates
- [x] **Favorites Count** - Shows number of favorited templates

### NEW - Image to Video Workflow (Jan 8, 2026)
- [x] "Create Video from This Image" button on generated images
- [x] Seamless transfer of image URL to Video Generation
- [x] Prompt carries over from image to video generation
- [x] Visual indicator showing "From Image Generation" badge
- [x] Option to clear loaded image and upload different one

### NEW - Storyboard Studio (Feb 24, 2026)
- [x] Project Overview Page - Grid layout showing all user storyboards
- [x] Create new storyboards with custom titles
- [x] Storyboard Editor with horizontal timeline view
- [x] Scene cards with image placeholder, title, script preview
- [x] Drag-and-drop scene reordering (using Framer Motion Reorder)
- [x] Scene Detail Panel (side drawer) with:
  - Scene title editing
  - Script/dialogue text area
  - Visual upload (image upload)
  - Audio resource attachment
  - Director notes field
- [x] Add/delete scenes functionality
- [x] Delete storyboards with confirmation
- [x] Auto-save scene changes
- [x] Respects global light/dark theme toggle
- [x] Navigation link in sidebar with Clapperboard icon

### UI/UX
- [x] Electric Orange theme with dark mode default
- [x] Light/Dark theme toggle
- [x] Responsive layout (mobile, tablet, desktop)
- [x] Framer Motion animations
- [x] Shadcn UI components
- [x] File upload component with drag-and-drop

### Backend
- [x] FastAPI with async endpoints
- [x] MongoDB for user data, API keys, generations
- [x] Integration with Emergent Universal Key

## Prioritized Backlog

### P0 - Critical
- None (All requested features complete)

### P1 - High Priority
- [ ] Structure Assist AI - AI agent to review storyboards and suggest pacing improvements
- [ ] Kling AI Lip Sync feature
- [ ] Progress indicator for long-running generations

### P2 - Medium Priority
- [ ] Generation history pagination
- [ ] Batch generation support
- [ ] Download all from gallery
- [ ] Batch file upload for voice cloning
- [ ] Export/share storyboard functionality

### P3 - Nice to Have
- [ ] Share generated content
- [ ] Collaboration features
- [ ] Usage analytics dashboard
- [ ] API usage tracking per provider

## Technical Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn UI + Framer Motion
- **Backend**: FastAPI + Motor (async MongoDB)
- **Database**: MongoDB
- **Auth**: Emergent Google OAuth
- **AI Providers**: OpenAI, Fal.ai, Kling AI, ElevenLabs
- **Drag & Drop**: Framer Motion Reorder API

## Next Tasks
1. Structure Assist AI - AI agent to suggest pacing improvements for storyboards
2. Kling AI Lip Sync feature
3. Implement progress/status indicators for all async generations
4. Export/share storyboard functionality
