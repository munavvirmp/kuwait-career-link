import type { ReactNode } from "react";
import { AlertCircle, SearchX } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingList({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="gap-3 p-5">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-full" />
        </Card>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Card className="items-center gap-3 p-10 text-center shadow-card">
      <SearchX className="size-10 text-muted-foreground" />
      <h3 className="text-base font-semibold">{title}</h3>
      {description ? <p className="max-w-md text-sm text-muted-foreground">{description}</p> : null}
      {action}
    </Card>
  );
}

export function ErrorState({ message }: { message?: string }) {
  return (
    <Card className="items-center gap-3 border-destructive/30 p-10 text-center">
      <AlertCircle className="size-10 text-destructive" />
      <h3 className="text-base font-semibold">Something went wrong</h3>
      <p className="max-w-md text-sm text-muted-foreground">
        {message ?? "We couldn't load this content. Please refresh and try again."}
      </p>
    </Card>
  );
}
