export { Skeleton } from "@/components/ui/skeleton";

/**
 * CardSkeleton — reusable placeholder for a token card while loading.
 */
export function CardSkeleton() {
  return (
    <div className="rounded-lg border p-4 space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="h-5 w-12 rounded bg-muted" />
        </div>
        <div className="h-4 w-24 rounded bg-muted" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-48 rounded bg-muted" />
        <div className="h-3 w-56 rounded bg-muted" />
      </div>
      <div className="h-9 w-full rounded bg-muted" />
    </div>
  );
}

/**
 * DashboardSkeleton — three card placeholders for the dashboard loading state.
 */
export function DashboardSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}
