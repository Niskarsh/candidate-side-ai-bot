### Provider notes
- **Gemini function calling**: supported via `functionDeclarations` / `AUTO` tool use. Prefer `gemini-2.0-flash` for speed.
- **OpenAI tool calling**: supported via Responses API with `tools` and `tool_choice:auto`.


Switch with `PROVIDER=gemini|openai` in `.env`.