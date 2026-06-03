import { DocumentGrid } from '@/components/features/documents/DocumentGrid';
import { DocumentUploader } from '@/components/features/documents/DocumentUploader';
import { DashboardShell } from '@/components/layout/DashboardShell';

export default function DocumentsPage() {
  return (
    <DashboardShell
      eyebrow="Library"
      title="Documents"
    >
      <div className="space-y-8 max-w-7xl">
        <DocumentUploader />

        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-lg tracking-tight">
            Your documents
          </h2>
          <span className="label-mono">most recent first</span>
        </div>

        <DocumentGrid />
      </div>
    </DashboardShell>
  );
}
