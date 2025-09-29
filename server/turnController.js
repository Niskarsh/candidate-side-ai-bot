// server/turnController.js
import { createPlanner } from './llmPlanner.js';
import { extractFreeText } from './tools/extract.js';
import { ProfileBuilderAgent } from '../src/agent/profileBuilder.js'; // or server-side import
const planner = createPlanner();

export async function handleTurn(req, res) {
  const { state, last_user_message, goal, idempotency_key } = req.body;

  // 1) extract & merge
  const patch = await extractFreeText(last_user_message, state?.profile || {});
  const merged = mergeProfile(state?.profile || {}, patch); // reuse your merge logic
  const newState = { ...state, profile: merged };

  // 2) plan once
  const plan = await planner.plan({ goal, state: newState, last_user_message, idempotency_key });
  console.log('[turn] plan:', plan);

  // 3) if builder is needed, do it server-side, then re-plan and return a single message
  if (plan.action === 'spawn_profile_builder') {
    console.log('[turn] spawning ProfileBuilderAgent', plan.args);
    const profile = await ProfileBuilderAgent({ linkedinUrl: plan.args.linkedinUrl }, { context: { profile: merged }, emit: () => {} });
    const state2 = { ...newState, profile, step: 'profile_built' };
    const plan2 = await planner.plan({ goal, state: state2, last_user_message: '', idempotency_key: `${idempotency_key}:postbuild` });
    if (plan2.action === 'assistant_message') return res.json({ state: state2, reply: plan2.args.text });
    if (plan2.action === 'request_clarification') return res.json({ state: state2, reply: plan2.args.question });
    if (plan2.action === 'finalize_profile') return res.json({ state: state2, reply: "Love it. Profile's tight." });
    return res.json({ state: state2, reply: '' });
  }

  // 4) all other actions → just return one assistant reply
  if (plan.action === 'assistant_message') return res.json({ state: newState, reply: plan.args.text });
  if (plan.action === 'request_clarification') return res.json({ state: newState, reply: plan.args.question });
  if (plan.action === 'finalize_profile') return res.json({ state: newState, reply: "Love it. Profile's tight." });

  return res.json({ state: newState, reply: '' });
}
