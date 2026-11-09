import { WAIT_LIMIT_WEEKS, latestWaitWeeks } from '@/agents/forecast';
import { CLINIC_IDS, CLINIC_NAMES, SPECIALTY_IDS, SPECIALTY_LABELS } from '@/data/scenario';
import type { ClinicSpecialtyRecord } from '@/types';
import Sparkline from '@/components/Sparkline';

interface WaitingTimeMatrixProps {
  records: ClinicSpecialtyRecord[];
}

const AMBER_FROM_WEEKS = 5;

function toneClass(weeks: number) {
  if (weeks >= WAIT_LIMIT_WEEKS) return 'bg-rose-100 text-rose-900';
  if (weeks >= AMBER_FROM_WEEKS) return 'bg-amber-50 text-amber-900';
  return 'wait-normal';
}

export default function WaitingTimeMatrix({ records }: WaitingTimeMatrixProps) {
  return (
    <div className="overflow-x-auto">
      <table className="waiting-matrix min-w-full text-sm">
        <caption className="sr-only">Current waiting weeks and six-week trends by clinic and specialty. Five weeks indicates elevated wait; eight weeks is the limit.</caption>
        <thead>
          <tr>
            <th scope="col" className="px-2 py-1 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              Specialty
            </th>
            {CLINIC_IDS.map((clinicId) => (
              <th
                key={clinicId}
                scope="col"
                className="whitespace-nowrap px-2 py-1 text-left text-xs font-medium uppercase tracking-wide text-slate-500"
              >
                {CLINIC_NAMES[clinicId]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SPECIALTY_IDS.map((specialtyId) => (
            <tr key={specialtyId}>
              <th scope="row" className="whitespace-nowrap px-2 py-1 text-left font-medium text-slate-700">
                {SPECIALTY_LABELS[specialtyId]}
              </th>
              {CLINIC_IDS.map((clinicId) => {
                const record = records.find(
                  (item) => item.clinicId === clinicId && item.specialtyId === specialtyId,
                );
                return (
                  <td key={clinicId} className="px-2 py-1">
                    {record ? (
                      <div className={`wait-cell ${toneClass(latestWaitWeeks(record))}`}>
                        <span className="wait-value">{latestWaitWeeks(record).toFixed(1)}<span className="sr-only"> weeks{latestWaitWeeks(record) >= WAIT_LIMIT_WEEKS ? ', at or over limit' : latestWaitWeeks(record) >= AMBER_FROM_WEEKS ? ', elevated wait' : ''}</span></span>
                        <Sparkline values={record.waitingWeeksHistory} label={`${CLINIC_NAMES[clinicId]} ${SPECIALTY_LABELS[specialtyId]}`} />
                      </div>
                    ) : (
                      <span className="text-slate-400">--</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
