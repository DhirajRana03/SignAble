import { DocumentGrid } from '@/components/features/documents/DocumentGrid';
import { DocumentUploader } from '@/components/features/documents/DocumentUploader';
import { DashboardShell } from '@/components/layout/DashboardShell';

export default function DocumentsPage() {
  return (
    <DashboardShell eyebrow="Library" title="Documents">
      <div className="space-y-16 lg:space-y-20 pb-16">
        <section>
          <DocumentUploader />
        </section>

        <section>
          <div className="flex items-baseline justify-between mb-8">
            <div>
              <span className="eyebrow">Your files</span>
              <h2 className="mt-3">All documents</h2>
            </div>
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-mute">
              Most recent first
            </span>
          </div>

          <DocumentGrid />
        </section>
      </div>
    </DashboardShell>
  );
}
