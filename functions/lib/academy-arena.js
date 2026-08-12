import {lesson} from './academy.js';
export const ARENAS=[
 {id:'reasoning-duel',title:'Reasoning Duel',skill:'models',prompt:'Solve the same ambiguous reasoning problem with two eligible models, judge the stronger answer, then defend your choice.',rubric:['correctness','reasoning quality','uncertainty','verification']},
 {id:'prompt-remix',title:'Prompt Remix',skill:'prompting',prompt:'Improve a weak prompt, test the original and improved versions, and explain what changed.',rubric:['clarity','constraints','transferability','result quality']},
 {id:'research-trial',title:'Research Trial',skill:'research',prompt:'Answer a current question using sources, separate facts from inference, and identify one uncertainty.',rubric:['source quality','recency','claim support','uncertainty']},
 {id:'agent-rescue',title:'Agent Rescue',skill:'agents',prompt:'Diagnose a failing agent workflow, make the smallest safe repair, and define proof that it works.',rubric:['diagnosis','minimal repair','safety','verification']},
 {id:'automation-sprint',title:'Automation Sprint',skill:'automation',prompt:'Turn a repetitive workflow into an automation while keeping the right human approval step.',rubric:['value','workflow design','approval','failure handling']},
 {id:'builder-boss',title:'Builder Boss',skill:'building',prompt:'Build a small useful AI product from a scenario and demonstrate that its core path works.',rubric:['usefulness','architecture','working outcome','verification']}
];
export function arena(id){return ARENAS.find(x=>x.id===id)||null}
export function proofMissionFor(lessonId){const l=lesson(lessonId);if(!l)return null;const map={foundations:'prompt-remix',models:'reasoning-duel',work:'automation-sprint',builder:'builder-boss','agent-engineer':'agent-rescue',business:'research-trial'},a=arena(map[l.trackId]);return {...a,lessonId,sourceLesson:l.title,proofRequired:true}}
export function gradeProof({rubric=[],scores={}}={}){const vals=rubric.map(k=>Math.max(0,Math.min(100,Number(scores[k]||0))));const score=vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):0;return {score,passed:score>=75,verified:score>=75&&vals.every(v=>v>=55),breakdown:Object.fromEntries(rubric.map((k,i)=>[k,vals[i]]))}}
