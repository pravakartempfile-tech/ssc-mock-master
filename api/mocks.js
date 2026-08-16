const ALLOWED = [
  process.env.SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_URL
].filter(Boolean);
const KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function base(){
  const url=ALLOWED[0];
  if(!url || !KEY) throw new Error('Supabase environment variables are not available. Redeploy after connecting Supabase to Vercel.');
  return url.replace(/\/$/,'') + '/rest/v1/mocks';
}
async function supa(path='', opts={}){
  const headers={apikey:KEY, Authorization:'Bearer '+KEY, 'Content-Type':'application/json', ...(opts.headers||{})};
  const r=await fetch(base()+path,{...opts,headers});
  const text=await r.text();
  let body; try{body=text?JSON.parse(text):null}catch{body=text}
  if(!r.ok) throw new Error(typeof body==='string'?body:(body?.message||body?.error||('Supabase HTTP '+r.status)));
  return body;
}

export default async function handler(req,res){
  try{
    if(req.method==='GET'){
      const rows=await supa('?select=id,data&order=id.asc');
      return res.status(200).json({mocks:(rows||[]).map(x=>x.data)});
    }
    if(req.method==='POST'){
      const m=req.body;
      if(!m || m.id==null) return res.status(400).json({error:'Mock id is required'});
      await supa('?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({id:Number(m.id),data:m})});
      return res.status(200).json({ok:true});
    }
    if(req.method==='DELETE'){
      const id=new URL(req.url,'http://localhost').searchParams.get('id');
      if(!id) return res.status(400).json({error:'id is required'});
      await supa('?id=eq.'+encodeURIComponent(id),{method:'DELETE',headers:{Prefer:'return=minimal'}});
      return res.status(200).json({ok:true});
    }
    return res.status(405).json({error:'Method not allowed'});
  }catch(e){return res.status(500).json({error:e.message||String(e)})}
}
