import { DemoWorkspace } from '@/components/demo-workspace';
import { createDemoCases } from '@/lib/demo-data';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Interactive demo | Ileal Conduit Care', description: 'ทดลองระบบติดตามผู้ป่วยด้วยข้อมูลจำลองทั้งหมด' };

export default function DemoPage() { return <DemoWorkspace initialCases={createDemoCases()} />; }
