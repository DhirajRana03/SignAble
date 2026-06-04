import { DocumentGrid } from '@/components/features/documents/DocumentGrid';
import { DocumentUploader } from '@/components/features/documents/DocumentUploader';
import { DashboardShell } from '@/components/layout/DashboardShell';

export default function DocumentsPage() {
  return (
    <DashboardShell eyebrow="Library" title="Documents">
      <div className="space-y-6 pb-12">
        <DocumentUploader />

        <div>
          <div className="flex items-baseline justify-between mb-3">
            <h2>All documents</h2>
            <span className="text-[10.5px] font-mono uppercase tracking-[0.09em] text-muted">
              Most recent first
            </span>
          </div>
          <DocumentGrid />
        </div>
      </div>
    </DashboardShell>
  );
}
