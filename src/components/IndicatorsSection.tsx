import Panel from '@/components/Panel';
import WaitingTimeMatrix from '@/components/WaitingTimeMatrix';
import { CLINIC_IDS, CLINIC_NAMES, SPECIALTY_IDS, SPECIALTY_LABELS } from '@/data/scenario';
import type { ClinicSpecialtyRecord } from '@/types';

interface IndicatorsSectionProps {
  records: ClinicSpecialtyRecord[];
}

function percent(value: number, max: number) {
  return max === 0 ? 0 : Math.round((value / max) * 100);
}

export default function IndicatorsSection({ records }: IndicatorsSectionProps) {
  const hoursByClinic = CLINIC_IDS.map((clinicId) => ({
    clinicId,
    hours: records
      .filter((record) => record.clinicId === clinicId)
      .reduce((sum, record) => sum + record.freeSpecialistHoursPerWeek, 0),
  }));
  const maxHours = Math.max(...hoursByClinic.map((item) => item.hours));

  const referralsBySpecialty = SPECIALTY_IDS.map((specialtyId) => ({
    specialtyId,
    referrals: records
      .filter((record) => record.specialtyId === specialtyId)
      .reduce((sum, record) => sum + record.referralsPerWeek, 0),
  }));
  const totalReferrals = referralsBySpecialty.reduce((sum, item) => sum + item.referrals, 0);
  const maxReferrals = Math.max(...referralsBySpecialty.map((item) => item.referrals));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel
        className="lg:col-span-2"
        title="Waiting time by specialty and clinic"
        description="Weeks to first appointment · elevated at 5 weeks, limit at 8. Lines show the last 6 weeks; each uses its own vertical scale."
      >
        <WaitingTimeMatrix records={records} />
      </Panel>

      <Panel title="Free specialist hours per week" description="Unbooked specialist hours, all specialties combined.">
        <ul className="space-y-4">
          {hoursByClinic.map((item) => (
            <li key={item.clinicId}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium text-slate-700">{CLINIC_NAMES[item.clinicId]}</span>
                <span className="tabular-nums text-slate-900">{item.hours} hrs</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-sm bg-slate-100">
                <div
                  className="h-full bg-teal-700 transition-all duration-500"
                  style={{ width: `${percent(item.hours, maxHours)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Referrals per week" description="Incoming referrals across all clinics.">
        <p className="text-4xl font-semibold tracking-tight tabular-nums text-slate-900">
          {totalReferrals.toLocaleString()}
        </p>
        <ul className="mt-5 space-y-3">
          {referralsBySpecialty.map((item) => (
            <li key={item.specialtyId} className="flex items-center gap-3 text-sm">
              <span className="w-28 shrink-0 text-slate-600">{SPECIALTY_LABELS[item.specialtyId]}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-sm bg-slate-100">
                <div
                  className="h-full rounded-sm bg-teal-600 transition-all duration-500"
                  style={{ width: `${percent(item.referrals, maxReferrals)}%` }}
                />
              </div>
              <span className="w-12 text-right font-mono tabular-nums text-slate-900">{item.referrals}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
