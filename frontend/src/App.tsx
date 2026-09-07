import { Fragment, useEffect, useState } from 'react';
import { Bell, CalendarDays, CalendarCheck, CalendarClock, ClipboardList, LayoutDashboard, Users, Wand2, Upload, Check, X, ChevronDown, ChevronUp, AlertTriangle, Clock, MapPin, TrendingUp, Settings, Plus, Search, Users2, ShieldCheck, Building2, Circle, LayoutTemplate, CheckCircle2, XCircle, Copy, RotateCcw, Mail, Lock, ArrowRight, ArrowLeft } from 'lucide-react';
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { StatusBadge } from './components/ui/StatusBadge';
import { Avatar } from './components/ui/Avatar';
import { DepartmentBadge } from './components/ui/DepartmentBadge';
import { StatCard } from './components/ui/StatCard';
import { RelativeTime } from './components/ui/RelativeTime';
import { ThemeToggle } from './components/ui/ThemeToggle';
import { useTheme, type Theme } from './hooks/useTheme';
import { useStaggerReveal } from './hooks/useStaggerReveal';
import logo from './assets/logo.png';
import loginHero from './assets/login-hero.webp';

const API_BASE = 'http://localhost:3000';

type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  accessToken: string;
  tenantId?: string;
};

type Department = {
  id: string;
  name: string;
  code: string;
  tenantId: string;
  maxStaff?: number | null;
};

type EmployeeTypeRecord = {
  id: string;
  name: string;
  tenantId: string;
};

type ShiftRequirementRecord = {
  id: string;
  employeeTypeId: string;
  employeeTypeName: string;
  requiredCount: number;
  assignedCount: number;
  pendingCount: number;
};

type ShiftTemplateRequirementRecord = {
  id: string;
  employeeTypeId: string;
  requiredCount: number;
  employeeType?: { id: string; name: string } | null;
};

type ShiftTemplateRecord = {
  id: string;
  tenantId: string;
  departmentId: string;
  shiftTypeId: string;
  active: boolean;
  department?: Department | null;
  shiftType?: ShiftTypeRecord | null;
  requirements: ShiftTemplateRequirementRecord[];
};

type ShiftTemplateGenerateSummary = {
  generated: number;
  skipped: number;
  fullyCovered: number;
  partiallyCovered: number;
  uncovered: number;
  shifts: { shiftId: string; departmentName: string; templateName: string; date: string; coverageStatus: ShiftCoverageStatus }[];
};

type GenerateNextUncoveredRequirementResult = {
  employeeTypeId: string;
  employeeTypeName: string;
  requiredCount: number;
  assignedEmployees: { employeeId: string; employeeName: string }[];
  pendingCount: number;
  pendingReasons: { employeeName: string; reasons: string[] }[];
};

type ShiftTemplateGenerateNextUncoveredSummary = {
  generated: number;
  fullyCovered: number;
  partiallyCovered: number;
  uncovered: number;
  shifts: {
    shiftId: string;
    departmentName: string;
    templateName: string;
    date: string;
    coverageStatus: ShiftCoverageStatus;
    requirements: GenerateNextUncoveredRequirementResult[];
  }[];
  skippedTemplates: { templateId: string; shiftTypeName: string; reason: string }[];
};

type EligibilityResult = {
  employeeId: string;
  employeeName: string;
  employeeTypeId: string | null;
  employeeTypeName: string | null;
  eligible: boolean;
  availabilityStatus: string;
  reasons: string[];
  metrics: {
    hoursThisWeek: number;
    hoursThisDay: number;
    nightShiftsInPeriod: number;
    totalAssignments: number;
    hoursSinceLastAssignment: number | null;
  };
};

type ShiftCoverageStatus = 'UNCOVERED' | 'PARTIALLY_COVERED' | 'COVERED';

type AutoAssignSummary = {
  shiftId: string;
  coverage: ShiftCoverageStatus;
  totalRequired: number;
  totalAssigned: number;
  totalPending: number;
  perType: { employeeTypeId: string; employeeTypeName: string; required: number; assigned: number; pending: number; newlyAssigned: number }[];
  assignedEmployeeIds: string[];
  ineligible: { employeeId: string; employeeName: string; employeeTypeName: string | null; reasons: string[] }[];
};

type SchedulingPolicyRecord = {
  maxHoursPerDay: number;
  maxHoursPerWeek: number;
  minRestHours: number;
  maxNightShiftsPerPeriod: number;
  nightShiftPeriodDays: number;
};

type SuggestedCandidate = {
  employeeId: string;
  employeeName: string;
  employeeTypeName: string | null;
  eligible: boolean;
  score: number;
  currentHours: number;
  totalAssignments: number;
  lastShiftEnd: string | null;
  exclusionReasons: string[];
};

type UserRecord = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  active: boolean;
  userStatus?: string;
  tenantId: string;
  employee?: {
    id: string;
    department?: Department | null;
    position?: string | null;
    employeeTypeId?: string | null;
    employeeType?: { id: string; name: string } | null;
  } | null;
};

type RequestRecord = {
  id: string;
  reason: string;
  status: string;
  requestedDate: string;
  employee?: {
    user?: { firstName: string; lastName: string; email: string };
    department?: Department | null;
  };
};

type NotificationRecord = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};

type ScheduleRecord = {
  id: string;
  tenantId: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  status: string;
  employee?: {
    user?: { firstName: string; lastName: string };
  };
};

type ShiftTypeRecord = {
  id: string;
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  nightShift?: boolean;
  color?: string;
};

type ShiftAssignmentRecord = {
  employeeId: string;
  employee?: { user?: { id: string; firstName: string; lastName: string } };
};

type ShiftRecord = {
  id: string;
  date: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  status: string;
  coverageStatus: ShiftCoverageStatus;
  shiftTypeId?: string | null;
  department?: Department | null;
  assignments: ShiftAssignmentRecord[];
};

const demoUser = {
  email: 'admin@turnosmart.com',
  password: 'admin123',
  name: 'Admin TurnoSmart',
};

async function apiFetch<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    const backendMessage = Array.isArray(data?.message) ? data.message.join(', ') : data?.message;
    const message = `${path} (${response.status}): ${backendMessage || 'Error de la petición'}`;
    throw new Error(message);
  }

  return data as T;
}

const LANDING_FEATURES = [
  {
    icon: CalendarCheck,
    title: 'Planificación automática',
    description: 'Genera turnos de mañana, tarde y noche con un clic, respetando el personal requerido por área.',
  },
  {
    icon: ShieldCheck,
    title: 'Reglas de descanso',
    description: 'Descanso mínimo, máximo de horas y de noches seguidas: el sistema las respeta en cada asignación.',
  },
  {
    icon: Clock,
    title: 'Cobertura en tiempo real',
    description: 'Vas a saber al instante qué turnos están cubiertos, parcialmente cubiertos o sin personal.',
  },
  {
    icon: Bell,
    title: 'Notificaciones automáticas',
    description: 'Cada empleado se entera al instante cuando se le asigna, modifica o cancela un turno.',
  },
];

function HomePage({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const { setRef, visible } = useStaggerReveal<HTMLDivElement>(LANDING_FEATURES.length);

  return (
    <main className="relative min-h-screen bg-white dark:bg-[var(--bg)] overflow-x-hidden">
      <div className="pointer-events-none fixed -top-36 -right-24 w-[420px] h-[420px] rounded-full bg-[#3157aa] opacity-[0.35] dark:opacity-[0.14] blur-[90px]" aria-hidden="true" />
      <div className="pointer-events-none fixed -bottom-32 -left-20 w-[340px] h-[340px] rounded-full bg-[#41bf8f] opacity-[0.22] dark:opacity-[0.1] blur-[90px]" aria-hidden="true" />

      <div className="relative z-10 max-w-[1120px] mx-auto px-6 sm:px-8 pt-7 pb-16">
        <header className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="w-[42px] h-[42px] rounded-[10px] bg-white dark:bg-[var(--surface)] border border-[#e1e4ee] dark:border-[var(--border)] flex items-center justify-center overflow-hidden shrink-0">
              <img src={logo} alt="TurnoSmart" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="font-['Fraunces',serif] font-semibold text-[17px] tracking-tight text-[#16223f] dark:text-[var(--ink)]">TurnoSmart</div>
              <div className="text-[11px] text-[#63698a] dark:text-[var(--ink-muted)] font-['JetBrains_Mono',monospace] tracking-wide">GESTIÓN OPERATIVA</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle theme={theme} onToggle={onToggleTheme} variant="surface" />
            <button
              onClick={() => (window.location.href = '/login')}
              className="bg-[#1f3b7a] hover:bg-[#18305f] dark:bg-[var(--accent)] dark:hover:bg-[var(--accent-hover)] text-white text-sm font-medium px-[22px] py-[11px] rounded-lg border-0 cursor-pointer transition-colors"
            >
              Iniciar sesión
            </button>
          </div>
        </header>

        <section className="landing-fade-in-up bg-white/85 dark:bg-[var(--surface-translucent)] backdrop-blur-xl border border-[#e1e4ee] dark:border-[var(--border)] rounded-3xl p-8 sm:p-[60px] grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-10 items-center shadow-[0_30px_80px_-30px_rgba(29,47,122,0.25)] dark:shadow-[0_30px_80px_-30px_rgba(0,0,0,0.55)]">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-['JetBrains_Mono',monospace] uppercase tracking-[0.12em] text-[#3157aa] dark:text-[var(--accent)] mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[#41bf8f]" aria-hidden="true" />
              Plataforma hospitalaria
            </p>
            <h1 className="font-['Fraunces',serif] font-semibold text-[34px] sm:text-[52px] leading-[1.05] tracking-tight text-[#16223f] dark:text-[var(--ink)] mb-5">
              La guardia de mañana,<br />armada <em className="italic font-normal text-[#3157aa] dark:text-[var(--accent)]">desde hoy</em>.
            </h1>
            <p className="text-[16px] text-[#63698a] dark:text-[var(--ink-muted)] leading-relaxed max-w-[440px] mb-7">
              TurnoSmart cubre mañana, tarde y noche sin que nadie tenga que armar la planilla a mano —
              respetando descanso mínimo, especialidad por área y máximo de horas de cada empleado.
            </p>
            <div className="mb-8">
              <button
                onClick={() => (window.location.href = '/login')}
                className="bg-[#1f3b7a] hover:bg-[#18305f] dark:bg-[var(--accent)] dark:hover:bg-[var(--accent-hover)] text-white font-medium text-[14.5px] px-6 py-[13px] rounded-[9px] border-0 cursor-pointer transition-colors"
              >
                Acceder ahora
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <div className="font-['Fraunces',serif] font-semibold text-[22px] text-[#16223f] dark:text-[var(--ink)] leading-none">24 / 7</div>
                <div className="text-[11.5px] text-[#63698a] dark:text-[var(--ink-muted)] font-['JetBrains_Mono',monospace] mt-1">COBERTURA ROTATIVA</div>
              </div>
              <span className="text-xs font-medium text-[#3157aa] dark:text-[var(--accent)] bg-[#eef2fb] dark:bg-[var(--accent-soft)] border border-[#dbe3f5] dark:border-[var(--accent-border)] px-3 py-1.5 rounded-full">
                Sin planillas manuales
              </span>
              <span className="text-xs font-medium text-[#1f8f6b] dark:text-[var(--success)] bg-[#eafaf3] dark:bg-[var(--success-soft)] border border-[#c9efe0] dark:border-[var(--success-border)] px-3 py-1.5 rounded-full">
                Reglas de descanso automáticas
              </span>
            </div>
          </div>

          <div className="relative flex flex-col items-center justify-center bg-gradient-to-b from-white to-[#f3f5ff] dark:from-[var(--surface)] dark:to-[var(--bg-subtle)] rounded-3xl p-8 shadow-[0_30px_70px_-14px_rgba(53,87,224,0.45),0_10px_26px_-8px_rgba(29,47,122,0.3)] dark:shadow-[0_30px_70px_-14px_rgba(59,130,246,0.2),0_10px_26px_-8px_rgba(0,0,0,0.5)]">
            <svg viewBox="0 0 260 260" className="w-[240px] h-[240px] sm:w-[300px] sm:h-[300px]" style={{ filter: 'drop-shadow(0 0 24px rgba(53,87,224,0.25))' }}>
              <circle fill="none" strokeWidth={22} className="stroke-[#bcd4f5] dark:stroke-[#33415c]" cx="130" cy="130" r="100" strokeDasharray="209 419" strokeDashoffset="0" transform="rotate(-90 130 130)" />
              <circle fill="none" strokeWidth={22} className="stroke-[#7fb8e8] dark:stroke-[#5b8fd9]" cx="130" cy="130" r="100" strokeDasharray="209 419" strokeDashoffset="-209" transform="rotate(-90 130 130)" />
              <circle fill="none" strokeWidth={22} className="stroke-[#41bf8f] dark:stroke-[#34d399]" cx="130" cy="130" r="100" strokeDasharray="209 419" strokeDashoffset="-418" transform="rotate(-90 130 130)" />
              <g className="landing-ring-needle">
                <line x1="130" y1="130" x2="130" y2="34" className="stroke-[#41bf8f] dark:stroke-[#34d399]" strokeWidth={3} strokeLinecap="round" />
                <circle cx="130" cy="130" r="4" className="fill-[#1f3b7a] dark:fill-[var(--ink)]" />
              </g>
              <text x="130" y="126" textAnchor="middle" className="font-['Fraunces',serif] font-semibold fill-[#16223f] dark:fill-[var(--ink)]" style={{ fontSize: 15 }}>Mañana · Tarde</text>
              <text x="130" y="142" textAnchor="middle" className="font-['JetBrains_Mono',monospace] fill-[#63698a] dark:fill-[var(--ink-muted)]" style={{ fontSize: 9 }}>Y NOCHE, CUBIERTO</text>
            </svg>

            <div className="flex items-center gap-4 mt-3.5">
              <span className="flex items-center gap-1.5 text-[11px] text-[#63698a] dark:text-[var(--ink-muted)] font-['JetBrains_Mono',monospace]"><span className="w-2 h-2 rounded-full bg-[#bcd4f5] dark:bg-[#33415c]" aria-hidden="true" />07–15</span>
              <span className="flex items-center gap-1.5 text-[11px] text-[#63698a] dark:text-[var(--ink-muted)] font-['JetBrains_Mono',monospace]"><span className="w-2 h-2 rounded-full bg-[#7fb8e8] dark:bg-[#5b8fd9]" aria-hidden="true" />15–23</span>
              <span className="flex items-center gap-1.5 text-[11px] text-[#63698a] dark:text-[var(--ink-muted)] font-['JetBrains_Mono',monospace]"><span className="w-2 h-2 rounded-full bg-[#41bf8f] dark:bg-[#34d399]" aria-hidden="true" />23–07</span>
            </div>

            <div className="landing-float-chip absolute -top-1.5 -left-8 bg-white dark:bg-[var(--surface)] border border-[#e1e4ee] dark:border-[var(--border)] rounded-full pl-1.5 pr-3 py-1.5 flex items-center gap-1.5 text-[11.5px] shadow-[0_12px_26px_-8px_rgba(29,47,122,0.28)]">
              <span className="w-[22px] h-[22px] rounded-full bg-[#1f3b7a] text-white flex items-center justify-center text-[9.5px] font-semibold shrink-0">LP</span>
              <span>
                <span className="font-semibold text-[#16223f] dark:text-[var(--ink)] block">Luis Peres</span>
                <span className="text-[#63698a] dark:text-[var(--ink-muted)] text-[10px] block -mt-0.5">Médico · Cardiología</span>
              </span>
            </div>
            <div className="landing-float-chip absolute bottom-2.5 -right-10 bg-white dark:bg-[var(--surface)] border border-[#e1e4ee] dark:border-[var(--border)] rounded-full pl-1.5 pr-3 py-1.5 flex items-center gap-1.5 text-[11.5px] shadow-[0_12px_26px_-8px_rgba(29,47,122,0.28)]" style={{ animationDelay: '1.6s' }}>
              <span className="w-[22px] h-[22px] rounded-full bg-[#1f3b7a] text-white flex items-center justify-center text-[9.5px] font-semibold shrink-0">DA</span>
              <span>
                <span className="font-semibold text-[#16223f] dark:text-[var(--ink)] block">Daniela Arias</span>
                <span className="text-[#63698a] dark:text-[var(--ink-muted)] text-[10px] block -mt-0.5">Enfermera · turno noche</span>
              </span>
            </div>
            <div className="landing-float-chip absolute -bottom-5 left-7 bg-white dark:bg-[var(--surface)] border border-[#e1e4ee] dark:border-[var(--border)] rounded-full pl-1.5 pr-3 py-1.5 flex items-center gap-1.5 text-[11.5px] shadow-[0_12px_26px_-8px_rgba(29,47,122,0.28)]" style={{ animationDelay: '3.1s' }}>
              <span className="w-[22px] h-[22px] rounded-full bg-[#41bf8f] text-white flex items-center justify-center text-[9.5px] font-semibold shrink-0">✓</span>
              <span>
                <span className="font-semibold text-[#16223f] dark:text-[var(--ink)] block">Turno cubierto</span>
                <span className="text-[#63698a] dark:text-[var(--ink-muted)] text-[10px] block -mt-0.5">asignado automáticamente</span>
              </span>
            </div>
          </div>
        </section>

        <p className="text-center text-[#63698a] dark:text-[var(--ink-muted)] text-sm mt-10 mb-12">
          Pensado para instituciones que no pueden permitirse un turno sin cubrir.
        </p>

        <section className="text-center px-2 pb-10">
          <p className="text-[11px] font-['JetBrains_Mono',monospace] uppercase tracking-[0.12em] text-[#3157aa] dark:text-[var(--accent)] mb-2.5">
            Diseñado para equipos que nunca descansan
          </p>
          <h2 className="font-['Fraunces',serif] font-semibold text-[26px] sm:text-[30px] leading-tight text-[#16223f] dark:text-[var(--ink)] max-w-[620px] mx-auto mb-10">
            Todo lo que necesitas para gestionar turnos sin planillas a mano
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-left">
            {LANDING_FEATURES.map((feature, index) => (
              <div
                key={feature.title}
                ref={setRef(index)}
                className={`bg-white dark:bg-[var(--surface)] border border-[#e1e4ee] dark:border-[var(--border)] rounded-2xl p-6 transition-all duration-500 ease-out ${visible[index] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                style={{ transitionDelay: visible[index] ? `${index * 90}ms` : '0ms' }}
              >
                <span className="w-[42px] h-[42px] rounded-[11px] bg-gradient-to-br from-[#e9eefc] to-[#dcf3e9] dark:from-[var(--accent-soft)] dark:to-[var(--success-soft)] text-[#1f3b7a] dark:text-[var(--accent)] flex items-center justify-center mb-4">
                  <feature.icon size={20} />
                </span>
                <h3 className="font-['Fraunces',serif] font-semibold text-[16.5px] text-[#16223f] dark:text-[var(--ink)] mb-1.5">{feature.title}</h3>
                <p className="text-[13.5px] text-[#63698a] dark:text-[var(--ink-muted)] leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function LoginPage({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState(demoUser.email);
  const [password, setPassword] = useState(demoUser.password);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || 'Credenciales inválidas');
      }

      const authUser: AuthUser = {
        id: data.user.id,
        email: data.user.email,
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        role: data.user.role,
        tenantId: data.user.tenantId,
        accessToken: data.accessToken,
      };

      onLogin(authUser);
      navigate('/app/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#ffffff] md:bg-[#0e1c3f]">
      <div
        className="login-photo-overlay hidden md:block absolute inset-0 bg-cover"
        style={{ backgroundImage: `url(${loginHero})`, backgroundPosition: 'center 28%' }}
        aria-hidden="true"
      />
      <div className="hidden md:block pointer-events-none absolute z-[1] w-[340px] h-[340px] rounded-full bg-[#41bf8f] opacity-[0.25] blur-[100px] -top-[90px] right-[4%]" aria-hidden="true" />
      <div className="hidden md:block pointer-events-none absolute z-[1] w-[220px] h-[220px] rounded-full bg-[#3157aa] opacity-[0.35] blur-[100px] -bottom-[60px] right-[30%]" aria-hidden="true" />
      <div className="hidden md:block absolute inset-y-0 right-0 z-[1] w-[45%] bg-[linear-gradient(165deg,#101f47_0%,#0e1c3f_100%)] [clip-path:polygon(41%_0,100%_0,100%_100%,11%_100%)]" aria-hidden="true" />
      <div className="hidden md:block absolute inset-y-0 left-[41%] z-[1] w-[2px] bg-[linear-gradient(180deg,rgba(65,191,143,0.7),rgba(65,191,143,0))]" aria-hidden="true" />

      <div className="hidden md:flex absolute inset-0 z-[2] flex-col justify-between px-[60px] py-[52px] text-white">
        <div className="flex items-center gap-3">
          <div className="w-[42px] h-[42px] rounded-[11px] bg-[#f2f3f8] flex items-center justify-center overflow-hidden shadow-[0_8px_20px_-6px_rgba(0,0,0,0.4)]">
            <img src={logo} alt="TurnoSmart" className="w-full h-full object-contain p-[3px]" />
          </div>
          <div>
            <div className="font-['Fraunces',serif] font-semibold text-[16.5px]">TurnoSmart</div>
            <div className="text-[10.5px] text-white/60 font-['JetBrains_Mono',monospace] tracking-wide">GESTIÓN OPERATIVA</div>
          </div>
        </div>

        <div>
          <p className="flex items-center gap-[7px] font-['JetBrains_Mono',monospace] text-[10.5px] uppercase tracking-[0.12em] text-[#a8e8cc] mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#41bf8f] shadow-[0_0_10px_#41bf8f]" aria-hidden="true" />
            Plataforma hospitalaria
          </p>
          <p className="font-['Fraunces',serif] font-semibold text-[34px] leading-[1.22] max-w-[380px] tracking-tight">
            Guardias cubiertas,<br />armadas <em className="italic font-normal text-[#90e3bf]">desde hoy</em>.
          </p>
          <p className="text-[13.5px] text-white/70 mt-3.5 max-w-[320px] leading-relaxed">
            Reglas de descanso, especialidad por área y horas máximas, siempre respetadas — sin planillas a mano.
          </p>
          <div className="flex gap-2.5 mt-6">
            <span className="flex items-center gap-1.5 text-[11px] text-white/85 border border-white/[0.18] bg-white/[0.06] px-3 py-1.5 rounded-full">
              <Clock size={12} className="text-[#90e3bf]" /> Cobertura 24/7
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-white/85 border border-white/[0.18] bg-white/[0.06] px-3 py-1.5 rounded-full">
              <CheckCircle2 size={12} className="text-[#90e3bf]" /> Reglas automáticas
            </span>
          </div>
        </div>
      </div>

      <div className="absolute inset-0 z-[3] flex items-center justify-center md:justify-end p-6 md:p-0 md:pr-[7.5%]">
        <div className="login-card relative w-full max-w-[392px] bg-[#f6f7fb] rounded-[22px] px-10 pt-11 pb-9 shadow-[0_40px_90px_-28px_rgba(4,10,30,0.4),0_2px_0_rgba(255,255,255,0.4)_inset]">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#6b7191] hover:text-[#3157aa] bg-transparent border-0 cursor-pointer p-0 mb-5 transition-colors"
          >
            <ArrowLeft size={14} />
            Volver al inicio
          </button>

          <div className="flex items-center justify-between mb-[30px]">
            <div className="w-[34px] h-[34px] rounded-[9px] bg-[linear-gradient(135deg,#f3f5fc,#e9f7f1)] border border-[#e5e8f0] flex items-center justify-center overflow-hidden">
              <img src={logo} alt="TurnoSmart" className="w-full h-full object-contain p-[3px]" />
            </div>
            <span className="font-['JetBrains_Mono',monospace] text-[10px] tracking-[0.1em] text-[#6b7191]">TURNOSMART</span>
          </div>

          <h1 className="font-['Fraunces',serif] font-semibold text-[26px] text-[#16223f] mb-1.5 tracking-tight">¡Bienvenido de nuevo!</h1>
          <p className="text-[13.5px] text-[#6b7191] mb-7">Inicia sesión para continuar.</p>

          <form onSubmit={handleSubmit}>
            <label className="block mb-[17px]">
              <span className="block text-[12.5px] font-semibold text-[#16223f] mb-[7px]">Email</span>
              <div className="relative">
                <Mail size={15} className="absolute left-[13px] top-1/2 -translate-y-1/2 text-[#9aa0bf] pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@turnosmart.com"
                  className="w-full pl-[38px] pr-3.5 py-3 border-[1.5px] border-[#e5e8f0] rounded-[11px] text-sm text-[#16223f] bg-[#fbfbfd] outline-none transition-colors focus:border-[#3157aa] focus:shadow-[0_0_0_4px_rgba(49,87,170,0.1)] focus:bg-[#f8f9fc]"
                />
              </div>
            </label>

            <label className="block mb-[17px]">
              <span className="block text-[12.5px] font-semibold text-[#16223f] mb-[7px]">Contraseña</span>
              <div className="relative">
                <Lock size={15} className="absolute left-[13px] top-1/2 -translate-y-1/2 text-[#9aa0bf] pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="admin123"
                  className="w-full pl-[38px] pr-3.5 py-3 border-[1.5px] border-[#e5e8f0] rounded-[11px] text-sm text-[#16223f] bg-[#fbfbfd] outline-none transition-colors focus:border-[#3157aa] focus:shadow-[0_0_0_4px_rgba(49,87,170,0.1)] focus:bg-[#f8f9fc]"
                />
              </div>
            </label>

            <label className="flex items-center gap-[7px] text-[12.5px] text-[#6b7191] my-0.5 mb-6 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-3.5 h-3.5 accent-[#3157aa]" />
              Recordarme en este dispositivo
            </label>

            {error ? <p className="text-[12.5px] text-red-600 mb-4">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[linear-gradient(135deg,#3157aa_0%,#1f3b7a_100%)] disabled:opacity-60 text-white border-0 py-3.5 rounded-[11px] text-[14.5px] font-semibold cursor-pointer shadow-[0_14px_28px_-10px_rgba(31,59,122,0.5)] flex items-center justify-center gap-2 transition-transform active:scale-[0.99]"
            >
              {loading ? 'Ingresando...' : 'Entrar'}
              <ArrowRight size={15} />
            </button>
          </form>

          <div className="flex items-center gap-2.5 my-[26px]">
            <span className="flex-1 h-px bg-[#e5e8f0]" />
            <span className="text-[11px] text-[#a4a9c2] font-['JetBrains_Mono',monospace] tracking-wide whitespace-nowrap">TURNOSMART © 2026</span>
            <span className="flex-1 h-px bg-[#e5e8f0]" />
          </div>

          <p className="text-center text-[12.5px] text-[#6b7191]">
            ¿No tienes cuenta? Contacta a tu administrador
          </p>
        </div>
      </div>
    </main>
  );
}

function EmployeeTypeCombobox({ roles, selectedId, onChange, onCreate }: {
  roles: EmployeeTypeRecord[];
  selectedId: string;
  onChange: (role: EmployeeTypeRecord | null) => void;
  onCreate: (name: string) => Promise<EmployeeTypeRecord>;
}) {
  const selectedRole = roles.find((role) => role.id === selectedId) || null;
  const [query, setQuery] = useState(selectedRole?.name || '');
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setQuery(selectedRole?.name || '');
  }, [selectedId, selectedRole?.name]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredRoles = normalizedQuery
    ? roles.filter((role) => role.name.toLowerCase().includes(normalizedQuery))
    : roles;
  const exactMatch = roles.find((role) => role.name.trim().toLowerCase() === normalizedQuery);
  const showCreateOption = query.trim().length > 0 && !exactMatch;

  const handleSelect = (role: EmployeeTypeRecord) => {
    onChange(role);
    setQuery(role.name);
    setOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setQuery('');
    setOpen(false);
  };

  const handleCreate = async () => {
    const name = query.trim();
    if (!name || creating) return;
    try {
      setCreating(true);
      const created = await onCreate(name);
      onChange(created);
      setQuery(created.name);
      setOpen(false);
    } catch {
      // el estado de error ya se muestra vía el toast de statusMsg
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="combobox">
      <input
        value={query}
        placeholder="Escribe o selecciona un puesto"
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          if (exactMatch) {
            handleSelect(exactMatch);
          } else if (showCreateOption) {
            handleCreate();
          }
        }}
      />
      {open ? (
        <ul className="combobox-list">
          <li className="combobox-option" onMouseDown={handleClear}>Sin puesto asignado</li>
          {filteredRoles.map((role) => (
            <li key={role.id} className="combobox-option" onMouseDown={() => handleSelect(role)}>{role.name}</li>
          ))}
          {showCreateOption ? (
            <li className="combobox-option combobox-create" onMouseDown={handleCreate}>
              {creating ? 'Creando…' : `+ Crear nuevo puesto: "${query.trim()}"`}
            </li>
          ) : null}
          {!filteredRoles.length && !showCreateOption ? (
            <li className="combobox-empty">Escribe para buscar o crear un puesto</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

function AppShell({ user, onLogout, theme, onToggleTheme }: { user: AuthUser; onLogout: () => void; theme: Theme; onToggleTheme: () => void }) {
  const location = useLocation();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [employeeTypes, setEmployeeTypes] = useState<EmployeeTypeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const statusIsError = /no se|obligatorio|error|escribe|falta|inválid/i.test(statusMsg);
  const [departmentForm, setDepartmentForm] = useState({ name: '', tenantId: user.tenantId || '' });
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'EMPLOYEE',
    tenantId: user.tenantId || '',
    departmentId: '',
    employeeTypeId: '',
    phone: '',
  });
  const [requestForm, setRequestForm] = useState({
    reason: '',
    requestedDate: new Date().toISOString().slice(0, 10),
    tenantId: user.tenantId || '',
  });

  useEffect(() => {
    if (!statusMsg) return undefined;
    const timeout = window.setTimeout(() => setStatusMsg(''), 5000);
    return () => window.clearTimeout(timeout);
  }, [statusMsg]);

  const loadEverything = async () => {
    try {
      setLoading(true);
      const isManager = user.role === 'ADMIN';
      const tenantId = user.tenantId || userForm.tenantId || departmentForm.tenantId;
      const requestQuery = isManager
        ? (tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '')
        : `?userId=${encodeURIComponent(user.id)}`;
      const [departmentsData, usersData, requestsData, shiftsData] = await Promise.all([
        apiFetch<Department[]>(tenantId ? `/departments?tenantId=${encodeURIComponent(tenantId)}` : '/departments', {}, user.accessToken),
        apiFetch<UserRecord[]>('/users', {}, user.accessToken),
        apiFetch<RequestRecord[]>(`/requests${requestQuery}`, {}, user.accessToken),
        apiFetch<ShiftRecord[]>('/shifts', {}, user.accessToken),
      ]);

      setDepartments(departmentsData || []);
      setUsers(usersData || []);
      setRequests(requestsData || []);
      setShifts(shiftsData || []);

      if (tenantId) {
        try {
          const employeeTypesData = await apiFetch<EmployeeTypeRecord[]>(`/employee-types?tenantId=${encodeURIComponent(tenantId)}`, {}, user.accessToken);
          setEmployeeTypes(employeeTypesData || []);
        } catch {
          // no bloquea la carga principal si el catálogo de tipos falla
        }
      }

      if (user.id) {
        const notificationsData = await apiFetch<NotificationRecord[]>(`/users/${user.id}/notifications`, {}, user.accessToken);
        setNotifications(notificationsData || []);
      }

      setDepartmentForm((prev) => ({ ...prev, tenantId: prev.tenantId || user.tenantId || '' }));
      setUserForm((prev) => ({ ...prev, tenantId: prev.tenantId || user.tenantId || '' }));
      setRequestForm((prev) => ({ ...prev, tenantId: prev.tenantId || user.tenantId || '' }));
    } catch (error) {
      setStatusMsg(error instanceof Error ? error.message : 'No se pudieron cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEverything();
  }, [user.id, user.accessToken]);

  const handleCreateDepartment = async () => {
    try {
      if (!departmentForm.name.trim()) {
        setStatusMsg('Escribe el nombre del departamento antes de guardar.');
        return;
      }
      const tenantId = user.tenantId || departmentForm.tenantId || userForm.tenantId;
      const createdDepartment = await apiFetch<Department>('/departments', {
        method: 'POST',
        body: JSON.stringify({
          name: departmentForm.name,
          tenantId,
        }),
      }, user.accessToken);
      setStatusMsg('Departamento creado correctamente');
      setDepartments((current) => [...current.filter((department) => department.id !== createdDepartment.id), createdDepartment].sort((first, second) => first.name.localeCompare(second.name)));
      setDepartmentForm({ name: '', tenantId: user.tenantId || '' });
      await loadEverything();
    } catch (error) {
      setStatusMsg(error instanceof Error ? error.message : 'No se pudo crear el departamento');
    }
  };

  const handleCreateUser = async () => {
    try {
      await apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify({
          email: userForm.email,
          password: userForm.password,
          firstName: userForm.firstName,
          lastName: userForm.lastName,
          role: userForm.role,
          tenantId: userForm.tenantId || user.tenantId,
          departmentId: userForm.departmentId,
          employeeTypeId: userForm.employeeTypeId || undefined,
          phone: userForm.phone,
        }),
      }, user.accessToken);
      setStatusMsg('Usuario creado correctamente');
      setUserForm({ email: '', password: '', firstName: '', lastName: '', role: 'EMPLOYEE', tenantId: user.tenantId || '', departmentId: '', employeeTypeId: '', phone: '' });
      await loadEverything();
    } catch (error) {
      setStatusMsg(error instanceof Error ? error.message : 'No se pudo crear el usuario');
    }
  };

  const handleCreateEmployeeType = async (name: string) => {
    try {
      const tenantId = user.tenantId || userForm.tenantId;
      const created = await apiFetch<EmployeeTypeRecord>('/employee-types', {
        method: 'POST',
        body: JSON.stringify({ tenantId, name }),
      }, user.accessToken);
      setEmployeeTypes((current) => [...current.filter((role) => role.id !== created.id), created].sort((first, second) => first.name.localeCompare(second.name)));
      setStatusMsg('Puesto creado y agregado');
      return created;
    } catch (error) {
      setStatusMsg(error instanceof Error ? error.message : 'No se pudo crear el puesto');
      throw error;
    }
  };

  const handleCreateRequest = async () => {
    try {
      await apiFetch('/requests', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: requestForm.tenantId || user.tenantId,
          userId: user.id,
          requestedDate: requestForm.requestedDate,
          reason: requestForm.reason,
        }),
      }, user.accessToken);
      setStatusMsg('Solicitud creada y guardada en la base de datos');
      setRequestForm({ reason: '', requestedDate: new Date().toISOString().slice(0, 10), tenantId: user.tenantId || '' });
      await loadEverything();
    } catch (error) {
      setStatusMsg(error instanceof Error ? error.message : 'No se pudo crear la solicitud');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await apiFetch(`/requests/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'APPROVED' }),
      }, user.accessToken);
      setStatusMsg('Solicitud aprobada');
      await loadEverything();
      window.alert('La solicitud fue aprobada correctamente.');
    } catch (error) {
      setStatusMsg(error instanceof Error ? error.message : 'No se pudo aprobar la solicitud');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await apiFetch(`/requests/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'REJECTED' }),
      }, user.accessToken);
      setStatusMsg('Solicitud rechazada');
      await loadEverything();
      window.alert('La solicitud fue rechazada.');
    } catch (error) {
      setStatusMsg(error instanceof Error ? error.message : 'No se pudo rechazar la solicitud');
    }
  };

  const handleCreateShift = async (data: { employeeId: string; departmentId: string; startDate: string; endDate: string; startTime: string; endTime: string }) => {
    try {
      const selectedEmployee = users.find((person) => person.employee?.id === data.employeeId);
      const tenantId = user.tenantId || selectedEmployee?.tenantId;
      if (!tenantId) {
        setStatusMsg('No se encontró la organización del empleado. Cierra sesión e inicia sesión nuevamente.');
        return;
      }
      await apiFetch('/shifts', {
        method: 'POST',
        body: JSON.stringify({ ...data, tenantId, status: 'PUBLISHED' }),
      }, user.accessToken);
      setStatusMsg('Turno creado correctamente');
      await loadEverything();
    } catch (error) {
      setStatusMsg(error instanceof Error ? error.message : 'No se pudo crear el turno');
    }
  };

  const handleUpdateShift = async (id: string, data: { departmentId: string; startDate: string; endDate: string; startTime: string; endTime: string; status: string }) => {
    try {
      await apiFetch(`/shifts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }, user.accessToken);
      setStatusMsg('Turno actualizado y empleados notificados');
      await loadEverything();
    } catch (error) {
      setStatusMsg(error instanceof Error ? error.message : 'No se pudo actualizar el turno');
    }
  };

  const handleAssignShift = async (shiftId: string, employeeId: string) => {
    try {
      await apiFetch(`/shifts/${shiftId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ employeeId, assignedBy: user.id }),
      }, user.accessToken);
      setStatusMsg('Turno asignado; el empleado recibió una notificación');
      await loadEverything();
    } catch (error) {
      setStatusMsg(error instanceof Error ? error.message : 'No se pudo asignar el turno');
    }
  };

  const handleCancelShift = async (shiftId: string) => {
    try {
      await apiFetch(`/shifts/${shiftId}/cancel`, { method: 'PATCH' }, user.accessToken);
      setStatusMsg('Turno cancelado; los empleados asignados recibieron una notificación');
      await loadEverything();
    } catch (error) {
      setStatusMsg(error instanceof Error ? error.message : 'No se pudo cancelar el turno');
    }
  };

  const handleUnassignEmployee = async (shiftId: string, employeeId: string) => {
    try {
      await apiFetch(`/shifts/${shiftId}/unassign/${employeeId}`, { method: 'PATCH' }, user.accessToken);
      setStatusMsg('Empleado desasignado del turno');
      await loadEverything();
    } catch (error) {
      setStatusMsg(error instanceof Error ? error.message : 'No se pudo desasignar al empleado');
    }
  };

  const handleToggleUser = async (id: string, active: boolean) => {
    try {
      await apiFetch(`/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active }),
      }, user.accessToken);
      setStatusMsg(active ? 'Cuenta activada correctamente' : 'Cuenta suspendida correctamente');
      await loadEverything();
    } catch (error) {
      setStatusMsg(error instanceof Error ? error.message : 'No se pudo actualizar la cuenta');
    }
  };

  const handleMarkNotificationRead = async (notificationId: string) => {
    try {
      await apiFetch(`/users/${user.id}/notifications/${notificationId}/read`, { method: 'PATCH' }, user.accessToken);
      setNotifications((current) => current.map((notification) => notification.id === notificationId ? { ...notification, read: true } : notification));
    } catch (error) {
      setStatusMsg(error instanceof Error ? error.message : 'No se pudo marcar la notificación');
    }
  };

  const pendingRequestsCount = requests.filter((request) => request.status === 'PENDING').length;
  const unreadNotificationsCount = notifications.filter((notification) => !notification.read).length;

  const navItems = [
    { label: 'Dashboard', to: '/app/dashboard', icon: LayoutDashboard },
    { label: 'Empleados', to: '/app/employees', icon: Users },
    { label: 'Turnos', to: '/app/shifts', icon: CalendarClock },
    ...(user.role === 'ADMIN' ? [{ label: 'Asistente de asignación', to: '/app/auto-assign', icon: Wand2 }] : []),
    ...(user.role === 'ADMIN' ? [{ label: 'Generación automática de turnos', to: '/app/shift-templates', icon: LayoutTemplate }] : []),
    { label: 'Solicitudes', to: '/app/requests', icon: ClipboardList, count: pendingRequestsCount },
    { label: 'Calendario', to: '/app/schedule', icon: CalendarDays },
    { label: 'Notificaciones', to: '/app/notifications', icon: Bell, count: unreadNotificationsCount },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-identity">
            <img src="/logo.png" alt="TurnoSmart" className="h-10 w-auto object-contain" />
            <div>
              <p className="eyebrow">TurnoSmart</p>
              <strong>{user.role}</strong>
            </div>
          </div>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} variant="sidebar" />
        </div>

        <nav className="nav-list">
          {navItems.map((item) => (
            (() => {
              const Icon = item.icon;
              return <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
                <span className="nav-label"><Icon size={18} strokeWidth={2} aria-hidden="true" />{item.label}</span>
                {'count' in item && item.count ? <span className="nav-count">{item.count}</span> : null}
              </NavLink>;
            })()
          ))}
        </nav>

        <div className="user-box">
          <p>{user.firstName} {user.lastName}</p>
          <button className="secondary-btn small" onClick={onLogout}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="content-shell">
        {statusMsg ? (
          <div className={`status-alert ${statusIsError ? 'status-alert-error' : 'status-alert-success'}`} role="status">
            <span>{statusMsg}</span>
            <button type="button" className="status-alert-close" aria-label="Cerrar alerta" onClick={() => setStatusMsg('')}>×</button>
          </div>
        ) : null}
        <Routes>
          <Route path="dashboard" element={<DashboardPage users={users} requests={requests} departments={departments} user={user} />} />
          <Route path="employees" element={<EmployeesPage users={users} departments={departments} employeeTypes={employeeTypes} currentUserId={user.id} canManageUsers={user.role === 'ADMIN'} onToggleUser={handleToggleUser} accessToken={user.accessToken} tenantId={user.tenantId} onRefresh={loadEverything} onCreateEmployeeType={handleCreateEmployeeType} />} />
          <Route path="shifts" element={<ShiftsPage shifts={shifts} departments={departments} users={users} user={user} onCreate={handleCreateShift} onUpdate={handleUpdateShift} onAssign={handleAssignShift} onCancel={handleCancelShift} onUnassign={handleUnassignEmployee} />} />
          {user.role === 'ADMIN' ? (
            <Route path="auto-assign" element={<AutoAssignPage shifts={shifts} departments={departments} employeeTypes={employeeTypes} user={user} onRefresh={loadEverything} onAssignEmployee={handleAssignShift} />} />
          ) : null}
          {user.role === 'ADMIN' ? (
            <Route path="shift-templates" element={<ShiftTemplatesPage departments={departments} employeeTypes={employeeTypes} user={user} />} />
          ) : null}
          <Route path="requests" element={<RequestsPage
            requests={requests}
            user={user}
            onApprove={handleApprove}
            onReject={handleReject}
            onCreateRequest={handleCreateRequest}
            requestForm={requestForm}
            setRequestForm={setRequestForm}
            notifications={notifications}
          />} />
          <Route path="schedule" element={<SchedulePage shifts={shifts} user={user} />} />
          <Route path="notifications" element={<NotificationsPage notifications={notifications} onRead={handleMarkNotificationRead} />} />
          <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
        </Routes>

        {user.role === 'ADMIN' && location.pathname === '/app/employees' ? (
          <div className="panel" style={{ marginTop: 20 }}>
            <h3>Administración</h3>
            <div className="content-grid">
              <div>
                <h4>Crear departamento</h4>
                <div className="auth-form">
                  <label><span>Nombre</span><input value={departmentForm.name} onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })} /></label>
                  <p className="generated-code-hint">Abreviación automática: <strong>{departmentForm.name.trim() ? (departmentForm.name.trim().split(/\s+/).length > 1 ? departmentForm.name.trim().split(/\s+/).map((word) => word[0]).join('').slice(0, 4) : departmentForm.name.trim().slice(0, 4)).toUpperCase() : 'Se generará al guardar'}</strong></p>
                  <button className="primary-btn small" onClick={handleCreateDepartment}>Guardar departamento</button>
                </div>
              </div>

              <div>
                <h4>Crear usuario</h4>
                <div className="auth-form">
                  <label><span>Nombre</span><input value={userForm.firstName} onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })} /></label>
                  <label><span>Apellidos</span><input value={userForm.lastName} onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })} /></label>
                  <label><span>Email</span><input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} /></label>
                  <label><span>Contraseña</span><input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} /></label>
                  <label className="select-field"><span>Rol del usuario</span>
                    <select required value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
                      <option value="" disabled>Selecciona un rol</option>
                      <option value="EMPLOYEE">Empleado · consulta sus turnos</option>
                      <option value="ADMIN">Administrador · acceso completo</option>
                    </select>
                    <small>Define qué puede consultar y gestionar esta persona.</small>
                  </label>
                  <label className="select-field"><span>Puesto / Rol profesional</span>
                    <EmployeeTypeCombobox
                      roles={employeeTypes}
                      selectedId={userForm.employeeTypeId}
                      onChange={(role) => setUserForm({ ...userForm, employeeTypeId: role?.id || '' })}
                      onCreate={handleCreateEmployeeType}
                    />
                    <small>Escribe para buscar; si no existe, puedes crearlo al instante.</small>
                  </label>
                  <label className="select-field"><span>Departamento</span>
                    <select value={userForm.departmentId} onChange={(e) => setUserForm({ ...userForm, departmentId: e.target.value })}>
                      <option value="">Sin departamento asignado</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>{dept.name} · {dept.code}</option>
                      ))}
                    </select>
                    <small>Podrás cambiarlo después desde la gestión de empleados.</small>
                  </label>
                  <button className="primary-btn small" onClick={handleCreateUser}>Guardar usuario</button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

function DashboardPage({ users, requests, departments, user }: { users: UserRecord[]; requests: RequestRecord[]; departments: Department[]; user: AuthUser; }) {
  const navigate = useNavigate();
  return (
    <div className="max-w-7xl mx-auto p-6 pb-12">
      <p className="text-sm font-medium text-indigo-600 mb-2 tracking-wide uppercase">Resumen</p>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 m-0">Dashboard general</h1>
        <span className="flex items-center gap-1.5 text-xs text-gray-500 bg-white border border-gray-200 px-3 py-1.5 rounded-full shadow-sm">
          <Circle size={7} className="fill-green-500 text-green-500 animate-pulse" />
          Datos en vivo
        </span>
      </div>

      <div className="flex gap-6 mb-8">
        <StatCard icon={Users} label="Empleados" value={users.length} trend="Live" tint="bg-indigo-50 text-indigo-600" />
        <StatCard icon={Building2} label="Departamentos" value={departments.length} trend="Live" tint="bg-blue-50 text-blue-600" />
        <StatCard icon={ClipboardList} label="Solicitudes" value={requests.length} trend="Live" tint="bg-amber-50 text-amber-600" />
      </div>

      {user.role === 'ADMIN' ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8 flex items-center gap-6 shadow-sm">
          <span className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Wand2 size={24} />
          </span>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 m-0">Turnos automatizados</p>
            <p className="text-xs text-gray-500 mt-1 m-0">
              Define el personal requerido por turno y deja que el motor de asignación automática elija a los empleados elegibles según reglas y prioridad.
            </p>
          </div>
          <button onClick={() => navigate('/app/auto-assign')} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg whitespace-nowrap transition cursor-pointer">
            Ir al asistente de asignación
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <p className="text-base font-semibold text-gray-900 px-6 pt-5 pb-4 m-0">Usuarios registrados</p>
          <div className="divide-y divide-gray-100 flex-1">
            {users.slice(0, 5).map((person) => (
              <div key={person.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                <Avatar firstName={person.firstName} lastName={person.lastName} />
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <p className="text-sm text-gray-900 truncate m-0 font-medium">{person.firstName} {person.lastName}</p>
                  <span className="text-[10px] font-medium text-gray-400 tracking-wide m-0">{person.role}</span>
                </div>
                <DepartmentBadge name={person.employee?.department?.name} />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <p className="text-base font-semibold text-gray-900 px-6 pt-5 pb-4 m-0">Solicitudes recientes</p>
          <div className="divide-y divide-gray-100 flex-1">
            {requests.slice(0, 5).map((request) => (
              <div key={request.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="text-sm text-gray-800 leading-snug m-0">{request.reason}</p>
                  <StatusBadge status={request.status} />
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="font-medium text-gray-600">{request.employee?.user ? `${request.employee.user.firstName} ${request.employee.user.lastName}` : 'Usuario'}</span>
                  <RelativeTime dateString={request.requestedDate} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const CSV_IMPORT_COLUMNS = ['firstName', 'lastName', 'email', 'role', 'department', 'employeeType', 'position'];

function EmployeesPage({ users, departments, employeeTypes, currentUserId, canManageUsers, onToggleUser, accessToken, tenantId, onRefresh, onCreateEmployeeType }: {
  users: UserRecord[];
  departments: Department[];
  employeeTypes: EmployeeTypeRecord[];
  currentUserId: string;
  canManageUsers: boolean;
  onToggleUser: (id: string, active: boolean) => void;
  accessToken: string;
  tenantId?: string;
  onRefresh: () => Promise<void>;
  onCreateEmployeeType: (name: string) => Promise<EmployeeTypeRecord>;
}) {
  const [showImport, setShowImport] = useState(false);
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{ total: number; importedCount: number; reactivatedCount: number; errorCount: number; duplicateCount: number; errors: { row: number; email?: string; message: string }[]; duplicates: { row: number; email?: string; message: string }[]; reactivated: { row: number; email?: string; message: string }[] } | null>(null);
  const [importError, setImportError] = useState('');

  const [editingUserId, setEditingUserId] = useState('');
  const [editForm, setEditForm] = useState({ departmentId: '', employeeTypeId: '', password: '' });
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const handleStartEdit = (person: UserRecord) => {
    setEditingUserId(person.id);
    setEditError('');
    setShowPasswordField(false);
    setEditForm({
      departmentId: person.employee?.department?.id || '',
      employeeTypeId: person.employee?.employeeTypeId || '',
      password: '',
    });
  };

  const handleCancelEdit = () => {
    setEditingUserId('');
    setEditError('');
    setShowPasswordField(false);
    setEditForm({ ...editForm, password: '' });
  };

  const handleSaveEdit = async () => {
    try {
      setEditSaving(true);
      setEditError('');
      await apiFetch(`/users/${editingUserId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          departmentId: editForm.departmentId || undefined,
          employeeTypeId: editForm.employeeTypeId || undefined,
          password: editForm.password.trim() || undefined,
        }),
      }, accessToken);
      setEditingUserId('');
      setShowPasswordField(false);
      setEditForm({ ...editForm, password: '' });
      await onRefresh();
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'No se pudo guardar el puesto/departamento');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteAccount = async (person: UserRecord) => {
    const confirmed = window.confirm(`¿Eliminar la cuenta de ${person.firstName} ${person.lastName}? El historial de turnos se conserva, pero la cuenta dejará de aparecer en las listas.`);
    if (!confirmed) return;
    try {
      await apiFetch(`/users/${person.id}`, { method: 'DELETE' }, accessToken);
      await onRefresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No se pudo eliminar la cuenta');
    }
  };

  const parseCsv = (text: string) => {
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return [];
    const header = lines[0].split(',').map((column) => column.trim().toLowerCase());
    return lines.slice(1).map((line) => {
      const cells = line.split(',').map((cell) => cell.trim());
      const record: Record<string, string> = {};
      header.forEach((column, index) => { record[column] = cells[index] || ''; });
      return {
        firstName: record.firstname || record.nombre || '',
        lastName: record.lastname || record.apellido || '',
        email: record.email || record.correo || '',
        role: record.role || record.rol || 'EMPLOYEE',
        departmentName: record.department || record.departamento || record.area || undefined,
        employeeTypeName: record.employeetype || record.tipo || record['tipo de empleado'] || undefined,
        position: record.position || record.cargo || undefined,
      };
    });
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setRawText(String(reader.result || ''));
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setImportError('');
    setImportSummary(null);
    const records = parseCsv(rawText);
    if (!records.length) {
      setImportError('No se encontraron registros válidos. Verifica el formato del archivo.');
      return;
    }
    try {
      setImporting(true);
      const summary = await apiFetch<any>('/employees/import', {
        method: 'POST',
        body: JSON.stringify({ tenantId, records }),
      }, accessToken);
      setImportSummary(summary);
      await onRefresh();
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'No se pudo importar el archivo');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <header className="page-header">
        <div>
          <p className="eyebrow accent">Personal</p>
          <h1>Empleados</h1>
        </div>
        {canManageUsers ? (
          <button className="primary-btn small" onClick={() => setShowImport((value) => !value)}>
            <Upload size={16} style={{ marginRight: 6 }} aria-hidden="true" />
            Importar empleados
          </button>
        ) : null}
      </header>

      {showImport ? (
        <div className="panel" style={{ marginBottom: 20 }}>
          <h3>Importar empleados desde CSV</h3>

          <div className="space-y-3 mb-4">
            <div>
              <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-1.5">Columnas admitidas</p>
              <div className="flex flex-wrap gap-1.5">
                {CSV_IMPORT_COLUMNS.map((column) => (
                  <span key={column} className="text-xs font-mono bg-gray-50 border border-gray-200 text-gray-600 px-2 py-1 rounded-md">{column}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-1.5">Departamentos disponibles</p>
              <div className="flex flex-wrap gap-1.5">
                {departments.length ? departments.map((department) => (
                  <span key={department.id} className="text-xs bg-blue-50 border border-blue-100 text-blue-700 px-2.5 py-1 rounded-full">{department.name}</span>
                )) : <span className="text-xs text-gray-400">Ninguno</span>}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-1.5">Tipos disponibles</p>
              <div className="flex flex-wrap gap-1.5">
                {employeeTypes.length ? employeeTypes.map((type) => (
                  <span key={type.id} className="text-xs bg-indigo-50 border border-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full">{type.name}</span>
                )) : <span className="text-xs text-gray-400">Ninguno</span>}
              </div>
            </div>
          </div>

          <div className="auth-form">
            <div>
              <span className="text-sm text-gray-700 font-medium block mb-1.5">Archivo CSV</span>
              <label className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-gray-200 rounded-xl px-6 py-8 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors">
                <span className="w-10 h-10 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center mb-1">
                  <Upload size={18} />
                </span>
                <span className="text-sm text-gray-600">Haz clic para subir o arrastra tu archivo CSV</span>
                <span className="text-xs text-gray-400 mt-1">{fileName || 'Ningún archivo seleccionado'}</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) { setFileName(file.name); handleFile(file); }
                  }}
                />
              </label>
            </div>
            <label><span>O pega el contenido CSV aquí</span><textarea rows={6} value={rawText} onChange={(e) => setRawText(e.target.value)} placeholder={'firstName,lastName,email,role,department,employeeType,position'} /></label>
            {importError ? <p className="error-text">{importError}</p> : null}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="primary-btn small" disabled={importing || !rawText.trim()} onClick={handleImport}>{importing ? 'Importando...' : 'Importar'}</button>
              <button className="secondary-btn small" onClick={() => { setShowImport(false); setRawText(''); setFileName(''); setImportSummary(null); setImportError(''); }}>Cerrar</button>
            </div>
          </div>

          {importSummary ? (
            <div style={{ marginTop: 16 }}>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                <StatCard icon={Users} label="Total de registros" value={importSummary.total} tint="bg-gray-100 text-gray-600" />
                <StatCard icon={CheckCircle2} label="Importados" value={importSummary.importedCount} tint="bg-green-50 text-green-600" />
                <StatCard icon={RotateCcw} label="Reactivados" value={importSummary.reactivatedCount} tint="bg-blue-50 text-blue-600" />
                <StatCard icon={XCircle} label="Errores" value={importSummary.errorCount} tint="bg-red-50 text-red-600" />
                <StatCard icon={Copy} label="Duplicados" value={importSummary.duplicateCount} tint="bg-amber-50 text-amber-600" />
              </div>
              {importSummary.errors.length ? (
                <div className="mb-3">
                  <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-2">Errores</p>
                  <div className="space-y-2">
                    {importSummary.errors.map((item, index) => (
                      <div key={index} className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg p-2.5">
                        <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-red-800">Fila {item.row}{item.email ? ` (${item.email})` : ''}</p>
                          <p className="text-xs text-red-600 mt-0.5">{item.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {importSummary.reactivated.length ? (
                <div className="mb-3">
                  <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-2">Reactivados</p>
                  <div className="space-y-2">
                    {importSummary.reactivated.map((item, index) => (
                      <div key={index} className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg p-2.5">
                        <RotateCcw size={14} className="text-blue-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-blue-800">Fila {item.row}{item.email ? ` (${item.email})` : ''}</p>
                          <p className="text-xs text-blue-600 mt-0.5">{item.message || 'Cuenta eliminada reactivada con los datos de esta fila.'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {importSummary.duplicates.length ? (
                <div>
                  <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-2">Duplicados</p>
                  <div className="space-y-2">
                    {importSummary.duplicates.map((item, index) => (
                      <div key={index} className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg p-2.5">
                        <Copy size={14} className="text-amber-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-amber-800">Fila {item.row}{item.email ? ` (${item.email})` : ''}</p>
                          <p className="text-xs text-amber-600 mt-0.5">{item.message || 'Duplicado'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="panel table-panel">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Departamento</th>
              <th>Puesto</th>
              {canManageUsers ? <><th>Rol</th><th>Estado</th></> : null}
              {canManageUsers ? <th>Acción</th> : null}
            </tr>
          </thead>
          <tbody>
            {users.map((person) => (
              <Fragment key={person.id}>
                <tr>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <Avatar firstName={person.firstName} lastName={person.lastName} />
                      <span className="font-medium">{person.firstName} {person.lastName}</span>
                    </div>
                  </td>
                  <td><DepartmentBadge name={person.employee?.department?.name} /></td>
                  <td>{person.employee?.employeeType?.name || <span className="muted-action">Sin asignar</span>}</td>
                  {canManageUsers ? <>
                    <td><StatusBadge status={person.role} /></td>
                    <td>
                      <StatusBadge status={person.active ? 'ACTIVO' : 'SUSPENDIDO'} />
                    </td>
                  </> : null}
                  {canManageUsers ? (
                    <td>
                      {person.id === currentUserId ? <span className="muted-action">Cuenta actual</span> : (
                        <div className="flex items-center gap-2 flex-wrap">
                          <button className="secondary-btn small" onClick={() => (editingUserId === person.id ? handleCancelEdit() : handleStartEdit(person))}>
                            {editingUserId === person.id ? 'Cerrar' : 'Editar'}
                          </button>
                          <button className={person.active ? 'secondary-btn small' : 'primary-btn small'} onClick={() => onToggleUser(person.id, !person.active)}>{person.active ? 'Suspender' : 'Activar'}</button>
                          <button className="secondary-btn small danger" onClick={() => handleDeleteAccount(person)}>Eliminar</button>
                        </div>
                      )}
                    </td>
                  ) : null}
                </tr>
                {editingUserId === person.id ? (
                  <tr>
                    <td colSpan={canManageUsers ? 6 : 3}>
                      <div className="auth-form" style={{ maxWidth: 420, padding: '12px 0' }}>
                        <label className="select-field"><span>Puesto / Rol profesional</span>
                          <EmployeeTypeCombobox
                            roles={employeeTypes}
                            selectedId={editForm.employeeTypeId}
                            onChange={(role) => setEditForm({ ...editForm, employeeTypeId: role?.id || '' })}
                            onCreate={onCreateEmployeeType}
                          />
                        </label>
                        <label className="select-field"><span>Departamento</span>
                          <select value={editForm.departmentId} onChange={(e) => setEditForm({ ...editForm, departmentId: e.target.value })}>
                            <option value="">Sin departamento asignado</option>
                            {departments.map((dept) => (
                              <option key={dept.id} value={dept.id}>{dept.name} · {dept.code}</option>
                            ))}
                          </select>
                        </label>
                        {showPasswordField ? (
                          <label><span>Nueva contraseña</span>
                            <input
                              type="password"
                              value={editForm.password}
                              onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                              placeholder="Contraseña nueva"
                              autoFocus
                            />
                          </label>
                        ) : (
                          <button
                            type="button"
                            className="combobox-create bg-transparent border-0 cursor-pointer p-0 text-left"
                            onClick={() => setShowPasswordField(true)}
                          >
                            Cambiar contraseña
                          </button>
                        )}
                        {editError ? <p className="error-text">{editError}</p> : null}
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button className="primary-btn small" disabled={editSaving} onClick={handleSaveEdit}>{editSaving ? 'Guardando...' : 'Guardar cambios'}</button>
                          <button className="secondary-btn small" onClick={handleCancelEdit}>Cancelar</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const SHIFT_ACTION_BASE = 'inline-flex items-center justify-center h-9 min-w-[128px] px-3 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors';
const SHIFT_ACTION_NEUTRAL = 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 dark:border-gray-500';

function ShiftsPage({ shifts, departments, users, user, onCreate, onUpdate, onAssign, onCancel, onUnassign }: {
  shifts: ShiftRecord[];
  departments: Department[];
  users: UserRecord[];
  user: AuthUser;
  onCreate: (data: { employeeId: string; departmentId: string; startDate: string; endDate: string; startTime: string; endTime: string }) => void;
  onUpdate: (id: string, data: { departmentId: string; startDate: string; endDate: string; startTime: string; endTime: string; status: string }) => void;
  onAssign: (shiftId: string, employeeId: string) => void;
  onCancel: (shiftId: string) => void;
  onUnassign: (shiftId: string, employeeId: string) => void;
}) {
  const isAdmin = user.role === 'ADMIN';
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ employeeId: '', departmentId: '', startDate: '', endDate: '', startTime: '', endTime: '', status: 'PUBLISHED' });
  const [assignment, setAssignment] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [showCancelled, setShowCancelled] = useState(false);
  const assignableUsers = users.filter((person) => person.employee);
  const visibleShifts = (isAdmin ? shifts : shifts.filter((shift) => shift.assignments.some((item) => item.employee?.user?.id === user.id)))
    .filter((shift) => showCancelled || shift.status !== 'CANCELLED');
  const cancelledCount = (isAdmin ? shifts : shifts.filter((shift) => shift.assignments.some((item) => item.employee?.user?.id === user.id)))
    .filter((shift) => shift.status === 'CANCELLED').length;

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    if (!editingId && !form.employeeId) {
      setFormError('Selecciona el empleado al que se asignará el turno.');
      return;
    }
    if (!form.startDate || !form.endDate || !form.startTime || !form.endTime) {
      setFormError('Completa las fechas y horas del turno.');
      return;
    }
    if (form.endDate < form.startDate) {
      setFormError('La fecha final no puede ser anterior a la fecha inicial.');
      return;
    }
    if (editingId) {
      onUpdate(editingId, { departmentId: form.departmentId, startDate: form.startDate, endDate: form.endDate, startTime: form.startTime, endTime: form.endTime, status: form.status });
    } else {
      onCreate({ employeeId: form.employeeId, departmentId: form.departmentId, startDate: form.startDate, endDate: form.endDate, startTime: form.startTime, endTime: form.endTime });
    }
    setEditingId(null);
    setForm({ employeeId: '', departmentId: '', startDate: '', endDate: '', startTime: '', endTime: '', status: 'PUBLISHED' });
  };

  return (
    <div>
      <header className="page-header">
        <div>
          <p className="eyebrow accent">Operación</p>
          <h1>{isAdmin ? 'Gestión de turnos' : 'Mis turnos'}</h1>
          <p className="page-subtitle">{isAdmin ? 'Crea, edita y asigna turnos al personal.' : 'Aquí aparecerán los turnos que te hayan asignado.'}</p>
        </div>
      </header>

      {isAdmin ? (
        <form className="panel shift-form" onSubmit={submit}>
          <h3>{editingId ? 'Editar turno' : 'Crear turno'}</h3>
          <div className="schedule-form-grid shift-form-grid">
            {!editingId ? <label><span>Asignar a empleado</span><select required value={form.employeeId} onChange={(event) => setForm({ ...form, employeeId: event.target.value })}><option value="">{assignableUsers.length ? 'Selecciona el empleado' : 'No hay empleados disponibles'}</option>{assignableUsers.map((person) => <option key={person.employee!.id} value={person.employee!.id}>{person.firstName} {person.lastName}</option>)}</select>{!assignableUsers.length ? <small className="form-error">Crea primero un usuario con perfil de empleado.</small> : null}</label> : null}
            <label><span>Área</span><select value={form.departmentId} onChange={(event) => setForm({ ...form, departmentId: event.target.value })}><option value="">Todas las áreas</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
            <label><span>Desde el día</span><input required type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></label>
            <label><span>Hasta el día</span><input required type="date" value={form.endDate} min={form.startDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></label>
            <label><span>Desde la hora</span><input required type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} /></label>
            <label><span>Hasta la hora</span><input required type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} /></label>
            {editingId ? <label><span>Estado</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="DRAFT">Borrador</option><option value="PUBLISHED">Publicado</option></select></label> : null}
            <button className="primary-btn small" type="submit" disabled={!editingId && !assignableUsers.length}>{editingId ? 'Guardar cambios' : 'Crear turno'}</button>
            {editingId ? <button className="secondary-btn small" type="button" onClick={() => { setEditingId(null); setForm({ employeeId: '', departmentId: '', startDate: '', endDate: '', startTime: '', endTime: '', status: 'PUBLISHED' }); }}>Cancelar</button> : null}
          </div>
          {formError ? <p className="form-error form-error-banner">{formError}</p> : null}
        </form>
      ) : null}

      {cancelledCount > 0 ? (
        <label className="flex items-center gap-2 text-sm text-gray-600 mb-3 cursor-pointer">
          <input
            type="checkbox"
            checked={showCancelled}
            onChange={(event) => setShowCancelled(event.target.checked)}
            className="h-4 w-4 rounded border-2 border-gray-400 dark:border-gray-500 accent-indigo-600 cursor-pointer"
          />
          Mostrar turnos cancelados ({cancelledCount})
        </label>
      ) : null}

      <div className="panel table-panel">
        <table>
          <thead><tr><th>Asignación</th><th>Periodo</th><th>Horario</th><th>Área</th><th>Estado</th>{isAdmin ? <th>Acciones</th> : null}</tr></thead>
          <tbody>
            {visibleShifts.map((shift) => <tr key={shift.id}>
              <td>
                {shift.assignments.length ? (
                  <div className="flex items-center gap-2">
                    {shift.assignments.map((item, idx) => {
                      const employeeName = item.employee?.user ? `${item.employee.user.firstName} ${item.employee.user.lastName}` : 'Empleado';
                      return (
                        <div key={idx} className="flex items-center gap-1" title={employeeName}>
                          <Avatar firstName={item.employee?.user?.firstName} lastName={item.employee?.user?.lastName} />
                          <span className="text-sm font-medium">{employeeName}</span>
                          {isAdmin ? (
                            <button
                              type="button"
                              onClick={() => { if (window.confirm(`¿Desasignar a ${employeeName} de este turno?`)) onUnassign(shift.id, item.employeeId); }}
                              className="text-gray-400 hover:text-red-500 bg-transparent border-0 cursor-pointer p-0"
                              title="Desasignar del turno"
                            >
                              <X size={12} />
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : <span className="text-sm text-gray-400">Sin asignar</span>}
              </td>
              <td>{new Date(shift.startDate).toLocaleDateString('es-ES')} - {new Date(shift.endDate).toLocaleDateString('es-ES')}</td>
              <td>{shift.startTime} - {shift.endTime}</td>
              <td><DepartmentBadge name={shift.department?.name} /></td>
              <td><StatusBadge status={shift.status} /></td>
              {isAdmin ? <td><div className="shift-actions">
                <button
                  className={`${SHIFT_ACTION_BASE} ${SHIFT_ACTION_NEUTRAL}`}
                  onClick={() => { setEditingId(shift.id); setForm({ employeeId: shift.assignments[0]?.employeeId || '', departmentId: shift.department?.id || '', startDate: new Date(shift.startDate).toISOString().slice(0, 10), endDate: new Date(shift.endDate).toISOString().slice(0, 10), startTime: shift.startTime, endTime: shift.endTime, status: shift.status }); }}
                >
                  Editar
                </button>
                <select
                  value={assignment[shift.id] || ''}
                  onChange={(event) => setAssignment({ ...assignment, [shift.id]: event.target.value })}
                  className={`${SHIFT_ACTION_BASE} ${SHIFT_ACTION_NEUTRAL} cursor-pointer`}
                >
                  <option value="">Reasignar empleado</option>
                  {users.filter((person) => person.employee).map((person) => <option key={person.employee!.id} value={person.employee!.id}>{person.firstName} {person.lastName}</option>)}
                </select>
                <button
                  className={`${SHIFT_ACTION_BASE} bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white`}
                  disabled={!assignment[shift.id]}
                  onClick={() => onAssign(shift.id, assignment[shift.id])}
                >
                  Asignar
                </button>
                <button
                  type="button"
                  className={`${SHIFT_ACTION_BASE} bg-white text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-red-950/40 dark:text-red-400 dark:border-red-700/70 dark:hover:bg-red-950/70`}
                  disabled={shift.status === 'CANCELLED'}
                  onClick={() => { if (window.confirm('¿Eliminar este turno? Se cancelará y se notificará a los empleados asignados. Esta acción no se puede deshacer.')) onCancel(shift.id); }}
                >
                  Eliminar turno
                </button>
              </div></td> : null}
            </tr>)}
            {!visibleShifts.length ? <tr><td colSpan={isAdmin ? 6 : 5}>No hay turnos para mostrar.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const COVERAGE_LABELS: Record<ShiftCoverageStatus, string> = {
  UNCOVERED: 'Sin cubrir',
  PARTIALLY_COVERED: 'Parcialmente cubierto',
  COVERED: 'Cubierto',
};

function CoverageBadge({ status }: { status: ShiftCoverageStatus }) {
  const color =
    status === 'COVERED' ? 'bg-green-50 text-green-700 border-green-200' :
    status === 'PARTIALLY_COVERED' ? 'bg-amber-50 text-amber-700 border-amber-200' :
    'bg-gray-50 text-gray-600 border-gray-200';
  return (
    <span className={`text-xs px-2 py-1 rounded-full border ${color}`}>
      {COVERAGE_LABELS[status]}
    </span>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 85 ? 'bg-green-50 text-green-700 border-green-200' :
    score >= 70 ? 'bg-blue-50 text-blue-700 border-blue-200' :
    'bg-amber-50 text-amber-700 border-amber-200';
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-full border ${color}`}>
      {score} pts
    </span>
  );
}

function CandidateCard({ candidate, onAssign, busy }: { candidate: SuggestedCandidate; onAssign: (employeeId: string) => void; busy: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border rounded-xl bg-white overflow-hidden transition-all ${candidate.eligible ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Avatar firstName={candidate.employeeName.split(' ')[0]} lastName={candidate.employeeName.split(' ').slice(1).join(' ')} />
          <div>
            <p className="font-medium text-gray-900 text-sm">{candidate.employeeName}</p>
            <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5 flex-wrap">
              <span className="flex items-center gap-1"><Clock size={12} /> {candidate.currentHours}h ({candidate.totalAssignments} turnos)</span>
              {candidate.employeeTypeName ? <span className="flex items-center gap-1"><ShieldCheck size={12} /> {candidate.employeeTypeName}</span> : null}
              <span className="flex items-center gap-1"><MapPin size={12} /> {candidate.lastShiftEnd ? `Último: ${new Date(candidate.lastShiftEnd).toLocaleDateString('es-ES')}` : 'Sin turnos previos'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {candidate.eligible ? (
            <>
              <ScoreBadge score={candidate.score} />
              <button
                onClick={() => onAssign(candidate.employeeId)}
                disabled={busy}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition cursor-pointer"
              >
                Asignar
              </button>
            </>
          ) : (
            <span className="text-xs text-red-500 font-medium px-2 py-1 rounded-full border border-red-200 bg-red-50">Excluido</span>
          )}
        </div>
      </div>

      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-center gap-1 text-xs text-gray-500 hover:text-gray-700 border-t border-gray-100 py-2 bg-transparent cursor-pointer"
      >
        {open ? 'Ocultar detalle' : 'Ver detalle'}
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open ? (
        <div className="px-4 pb-4 pt-1 space-y-2 bg-gray-50 border-t border-gray-100">
          {candidate.eligible ? (
            <>
              <div className="flex items-center gap-2 text-xs text-gray-700">
                <span className="w-4 h-4 rounded-full bg-green-100 text-green-700 flex items-center justify-center shrink-0"><Check size={11} /></span>
                Elegible para este turno
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-700">
                <span className="w-4 h-4 rounded-full bg-green-100 text-green-700 flex items-center justify-center shrink-0"><Check size={11} /></span>
                {candidate.currentHours}h acumuladas esta semana · {candidate.totalAssignments} turnos asignados
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-700">
                <span className="w-4 h-4 rounded-full bg-green-100 text-green-700 flex items-center justify-center shrink-0"><Check size={11} /></span>
                Score de compatibilidad: {candidate.score}
              </div>
            </>
          ) : (
            candidate.exclusionReasons.map((reason, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-gray-700">
                <span className="w-4 h-4 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0"><X size={11} /></span>
                {reason}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function AutoAssignPage({ shifts, departments, employeeTypes, user, onRefresh, onAssignEmployee }: {
  shifts: ShiftRecord[];
  departments: Department[];
  employeeTypes: EmployeeTypeRecord[];
  user: AuthUser;
  onRefresh: () => Promise<void>;
  onAssignEmployee: (shiftId: string, employeeId: string) => Promise<void>;
}) {
  const [selectedShiftId, setSelectedShiftId] = useState('');
  const [requirements, setRequirements] = useState<ShiftRequirementRecord[]>([]);
  const [draftCounts, setDraftCounts] = useState<Record<string, number>>({});
  const [candidates, setCandidates] = useState<{ eligible: EligibilityResult[]; ineligible: EligibilityResult[] } | null>(null);
  const [suggested, setSuggested] = useState<SuggestedCandidate[] | null>(null);
  const [autoResult, setAutoResult] = useState<AutoAssignSummary | null>(null);
  const [policy, setPolicy] = useState<SchedulingPolicyRecord | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const [newShiftForm, setNewShiftForm] = useState({ departmentId: '', date: '', startTime: '', endTime: '', nightShift: false });
  const [showCreateShift, setShowCreateShift] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const [showMaxStaff, setShowMaxStaff] = useState(false);
  const [showExcluded, setShowExcluded] = useState(false);
  const [showEligibility, setShowEligibility] = useState(false);

  const loadPolicy = async () => {
    if (!user.tenantId) return;
    const data = await apiFetch<SchedulingPolicyRecord>(`/scheduling-policy?tenantId=${encodeURIComponent(user.tenantId)}`, {}, user.accessToken);
    setPolicy(data);
  };

  const loadRequirements = async (shiftId: string) => {
    const data = await apiFetch<ShiftRequirementRecord[]>(`/shifts/${shiftId}/requirements`, {}, user.accessToken);
    setRequirements(data);
    const counts: Record<string, number> = {};
    data.forEach((item) => { counts[item.employeeTypeId] = item.requiredCount; });
    setDraftCounts(counts);
  };

  useEffect(() => { loadPolicy(); }, [user.tenantId]);
  useEffect(() => {
    setCandidates(null);
    setAutoResult(null);
    setSuggested(null);
    if (selectedShiftId) loadRequirements(selectedShiftId);
  }, [selectedShiftId]);

  useEffect(() => {
    if (!message) return undefined;
    const timeout = window.setTimeout(() => setMessage(''), 6000);
    return () => window.clearTimeout(timeout);
  }, [message]);

  const handleCreateEmptyShift = async () => {
    try {
      if (!newShiftForm.date || !newShiftForm.startTime || !newShiftForm.endTime) {
        setMessage('Completa fecha y horario para crear el turno.');
        return;
      }
      const startDate = newShiftForm.date;
      const endDate = newShiftForm.nightShift || newShiftForm.endTime < newShiftForm.startTime
        ? new Date(new Date(startDate).getTime() + 86400000).toISOString().slice(0, 10)
        : startDate;
      const created = await apiFetch<ShiftRecord>('/shifts', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: user.tenantId,
          departmentId: newShiftForm.departmentId || null,
          startDate,
          endDate,
          startTime: newShiftForm.startTime,
          endTime: newShiftForm.endTime,
          status: 'DRAFT',
        }),
      }, user.accessToken);
      setMessage('Turno creado. Ahora define el personal requerido.');
      await onRefresh();
      setSelectedShiftId(created.id);
      setShowCreateShift(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo crear el turno');
    }
  };

  const handleSaveRequirements = async () => {
    try {
      setBusy(true);
      const payload = Object.entries(draftCounts)
        .filter(([, count]) => Number(count) > 0)
        .map(([employeeTypeId, requiredCount]) => ({ employeeTypeId, requiredCount: Number(requiredCount) }));
      const data = await apiFetch<ShiftRequirementRecord[]>(`/shifts/${selectedShiftId}/requirements`, {
        method: 'PUT',
        body: JSON.stringify({ requirements: payload }),
      }, user.accessToken);
      setRequirements(data);
      setMessage('Personal requerido guardado correctamente.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo guardar el personal requerido');
    } finally {
      setBusy(false);
    }
  };

  const handleViewCandidates = async () => {
    try {
      setBusy(true);
      const data = await apiFetch<{ eligible: EligibilityResult[]; ineligible: EligibilityResult[] }>(`/shifts/${selectedShiftId}/candidates`, {}, user.accessToken);
      setCandidates(data);
      setShowEligibility(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudieron evaluar los candidatos');
    } finally {
      setBusy(false);
    }
  };

  const handleSuggestCandidates = async () => {
    try {
      setBusy(true);
      setMessage('');
      const data = await apiFetch<{ shiftId: string; candidates: SuggestedCandidate[] }>(`/shifts/${selectedShiftId}/suggested-candidates`, {}, user.accessToken);
      setSuggested(data.candidates);
      if (!data.candidates.some((item) => item.eligible)) {
        setMessage('Ningún empleado cumple todas las reglas para este turno. Revisa los motivos de exclusión.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudieron calcular los candidatos sugeridos');
    } finally {
      setBusy(false);
    }
  };

  const handleAssignCandidate = async (employeeId: string) => {
    try {
      setBusy(true);
      await onAssignEmployee(selectedShiftId, employeeId);
      await handleSuggestCandidates();
      await loadRequirements(selectedShiftId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo asignar al empleado');
    } finally {
      setBusy(false);
    }
  };

  const handleAutoAssign = async () => {
    try {
      setBusy(true);
      const data = await apiFetch<AutoAssignSummary>(`/shifts/${selectedShiftId}/auto-assign`, {
        method: 'POST',
        body: JSON.stringify({ assignedBy: user.id }),
      }, user.accessToken);
      setAutoResult(data);
      setMessage('Asignación automática ejecutada.');
      await onRefresh();
      await loadRequirements(selectedShiftId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo ejecutar la asignación automática');
    } finally {
      setBusy(false);
    }
  };

  const handleSavePolicy = async () => {
    if (!policy) return;
    try {
      setBusy(true);
      const data = await apiFetch<SchedulingPolicyRecord>('/scheduling-policy', {
        method: 'PUT',
        body: JSON.stringify({ tenantId: user.tenantId, ...policy }),
      }, user.accessToken);
      setPolicy(data);
      setMessage('Reglas de programación actualizadas.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo actualizar la configuración');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveMaxStaff = async (departmentId: string, maxStaff: string) => {
    try {
      await apiFetch(`/departments/${departmentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ maxStaff: maxStaff ? Number(maxStaff) : null }),
      }, user.accessToken);
      setMessage('Máximo de personal del área actualizado.');
      await onRefresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo actualizar el área');
    }
  };

  const selectedShift = shifts.find((shift) => shift.id === selectedShiftId);

  const eligibleCandidates = suggested?.filter((c) => c.eligible) || [];
  const excludedCandidates = suggested?.filter((c) => !c.eligible) || [];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs font-semibold tracking-widest text-indigo-600 uppercase mb-1">Motor inteligente</p>
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Asistente de asignación</h1>
        <p className="text-sm text-gray-500">
          Define el personal necesario por turno y el sistema sugiere candidatos elegibles respetando todas las reglas — la asignación final la confirmas tú.
        </p>
      </div>

      {/* Status message */}
      {message ? (
        <div className={`rounded-xl p-4 mb-4 flex items-center gap-3 text-sm font-medium ${/no se pudo|no se pudieron|completa|ningún/i.test(message) ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-green-50 border border-green-200 text-green-800'}`}>
          <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${/no se pudo|no se pudieron|completa|ningún/i.test(message) ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
            {/no se pudo|no se pudieron|completa|ningún/i.test(message) ? <X size={16} /> : <Check size={16} />}
          </span>
          <div>
            <p>{message}</p>
          </div>
        </div>
      ) : null}

      {/* Auto-assign result banner */}
      {autoResult ? (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0"><Wand2 size={16} /></span>
            <h3 className="text-base font-semibold text-gray-900">Resultado de asignación automática</h3>
            <span className="ml-auto">
              <CoverageBadge status={autoResult.coverage} />
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">{autoResult.totalRequired}</p>
              <p className="text-xs text-gray-500">Requeridos</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{autoResult.totalAssigned}</p>
              <p className="text-xs text-green-600">Asignados</p>
            </div>
            <div className={`rounded-lg p-3 text-center ${autoResult.totalPending > 0 ? 'bg-amber-50' : 'bg-gray-50'}`}>
              <p className={`text-2xl font-bold ${autoResult.totalPending > 0 ? 'text-amber-700' : 'text-gray-900'}`}>{autoResult.totalPending}</p>
              <p className={`text-xs ${autoResult.totalPending > 0 ? 'text-amber-600' : 'text-gray-500'}`}>Pendientes</p>
            </div>
          </div>

          {autoResult.perType.length ? (
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50"><th className="text-left px-3 py-2 font-medium text-gray-600 text-xs">Tipo</th><th className="text-center px-3 py-2 font-medium text-gray-600 text-xs">Requeridos</th><th className="text-center px-3 py-2 font-medium text-gray-600 text-xs">Asignados</th><th className="text-center px-3 py-2 font-medium text-gray-600 text-xs">Nuevos</th><th className="text-center px-3 py-2 font-medium text-gray-600 text-xs">Pendientes</th></tr></thead>
                <tbody>
                  {autoResult.perType.map((item) => (
                    <tr key={item.employeeTypeId} className="border-t border-gray-100">
                      <td className="px-3 py-2 text-gray-800">{item.employeeTypeName}</td>
                      <td className="px-3 py-2 text-center">{item.required}</td>
                      <td className="px-3 py-2 text-center text-green-700 font-medium">{item.assigned}</td>
                      <td className="px-3 py-2 text-center text-indigo-600 font-medium">{item.newlyAssigned}</td>
                      <td className="px-3 py-2 text-center">{item.pending > 0 ? <span className="text-amber-600 font-medium">{item.pending}</span> : '0'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {autoResult.ineligible.length ? (
            <div className="mt-4">
              <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1"><AlertTriangle size={13} className="text-amber-500" /> Empleados no elegibles</p>
              <div className="space-y-2">
                {autoResult.ineligible.map((item) => (
                  <div key={item.employeeId} className="flex items-start gap-2 text-xs bg-gray-50 rounded-lg p-2">
                    <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center shrink-0 text-[10px] font-medium mt-0.5">{item.employeeName.split(' ').map((w) => w[0]).join('').slice(0, 2)}</span>
                    <div>
                      <p className="text-gray-800 font-medium">{item.employeeName} {item.employeeTypeName ? <span className="font-normal text-gray-500">· {item.employeeTypeName}</span> : null}</p>
                      <p className="text-red-600 mt-0.5">{item.reasons.join(' · ')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Step 1: Shift selection / creation */}
      <div className="bg-white border border-gray-200 border-l-4 border-l-indigo-500 dark:border-l-indigo-400 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium uppercase tracking-wide">Turno a cubrir</p>
          <button
            onClick={() => setShowCreateShift(!showCreateShift)}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium bg-transparent border-0 cursor-pointer"
          >
            <Plus size={14} /> Crear turno nuevo
          </button>
        </div>

        {showCreateShift ? (
          <div className="bg-gray-50 rounded-lg p-4 mb-3 border border-gray-100">
            <p className="text-sm font-medium text-gray-800 mb-3">Nuevo turno vacío (sin empleado asignado)</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <label className="flex flex-col gap-1 text-xs text-gray-600">
                <span>Área</span>
                <select value={newShiftForm.departmentId} onChange={(e) => setNewShiftForm({ ...newShiftForm, departmentId: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                  <option value="">Selecciona un área</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-600">
                <span>Fecha</span>
                <input type="date" value={newShiftForm.date} onChange={(e) => setNewShiftForm({ ...newShiftForm, date: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-600">
                <span>Desde</span>
                <input type="time" value={newShiftForm.startTime} onChange={(e) => setNewShiftForm({ ...newShiftForm, startTime: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-600">
                <span>Hasta</span>
                <input type="time" value={newShiftForm.endTime} onChange={(e) => setNewShiftForm({ ...newShiftForm, endTime: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-600">
                <span>¿Nocturno?</span>
                <select value={newShiftForm.nightShift ? '1' : '0'} onChange={(e) => setNewShiftForm({ ...newShiftForm, nightShift: e.target.value === '1' })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                  <option value="0">No</option>
                  <option value="1">Sí, cruza medianoche</option>
                </select>
              </label>
              <div className="flex items-end">
                <button onClick={handleCreateEmptyShift} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition cursor-pointer border-0 w-full">
                  Crear turno
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <select
          value={selectedShiftId}
          onChange={(e) => setSelectedShiftId(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white text-gray-700 cursor-pointer"
        >
          <option value="">Selecciona un turno existente…</option>
          {shifts.map((shift) => (
            <option key={shift.id} value={shift.id}>
              {new Date(shift.startDate).toLocaleDateString('es-ES')} · {shift.startTime}-{shift.endTime} · {shift.department?.name || 'Todas las áreas'} · {shift.assignments.length} asignados
            </option>
          ))}
        </select>

        {selectedShift ? (
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100">
            <span className="text-sm font-medium text-gray-900">{selectedShift.department?.name || 'Todas las áreas'}</span>
            <span className="text-gray-300">•</span>
            <span className="text-sm text-gray-700">{new Date(selectedShift.startDate).toLocaleDateString('es-ES')} - {new Date(selectedShift.endDate).toLocaleDateString('es-ES')}</span>
            <span className="text-gray-300">•</span>
            <span className="text-sm text-gray-700">{selectedShift.startTime} - {selectedShift.endTime}</span>
            <span className="ml-auto">
              <CoverageBadge status={selectedShift.coverageStatus} />
            </span>
          </div>
        ) : null}
      </div>

      {/* Step 2: Requirements (only when shift selected) */}
      {selectedShift ? (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Users2 size={16} className="text-indigo-600" />
            <h3 className="text-sm font-semibold text-gray-900">Personal requerido por tipo</h3>
          </div>

          {employeeTypes.length ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
              {employeeTypes.map((type) => (
                <label key={type.id} className="flex flex-col gap-1 text-xs text-gray-600">
                  <span>{type.name}</span>
                  <input
                    type="number"
                    min={0}
                    value={draftCounts[type.id] ?? 0}
                    onChange={(e) => setDraftCounts({ ...draftCounts, [type.id]: Number(e.target.value) })}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full"
                  />
                </label>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 mb-3">No hay tipos de empleado configurados para esta organización.</p>
          )}

          {requirements.length ? (
            <div className="overflow-hidden rounded-lg border border-gray-200 mb-3">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50"><th className="text-left px-3 py-2 font-medium text-gray-600 text-xs">Tipo</th><th className="text-center px-3 py-2 font-medium text-gray-600 text-xs">Requeridos</th><th className="text-center px-3 py-2 font-medium text-gray-600 text-xs">Asignados</th><th className="text-center px-3 py-2 font-medium text-gray-600 text-xs">Pendientes</th></tr></thead>
                <tbody>
                  {requirements.map((req) => (
                    <tr key={req.id} className="border-t border-gray-100">
                      <td className="px-3 py-2 text-gray-800">{req.employeeTypeName}</td>
                      <td className="px-3 py-2 text-center">{req.requiredCount}</td>
                      <td className="px-3 py-2 text-center text-green-700 font-medium">{req.assignedCount}</td>
                      <td className="px-3 py-2 text-center">{req.pendingCount > 0 ? <span className="text-amber-600 font-medium">{req.pendingCount}</span> : '0'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="flex items-center gap-2 flex-wrap">
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition cursor-pointer border-0 disabled:opacity-50" disabled={busy} onClick={handleSaveRequirements}>
              Guardar personal requerido
            </button>
          </div>
        </div>
      ) : null}

      {/* Action buttons */}
      {selectedShift ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <button
            onClick={handleSuggestCandidates}
            disabled={busy}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-sm py-3 rounded-xl transition cursor-pointer border-0"
          >
            <Search size={16} />
            Buscar candidatos
          </button>
          <button
            onClick={handleViewCandidates}
            disabled={busy || !requirements.length}
            className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 disabled:opacity-50 text-gray-700 font-medium text-sm py-3 rounded-xl transition cursor-pointer border border-gray-200"
          >
            <Users2 size={16} />
            Elegibilidad detallada
          </button>
          <button
            onClick={handleAutoAssign}
            disabled={busy || !requirements.length}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white font-medium text-sm py-3 rounded-xl transition cursor-pointer border-0"
          >
            <Wand2 size={16} />
            Asignar automáticamente
          </button>
        </div>
      ) : null}

      {/* Suggested candidates list */}
      {suggested ? (
        <>
          {eligibleCandidates.length ? (
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900">
                Candidatos sugeridos <span className="text-gray-400 font-normal">({eligibleCandidates.length})</span>
              </p>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <TrendingUp size={12} /> Ordenado por compatibilidad
              </span>
            </div>
          ) : null}

          <div className="space-y-3 mb-5">
            {eligibleCandidates.map((c) => (
              <CandidateCard key={c.employeeId} candidate={c} onAssign={handleAssignCandidate} busy={busy} />
            ))}
            {!eligibleCandidates.length ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 text-sm text-amber-800">
                <AlertTriangle size={18} className="text-amber-500 shrink-0" />
                <p>No hay empleados elegibles para este turno. Revisa las reglas de programación o los motivos de exclusión.</p>
              </div>
            ) : null}
          </div>

          {/* Excluded employees accordion */}
          {excludedCandidates.length ? (
            <div className="border border-gray-200 rounded-xl bg-white overflow-hidden mb-5">
              <button
                onClick={() => setShowExcluded(!showExcluded)}
                className="w-full flex items-center justify-between p-4 text-sm bg-transparent border-0 cursor-pointer"
              >
                <span className="flex items-center gap-2 text-gray-700 font-medium">
                  <AlertTriangle size={15} className="text-amber-500" />
                  {excludedCandidates.length} empleado(s) excluido(s) automáticamente
                </span>
                {showExcluded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </button>
              {showExcluded ? (
                <div className="border-t border-gray-100 divide-y divide-gray-100">
                  {excludedCandidates.map((c) => {
                    const initials = c.employeeName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
                    return (
                      <div key={c.employeeId} className="flex items-start gap-3 p-4">
                        <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-medium shrink-0">
                          {initials}
                        </div>
                        <div>
                          <p className="text-sm text-gray-800 font-medium">{c.employeeName} {c.employeeTypeName ? <span className="font-normal text-gray-500">· {c.employeeTypeName}</span> : null}</p>
                          {c.exclusionReasons.map((reason, idx) => (
                            <p key={idx} className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <X size={11} className="text-red-400 shrink-0" /> {reason}
                            </p>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}

      {/* Eligibility detail panel */}
      {candidates && showEligibility ? (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><ShieldCheck size={16} className="text-indigo-600" /> Evaluación de elegibilidad por tipo requerido</h3>
            <button onClick={() => setShowEligibility(false)} className="text-gray-400 hover:text-gray-600 bg-transparent border-0 cursor-pointer"><X size={16} /></button>
          </div>

          <p className="text-xs font-medium text-green-700 mb-2">Elegibles ({candidates.eligible.length})</p>
          {candidates.eligible.length ? (
            <div className="overflow-hidden rounded-lg border border-gray-200 mb-4">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50"><th className="text-left px-3 py-2 font-medium text-gray-600 text-xs">Empleado</th><th className="text-left px-3 py-2 font-medium text-gray-600 text-xs">Tipo</th><th className="text-center px-3 py-2 font-medium text-gray-600 text-xs">Horas semana</th><th className="text-center px-3 py-2 font-medium text-gray-600 text-xs">Noches</th><th className="text-left px-3 py-2 font-medium text-gray-600 text-xs">Disponibilidad</th></tr></thead>
                <tbody>
                  {candidates.eligible.map((item) => (
                    <tr key={item.employeeId} className="border-t border-gray-100">
                      <td className="px-3 py-2 text-gray-800">{item.employeeName}</td>
                      <td className="px-3 py-2 text-gray-600">{item.employeeTypeName}</td>
                      <td className="px-3 py-2 text-center">{item.metrics.hoursThisWeek}h</td>
                      <td className="px-3 py-2 text-center">{item.metrics.nightShiftsInPeriod}</td>
                      <td className="px-3 py-2"><span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">{item.availabilityStatus}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-xs text-gray-500 mb-4">No hay empleados elegibles.</p>}

          <p className="text-xs font-medium text-red-600 mb-2">No elegibles ({candidates.ineligible.length})</p>
          {candidates.ineligible.length ? (
            <div className="space-y-2">
              {candidates.ineligible.map((item) => (
                <div key={item.employeeId} className="flex items-start gap-2 text-xs bg-gray-50 rounded-lg p-2">
                  <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center shrink-0 text-[10px] font-medium mt-0.5">{item.employeeName.split(' ').map((w) => w[0]).join('').slice(0, 2)}</span>
                  <div>
                    <p className="text-gray-800 font-medium">{item.employeeName} <span className="font-normal text-gray-500">· {item.employeeTypeName}</span></p>
                    <p className="text-red-600 mt-0.5">{item.reasons.join(' · ')}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-gray-500">Todos los candidatos son elegibles.</p>}
        </div>
      ) : null}

      {/* Scheduling policy */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
        <button
          onClick={() => setShowPolicy(!showPolicy)}
          className="w-full flex items-center justify-between p-4 text-sm bg-transparent border-0 cursor-pointer"
        >
          <span className="flex items-center gap-2 text-gray-700 font-medium">
            <Settings size={15} className="text-gray-400" />
            Reglas de programación
          </span>
          {showPolicy ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </button>
        {showPolicy ? (
          <div className="border-t border-gray-100 p-4">
            {policy ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                  <label className="flex flex-col gap-1 text-xs text-gray-600">
                    <span>Máx. horas/día</span>
                    <input type="number" value={policy.maxHoursPerDay} onChange={(e) => setPolicy({ ...policy, maxHoursPerDay: Number(e.target.value) })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-gray-600">
                    <span>Máx. horas/semana</span>
                    <input type="number" value={policy.maxHoursPerWeek} onChange={(e) => setPolicy({ ...policy, maxHoursPerWeek: Number(e.target.value) })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-gray-600">
                    <span>Descanso mínimo (h)</span>
                    <input type="number" value={policy.minRestHours} onChange={(e) => setPolicy({ ...policy, minRestHours: Number(e.target.value) })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-gray-600">
                    <span>Máx. noches/periodo</span>
                    <input type="number" value={policy.maxNightShiftsPerPeriod} onChange={(e) => setPolicy({ ...policy, maxNightShiftsPerPeriod: Number(e.target.value) })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-gray-600">
                    <span>Periodo noches (días)</span>
                    <input type="number" value={policy.nightShiftPeriodDays} onChange={(e) => setPolicy({ ...policy, nightShiftPeriodDays: Number(e.target.value) })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </label>
                </div>
                <button className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition cursor-pointer border-0 disabled:opacity-50" disabled={busy} onClick={handleSavePolicy}>
                  Guardar reglas
                </button>
              </>
            ) : <p className="text-sm text-gray-500">Cargando configuración…</p>}
          </div>
        ) : null}
      </div>

      {/* Max staff per department */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
        <button
          onClick={() => setShowMaxStaff(!showMaxStaff)}
          className="w-full flex items-center justify-between p-4 text-sm bg-transparent border-0 cursor-pointer"
        >
          <span className="flex items-center gap-2 text-gray-700 font-medium">
            <Users size={15} className="text-gray-400" />
            Máximo de personal por área
          </span>
          {showMaxStaff ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </button>
        {showMaxStaff ? (
          <div className="border-t border-gray-100 p-4">
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50"><th className="text-left px-3 py-2 font-medium text-gray-600 text-xs">Área</th><th className="text-center px-3 py-2 font-medium text-gray-600 text-xs">Máximo total</th><th className="text-center px-3 py-2 font-medium text-gray-600 text-xs">Acción</th></tr></thead>
                <tbody>
                  {departments.map((department) => (
                    <DepartmentMaxStaffRow key={department.id} department={department} onSave={handleSaveMaxStaff} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function RoleRequirementChips({ employeeTypes, draftCounts, onAdd, onRemove }: {
  employeeTypes: EmployeeTypeRecord[];
  draftCounts: Record<string, number>;
  onAdd: (employeeTypeId: string, count: number) => void;
  onRemove: (employeeTypeId: string) => void;
}) {
  const [newTypeId, setNewTypeId] = useState('');
  const [newCount, setNewCount] = useState(1);

  const activeEntries = Object.entries(draftCounts).filter(([, count]) => count > 0);
  const availableTypes = employeeTypes.filter((type) => !(draftCounts[type.id] > 0));

  const handleAdd = () => {
    if (!newTypeId || newCount < 1) return;
    onAdd(newTypeId, newCount);
    setNewTypeId('');
    setNewCount(1);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        {activeEntries.map(([id, count]) => {
          const type = employeeTypes.find((item) => item.id === id);
          return (
            <span key={id} className="flex items-center gap-1.5 text-xs bg-gray-50 border border-gray-200 text-gray-700 px-2.5 py-1.5 rounded-full">
              {type?.name || 'Tipo eliminado'} × {count}
              <button onClick={() => onRemove(id)} className="text-gray-400 hover:text-red-500 bg-transparent border-0 cursor-pointer">
                <X size={11} />
              </button>
            </span>
          );
        })}
        {!activeEntries.length ? <p className="text-xs text-gray-400">Todavía no agregaste ningún rol requerido.</p> : null}
      </div>
      <div className="flex gap-2">
        <select value={newTypeId} onChange={(e) => setNewTypeId(e.target.value)} className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 bg-white">
          <option value="">Selecciona un rol</option>
          {availableTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
        </select>
        <input type="number" min={1} value={newCount} onChange={(e) => setNewCount(Number(e.target.value))} className="w-16 text-sm border border-gray-200 rounded-lg px-2 py-2 text-gray-700" />
        <button onClick={handleAdd} disabled={!newTypeId} className="flex items-center gap-1 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white text-sm font-medium px-3 py-2 rounded-lg border-0 cursor-pointer">
          <Plus size={14} /> Agregar
        </button>
      </div>
    </div>
  );
}

function ShiftTemplateCard({ template, employeeTypes, onUpdate, onDelete, onSaveRequirements }: {
  template: ShiftTemplateRecord;
  employeeTypes: EmployeeTypeRecord[];
  onDelete: (id: string) => Promise<void>;
  onSaveRequirements: (id: string, counts: Record<string, number>) => Promise<void>;
}) {
  const [draftCounts, setDraftCounts] = useState<Record<string, number>>(
    () => Object.fromEntries(template.requirements.map((requirement) => [requirement.employeeTypeId, requirement.requiredCount])),
  );
  const [savingReq, setSavingReq] = useState(false);

  useEffect(() => {
    setDraftCounts(Object.fromEntries(template.requirements.map((requirement) => [requirement.employeeTypeId, requirement.requiredCount])));
  }, [template.requirements]);

  const handleSaveRequirements = async () => {
    try {
      setSavingReq(true);
      await onSaveRequirements(template.id, draftCounts);
    } finally {
      setSavingReq(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl bg-white p-4 mb-3">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-900">{template.shiftType?.name || 'Bloque'}</span>
          <span className="text-xs text-gray-500">{template.shiftType?.startTime} - {template.shiftType?.endTime}</span>
          {template.shiftType?.nightShift ? <span className="text-xs bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-full">Nocturno</span> : null}
        </div>
        <button onClick={() => onDelete(template.id)} className="text-xs text-red-600 hover:text-red-700 font-medium bg-transparent border-0 cursor-pointer">Eliminar</button>
      </div>

      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Personal requerido</p>
      <RoleRequirementChips
        employeeTypes={employeeTypes}
        draftCounts={draftCounts}
        onAdd={(employeeTypeId, count) => setDraftCounts({ ...draftCounts, [employeeTypeId]: count })}
        onRemove={(employeeTypeId) => { const next = { ...draftCounts }; delete next[employeeTypeId]; setDraftCounts(next); }}
      />
      <button onClick={handleSaveRequirements} disabled={savingReq} className="mt-2 bg-white hover:bg-gray-50 disabled:opacity-50 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 cursor-pointer">
        {savingReq ? 'Guardando...' : 'Guardar personal requerido'}
      </button>
    </div>
  );
}

function computeShiftDurationHours(startTime: string, endTime: string) {
  const [startH, startM] = startTime.split(':').map((part) => Number(part) || 0);
  const [endH, endM] = endTime.split(':').map((part) => Number(part) || 0);
  const startMinutes = startH * 60 + startM;
  let endMinutes = endH * 60 + endM;
  if (endMinutes <= startMinutes) endMinutes += 24 * 60;
  return Math.round(((endMinutes - startMinutes) / 60) * 100) / 100;
}

const NEW_SHIFT_TYPE_DEFAULTS: { key: string; name: string; code: string; startTime: string; endTime: string; nightShift: boolean }[] = [
  { key: 'manana', name: 'Mañana', code: 'MANANA', startTime: '07:00', endTime: '15:00', nightShift: false },
  { key: 'tarde', name: 'Tarde', code: 'TARDE', startTime: '15:00', endTime: '23:00', nightShift: false },
  { key: 'noche', name: 'Noche', code: 'NOCHE', startTime: '23:00', endTime: '07:00', nightShift: true },
];

function AutomateShiftsModal({ departments, employeeTypes, shiftTypes, templates, user, onClose, onTemplatesChanged }: {
  departments: Department[];
  employeeTypes: EmployeeTypeRecord[];
  shiftTypes: ShiftTypeRecord[];
  templates: ShiftTemplateRecord[];
  user: AuthUser;
  onClose: () => void;
  onTemplatesChanged: () => Promise<void>;
}) {
  const [departmentId, setDepartmentId] = useState('');
  const [draftCounts, setDraftCounts] = useState<Record<string, number>>({});
  const [draftBlocks, setDraftBlocks] = useState(NEW_SHIFT_TYPE_DEFAULTS.map((block) => ({ ...block })));
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<ShiftTemplateGenerateNextUncoveredSummary | null>(null);

  const departmentTemplates = templates.filter((template) => template.departmentId === departmentId && template.active);
  const needsInlineTemplates = Boolean(departmentId) && departmentTemplates.length === 0;
  const hasAnyBaseRequirement = departmentTemplates.some((template) => template.requirements.length > 0);

  useEffect(() => {
    setResult(null);
    setMessage('');
    setDraftBlocks(NEW_SHIFT_TYPE_DEFAULTS.map((block) => ({ ...block })));
  }, [departmentId]);

  const updateDraftBlock = (key: string, patch: Partial<{ name: string; startTime: string; endTime: string }>) => {
    setDraftBlocks((blocks) => blocks.map((block) => (block.key === key ? { ...block, ...patch } : block)));
  };

  const ensureTemplatesExist = async () => {
    for (const block of draftBlocks) {
      const existingType = shiftTypes.find((type) =>
        type.code.trim().toLowerCase() === block.code.trim().toLowerCase()
        || type.name.trim().toLowerCase() === block.name.trim().toLowerCase(),
      );
      let shiftTypeId = existingType?.id;
      if (!shiftTypeId) {
        const created = await apiFetch<ShiftTypeRecord>('/shift-types', {
          method: 'POST',
          body: JSON.stringify({
            tenantId: user.tenantId,
            name: block.name,
            code: block.code,
            startTime: block.startTime,
            endTime: block.endTime,
            duration: computeShiftDurationHours(block.startTime, block.endTime),
            nightShift: block.nightShift,
          }),
        }, user.accessToken);
        shiftTypeId = created.id;
      }
      await apiFetch('/shift-templates', {
        method: 'POST',
        body: JSON.stringify({ tenantId: user.tenantId, departmentId, shiftTypeId }),
      }, user.accessToken);
    }
    await onTemplatesChanged();
  };

  const handleGenerate = async () => {
    if (!departmentId) {
      setMessage('Selecciona un área antes de generar.');
      return;
    }

    const requirements = Object.entries(draftCounts)
      .filter(([, count]) => Number(count) > 0)
      .map(([employeeTypeId, requiredCount]) => ({ employeeTypeId, requiredCount: Number(requiredCount) }));

    if (!requirements.length && !hasAnyBaseRequirement) {
      setMessage('Define el personal requerido: esta área no tiene bloques con personal configurado por defecto.');
      return;
    }

    try {
      setGenerating(true);
      setMessage('');
      setResult(null);

      if (needsInlineTemplates) {
        await ensureTemplatesExist();
      }

      const data = await apiFetch<ShiftTemplateGenerateNextUncoveredSummary>('/shift-templates/generate-next-uncovered', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: user.tenantId,
          departmentId,
          requirements: requirements.length ? requirements : undefined,
        }),
      }, user.accessToken);

      setResult(data);
      await onTemplatesChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo generar y asignar los turnos');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start sm:items-center justify-center p-4 z-50 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full my-8 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0"><Wand2 size={18} /></span>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Automatizar turnos</h2>
              <p className="text-xs text-gray-500">Genera y asigna automáticamente el próximo turno sin cubrir de un área.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-transparent border-0 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {message ? (
          <div className="rounded-lg p-3 mb-4 text-sm font-medium bg-red-50 border border-red-200 text-red-800">{message}</div>
        ) : null}

        <label className="flex flex-col gap-1 text-xs text-gray-600 mb-4">
          <span>Área</span>
          <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">Selecciona un área</option>
            {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
          </select>
        </label>

        {needsInlineTemplates ? (
          <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 mb-4">
            <p className="text-xs font-medium text-amber-800 mb-3">
              Esta área todavía no tiene bloques de turno configurados. Se van a crear estos 3 antes de generar (puedes editarlos):
            </p>
            <div className="space-y-2">
              {draftBlocks.map((block) => (
                <div key={block.key} className="grid grid-cols-3 gap-2 items-center bg-white rounded-lg border border-amber-100 p-2">
                  <input
                    value={block.name}
                    onChange={(e) => updateDraftBlock(block.key, { name: e.target.value })}
                    className="text-sm border border-gray-200 rounded-lg px-2 py-1.5"
                  />
                  <input
                    type="time"
                    value={block.startTime}
                    onChange={(e) => updateDraftBlock(block.key, { startTime: e.target.value })}
                    className="text-sm border border-gray-200 rounded-lg px-2 py-1.5"
                  />
                  <input
                    type="time"
                    value={block.endTime}
                    onChange={(e) => updateDraftBlock(block.key, { endTime: e.target.value })}
                    className="text-sm border border-gray-200 rounded-lg px-2 py-1.5"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Personal requerido</p>
        <RoleRequirementChips
          employeeTypes={employeeTypes}
          draftCounts={draftCounts}
          onAdd={(employeeTypeId, count) => setDraftCounts({ ...draftCounts, [employeeTypeId]: count })}
          onRemove={(employeeTypeId) => { const next = { ...draftCounts }; delete next[employeeTypeId]; setDraftCounts(next); }}
        />
        {!Object.keys(draftCounts).length && hasAnyBaseRequirement ? (
          <p className="text-xs text-gray-400 mt-1">Si no agregas roles aquí, se usa el personal requerido ya configurado en cada bloque de la plantilla.</p>
        ) : null}

        <button
          onClick={handleGenerate}
          disabled={generating || !departmentId}
          className="mt-4 flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg border-0 cursor-pointer"
        >
          <Wand2 size={16} /> {generating ? 'Generando...' : 'Generar y asignar automáticamente'}
        </button>

        {result ? (
          <div className="mt-5 border-t border-gray-100 pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-gray-900">{result.generated}</p>
                <p className="text-xs text-gray-500">Turnos generados</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-green-700">{result.fullyCovered}</p>
                <p className="text-xs text-green-600">Cubiertos</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-amber-700">{result.partiallyCovered}</p>
                <p className="text-xs text-amber-600">Parciales</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-gray-900">{result.uncovered}</p>
                <p className="text-xs text-gray-500">Sin cubrir</p>
              </div>
            </div>

            <div className="space-y-3">
              {result.shifts.map((shift) => (
                <div key={shift.shiftId} className="border border-gray-200 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{shift.templateName}</p>
                      <p className="text-xs text-gray-500">{new Date(shift.date).toLocaleDateString('es-ES')}</p>
                    </div>
                    <CoverageBadge status={shift.coverageStatus} />
                  </div>
                  <div className="space-y-2">
                    {shift.requirements.map((requirement) => (
                      <div key={requirement.employeeTypeId} className="text-xs bg-gray-50 rounded-lg p-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-800">{requirement.employeeTypeName}</span>
                          <span className="text-gray-500">{requirement.assignedEmployees.length}/{requirement.requiredCount} cubiertos</span>
                        </div>
                        {requirement.assignedEmployees.length ? (
                          <p className="text-green-700 mt-1">{requirement.assignedEmployees.map((employee) => employee.employeeName).join(', ')}</p>
                        ) : null}
                        {requirement.pendingReasons.length ? (
                          <div className="mt-1 space-y-0.5">
                            {requirement.pendingReasons.map((pending, index) => (
                              <p key={index} className="text-red-600 flex items-start gap-1">
                                <AlertTriangle size={11} className="mt-0.5 shrink-0" />
                                <span><span className="font-medium">{pending.employeeName}:</span> {pending.reasons.join(' · ')}</span>
                              </p>
                            ))}
                          </div>
                        ) : requirement.pendingCount > 0 ? (
                          <p className="text-gray-400 mt-1">Sin candidatos evaluados para este rol (revisa que haya empleados con este tipo de empleado cargado).</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {result.skippedTemplates.length ? (
              <div className="mt-3 text-xs text-gray-500 bg-gray-50 rounded-lg p-3 space-y-1">
                {result.skippedTemplates.map((item) => (
                  <p key={item.templateId} className="flex items-start gap-1">
                    <AlertTriangle size={12} className="text-amber-500 mt-0.5 shrink-0" />
                    <span>{item.shiftTypeName}: no se encontró una fecha sin cobertura en el horizonte considerado.</span>
                  </p>
                ))}
              </div>
            ) : null}

            <button onClick={onClose} className="mt-4 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg border border-gray-200 cursor-pointer">
              Cerrar
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ShiftTemplatesPage({ departments, employeeTypes, user }: {
  departments: Department[];
  employeeTypes: EmployeeTypeRecord[];
  user: AuthUser;
}) {
  const [templates, setTemplates] = useState<ShiftTemplateRecord[]>([]);
  const [shiftTypes, setShiftTypes] = useState<ShiftTypeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [newTemplate, setNewTemplate] = useState({ departmentId: '', shiftTypeId: '' });
  const [generateForm, setGenerateForm] = useState({ startDate: '', endDate: '' });
  const [generateDepartmentIds, setGenerateDepartmentIds] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<ShiftTemplateGenerateSummary | null>(null);
  const [showAutomateModal, setShowAutomateModal] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const loadTemplates = async () => {
    if (!user.tenantId) return;
    try {
      setLoading(true);
      const [templatesData, shiftTypesData] = await Promise.all([
        apiFetch<ShiftTemplateRecord[]>(`/shift-templates?tenantId=${encodeURIComponent(user.tenantId)}`, {}, user.accessToken),
        apiFetch<ShiftTypeRecord[]>(`/shift-types?tenantId=${encodeURIComponent(user.tenantId)}`, {}, user.accessToken),
      ]);
      setTemplates(templatesData || []);
      setShiftTypes(shiftTypesData || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudieron cargar las plantillas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTemplates(); }, [user.tenantId]);

  useEffect(() => {
    if (!message) return undefined;
    const timeout = window.setTimeout(() => setMessage(''), 5000);
    return () => window.clearTimeout(timeout);
  }, [message]);

  const handleCreateTemplate = async () => {
    try {
      if (!newTemplate.departmentId || !newTemplate.shiftTypeId) {
        setMessage('Completa área y bloque antes de guardar.');
        return;
      }
      await apiFetch<ShiftTemplateRecord>('/shift-templates', {
        method: 'POST',
        body: JSON.stringify({ tenantId: user.tenantId, ...newTemplate }),
      }, user.accessToken);
      setMessage('Bloque de turno creado correctamente.');
      setNewTemplate({ departmentId: '', shiftTypeId: '' });
      await loadTemplates();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo crear el bloque de turno');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    const confirmed = window.confirm('¿Eliminar este bloque de turno? Los turnos ya generados a partir de él no se ven afectados.');
    if (!confirmed) return;
    try {
      await apiFetch(`/shift-templates/${id}`, { method: 'DELETE' }, user.accessToken);
      setMessage('Bloque eliminado.');
      await loadTemplates();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo eliminar el bloque');
    }
  };

  const toggleGenerateDepartment = (departmentId: string) => {
    setGenerateDepartmentIds((current) => current.includes(departmentId)
      ? current.filter((id) => id !== departmentId)
      : [...current, departmentId]);
  };

  const handleGenerate = async () => {
    try {
      if (!generateForm.startDate || !generateForm.endDate) {
        setMessage('Completa el rango de fechas antes de generar.');
        return;
      }
      setGenerating(true);
      setGenerateResult(null);
      const data = await apiFetch<ShiftTemplateGenerateSummary>('/shift-templates/generate', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: user.tenantId,
          startDate: generateForm.startDate,
          endDate: generateForm.endDate,
          departmentIds: generateDepartmentIds.length ? generateDepartmentIds : undefined,
          assignedBy: user.id,
        }),
      }, user.accessToken);
      setGenerateResult(data);
      setMessage(`${data.generated} turnos generados (${data.fullyCovered} cubiertos, ${data.partiallyCovered + data.uncovered} con personal pendiente).`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudieron generar los turnos');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveRequirements = async (id: string, counts: Record<string, number>) => {
    try {
      const requirements = Object.entries(counts)
        .filter(([, count]) => Number(count) > 0)
        .map(([employeeTypeId, requiredCount]) => ({ employeeTypeId, requiredCount: Number(requiredCount) }));
      await apiFetch(`/shift-templates/${id}/requirements`, {
        method: 'PUT',
        body: JSON.stringify({ requirements }),
      }, user.accessToken);
      setMessage('Personal requerido guardado correctamente.');
      await loadTemplates();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo guardar el personal requerido');
    }
  };

  const templatesByDepartment = departments.map((department) => ({
    department,
    templates: templates.filter((template) => template.departmentId === department.id),
  }));

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <p className="text-xs font-semibold tracking-widest text-indigo-600 uppercase mb-1">Motor inteligente</p>
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Generación automática de turnos</h1>
        <p className="text-sm text-gray-500">
          Genera y asigna turnos automáticamente por área. La configuración de plantillas y bloques horarios queda disponible más abajo, como configuración avanzada.
        </p>
      </div>

      {message ? (
        <div className={`rounded-xl p-4 mb-4 flex items-center gap-3 text-sm font-medium ${/no se pud|completa/i.test(message) ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-green-50 border border-green-200 text-green-800'}`}>
          {message}
        </div>
      ) : null}

      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-white">
        <div>
          <p className="text-sm font-semibold flex items-center gap-2"><Wand2 size={16} /> Automatizar turnos</p>
          <p className="text-xs text-indigo-100 mt-1">Elige un área: el sistema calcula el próximo turno sin cubrir de cada bloque y lo asigna automáticamente.</p>
        </div>
        <button
          onClick={() => setShowAutomateModal(true)}
          className="shrink-0 bg-white text-indigo-700 text-sm font-medium px-4 py-2 rounded-lg border-0 cursor-pointer hover:bg-indigo-50"
        >
          Automatizar turnos
        </button>
      </div>

      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="w-full flex items-center justify-between text-xs font-semibold tracking-widest text-gray-400 uppercase mb-3 bg-transparent border-0 cursor-pointer p-0 hover:text-gray-600"
      >
        <span>Configuración avanzada</span>
        {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {showAdvanced ? (
        <>
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Wand2 size={16} className="text-indigo-600" />
          <p className="text-sm font-medium text-gray-900">Generar turnos</p>
        </div>
        <p className="text-xs text-gray-500 mb-3">Crea un turno real por cada combinación de plantilla × día en el rango elegido, y corre la asignación automática sobre cada uno.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <label className="flex flex-col gap-1 text-xs text-gray-600">
            <span>Desde</span>
            <input type="date" value={generateForm.startDate} onChange={(e) => setGenerateForm({ ...generateForm, startDate: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-600">
            <span>Hasta</span>
            <input type="date" value={generateForm.endDate} onChange={(e) => setGenerateForm({ ...generateForm, endDate: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </label>
          <div className="col-span-2 flex flex-col gap-1 text-xs text-gray-600">
            <span>Áreas (opcional, todas si no eliges ninguna)</span>
            <div className="flex flex-wrap gap-2">
              {departments.map((department) => (
                <button
                  key={department.id}
                  type="button"
                  onClick={() => toggleGenerateDepartment(department.id)}
                  className={`text-xs px-2.5 py-1.5 rounded-full border cursor-pointer ${generateDepartmentIds.includes(department.id) ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-gray-600 border-gray-200'}`}
                >
                  {department.name}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button onClick={handleGenerate} disabled={generating} className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg border-0 cursor-pointer">
          <Wand2 size={16} /> {generating ? 'Generando...' : 'Generar turnos'}
        </button>

        {generateResult ? (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-3">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-gray-900">{generateResult.generated}</p>
                <p className="text-xs text-gray-500">Creados</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-green-700">{generateResult.fullyCovered}</p>
                <p className="text-xs text-green-600">Cubiertos</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-amber-700">{generateResult.partiallyCovered}</p>
                <p className="text-xs text-amber-600">Parciales</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-gray-900">{generateResult.uncovered}</p>
                <p className="text-xs text-gray-500">Sin cubrir</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-gray-500">{generateResult.skipped}</p>
                <p className="text-xs text-gray-500">Ya existían</p>
              </div>
            </div>
            {generateResult.shifts.length ? (
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50"><th className="text-left px-3 py-2 font-medium text-gray-600 text-xs">Área</th><th className="text-left px-3 py-2 font-medium text-gray-600 text-xs">Bloque</th><th className="text-left px-3 py-2 font-medium text-gray-600 text-xs">Fecha</th><th className="text-left px-3 py-2 font-medium text-gray-600 text-xs">Cobertura</th></tr></thead>
                  <tbody>
                    {generateResult.shifts.map((item) => (
                      <tr key={item.shiftId} className="border-t border-gray-100">
                        <td className="px-3 py-2 text-gray-800">{item.departmentName}</td>
                        <td className="px-3 py-2 text-gray-600">{item.templateName}</td>
                        <td className="px-3 py-2 text-gray-600">{new Date(item.date).toLocaleDateString('es-ES')}</td>
                        <td className="px-3 py-2"><CoverageBadge status={item.coverageStatus} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5">
        <p className="text-sm font-medium text-gray-900 mb-3">Nuevo bloque de turno</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs text-gray-600">
            <span>Área</span>
            <select value={newTemplate.departmentId} onChange={(e) => setNewTemplate({ ...newTemplate, departmentId: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
              <option value="">Selecciona un área</option>
              {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-600">
            <span>Bloque</span>
            <select value={newTemplate.shiftTypeId} onChange={(e) => setNewTemplate({ ...newTemplate, shiftTypeId: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
              <option value="">Selecciona un bloque</option>
              {shiftTypes.map((shiftType) => <option key={shiftType.id} value={shiftType.id}>{shiftType.name} ({shiftType.startTime}-{shiftType.endTime})</option>)}
            </select>
          </label>
        </div>
        <button onClick={handleCreateTemplate} className="mt-3 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg border-0 cursor-pointer">
          <Plus size={16} /> Crear bloque
        </button>
      </div>

      {loading ? <p className="text-sm text-gray-500">Cargando plantillas...</p> : null}

      {!loading && !departments.length ? (
        <p className="text-sm text-gray-500">Todavía no hay áreas creadas — crea un departamento primero desde la sección de Empleados.</p>
      ) : null}

      {templatesByDepartment.map(({ department, templates: departmentTemplates }) => (
        <div key={department.id} className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">{department.name}</h3>
          {departmentTemplates.length ? (
            departmentTemplates.map((template) => (
              <ShiftTemplateCard
                key={template.id}
                template={template}
                employeeTypes={employeeTypes}
                onDelete={handleDeleteTemplate}
                onSaveRequirements={handleSaveRequirements}
              />
            ))
          ) : (
            <p className="text-xs text-gray-400">Sin bloques configurados todavía para esta área.</p>
          )}
        </div>
      ))}
        </>
      ) : null}

      {showAutomateModal ? (
        <AutomateShiftsModal
          departments={departments}
          employeeTypes={employeeTypes}
          shiftTypes={shiftTypes}
          templates={templates}
          user={user}
          onClose={() => setShowAutomateModal(false)}
          onTemplatesChanged={loadTemplates}
        />
      ) : null}
    </div>
  );
}

function DepartmentMaxStaffRow({ department, onSave }: { department: Department; onSave: (departmentId: string, maxStaff: string) => void }) {
  const [value, setValue] = useState(department.maxStaff ? String(department.maxStaff) : '');
  return (
    <tr className="border-t border-gray-100">
      <td className="px-3 py-2 text-gray-800">{department.name}</td>
      <td className="px-3 py-2 text-center"><input type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-center w-20" /></td>
      <td className="px-3 py-2 text-center"><button className="text-indigo-600 hover:text-indigo-700 text-xs font-medium bg-transparent border-0 cursor-pointer" onClick={() => onSave(department.id, value)}>Guardar</button></td>
    </tr>
  );
}

function RequestsPage({ requests, user, onApprove, onReject, onCreateRequest, requestForm, setRequestForm, notifications }: { requests: RequestRecord[]; user: AuthUser; onApprove: (id: string) => void; onReject: (id: string) => void; onCreateRequest: () => void; requestForm: { reason: string; requestedDate: string; tenantId: string; }; setRequestForm: (value: any) => void; notifications?: any[]; }) {
  const isAdmin = user.role === 'ADMIN';

  return (
    <div>
      <header className="page-header">
        <div>
          <p className="eyebrow accent">Solicitudes</p>
          <h1>Solicitudes</h1>
        </div>
      </header>

      {!isAdmin ? (
        <div className="panel">
          <h3>Nueva solicitud</h3>
          <div className="auth-form">
            <label><span>Fecha</span><input type="date" value={requestForm.requestedDate} onChange={(e) => setRequestForm({ ...requestForm, requestedDate: e.target.value })} /></label>
            <label><span>Motivo</span><textarea value={requestForm.reason} onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })} rows={4} /></label>
            <button className="primary-btn small" onClick={onCreateRequest}>Guardar solicitud</button>
          </div>
        </div>
      ) : null}

      {!isAdmin && notifications && notifications.length > 0 ? (
        <div className="panel" style={{ marginTop: 20, backgroundColor: '#f0f9ff', borderLeft: '4px solid #2563eb' }}>
          <h3 style={{ color: '#1e40af', marginTop: 0 }}>📬 Estado de tus solicitudes</h3>
          <ul className="list">
            {notifications.slice(0, 3).map((notification) => (
              <li key={notification.id} style={{ backgroundColor: '#fff', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <div className="flex items-center justify-between">
                  <span style={{ color: '#2563eb', fontWeight: 600 }}>{notification.title}</span>
                  <RelativeTime dateString={notification.createdAt} />
                </div>
                <strong style={{ display: 'block', marginTop: '4px' }}>{notification.message}</strong>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="panel" style={{ marginTop: 20 }}>
        <h3>Mis solicitudes</h3>
        <ul className="list">
          {requests.map((request) => (
            <li key={request.id} className="items-start">
              <div className="flex flex-col gap-1">
                <span>{request.reason}</span>
                <RelativeTime dateString={request.requestedDate} />
                {isAdmin && request.status === 'PENDING' ? (
                  <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                    <button className="primary-btn small" onClick={() => onApprove(request.id)}>Aprobar</button>
                    <button className="secondary-btn small" onClick={() => onReject(request.id)}>Rechazar</button>
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-2.5">
                <Avatar firstName={request.employee?.user?.firstName} lastName={request.employee?.user?.lastName} />
                <strong>{request.employee?.user ? `${request.employee.user.firstName} ${request.employee.user.lastName}` : 'Usuario'}</strong>
              </div>
              <div className="text-right">
                <StatusBadge status={request.status} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SchedulePage({ shifts, user }: { shifts: ShiftRecord[]; user: AuthUser; }) {
  const [month, setMonth] = useState(() => new Date());
  const isAdmin = user.role === 'ADMIN';
  const calendarShifts = isAdmin
    ? shifts.filter((shift) => shift.status !== 'CANCELLED')
    : shifts.filter((shift) => shift.status !== 'CANCELLED' && shift.assignments.some((assignment) => assignment.employee?.user?.id === user.id));

  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const calendarDays = Array.from({ length: mondayOffset + daysInMonth }, (_, index) => {
    if (index < mondayOffset) return null;
    return new Date(month.getFullYear(), month.getMonth(), index - mondayOffset + 1);
  });

  const shiftsForDay = (day: Date) => calendarShifts.filter((shift) => {
    const current = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
    const start = new Date(shift.startDate).setHours(0, 0, 0, 0);
    const end = new Date(shift.endDate).setHours(0, 0, 0, 0);
    return current >= start && current <= end;
  });

  return (
    <div>
      <header className="page-header schedule-heading">
        <div>
          <p className="eyebrow accent">Planificación operativa</p>
          <h1>Calendario</h1>
          <p className="page-subtitle">Solo se muestran los turnos publicados y asignados.</p>
        </div>
        <div className="calendar-controls">
          <button className="secondary-btn small" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>Anterior</button>
          <strong>{month.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</strong>
          <button className="secondary-btn small" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>Siguiente</button>
        </div>
      </header>

      <div className="panel calendar-panel real-calendar">
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => <div key={day} className="calendar-weekday">{day}</div>)}
        {calendarDays.map((day, index) => {
          const daySchedules = day ? shiftsForDay(day) : [];
          return <div key={day?.toISOString() || `empty-${index}`} className={day ? 'calendar-cell' : 'calendar-cell empty'}>
            {day ? <><strong>{day.getDate()}</strong>{daySchedules.map((shift) => <span className="calendar-event" key={shift.id}>{shift.assignments.map((item) => item.employee?.user ? `${item.employee.user.firstName} ${item.employee.user.lastName}` : 'Empleado').join(', ') || 'Sin asignar'}<small>{shift.startTime} - {shift.endTime}</small></span>)}</> : null}
          </div>;
        })}
      </div>
    </div>
  );
}

function NotificationsPage({ notifications, onRead }: { notifications: NotificationRecord[]; onRead: (notificationId: string) => Promise<void> }) {
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  return (
    <div>
      <header className="page-header">
        <div>
          <p className="eyebrow accent">Centro de avisos</p>
          <h1>Notificaciones</h1>
          <p className="page-subtitle">Consulta tus asignaciones, cambios y actualizaciones.</p>
        </div>
        <span className={unreadCount ? 'notification-count has-unread' : 'notification-count'}>
          {unreadCount} sin leer
        </span>
      </header>

      <div className="notifications-list">
        {notifications.length ? notifications.map((notification) => (
          <article className={notification.read ? 'notification-card notification-read' : 'notification-card notification-unread'} key={notification.id} onClick={() => !notification.read && onRead(notification.id)}>
            <div className="notification-card-icon"><Bell size={18} aria-hidden="true" /></div>
            <div className="notification-card-content">
              <div className="notification-card-heading">
                <h3>{notification.title}</h3>
                {!notification.read ? <span className="notification-dot">Nueva</span> : null}
              </div>
              <p>{notification.message}</p>
              <div className="notification-card-footer">
                <time>{new Date(notification.createdAt).toLocaleString('es-ES')}</time>
                {!notification.read ? <button type="button" className="notification-read-button" onClick={(event) => { event.stopPropagation(); onRead(notification.id); }}>Marcar como leída</button> : <span className="read-label">✓ Leída</span>}
              </div>
            </div>
          </article>
        )) : (
          <div className="panel empty-notifications">
            <Bell size={30} aria-hidden="true" />
            <h3>No tienes notificaciones</h3>
            <p>Cuando recibas una asignación o actualización aparecerá aquí.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<AuthUser | null>(() => {
    const savedUser = localStorage.getItem('turnosmart-user');
    if (!savedUser) return null;
    try {
      return JSON.parse(savedUser);
    } catch {
      localStorage.removeItem('turnosmart-user');
      return null;
    }
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('turnosmart-user', JSON.stringify(user));
    } else {
      localStorage.removeItem('turnosmart-user');
    }
  }, [user]);

  const handleLogin = (newUser: AuthUser) => {
    setUser(newUser);
  };

  const handleLogout = () => {
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <Routes>
      <Route path="/" element={<HomePage theme={theme} onToggleTheme={toggleTheme} />} />
      <Route path="/login" element={user ? <Navigate to="/app/dashboard" replace /> : <LoginPage onLogin={handleLogin} />} />
      <Route path="/app/*" element={user ? <AppShell user={user} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme} /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to={user ? '/app/dashboard' : '/'} replace />} />
    </Routes>
  );
}
