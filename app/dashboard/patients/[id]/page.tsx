import { PatientDetail } from '@/components/dashboard/patient-detail';

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PatientDetail patientId={id}/>;
}
