# Teachify Web

Teachify Web is the front-end of an AI-driven education platform designed to help teachers create engaging, adaptive assignments and support students through personalised, conversational learning. The platform combines a modern web interface with AI-powered tutoring, real-time progress tracking, and structured classroom management.

Built with React, TypeScript, and Tailwind CSS, Teachify Web integrates with Firebase for authentication and data storage and communicates with a dedicated AI back end to deliver interactive learning experiences for both students and teachers.

---

## Features

### Student Experience
- **AI-powered assignment chat**  
  Students complete assignments through a conversational AI assistant that asks targeted questions based on defined learning objectives.
- **Guided learning objectives**  
  Each assignment is broken down into clear objectives, which are tracked and marked as completed during the chat.
- **Progress tracking**  
  Students can see their active classes, upcoming assignments, and completion status in a clean, intuitive dashboard.
- **Automatic summaries**  
  Once an assignment is completed, the system generates a concise summary of the student’s learning session for later review.

### Teacher Experience
- **Class management**  
  Teachers can create classes, generate unique class codes, and manage enrolled students.
- **AI-generated assignments**  
  By entering syllabus statements and a due date, teachers can automatically generate assignments with learning objectives and descriptions.
- **Insightful progress monitoring**  
  Teachers can see which students have completed assignments, view AI-generated summaries, and review student chat transcripts in read-only mode.
- **Centralised dashboards**  
  Separate dashboards for teachers and students ensure a focused, role-specific experience.

### Platform Highlights
- **Responsive design** built with Tailwind CSS
- **Real-time updates** powered by Firebase Firestore
- **Math & Markdown support** inside the AI chat
- **Smooth animations** using Framer Motion

---

## Technology Stack

| Layer           | Technologies |
|-----------------|--------------|
| Front-end       | React 18, TypeScript, React Router |
| Styling         | Tailwind CSS, Tailwind Typography |
| Animations      | Framer Motion |
| Markdown & Math | react-markdown, remark-math, rehype-katex, KaTeX |
| Backend Services| Firebase Authentication, Cloud Firestore |
| AI Integration  | Custom Flask HTTP API (streamed responses & summaries) |
| Build Tooling   | Vite, TypeScript |

---
