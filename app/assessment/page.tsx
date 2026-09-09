'use client';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const questions = [{name:'overall',label:'โดยรวมคุณพึงพอใจกับระบบเพียงใด'},{name:'ease',label:'ระบบใช้งานง่ายเพียงใด'},{name:'usefulness',label:'ระบบมีประโยชน์ต่อการติดตามอาการเพียงใด'}];
export default function AssessmentPage(){
  const [done,setDone]=useState(false); const [error,setError]=useState(''); const [sending,setSending]=useState(false);
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setSending(true);setError('');const data=Object.fromEntries(new FormData(event.currentTarget));const response=await fetch('/api/assessments',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});if(response.ok)setDone(true);else setError((await response.json()).error||'ส่งไม่สำเร็จ');setSending(false)}
  return <main className="form-page"><section className="form-shell"><header><p>SATISFACTION ASSESSMENT</p><h1>แบบประเมินความพึงพอใจ</h1><span>ความคิดเห็นของคุณช่วยให้เราปรับปรุงระบบให้ดีขึ้น</span></header>{done?<div className="success"><CheckCircle2/><h2>ขอบคุณสำหรับความคิดเห็น</h2><p>ระบบบันทึกผลประเมินเรียบร้อยแล้ว</p><Link href="/">กลับหน้าหลัก</Link></div>:<form onSubmit={submit}>{questions.map(q=><fieldset key={q.name}><legend>{q.label}</legend><div className="ratings">{[1,2,3,4,5].map(score=><label key={score}><input required type="radio" name={q.name} value={score}/><span>★<b>{score}</b></span></label>)}</div></fieldset>)}<label className="comment">ความคิดเห็นเพิ่มเติม (ไม่บังคับ)<textarea name="comment" maxLength={1000}/></label>{error&&<p className="error">{error}</p>}<div className="form-actions"><Link href="/">กลับหน้าหลัก</Link><Button type="submit" disabled={sending} className="h-11 bg-[#176b87] px-6">{sending?'กำลังส่ง...':'ส่งแบบประเมิน'}</Button></div></form>}</section></main>
}
