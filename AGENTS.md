# AGENTS.md 

## Project Overview

This repository contains the current implementation of **ProconBot Jacarei**, a Node.js + TypeScript WhatsApp chatbot for initial consumer-rights guidance.

The implemented product today is primarily:

- a WhatsApp integration using `whatsapp-web.js`
- a message orchestration layer
- a deterministic flow engine
- JSON-based decision flows for supported PROCON scenarios
- in-memory conversation/session tracking
- unit tests with Vitest

Do **not** assume that planned roadmap items are already implemented. The current codebase does **not** yet provide a full RAG, LLM, embeddings, database, or cloud architecture in runtime code unless the relevant code is explicitly added.

## Stack

- Node.js
- TypeScript
- CommonJS package mode
- `tsx` for local dev execution
- Vitest for tests
- `whatsapp-web.js` for WhatsApp connectivity

## Important Commands

Run these from the repository root:

- `npm.cmd run dev`: starts the bot through `src/server.ts`
- `npm.cmd run test:run`: runs the full test suite once
- `npm.cmd run test`: runs Vitest in watch mode
- `npm.cmd run typecheck`: runs TypeScript without emitting files
- `npm.cmd run build`: compiles TypeScript to `dist/`

On Windows PowerShell, prefer `npm.cmd` instead of `npm` if execution policy blocks PowerShell scripts.

## Entry Points

- `src/server.ts`: real application bootstrap
- `src/bot/bot.ts`: bot orchestration over the messaging provider
- `src/messages/message-processor.service.ts`: flow matching, session continuation, and response formatting

Do not use `src/index.ts` as the application entry point unless you intentionally repurpose it.

## Architecture Notes

Keep these boundaries intact unless the task explicitly requires a refactor:

- `src/whatsapp/`: messaging provider implementation details
- `src/bot/`: top-level bot orchestration
- `src/messages/`: message logging and processing
- `src/engine/`: generic flow engine behavior
- `src/flows/`: flow definitions and flow discovery
- `src/sessions/`: session storage
- `src/types/`: shared domain types

Preferred request path:

1. incoming WhatsApp message
2. provider callback
3. `ProconBot`
4. `MessageProcessorService`
5. flow matching or session continuation
6. `FlowEngine`
7. formatted reply

## Flow System Rules

Flows are stored as JSON files under `src/flows/`.

When adding or editing flows:

- keep flow definitions deterministic
- preserve the current schema used by `FlowDefinition`
- ensure every flow has a valid `fallback` response
- keep trigger phrases in Brazilian Portuguese
- keep user-facing guidance in clear, simple Portuguese
- keep recommendations and document lists concise and action-oriented

If you add a new flow:

- register it in `src/flows/flow-registry.ts`
- add or update tests for the new behavior

## Coding Guidelines

- Use TypeScript strictness already configured in `tsconfig.json`
- Match the existing code style and naming already present in `src/`
- Prefer small, focused classes and functions
- Avoid introducing heavy abstractions unless there is a clear need
- Keep user-facing messages in Portuguese unless the task explicitly requires another language
- Prefer deterministic logic over speculative AI behavior in the current codebase

## Testing Expectations

Before finishing a change, run as many of these as relevant:

- `npm.cmd run typecheck`
- `npm.cmd run test:run`
- `npm.cmd run build`

At minimum:

- run tests for behavior changes
- run typecheck for TypeScript edits

If you cannot run a command, say so clearly in your handoff.

## WhatsApp Provider Notes

`src/whatsapp/whatsapp-provider.ts` uses `LocalAuth` and `qrcode-terminal`.

When editing provider behavior:

- do not break QR authentication flow
- continue ignoring messages from the bot itself
- continue ignoring status broadcasts
- continue ignoring group messages unless group support is intentionally added

## Documentation Notes

The `docs/` folder is important project documentation and should be preserved unless the task explicitly asks for documentation cleanup.

Documentation may describe future vision. When implementing code, prioritize the actual runtime behavior in `src/` and the current tests in `tests/`.

## Change Safety

Be careful with these areas:

- changing response text may break tests that assert summary/message content
- changing flow trigger matching can alter routing behavior across all supported topics
- replacing in-memory session handling with persistence is an architectural change and should be done deliberately

When making architectural changes, update both tests and documentation as needed.
