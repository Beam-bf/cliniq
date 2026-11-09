import { useId, type ReactNode } from 'react';

interface PanelProps {
  title: string; description?: string; action?: ReactNode; children: ReactNode; className?: string;
}

export default function Panel({ title, description, action, children, className = '' }: PanelProps) {
  const titleId = useId();
  return <section aria-labelledby={titleId} className={`briefing-section ${className}`}>
    <div className="section-heading">
      <div><h2 id={titleId}>{title}</h2>{description && <p className="section-description">{description}</p>}</div>
      {action}
    </div>
    <div className="section-body">{children}</div>
  </section>;
}
