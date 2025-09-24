
- No Postgres yet; in‑memory state only

---


## Project layout


```
ai-orchestrator-cra/
├─ server/
│ ├─ index.js # Express app + routes (proxy + /api/plan)
│ ├─ llmPlanner.js # Provider switch (Gemini/OpenAI) + tool schemas
│ ├─ .env.example
│ ├─ package.json
│ └─ README_server.md
└─ client/ # Create React App
├─ package.json
├─ .env # REACT_APP_SERVER_BASE=http://localhost:8787
└─ src/
├─ index.js
├─ App.js # Chat UI + session state
├─ styles.css
├─ agent/
│ ├─ runtime.js # Event bus + tool calls + agent spawn
│ ├─ orchestrator.js # Client supervisor wrapper around /api/plan
│ └─ profileBuilder.js # Calls tools to normalize profile
└─ tools/
├─ api.js # axios helpers (plan, enrich)
└─ registry.js # client-visible tools (only ask.user lives on client)
```


---


## How to run


```bash
# server
cd server
cp .env.example .env
# set RAPIDAPI_KEY and either GOOGLE_API_KEY (Gemini) or OPENAI_API_KEY (OpenAI)
npm i
npm run dev # http://localhost:8787


# client (CRA)
cd ../client
npm i
npm start # http://localhost:3000
```


> Switch provider by editing `server/.env` → `PROVIDER=gemini` or `PROVIDER=openai`.