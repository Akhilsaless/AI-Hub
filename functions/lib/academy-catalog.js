export const ACADEMY_LEVELS=[
 {id:'beginner',title:'Beginner',promise:'Understand modern AI and use it safely.',requires:[],tracks:['foundations','models']},
 {id:'intermediate',title:'Intermediate',promise:'Use AI for real work and build useful workflows.',requires:['beginner'],tracks:['work','builder']},
 {id:'advanced',title:'Advanced',promise:'Engineer reliable agents and AI products.',requires:['intermediate'],tracks:['agent-engineer','business']}
];

export const TOOL_CATALOG=[
 {id:'chatgpt',name:'ChatGPT',provider:'OpenAI',category:'Assistants',access:'free+paid',url:'https://chatgpt.com',lesson:'openai',use:'General reasoning, writing, research and multimodal assistance.'},
 {id:'gemini',name:'Gemini',provider:'Google',category:'Assistants',access:'free+paid',url:'https://gemini.google.com',lesson:'gemini',use:'Multimodal assistance and Google ecosystem workflows.'},
 {id:'claude',name:'Claude',provider:'Anthropic',category:'Assistants',access:'free+paid',url:'https://claude.ai',lesson:'claude',use:'Long-context reasoning, writing and analysis.'},
 {id:'deepseek',name:'DeepSeek',provider:'DeepSeek',category:'Assistants',access:'free+paid',url:'https://chat.deepseek.com',lesson:'deepseek',use:'Reasoning and coding with accessible models.'},
 {id:'qwen',name:'Qwen Chat',provider:'Alibaba Cloud',category:'Assistants',access:'free+paid',url:'https://chat.qwen.ai',lesson:'qwen',use:'Multilingual reasoning, coding and multimodal tasks.'},
 {id:'mistral',name:'Le Chat',provider:'Mistral AI',category:'Assistants',access:'free+paid',url:'https://chat.mistral.ai',lesson:'mistral',use:'Fast general assistance and Mistral model access.'},
 {id:'grok',name:'Grok',provider:'xAI',category:'Assistants',access:'free+paid',url:'https://grok.com',lesson:'grok',use:'General assistant and current-information workflows where available.'},
 {id:'kimi',name:'Kimi',provider:'Moonshot AI',category:'Assistants',access:'free+paid',url:'https://www.kimi.com',lesson:'kimi',use:'Long-context and agent-style assistant workflows.'},
 {id:'openrouter',name:'OpenRouter',provider:'OpenRouter',category:'Model gateways',access:'free+paid',url:'https://openrouter.ai',lesson:'routing',use:'Route applications across many model providers.'},
 {id:'huggingface',name:'Hugging Face',provider:'Hugging Face',category:'Models & builders',access:'free+paid',url:'https://huggingface.co',lesson:'models',use:'Discover models, datasets, Spaces and open AI tooling.'},
 {id:'groq',name:'GroqCloud',provider:'Groq',category:'Inference',access:'free+paid',url:'https://console.groq.com',lesson:'apis',use:'Low-latency model inference APIs.'},
 {id:'cerebras',name:'Cerebras Inference',provider:'Cerebras',category:'Inference',access:'free+paid',url:'https://inference.cerebras.ai',lesson:'apis',use:'Fast inference for supported open models.'},
 {id:'github-copilot',name:'GitHub Copilot',provider:'GitHub',category:'Coding',access:'free+paid',url:'https://github.com/features/copilot',lesson:'builder',use:'AI-assisted software development.'},
 {id:'canva',name:'Canva AI',provider:'Canva',category:'Design',access:'free+paid',url:'https://www.canva.com/ai-assistant/',lesson:'marketing',use:'Design and content creation workflows.'}
];

export const LESSON_STORIES={
 'ai-in-10':{why:'AI systems predict useful outputs from patterns learned from data.',example:'Ask one model to summarize a messy note, then verify every factual claim.',challenge:'Explain AI to a 12-year-old without saying it thinks like a human.'},
 'openai':{why:'Model families differ in capability, latency, modalities, context and cost.',example:'Compare a fast model and a reasoning model on the same task.',challenge:'Choose a model for a support bot and defend the trade-off.'},
 'research':{why:'AI can accelerate research only when sources and uncertainty stay visible.',example:'Turn a broad question into claims, sources, contradictions and a conclusion.',challenge:'Produce a research plan that makes hallucinations easy to detect.'},
 'agents':{why:'Agents combine a model with goals, tools, state and a control loop.',example:'A support agent reads a ticket, searches policy, drafts a response and waits for approval.',challenge:'Design the smallest safe agent for one repetitive task.'},
 'evals':{why:'Reliable AI needs repeatable tests, not vibes.',example:'Create ten representative tasks and score correctness, safety, latency and cost.',challenge:'Write an eval that would catch a confident but wrong agent.'}
};

export function catalog({q='',category='',access=''}={}){const query=String(q).trim().toLowerCase();return TOOL_CATALOG.filter(t=>(!query||[t.name,t.provider,t.category,t.use].join(' ').toLowerCase().includes(query))&&(!category||t.category===category)&&(!access||t.access.includes(access)));}
export function categories(){return [...new Set(TOOL_CATALOG.map(t=>t.category))].sort();}
export function storyFor(id,title='AI lesson'){return LESSON_STORIES[id]||{why:`Understand ${title} through a concrete decision rather than memorizing terminology.`,example:'Use the idea on a real task, compare the result with a weaker approach, and verify what changed.',challenge:'Apply the idea, explain the trade-off, and show how you verified the result.'};}
