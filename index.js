const MODEL="@cf/google/gemma-4-26b-a4b-it";
const SYSTEM=`Lightly refine a student's elevator pitch. Preserve all facts and first-person voice. Do not invent experiences, credentials, skills, achievements, employers, results, motivations, or goals. Improve grammar, flow, transitions, rhythm, and awkward repetition. Prefer natural spoken language. Keep the structure focused on who I am -> value I bring -> who/where I want to contribute. Return only the polished pitch.`;

function cors(origin,env){
  const allowed=(env.ALLOWED_ORIGINS||"").split(",").map(x=>x.trim()).filter(Boolean);
  const ok=allowed.length===0||allowed.includes(origin);
  return {ok,headers:{
    "Access-Control-Allow-Origin":ok?(allowed.length?origin:"*"):"null",
    "Access-Control-Allow-Methods":"POST, OPTIONS, GET",
    "Access-Control-Allow-Headers":"Content-Type",
    "Content-Type":"application/json; charset=utf-8"
  }};
}
function json(body,status,headers){return new Response(JSON.stringify(body),{status:status||200,headers});}
function extractText(result){
  if(typeof result?.response==="string") return result.response;
  if(typeof result?.output_text==="string") return result.output_text;
  if(Array.isArray(result?.choices)) return result.choices?.[0]?.message?.content||result.choices?.[0]?.text||"";
  return "";
}
export default{
  async fetch(request,env){
    const url=new URL(request.url), origin=request.headers.get("Origin")||"", c=cors(origin,env);
    if(request.method==="OPTIONS") return new Response(null,{status:c.ok?204:403,headers:c.headers});
    if(request.method==="GET"&&url.pathname==="/health") return json({ok:true,service:"Build Your Pitch AI Polish",model:MODEL},200,c.headers);
    if(url.pathname!=="/polish") return json({error:"Not found."},404,c.headers);
    if(!c.ok) return json({error:"Origin not allowed."},403,c.headers);
    if(request.method!=="POST") return json({error:"Method not allowed."},405,c.headers);
    try{
      const body=await request.json(), pitch=String(body?.pitch||"").trim();
      if(!pitch) return json({error:"A pitch is required."},400,c.headers);
      const result=await env.AI.run(MODEL,{messages:[{role:"system",content:SYSTEM},{role:"user",content:`Polish this elevator pitch:\n\n${pitch}`}],temperature:0.25,max_completion_tokens:220});
      const polished=extractText(result).trim().replace(/^["“]|["”]$/g,"").trim();
      if(!polished) return json({error:"The AI returned no usable polished pitch."},502,c.headers);
      return json({polished,model:MODEL},200,c.headers);
    }catch(e){
      return json({error:"AI polishing is temporarily unavailable."},500,c.headers);
    }
  }
};