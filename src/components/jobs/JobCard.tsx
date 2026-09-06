import { Link } from "@tanstack/react-router";
import { Building2, MapPin, Wallet, Clock, BriefcaseBusiness, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatSalary, timeAgo } from "@/lib/constants";
import type { Job } from "@/lib/api";
import { SaveJobButton } from "./SaveJobButton";

export function JobCard({ job }: { job: Job }) {
  return (
    <Card className="group gap-0 p-5 shadow-card transition-shadow hover:shadow-elevated">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/jobs/$jobId"
              params={{ jobId: job.id }}
              className="text-base font-semibold leading-tight hover:text-primary sm:text-lg"
            >
              {job.title}
            </Link>
            {job.is_featured ? <Badge>Featured</Badge> : null}
            {job.is_demo ? <Badge variant="secondary">Sample data</Badge> : null}
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Building2 className="size-4 shrink-0" />
            <span className="truncate">{job.companies?.name ?? "Company"}</span>
          </p>
        </div>
        <SaveJobButton jobId={job.id} />
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <MapPin className="size-4" /> {job.location}
        </span>
        <span className="flex items-center gap-1.5">
          <Wallet className="size-4" /> {formatSalary(job.salary_min, job.salary_max, job.currency)}
        </span>
        <span className="flex items-center gap-1.5">
          <BriefcaseBusiness className="size-4" /> {job.job_type}
        </span>
        <span className="flex items-center gap-1.5">
          <GraduationCap className="size-4" /> {job.experience_years ?? job.experience_level}
        </span>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3.5" /> {timeAgo(job.created_at)}
        </span>
        <Button asChild size="sm">
          <Link to="/jobs/$jobId" params={{ jobId: job.id }}>
            Apply
          </Link>
        </Button>
      </div>
    </Card>
  );
}
