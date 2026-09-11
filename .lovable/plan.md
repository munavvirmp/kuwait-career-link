# Kuwait Career Link production repair and audit

## Goal
Confirm the current live-site status, preserve all existing features, repair verified production risks, and validate the existing application end to end.

## Work
1. **Production diagnosis**
   - Correlate live HTTP responses with published server logs and the custom SSR error wrapper.
   - Confirm the prior production failure source and ensure startup no longer depends on missing client build variables.
2. **Application hardening**
   - Fix verified rendering, routing, authentication, query, and empty/error-state issues only.
   - Add a branded not-found page and eliminate invalid HTML that causes hydration errors.
   - Keep private pages out of search and preserve direct navigation behavior.
3. **Backend and security audit**
   - Verify database health, required tables/columns, access policies, private CV storage, role enforcement, public job visibility, and authentication configuration.
   - Preserve the schema and data; apply a migration only if an actual access-policy defect is found.
4. **SEO and trust cleanup**
   - Complete unique route metadata, canonical links, robots, sitemap, and structured data for eligible public content.
   - Remove unsupported claims and placeholder contact details without inventing replacements.
5. **Validation**
   - Run the automated project checks.
   - Test public routes, search, a real approved job detail, invalid job handling, authentication entry points, direct navigation, backend requests, and mobile layouts.
   - Publish the repaired existing project, then test the live URL and report exact outcomes.

## Technical details
- Keep TanStack Start routing and the existing Lovable Cloud integration.
- Keep public keys limited to browser-safe configuration; never expose privileged keys.
- Preserve row-level access controls, current tables, stored files, and all real records.
- Use the existing design system and components; no redesign or new dependencies.
