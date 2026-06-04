import { DocumentGrid } from '@/components/features/documents/DocumentGrid';
import { DocumentUploader } from '@/components/features/documents/DocumentUploader';
import { DashboardShell } from '@/components/layout/DashboardShell';

export default function DocumentsPage() {
  return (
    <DashboardShell eyebrow="Library" title="Documents">
      <div className="space-y-8 pb-12">
        <DocumentUploader />

        <div>
          <div className="flex items-baseline justify-between mb-4">
            <h2>All documents</h2>
            <span className="text-[11px] uppercase tracking-[0.08em] text-ink-3">
              Most recent first
            </span>
          </div>
          <DocumentGrid />
        </div>
      </div>
    </DashboardShell>
  );
}
