
CREATE TYPE public.app_role AS ENUM ('admin','employer','job_seeker');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text,
  phone text,
  headline text,
  location text,
  cv_url text,
  cv_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(),'admin')) WITH CHECK (true);

CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NEW.email, NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE(NULLIF(NEW.raw_user_meta_data->>'role',''), 'job_seeker')::public.app_role)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  icon text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories public read" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "categories admin write" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  industry text,
  location text,
  website text,
  size text,
  contact_email text,
  is_demo boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.companies TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "companies public read" ON public.companies FOR SELECT TO anon, authenticated
  USING (is_active OR owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "companies owner insert" ON public.companies FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "companies owner update" ON public.companies FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (true);
CREATE POLICY "companies owner delete" ON public.companies FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER companies_touch BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  posted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  title text NOT NULL,
  location text NOT NULL,
  salary_min integer,
  salary_max integer,
  currency text NOT NULL DEFAULT 'KWD',
  job_type text NOT NULL DEFAULT 'Full-time',
  experience_level text NOT NULL DEFAULT 'Mid level',
  experience_years text,
  education text,
  description text NOT NULL DEFAULT '',
  responsibilities text[] NOT NULL DEFAULT '{}',
  requirements text[] NOT NULL DEFAULT '{}',
  benefits text[] NOT NULL DEFAULT '{}',
  deadline date,
  status text NOT NULL DEFAULT 'pending',
  is_featured boolean NOT NULL DEFAULT false,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.jobs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jobs public read approved" ON public.jobs FOR SELECT TO anon, authenticated USING (status = 'approved');
CREATE POLICY "jobs owner read" ON public.jobs FOR SELECT TO authenticated
  USING (posted_by = auth.uid() OR public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.companies c WHERE c.id = jobs.company_id AND c.owner_id = auth.uid()));
CREATE POLICY "jobs employer insert" ON public.jobs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid()));
CREATE POLICY "jobs employer update" ON public.jobs FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.companies c WHERE c.id = jobs.company_id AND c.owner_id = auth.uid()))
  WITH CHECK (true);
CREATE POLICY "jobs employer delete" ON public.jobs FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.companies c WHERE c.id = jobs.company_id AND c.owner_id = auth.uid()));
CREATE TRIGGER jobs_touch BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX jobs_status_idx ON public.jobs(status, created_at DESC);

CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  applicant_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  cv_url text,
  cover_letter text,
  status text NOT NULL DEFAULT 'submitted',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "applications read" ON public.applications FOR SELECT TO authenticated
  USING (applicant_id = auth.uid() OR public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.jobs j JOIN public.companies c ON c.id = j.company_id WHERE j.id = applications.job_id AND c.owner_id = auth.uid()));
CREATE POLICY "applications insert own" ON public.applications FOR INSERT TO authenticated WITH CHECK (applicant_id = auth.uid());
CREATE POLICY "applications update" ON public.applications FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.jobs j JOIN public.companies c ON c.id = j.company_id WHERE j.id = applications.job_id AND c.owner_id = auth.uid()))
  WITH CHECK (true);
CREATE POLICY "applications delete" ON public.applications FOR DELETE TO authenticated
  USING (applicant_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER applications_touch BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE UNIQUE INDEX applications_unique ON public.applications(job_id, applicant_id);

CREATE TABLE public.saved_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, job_id)
);
GRANT SELECT, INSERT, DELETE ON public.saved_jobs TO authenticated;
GRANT ALL ON public.saved_jobs TO service_role;
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saved own" ON public.saved_jobs FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "cv owner read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'cvs' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.applications a JOIN public.jobs j ON j.id = a.job_id JOIN public.companies c ON c.id = j.company_id
       WHERE c.owner_id = auth.uid() AND a.cv_url = storage.objects.name)));
CREATE POLICY "cv owner write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "cv owner update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "cv owner delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);

INSERT INTO public.categories (name, slug, icon) VALUES
 ('Office & Administration','office-administration','Briefcase'),
 ('Accounting & Finance','accounting-finance','Calculator'),
 ('Warehouse & Logistics','warehouse-logistics','Truck'),
 ('Oil & Gas','oil-gas','Fuel'),
 ('Hospitality','hospitality','UtensilsCrossed'),
 ('Sales','sales','TrendingUp'),
 ('IT & Technology','it-technology','Laptop'),
 ('Driver','driver','Car'),
 ('Engineering','engineering','HardHat'),
 ('Healthcare','healthcare','Stethoscope');

INSERT INTO public.companies (id, name, description, industry, location, website, size, contact_email, is_demo) VALUES
 ('11111111-1111-1111-1111-111111111101','Gulf Horizon Trading (Demo)','Sample demo company used to showcase the portal. Not a real employer.','Trading & Retail','Kuwait City','https://example.com','201-500','demo@example.com',true),
 ('11111111-1111-1111-1111-111111111102','Al Salmiya Logistics (Demo)','Sample demo logistics company for demonstration purposes only.','Logistics','Shuwaikh','https://example.com','51-200','demo@example.com',true),
 ('11111111-1111-1111-1111-111111111103','Burgan Energy Services (Demo)','Sample demo energy services provider. Demo data only.','Oil & Gas','Ahmadi','https://example.com','501-1000','demo@example.com',true),
 ('11111111-1111-1111-1111-111111111104','Bayan Health Group (Demo)','Sample demo healthcare group for demonstration only.','Healthcare','Hawally','https://example.com','201-500','demo@example.com',true),
 ('11111111-1111-1111-1111-111111111105','Kuwait Digital Labs (Demo)','Sample demo technology studio. Not a real employer.','Technology','Kuwait City','https://example.com','11-50','demo@example.com',true),
 ('11111111-1111-1111-1111-111111111106','Marina Hospitality (Demo)','Sample demo hospitality operator for demo listings.','Hospitality','Salmiya','https://example.com','201-500','demo@example.com',true);

INSERT INTO public.jobs (company_id, category_id, title, location, salary_min, salary_max, job_type, experience_level, experience_years, education, description, responsibilities, requirements, benefits, deadline, status, is_featured, is_demo, created_at)
SELECT c.id, cat.id, v.title, v.location, v.smin, v.smax, v.jtype, v.elevel, v.eyears, v.edu, v.descr,
       v.resp, v.req, v.ben, (now() + (v.days || ' days')::interval)::date, 'approved', v.feat, true, now() - (v.age || ' days')::interval
FROM (VALUES
 ('11111111-1111-1111-1111-111111111101','office-administration','Office Administrator','Kuwait City',400,550,'Full-time','Mid level','2-4 years','Bachelor Degree','Demo listing. Support daily office operations for a busy trading head office in Kuwait City.', ARRAY['Manage office correspondence and filing','Coordinate meetings and travel','Maintain office supplies'], ARRAY['2+ years admin experience in Kuwait','Fluent English, Arabic a plus','Strong MS Office skills'], ARRAY['Medical insurance','Annual ticket','Paid annual leave'], 30, true, 1),
 ('11111111-1111-1111-1111-111111111101','accounting-finance','Senior Accountant','Kuwait City',700,900,'Full-time','Senior level','5+ years','Bachelor Degree','Demo listing. Own monthly closing, reconciliations and reporting.', ARRAY['Prepare monthly financial statements','Handle VAT and audit files','Supervise junior accountants'], ARRAY['5+ years accounting experience','Transferable residency preferred','ERP experience'], ARRAY['Medical insurance','Performance bonus','Annual ticket'], 25, true, 2),
 ('11111111-1111-1111-1111-111111111102','warehouse-logistics','Warehouse Supervisor','Shuwaikh',450,600,'Full-time','Mid level','3-5 years','Diploma','Demo listing. Supervise inbound and outbound warehouse operations.', ARRAY['Supervise warehouse team','Manage stock accuracy','Ensure safety compliance'], ARRAY['3+ years warehouse supervision','WMS knowledge','Valid Kuwait driving licence a plus'], ARRAY['Overtime pay','Transportation','Medical insurance'], 20, false, 3),
 ('11111111-1111-1111-1111-111111111102','driver','Light Vehicle Driver','Farwaniya',250,320,'Full-time','Entry level','1-2 years','High School','Demo listing. Deliver goods across Kuwait governorates safely and on time.', ARRAY['Deliver customer orders','Maintain vehicle cleanliness','Complete delivery paperwork'], ARRAY['Valid Kuwait driving licence','Knowledge of Kuwait roads','Transferable visa'], ARRAY['Accommodation','Overtime','Medical insurance'], 15, false, 4),
 ('11111111-1111-1111-1111-111111111103','oil-gas','Mechanical Engineer - Oil & Gas','Ahmadi',900,1300,'Full-time','Senior level','6+ years','Bachelor Degree','Demo listing. Support maintenance and integrity of rotating equipment on site.', ARRAY['Plan preventive maintenance','Lead shutdown activities','Prepare technical reports'], ARRAY['Bachelor in Mechanical Engineering','Oil and gas field experience','Site approval preferred'], ARRAY['Housing allowance','Transport allowance','Family medical cover'], 40, true, 1),
 ('11111111-1111-1111-1111-111111111103','engineering','Site Safety Officer','Ahmadi',600,800,'Contract','Mid level','4-6 years','Bachelor Degree','Demo listing. Ensure HSE compliance across active project sites.', ARRAY['Conduct site inspections','Deliver toolbox talks','Investigate incidents'], ARRAY['NEBOSH IGC certified','4+ years site HSE experience','Strong reporting skills'], ARRAY['Camp accommodation','Transport','Medical insurance'], 18, false, 6),
 ('11111111-1111-1111-1111-111111111104','healthcare','Registered Nurse','Hawally',550,750,'Full-time','Mid level','3+ years','Bachelor Degree','Demo listing. Provide patient care in an outpatient clinic setting.', ARRAY['Assess and monitor patients','Assist physicians','Maintain patient records'], ARRAY['Valid Kuwait nursing licence or eligibility','BLS certification','3+ years clinical experience'], ARRAY['Medical insurance','Annual ticket','Shift allowance'], 28, true, 2),
 ('11111111-1111-1111-1111-111111111104','office-administration','Medical Receptionist','Salmiya',300,400,'Full-time','Entry level','1-3 years','Diploma','Demo listing. Welcome patients and manage clinic appointments.', ARRAY['Handle patient check-in','Manage appointment calendar','Answer phone enquiries'], ARRAY['Customer service experience','Bilingual Arabic and English','Computer literate'], ARRAY['Medical insurance','Paid leave'], 12, false, 8),
 ('11111111-1111-1111-1111-111111111105','it-technology','Full Stack Developer','Kuwait City',800,1100,'Full-time','Mid level','3-5 years','Bachelor Degree','Demo listing. Build and maintain web applications for local clients.', ARRAY['Develop React and Node applications','Write clean, tested code','Collaborate with designers'], ARRAY['3+ years web development','React and TypeScript','SQL databases'], ARRAY['Flexible hours','Remote days','Training budget'], 35, true, 1),
 ('11111111-1111-1111-1111-111111111105','it-technology','IT Support Specialist','Jahra',400,520,'Full-time','Entry level','1-3 years','Diploma','Demo listing. Provide first line IT support to internal users.', ARRAY['Resolve helpdesk tickets','Set up user hardware','Maintain network devices'], ARRAY['1+ year IT support experience','Windows and networking basics','Good communication'], ARRAY['Medical insurance','Training','Transport allowance'], 22, false, 5),
 ('11111111-1111-1111-1111-111111111106','hospitality','Restaurant Supervisor','Salmiya',400,520,'Full-time','Mid level','3-5 years','High School','Demo listing. Lead the front of house team during peak service.', ARRAY['Supervise service staff','Handle guest feedback','Manage shift scheduling'], ARRAY['3+ years restaurant supervision','Fluent English','Flexible with shifts'], ARRAY['Meals on duty','Service charge','Medical insurance'], 16, false, 7),
 ('11111111-1111-1111-1111-111111111106','sales','Sales Executive','Hawally',350,600,'Full-time','Mid level','2-4 years','Bachelor Degree','Demo listing. Grow B2B accounts across Kuwait with a target driven team.', ARRAY['Generate new leads','Present products to clients','Achieve monthly targets'], ARRAY['2+ years B2B sales in Kuwait','Valid driving licence','Strong negotiation skills'], ARRAY['Commission','Car allowance','Medical insurance'], 26, true, 3)
) AS v(cid, cslug, title, location, smin, smax, jtype, elevel, eyears, edu, descr, resp, req, ben, days, feat, age)
JOIN public.companies c ON c.id = v.cid::uuid
JOIN public.categories cat ON cat.slug = v.cslug;
