import { useEffect, useState } from 'react';
import { Bell, CalendarDays, CalendarClock, ClipboardList, LayoutDashboard, Users, Wand2, Upload, Check, X, ChevronDown, ChevronUp, AlertTriangle, Clock, MapPin, TrendingUp, Settings, Plus, Search, Users2, ShieldCheck, Building2, Circle } from 'lucide-react';
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { StatusBadge } from './components/ui/StatusBadge';
import { Avatar } from './components/ui/Avatar';
import { DepartmentBadge } from './components/ui/DepartmentBadge';
import { StatCard } from './components/ui/StatCard';
import { RelativeTime } from './components/ui/RelativeTime';

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

type AutoAssignSummary = {
  shiftId: string;
  coverage: string;
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
  shiftTypeId?: string | null;
  department?: Department | null;
  assignments: ShiftAssignmentRecord[];
};

const demoUser = {
  email: 'admin@turnosmart.com',
  password: 'admin123',
  name: 'Admin TurnoSmart',
};

const dashboardStats = [
  { label: 'Empleados', value: '0', trend: 'Live', icon: Users },
  { label: 'Turnos activos', value: '0', trend: 'Live', icon: CalendarDays },
  { label: 'Solicitudes', value: '0', trend: 'Live', icon: ClipboardList },
  { label: 'Cobertura', value: '100%', trend: 'Live', icon: ShieldCheck },
];

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

function HomePage() {
  return (
    <main className="landing-shell">
      <nav className="topbar">
        <div className="brand-wrap">
          <img src="/logo.png" alt="TurnoSmart" className="h-10 w-auto object-contain" />
          <div>
            <p className="eyebrow">TurnoSmart</p>
            <h2>Gestión operativa</h2>
          </div>
        </div>
        <button className="primary-btn" onClick={() => (window.location.href = '/login')}>
          Iniciar sesión
        </button>
      </nav>

      <section className="hero-card">
        <div>
          <p className="eyebrow accent">Plataforma hospitalaria</p>
          <h1>Organiza turnos, empleados y solicitudes en un solo lugar.</h1>
          <p className="hero-copy">
            Centraliza la programación, mejora la cobertura y reduce errores en la gestión del personal.
          </p>
          <div className="hero-actions">
            <button className="primary-btn" onClick={() => (window.location.href = '/login')}>
              Acceder ahora
            </button>
            <button className="secondary-btn" onClick={() => (window.location.href = '/login')}>
              Ver demo
            </button>
          </div>
        </div>

        <div className="stats-grid">
          {dashboardStats.slice(0, 3).map((stat) => (
            <StatCard key={stat.label} label={stat.label} value={stat.value} trend={stat.trend} icon={stat.icon} />
          ))}
        </div>
      </section>
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
    <main className="auth-shell">
      <div className="auth-card">
        <div className="auth-header">
          <img src="/logo.png" alt="TurnoSmart" className="h-12 w-auto object-contain" />
          <div>
            <p className="eyebrow">TurnoSmart</p>
            <h2>Iniciar sesión</h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@turnosmart.com"
            />
          </label>

          <label>
            <span>Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="admin123"
            />
          </label>

          {error ? <p className="error-text">{error}</p> : null}

          <button type="submit" className="primary-btn full-width" disabled={loading}>
            {loading ? 'Ingresando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  );
}

function AppShell({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
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
          phone: userForm.phone,
        }),
      }, user.accessToken);
      setStatusMsg('Usuario creado correctamente');
      setUserForm({ email: '', password: '', firstName: '', lastName: '', role: 'EMPLOYEE', tenantId: user.tenantId || '', departmentId: '', phone: '' });
      await loadEverything();
    } catch (error) {
      setStatusMsg(error instanceof Error ? error.message : 'No se pudo crear el usuario');
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
    ...(user.role === 'ADMIN' ? [{ label: 'Asignación automática', to: '/app/auto-assign', icon: Wand2 }] : []),
    { label: 'Solicitudes', to: '/app/requests', icon: ClipboardList, count: pendingRequestsCount },
    { label: 'Calendario', to: '/app/schedule', icon: CalendarDays },
    { label: 'Notificaciones', to: '/app/notifications', icon: Bell, count: unreadNotificationsCount },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src="/logo.png" alt="TurnoSmart" className="h-10 w-auto object-contain" />
          <div>
            <p className="eyebrow">TurnoSmart</p>
            <strong>{user.role}</strong>
          </div>
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
          <Route path="employees" element={<EmployeesPage users={users} departments={departments} employeeTypes={employeeTypes} currentUserId={user.id} canManageUsers={user.role === 'ADMIN'} onToggleUser={handleToggleUser} accessToken={user.accessToken} tenantId={user.tenantId} onImported={loadEverything} />} />
          <Route path="shifts" element={<ShiftsPage shifts={shifts} departments={departments} users={users} user={user} onCreate={handleCreateShift} onUpdate={handleUpdateShift} onAssign={handleAssignShift} />} />
          {user.role === 'ADMIN' ? (
            <Route path="auto-assign" element={<AutoAssignPage shifts={shifts} departments={departments} employeeTypes={employeeTypes} user={user} onRefresh={loadEverything} onAssignEmployee={handleAssignShift} />} />
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
            Ir a asignación automática
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

function EmployeesPage({ users, departments, employeeTypes, currentUserId, canManageUsers, onToggleUser, accessToken, tenantId, onImported }: {
  users: UserRecord[];
  departments: Department[];
  employeeTypes: EmployeeTypeRecord[];
  currentUserId: string;
  canManageUsers: boolean;
  onToggleUser: (id: string, active: boolean) => void;
  accessToken: string;
  tenantId?: string;
  onImported: () => Promise<void>;
}) {
  const [showImport, setShowImport] = useState(false);
  const [rawText, setRawText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{ total: number; importedCount: number; errorCount: number; duplicateCount: number; errors: { row: number; email?: string; message: string }[]; duplicates: { row: number; email?: string; message: string }[] } | null>(null);
  const [importError, setImportError] = useState('');

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
      await onImported();
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
          <p className="page-subtitle">
            Columnas admitidas: firstName, lastName, email, role, department, employeeType, position.
            Departamentos disponibles: {departments.map((d) => d.name).join(', ') || 'ninguno'}.
            Tipos disponibles: {employeeTypes.map((t) => t.name).join(', ') || 'ninguno'}.
          </p>
          <div className="auth-form">
            <label><span>Archivo CSV</span><input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} /></label>
            <label><span>O pega el contenido CSV aquí</span><textarea rows={6} value={rawText} onChange={(e) => setRawText(e.target.value)} placeholder={'firstName,lastName,email,role,department,employeeType,position'} /></label>
            {importError ? <p className="error-text">{importError}</p> : null}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="primary-btn small" disabled={importing || !rawText.trim()} onClick={handleImport}>{importing ? 'Importando...' : 'Importar'}</button>
              <button className="secondary-btn small" onClick={() => { setShowImport(false); setRawText(''); setImportSummary(null); setImportError(''); }}>Cerrar</button>
            </div>
          </div>

          {importSummary ? (
            <div style={{ marginTop: 16 }}>
              <p>Total de registros: <strong>{importSummary.total}</strong></p>
              <p>Importados correctamente: <strong>{importSummary.importedCount}</strong></p>
              <p>Registros con errores: <strong>{importSummary.errorCount}</strong></p>
              <p>Duplicados: <strong>{importSummary.duplicateCount}</strong></p>
              {importSummary.errors.length ? (
                <ul className="list">
                  {importSummary.errors.map((item, index) => <li key={index}><span>Fila {item.row}{item.email ? ` (${item.email})` : ''}</span><em>{item.message}</em></li>)}
                </ul>
              ) : null}
              {importSummary.duplicates.length ? (
                <ul className="list">
                  {importSummary.duplicates.map((item, index) => <li key={index}><span>Fila {item.row}{item.email ? ` (${item.email})` : ''}</span><em>Duplicado</em></li>)}
                </ul>
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
              {canManageUsers ? <><th>Rol</th><th>Estado</th></> : null}
              {canManageUsers ? <th>Acción</th> : null}
            </tr>
          </thead>
          <tbody>
            {users.map((person) => (
              <tr key={person.id}>
                <td>
                  <div className="flex items-center gap-2.5">
                    <Avatar firstName={person.firstName} lastName={person.lastName} />
                    <span className="font-medium">{person.firstName} {person.lastName}</span>
                  </div>
                </td>
                <td><DepartmentBadge name={person.employee?.department?.name} /></td>
                {canManageUsers ? <>
                  <td>{person.role}</td>
                  <td>
                    <StatusBadge status={person.active ? 'ACTIVO' : 'SUSPENDIDO'} />
                  </td>
                </> : null}
                {canManageUsers ? <td>{person.id === currentUserId ? <span className="muted-action">Cuenta actual</span> : <button className={person.active ? 'secondary-btn small' : 'primary-btn small'} onClick={() => onToggleUser(person.id, !person.active)}>{person.active ? 'Suspender' : 'Activar'}</button>}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ShiftsPage({ shifts, departments, users, user, onCreate, onUpdate, onAssign }: {
  shifts: ShiftRecord[];
  departments: Department[];
  users: UserRecord[];
  user: AuthUser;
  onCreate: (data: { employeeId: string; departmentId: string; startDate: string; endDate: string; startTime: string; endTime: string }) => void;
  onUpdate: (id: string, data: { departmentId: string; startDate: string; endDate: string; startTime: string; endTime: string; status: string }) => void;
  onAssign: (shiftId: string, employeeId: string) => void;
}) {
  const isAdmin = user.role === 'ADMIN';
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ employeeId: '', departmentId: '', startDate: '', endDate: '', startTime: '', endTime: '', status: 'PUBLISHED' });
  const [assignment, setAssignment] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const assignableUsers = users.filter((person) => person.employee);
  const visibleShifts = isAdmin ? shifts : shifts.filter((shift) => shift.assignments.some((item) => item.employee?.user?.id === user.id));

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
            {editingId ? <label><span>Estado</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="DRAFT">Borrador</option><option value="PUBLISHED">Publicado</option><option value="CANCELLED">Cancelado</option></select></label> : null}
            <button className="primary-btn small" type="submit" disabled={!editingId && !assignableUsers.length}>{editingId ? 'Guardar cambios' : 'Crear turno'}</button>
            {editingId ? <button className="secondary-btn small" type="button" onClick={() => { setEditingId(null); setForm({ employeeId: '', departmentId: '', startDate: '', endDate: '', startTime: '', endTime: '', status: 'PUBLISHED' }); }}>Cancelar</button> : null}
          </div>
          {formError ? <p className="form-error form-error-banner">{formError}</p> : null}
        </form>
      ) : null}

      <div className="panel table-panel">
        <table>
          <thead><tr><th>Asignación</th><th>Periodo</th><th>Horario</th><th>Área</th><th>Estado</th>{isAdmin ? <th>Acciones</th> : null}</tr></thead>
          <tbody>
            {visibleShifts.map((shift) => <tr key={shift.id}>
              <td>
                {shift.assignments.length ? (
                  <div className="flex items-center gap-2">
                    {shift.assignments.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2" title={item.employee?.user ? `${item.employee.user.firstName} ${item.employee.user.lastName}` : 'Empleado'}>
                        <Avatar firstName={item.employee?.user?.firstName} lastName={item.employee?.user?.lastName} />
                        <span className="text-sm font-medium">{item.employee?.user ? `${item.employee.user.firstName} ${item.employee.user.lastName}` : 'Empleado'}</span>
                      </div>
                    ))}
                  </div>
                ) : <span className="text-sm text-gray-400">Sin asignar</span>}
              </td>
              <td>{new Date(shift.startDate).toLocaleDateString('es-ES')} - {new Date(shift.endDate).toLocaleDateString('es-ES')}</td>
              <td>{shift.startTime} - {shift.endTime}</td>
              <td><DepartmentBadge name={shift.department?.name} /></td>
              <td><StatusBadge status={shift.status} /></td>
              {isAdmin ? <td><div className="shift-actions"><button className="secondary-btn small" onClick={() => { setEditingId(shift.id); setForm({ employeeId: shift.assignments[0]?.employeeId || '', departmentId: shift.department?.id || '', startDate: new Date(shift.startDate).toISOString().slice(0, 10), endDate: new Date(shift.endDate).toISOString().slice(0, 10), startTime: shift.startTime, endTime: shift.endTime, status: shift.status }); }}>Editar</button><select value={assignment[shift.id] || ''} onChange={(event) => setAssignment({ ...assignment, [shift.id]: event.target.value })}><option value="">Reasignar empleado</option>{users.filter((person) => person.employee).map((person) => <option key={person.employee!.id} value={person.employee!.id}>{person.firstName} {person.lastName}</option>)}</select><button className="primary-btn small" disabled={!assignment[shift.id]} onClick={() => onAssign(shift.id, assignment[shift.id])}>Asignar</button></div></td> : null}
            </tr>)}
            {!visibleShifts.length ? <tr><td colSpan={isAdmin ? 6 : 5}>No hay turnos para mostrar.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
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
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Asignación automática de turnos</h1>
        <p className="text-sm text-gray-500">
          Define el personal necesario por turno y deja que el sistema busque y asigne empleados elegibles respetando todas las reglas.
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
            <span className={`ml-auto text-xs font-medium px-2 py-1 rounded-full border ${autoResult.coverage === 'COMPLETA' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
              Cobertura: {autoResult.coverage}
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
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Turno a cubrir</p>
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
            <span className={`ml-auto text-xs px-2 py-1 rounded-full border ${selectedShift.assignments.length ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
              {selectedShift.assignments.length ? `${selectedShift.assignments.length} asignado(s)` : 'Sin cubrir'}
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
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={user ? <Navigate to="/app/dashboard" replace /> : <LoginPage onLogin={handleLogin} />} />
      <Route path="/app/*" element={user ? <AppShell user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to={user ? '/app/dashboard' : '/'} replace />} />
    </Routes>
  );
}
