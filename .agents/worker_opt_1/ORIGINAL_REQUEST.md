## 2026-07-02T16:50:33Z

You are a Worker subagent for the Ollama Setup Optimization project.
Your working directory is: c:\Users\sri charan\Documents\projects\hr recruter\.agents\worker_opt_1
Your task is to implement the optimization code modifications and write the system guidelines.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Please execute the following steps:
1. Create `OLLAMA_SYSTEM_OPTIMIZATION.md` in the project root containing the system configurations audit and tuning guide (e.g. CPU threads allocation physical cores N-2, OLLAMA_NUM_PARALLEL=1, OLLAMA_MAX_LOADED_MODELS=2, OLLAMA_KEEP_ALIVE=60m, systemd configuration template, WSL2 config).
2. Create a new utility file `server/ollamaOptimizer.js` that implements and exports:
   - `compressCandidateProfile(profile)`: strips previously generated large analysis data from the candidate profile JSON (e.g., `interviewQuestions`, `hrQuestions`, `technicalQuestions`, `career_gaps`, `technical_depth_audit`, `domain_question_bank`, `project_deep_dive`, `hr_questions`, `red_flags`, `must_prepare_topics`, `fit_summary`).
   - `stripSchemaDescriptions(schema)`: recursively strips `description` keys from JSON schema objects to save token overhead.
3. Update `server/models.js` to add `ollamaEmbeddingModel` to the settings schema (default: `'nomic-embed-text'`).
4. Update `server/server.js` settings API routes to allow saving and reading `ollamaEmbeddingModel`.
5. Update `client/src/components/Settings.jsx` to render an input field for Embedding Model Name under Model Name, and bind it to `ollamaEmbeddingModel`. Keep other sections unchanged.
6. Integrate the optimization utility in `server/geminiParser.js`:
   - Import/require `ollamaOptimizer.js` functions.
   - Refactor `callAIProvider` to accept an `options = {}` object, applying task-specific parameters:
     - Complex tasks (`parseResume`, `generateQuestionsForCandidate`): `num_ctx: 8192`, `num_predict: 2048`, timeout of 5 minutes (`300000` ms).
     - Simple tasks: `num_ctx: 2048`, `num_predict: 256`, timeout of 30 seconds (`30000` ms).
   - In `callAIProvider`, if a schema is passed, run it through `stripSchemaDescriptions(schema)`.
   - In `parseResume`, make sure that if using Ollama, it uses raw resume text (`resumeText`) rather than passing an empty PDF string indicator if PDF base64 is uploaded.
   - Compress the candidate profile with `compressCandidateProfile` before stringifying it for prompts in downstream tasks (`scoreCandidate`, `generateTags`, `scoreCandidateByOwnCategory`, `generateQuestionsForCandidate`).
7. Update `server/embeddingService.js`:
   - Use `settings?.ollamaEmbeddingModel || 'nomic-embed-text'` for embeddings.
   - Pass options: `{ options: { num_ctx: 8192 } }` in the `/api/embed` request body payload.
   - Change `BATCH_SIZE = provider === 'ollama' ? 10 : 100` to process in smaller chunks.
8. Update `server/emailCategorizer.js` to compress classification instructions and use parameters `num_ctx: 2048`, `num_predict: 256`, timeout `30000` ms.

Once completed, run server startup validation or test commands using the workspace dev/test scripts (via `run_command` from your workspace) and confirm everything builds and passes. Write your handoff report to `handoff.md` in your working directory and notify the orchestrator (conversation ID: 5514c725-c82f-4659-aad7-043243c47d03).

## 2026-07-10T10:25:56Z

You are a Worker agent. Your task is to update the `.light-theme` CSS variables in `c:/Users/sri charan/Documents/projects/hr recruter/client/src/index.css` (specifically lines 58-96) to apply the optimized scheme.

Ensure you replace the existing `.light-theme` variables block exactly with the following content:

```css
.light-theme {
  /* High-Contrast Premium Light Mode (Stripe/Linear-Inspired Optimization) */
  --bg-primary: #f8fafc; /* Crisp, clean slate canvas background */
  --bg-secondary: #ffffff; /* Pure white containers/cards */
  --bg-tertiary: #f1f5f9; /* Slate-100 for nested containers/inputs/wells */
  --sidebar-bg: #ffffff; /* Pure white sidebar to frame content */
  --kanban-column-bg: rgba(241, 245, 249, 0.75); /* Soft slate-100 Kanban lanes */
  
  --glass-bg: #ffffff;
  --glass-border: #cbd5e1; /* Slate-300 for crisp, visible boundaries */
  --glass-hover: #f8fafc; /* Subtle light hover feedback */
  
  --text-primary: #0f172a; /* Deep slate-950 for elite readability (passes WCAG AAA) */
  --text-secondary: #334155; /* Slate-700 for subtitles/descriptions (passes WCAG AAA) */
  --text-muted: #475569; /* Slate-600 for clear secondary tags (passes WCAG AA) */
  
  --accent-primary: #635bff; /* Premium Stripe Blurple brand tone */
  --accent-secondary: #8b5cf6; /* Vibrant purple accent */
  --accent-gradient: linear-gradient(135deg, #635bff 0%, #8b5cf6 100%); /* Elegant premium gradient button accent */
  --accent-glow: 0 0 24px rgba(99, 91, 255, 0.12);
  
  --status-inbox: #1d4ed8; /* Blue-700 (passes WCAG AA on white) */
  --status-shortlist: #b45309; /* Amber-700 (passes WCAG AA on white) */
  --status-interview: #6d28d9; /* Purple-700 (passes WCAG AA on white) */
  --status-offered: #047857; /* Emerald-700 (passes WCAG AA on white) */
  --status-rejected: #b91c1c; /* Red-700 (passes WCAG AA on white) */
  
  --bg-gradient: radial-gradient(circle at 10% 20%, rgba(99, 91, 255, 0.03) 0%, transparent 40%);
                 
  --banner-text-gradient: linear-gradient(to right, #ffffff, #f1f5f9);
  --banner-bg: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); /* Dark premium command center */
  --banner-border: rgba(15, 23, 42, 0.1);
  --inbox-header-bg: #f8fafc;
  --overlay-bg: rgba(255, 255, 255, 0.75); /* Highly polished glass transparency */

  --shadow-sm: 0 1px 3px rgba(15, 23, 42, 0.05);
  --shadow-md: 0 4px 12px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -1px rgba(15, 23, 42, 0.04);
  --shadow-lg: 0 12px 24px -3px rgba(15, 23, 42, 0.1), 0 4px 8px -2px rgba(15, 23, 42, 0.06);
}
```

Ensure NO functional code or JSX layout files are modified.
After updating the file, run the dev server locally using the `npm run dev` command inside the `client` directory (or verify compilation) to verify the changes load successfully without compile-time errors.
Note: You are only running verification builds and checks, and verifying that the project compiles.
When done, write a `handoff.md` report with the verified build status and send a message back.
