import { Link } from "@tanstack/react-router";
import { Building2, MapPin, Wallet, Clock, BriefcaseBusiness, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatSalary, timeAgo } from "@/lib/constants";
import type { Job } from "@/lib/api";
import { SaveJobButton } from "./SaveJobButton";
import { VerifiedBadge } from "@/components/site/VerifiedBadge";

export function JobCard({ job }: { job: Job }) {
  return (
    <Card className="group gap-0 p-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-elevated sm:p-5">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-primary">
          <Building2 className="size-5" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/jobs/$jobId"
              params={{ jobId: job.id }}
              className="text-base font-semibold leading-tight transition-colors hover:text-primary sm:text-lg"
            >
              {job.title}
            </Link>
            {job.is_featured ? <Badge>Featured</Badge> : null}
            {job.is_demo ? <Badge variant="secondary">Sample data</Badge> : null}
          </div>
          <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
            <span className="truncate">{job.companies?.name ?? "Company"}</span>
            {job.companies?.verification_status === "verified" ? <VerifiedBadge /> : null}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-muted-foreground sm:gap-x-5 sm:text-sm">
        <span className="flex min-w-0 items-center gap-1.5">
          <MapPin className="size-4 shrink-0" /> <span className="truncate">{job.location}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Wallet className="size-4 shrink-0" /> {formatSalary(job.salary_min, job.salary_max, job.currency)}
        </span>
        <span className="flex items-center gap-1.5">
          <BriefcaseBusiness className="size-4 shrink-0" /> {job.job_type}
        </span>
        <span className="flex items-center gap-1.5">
          <GraduationCap className="size-4 shrink-0" /> {job.experience_years ?? job.experience_level}
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:mt-5 sm:flex-row sm:items-center sm:justify-between">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3.5 shrink-0" /> {timeAgo(job.created_at)}
        </span>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <SaveJobButton jobId={job.id} showLabel />
          <Button asChild>
            <Link to="/jobs/$jobId" params={{ jobId: job.id }}>
              Apply Now
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}