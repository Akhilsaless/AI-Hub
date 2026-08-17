import {decryptStoredKey} from './vault.js';

export const AI_PROVIDERS={
  gemini:{name:'Google Gemini',endpoint:'https://generativelanguage.googleapis.com',auth:'api-key',credentialLabel:'Gemini API Key',discover:'gemini',freeCapable:true,capabilities:['chat','reasoning','code','vision','audio','multimodal','tools','structured','embeddings','long-context']},
  groq:{name:'Groq',endpoint:'https://api.groq.com/openai/v1',auth:'api-key',credentialLabel:'Groq API Key',discover:'openai',