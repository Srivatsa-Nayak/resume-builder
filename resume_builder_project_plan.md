# Project Plan: AI-Powered Resume Builder

## 1. Project Overview

A comprehensive, AI-enhanced resume builder designed to help users create, edit, and optimize their resumes for Applicant Tracking Systems (ATS). The platform will support starting from scratch, utilizing pre-built templates, editing existing PDFs, and leveraging AI for content generation and optimization.

## 2. Core Features & Requirements

### Authentication & User Management

* **Sign Up / Log In:** Email/Password and OAuth (Google/GitHub, optional but recommended).

* **User Dashboard:** Manage saved resumes, view ATS scores, and access account settings.

* **API Key Management (BYOK):** A settings panel allowing users to input their own AI API keys (e.g., OpenAI, Anthropic, Gemini) to bypass platform limits or use customized models.

### Resume Builder & Editor

* **Build from Scratch:** A step-by-step wizard capturing personal info, experience, education, and skills.

* **Template Library:** A selection of professional, ATS-friendly templates (Modern, Traditional, Creative, Tech).

* **PDF Editing:** Upload an existing PDF resume. The system will parse the text and structure, allowing the user to edit it within the builder and re-export.

* **Live Preview:** Side-by-side view showing real-time updates to the resume layout.

### AI Integration

* **Base AI Capability:** The app will provide default AI features (powered by the app's internal API keys) for users without their own keys.

* **AI Writing Assistant:**

  * Generate bullet points based on job titles.

  * Rewrite/Improve existing bullet points for better impact.

  * Generate professional summaries.

* **Bring Your Own Key (BYOK):** Fallback/Override logic so if a user has configured their own API key, the app routes requests through their key instead of the platform's base key.

### ATS Scoring & Optimization

* **Job Description Matching:** Users can paste a target job description.

* **ATS Score Calculation:** An algorithm that compares resume content against the job description using keyword density, action verbs, and structural checks.

* **Actionable Feedback:** Highlights missing keywords and suggests improvements to increase the match rate.

## 3. Recommended Tech Stack

* **Frontend:** React, Next.js, Tailwind CSS (for fast UI development and solid live-preview rendering).

* **Backend:** Node.js (Express) or Next.js server actions / API routes.

* **Database:** PostgreSQL (Supabase) or MongoDB for user data and resume storage.

* **PDF Handling:** `pdf-parse` or `pdf2json` (server-side parsing), `@react-pdf/renderer` (client-side generation).

* **AI Integration:** LangChain or direct API integration (OpenAI/Google Gemini APIs).

## 4. Implementation Phases

### Phase 1: Foundation

* \[ \] Set up project repository and tech stack.

* \[ \] Implement Authentication (Signup, Login, Sessions).

* \[ \] Create Database schema for Users and Resumes.

* \[ \] Build basic Dashboard layout.

### Phase 2: Core Builder & Templates

* \[ \] Develop the "Build from Scratch" input forms.

* \[ \] Create 2-3 base CSS/HTML templates for resumes.

* \[ \] Implement the Live Preview pane.

* \[ \] Add PDF Export functionality.

### Phase 3: AI Engine & BYOK

* \[ \] Integrate base AI for bullet point generation and rewriting.

* \[ \] Create the API key settings page for users.

* \[ \] Implement routing logic to use Base AI vs. User's API Key.

* \[ \] Add AI triggers within the resume editor (e.g., "Enhance this bullet").

### Phase 4: PDF Editing & ATS Scoring

* \[ \] Implement PDF upload and text extraction (parsing PDF into structured JSON).

* \[ \] Map parsed JSON data back into the editor fields.

* \[ \] Build the ATS comparison logic (keyword extraction from job description vs. resume).

* \[ \] Design the ATS feedback UI (circular progress bar, missing keywords list).

### Phase 5: Testing & Launch

* \[ \] End-to-end testing of PDF parsing (requires rigorous testing due to varied PDF formats).

* \[ \] Security audit (especially for securely storing user API keys).

* \[ \] Beta launch and user feedback collection.