import { ShieldAlert, ShieldCheck } from 'lucide-react';
import type { PolicySource } from '@/types';

interface PolicySourceCardProps {
  source: PolicySource;
}

export default function PolicySourceCard({ source }: PolicySourceCardProps) {
  return (
    <article
      id={`policy-${source.id}`}
      tabIndex={-1}
      className={`border-t py-5 transition-colors duration-200 ${
        source.verified ? 'border-slate-200 bg-transparent' : 'border-dashed border-amber-300 bg-amber-50/40'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-sm bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">{source.id}</span>
        {source.verified ? (
          <span className="inline-flex items-center gap-1 rounded-sm bg-transparent px-2.5 py-0.5 text-xs font-medium text-slate-700">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Verified
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-sm bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900">
            <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
            Unverified, not used as evidence
          </span>
        )}
      </div>

      <h3 className="mt-3 text-sm font-semibold text-slate-900">{source.title}</h3>
      <details className="mt-3"><summary className="text-xs text-teal-700">Publisher, date & original source</summary>
      <dl className="mt-2 grid gap-x-4 gap-y-1 text-xs text-slate-600 sm:grid-cols-2">
        <div>
          <dt className="inline font-medium text-slate-700">Publisher: </dt>
          <dd className="inline">{source.publisher}</dd>
        </div>
        <div>
          <dt className="inline font-medium text-slate-700">Date: </dt>
          <dd className="inline">{source.date}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="inline font-medium text-slate-700">Type: </dt>
          <dd className="inline">{source.documentType}</dd>
        </div>
        <div className="sm:col-span-2 break-all">
          <dt className="inline font-medium text-slate-700">URL: </dt>
          <dd className="inline">
            {source.url ? (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-700 underline underline-offset-2 hover:text-teal-900"
              >
                {source.url}
              </a>
            ) : (
              'None provided'
            )}
          </dd>
        </div>
      </dl>
      </details>

      {source.passage && (
        <blockquote className="mt-3 border-l-2 border-teal-600 pl-3 text-sm text-slate-800">
          &ldquo;{source.passage}&rdquo;
          {source.locator && <span className="mt-1 block text-xs text-slate-500">{source.locator}</span>}
        </blockquote>
      )}

      <p className="mt-3 text-sm text-slate-600">{source.summary}</p>

      {source.note && <p className="mt-2 text-xs text-amber-800">Note: {source.note}</p>}
      {source.unverifiedReason && (
        <p className="mt-2 text-xs text-amber-900">Why unverified: {source.unverifiedReason}</p>
      )}
    </article>
  );
}
