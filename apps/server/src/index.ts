import "./bootEnv";
import express from 'express';
import cors from 'cors';
import { chatRouter } from './routes/chat.js';
import { agentsRouter } from './routes/agents.js';
console.log(`6666666666666666`, process.env.GEMINI_API_KEY)
const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? '*' }));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/chat', chatRouter);
app.use('/api/agents', agentsRouter);

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Server listening on :${port}`));
