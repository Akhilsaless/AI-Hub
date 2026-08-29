export const MODEL_EXPLORER = [
  {
    id: "openai",
    provider: "OpenAI",
    family: "GPT",
    access: "paid/freemium varies",
    bestFor: ["general reasoning", "coding", "multimodal"],
    lesson: "openai",
    official: "https://platform.openai.com/",
    dynamic: true,
  },
  {
    id: "gemini",
    provider: "Google",
    family: "Gemini",
    access: "free/paid tiers vary",
    bestFor: ["multimodal", "long context", "Google ecosystem"],
    lesson: "gemini",
    official: "https://ai.google.dev/",
    dynamic: true,
  },
  {
    id: "claude",
    provider: "Anthropic",
    family: "Claude",
    access: "free/paid tiers vary",
    bestFor: ["writing", "reasoning", "coding"],
    lesson: "claude",
    official: "https://www.anthropic.com/claude",
    dynamic: true,
  },
  {
    id: "llama",
    provider: "Meta",
    family: "Llama",
    access: "open-weight terms vary",
    bestFor: ["self-hosting", "research", "customization"],
    lesson: "llama",
    official: "https://www.llama.com/",
    dynamic: true,
  },
  {
    id: "deepseek",
    provider: "DeepSeek",
    family: "DeepSeek",
    access: "free/paid varies",
    bestFor: ["reasoning", "coding"],
    lesson: "deepseek",
    official: "https://www.deepseek.com/",
    dynamic: true,
  },
  {
    id: "qwen",
    provider: "Alibaba Cloud",
    family: "Qwen",
    access: "open/hosted varies",
    bestFor: ["multilingual", "coding", "open models"],
    lesson: "qwen",
    official: "https://qwenlm.github.io/",
    dynamic: true,
  },
  {
    id: "mistral",
    provider: "Mistral AI",
    family: "Mistral",
    access: "open/paid varies",
    bestFor: ["efficient models", "coding", "enterprise"],
    lesson: "mistral",
    official: "https://mistral.ai/",
    dynamic: true,
  },
  {
    id: "kimi",
    provider: "Moonshot AI",
    family: "Kimi",
    access: "varies",
    bestFor: ["long context", "agentic tasks"],
    lesson: "kimi",
    official: "https://www.kimi.com/",
    dynamic: true,
  },
  {
    id: "glm",
    provider: "Zhipu AI",
    family: "GLM",
    access: "varies",
    bestFor: ["multilingual", "general AI"],
    lesson: "glm",
    official: "https://www.z.ai/",
    dynamic: true,
  },
  {
    id: "minimax",
    provider: "MiniMax",
    family: "MiniMax",
    access: "varies",
    bestFor: ["multimodal", "creative AI"],
    lesson: "minimax",
    official: "https://www.minimax.io/",
    dynamic: true,
  },
];
export function modelExplorer({ q = "", provider = "" } = {}) {
  const s = q.toLowerCase();
  return MODEL_EXPLORER.filter(
    (x) =>
      (!provider || x.provider.toLowerCase() === provider.toLowerCase()) &&
      (!s ||
        [x.provider, x.family, x.access, ...x.bestFor]
          .join(" ")
          .toLowerCase()
          .includes(s)),
  ).map((x) => ({
    ...x,
    freshness: "dynamic-metadata-required",
    note: "Capabilities, prices, free tiers and limits change frequently. HOPE should refresh these fields from an approved research source before presenting them as current.",
  }));
}
