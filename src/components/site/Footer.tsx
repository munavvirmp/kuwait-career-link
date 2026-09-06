import { Link } from "@tanstack/react-router";
import { Briefcase, Mail, Phone } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Briefcase className="size-4" />
            </span>
            <span className="text-base font-bold">
              Kuwait<span className="text-primary">Jobs</span>
            </span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            A job portal connecting job seekers and employers across Kuwait. All listings currently
            shown are clearly labelled sample demo data.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Explore</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/jobs" className="hover:text-primary">
                Browse Jobs
              </Link>
            </li>
            <li>
              <Link to="/companies" className="hover:text-primary">
                Companies
              </Link>
            </li>
            <li>
              <Link to="/career-tips" className="hover:text-primary">
                Career Tips
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Company</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/about" className="hover:text-primary">
                About
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-primary">
                Contact
              </Link>
            </li>
            <li>
              <Link to="/privacy" className="hover:text-primary">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/terms" className="hover:text-primary">
                Terms
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Get in touch</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Mail className="size-4" /> support@kuwaitjobs.example
            </li>
            <li className="flex items-center gap-2">
              <Phone className="size-4" /> +965 0000 0000
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border px-4 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} KuwaitJobs. Demonstration project — sample listings only.
      </div>
    </footer>
  );
}
