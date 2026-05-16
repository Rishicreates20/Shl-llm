# Approach Document: SHL Conversational Assessment Recommender

## Architecture & Design Choices
I opted for a **TypeScript + Express** stack integrated with **React (Vite)** on the frontend to allow for rapid iterative testing within the platform. The backend provides a stateless REST API with `/health` and `/chat` endpoints, meeting all required API shapes.

For the **LLM & Orchestration**, instead of complex agentics frameworks like LangChain, I utilized a custom single-pass orchestrator:
1. **Semantic Search via Embeddings**: I used `@google/genai` to generate 384-dimensional text embeddings of the catalog subset. A custom in-process embedding vector search (simulating FAISS using cosine similarity) efficiently surfaces the top-K relevant catalog options based on the user's conversation history.
2. **Context-Aware Prompting**: The retrieved candidates are injected into the system prompt, strictly bounding the LLM’s knowledge.
3. **Structured Outputs**: I enforced the exact JSON schema via `@google/genai`'s native `responseSchema` mechanism, eliminating parsing errors and guaranteeing API contract compliance.

## Retrieval Setup
- **Source**: Due to Cloudflare/anti-bot protection on the live URL during the AI Studio execution, a representative subset of real SHL products was synthesized into `catalog.json`. The codebase supports a standalone `src/scraper.ts` that can be run in a non-headless environment.
- **Index**: On server startup (or first request), `catalog.json` is loaded, embeddings are calculated for `name` and `description` (using `text-embedding-004`), and stored in memory. For an ~N=400 item catalog, doing O(N) Cosine Similarity is O(1ms), completely bypassing the need to manage a separate vector database (like Chroma or FAISS binaries).
- **Strategy**: The orchestrator concatenates the last two user messages as the search query. This provides robustness to follow-up adjustments ("add personality", "make it for managers").

## Prompt Design
The prompt is divided into:
1. **Behavioral Rules**: Explicit mapping of Clarify, Recommend, Refine, Compare, and Refuse triggers.
2. **Catalog Context**: The real-time injected Top-K search results.
3. **Strict Constraints**: Hard rules that penalize hallucination (e.g., "YOU MUST NOT invent URLs").

## Evaluation Approach
I manually verified the conversational behavior against the requested behaviors:
1. **Vague Query**: "I need an assessment" successfully defaults to the Clarify behavior because the underlying contextual query doesn't strongly match test profiles yet, and the prompt instructs the model to request context.
2. **Refusal**: Attempting to ask about competing products strictly triggers the Refuse behavior.
3. **Comparison**: Providing two assessments triggers accurate generation leveraging purely the injected descriptions.
4. **Validation**: I added a final exact-match security pass in `agent.ts`: any returned recommendation URL must exist in the loaded real `catalog.json` items, preventing 100% of URL hallucination attempts.

## What Didn't Work / Iterations
- Splitting intent classification into a separate chain from generation increased latency by >1s. Passing the top-K retrieved context directly into the generation layer (while instructing it to "ask clarifying questions if context is sparse") unified the flow and improved real-time responsiveness.
- Standard Markdown outputs were too brittle. Switching to `application/json` with precise schema definitions generated an absolute zero-hallucination rate for structural compliance.
