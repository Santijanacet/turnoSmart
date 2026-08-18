import { useEffect, useState } from 'react';
import { Bell, CalendarDays, CalendarClock, ClipboardList, LayoutDashboard, Users } from 'lucide-react';
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

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
  department?: Department | null;
  assignments: ShiftAssignmentRecord[];
};

const demoUser = {
  email: 'admin@turnosmart.com',
  password: 'admin123',
  name: 'Admin TurnoSmart',
};

const dashboardStats = [
  { label: 'Empleados', value: '0', trend: 'Live' },
  { label: 'Turnos activos', value: '0', trend: 'Live' },
  { label: 'Solicitudes', value: '0', trend: 'Live' },
  { label: 'Cobertura', value: '100%', trend: 'Live' },
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
          <div className="brand-badge">TS</div>
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
            <div key={stat.label} className="mini-stat">
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
              <em>{stat.trend}</em>
            </div>
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
          <div className="brand-badge">TS</div>
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
    { label: 'Solicitudes', to: '/app/requests', icon: ClipboardList, count: pendingRequestsCount },
    { label: 'Calendario', to: '/app/schedule', icon: CalendarDays },
    { label: 'Notificaciones', to: '/app/notifications', icon: Bell, count: unreadNotificationsCount },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-badge">TS</div>
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
          <Route path="employees" element={<EmployeesPage users={users} departments={departments} currentUserId={user.id} canManageUsers={user.role === 'ADMIN'} onToggleUser={handleToggleUser} />} />
          <Route path="shifts" element={<ShiftsPage shifts={shifts} departments={departments} users={users} user={user} onCreate={handleCreateShift} onUpdate={handleUpdateShift} onAssign={handleAssignShift} />} />
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
  return (
    <div>
      <header className="page-header">
        <div>
          <p className="eyebrow accent">Resumen</p>
          <h1>Dashboard general</h1>
        </div>
      </header>

      <section className="stats-grid dashboard-grid">
        {[
          { label: 'Empleados', value: String(users.length), trend: 'Live' },
          { label: 'Departamentos', value: String(departments.length), trend: 'Live' },
          { label: 'Solicitudes', value: String(requests.length), trend: 'Live' },
        ].map((stat) => (
          <div key={stat.label} className="mini-stat large">
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <em>{stat.trend}</em>
          </div>
        ))}
      </section>

      <section className="content-grid">
        <div className="panel">
          <h3>Usuarios registrados</h3>
          <ul className="list">
            {users.slice(0, 5).map((person) => (
              <li key={person.id}>
                <span>{person.firstName} {person.lastName}</span>
                <strong>{person.role}</strong>
                <em>{person.employee?.department?.name || 'Sin departamento'}</em>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel">
          <h3>Solicitudes recientes</h3>
          <ul className="list">
            {requests.slice(0, 5).map((request) => (
              <li key={request.id}>
                <span>{request.reason}</span>
                <strong>{request.employee?.user ? `${request.employee.user.firstName} ${request.employee.user.lastName}` : 'Usuario'}</strong>
                <em>{request.status}</em>
              </li>
            ))}
          </ul>
        </div>
      </section>

    </div>
  );
}

function EmployeesPage({ users, departments, currentUserId, canManageUsers, onToggleUser }: { users: UserRecord[]; departments: Department[]; currentUserId: string; canManageUsers: boolean; onToggleUser: (id: string, active: boolean) => void }) {
  return (
    <div>
      <header className="page-header">
        <div>
          <p className="eyebrow accent">Personal</p>
          <h1>Empleados</h1>
        </div>
      </header>

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
                <td>{person.firstName} {person.lastName}</td>
                <td>{person.employee?.department?.name || 'Sin departamento'}</td>
                {canManageUsers ? <>
                  <td>{person.role}</td>
                  <td>
                    <span className={person.active ? 'status success' : 'status warning'}>
                      {person.active ? 'Activo' : 'Suspendido'}
                    </span>
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
              <td>{shift.assignments.length ? shift.assignments.map((item) => item.employee?.user ? `${item.employee.user.firstName} ${item.employee.user.lastName}` : 'Empleado').join(', ') : 'Sin asignar'}</td>
              <td>{new Date(shift.startDate).toLocaleDateString('es-ES')} - {new Date(shift.endDate).toLocaleDateString('es-ES')}</td>
              <td>{shift.startTime} - {shift.endTime}</td>
              <td>{shift.department?.name || 'Todas'}</td>
              <td><span className={shift.status === 'PUBLISHED' ? 'status success' : 'status warning'}>{shift.status}</span></td>
              {isAdmin ? <td><div className="shift-actions"><button className="secondary-btn small" onClick={() => { setEditingId(shift.id); setForm({ employeeId: shift.assignments[0]?.employeeId || '', departmentId: shift.department?.id || '', startDate: new Date(shift.startDate).toISOString().slice(0, 10), endDate: new Date(shift.endDate).toISOString().slice(0, 10), startTime: shift.startTime, endTime: shift.endTime, status: shift.status }); }}>Editar</button><select value={assignment[shift.id] || ''} onChange={(event) => setAssignment({ ...assignment, [shift.id]: event.target.value })}><option value="">Reasignar empleado</option>{users.filter((person) => person.employee).map((person) => <option key={person.employee!.id} value={person.employee!.id}>{person.firstName} {person.lastName}</option>)}</select><button className="primary-btn small" disabled={!assignment[shift.id]} onClick={() => onAssign(shift.id, assignment[shift.id])}>Asignar</button></div></td> : null}
            </tr>)}
            {!visibleShifts.length ? <tr><td colSpan={isAdmin ? 6 : 5}>No hay turnos para mostrar.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
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
                <span style={{ color: '#2563eb', fontWeight: 600 }}>{notification.title}</span>
                <strong style={{ display: 'block', marginTop: '4px' }}>{notification.message}</strong>
                <em style={{ color: '#64748b', fontSize: '12px' }}>{new Date(notification.createdAt).toLocaleDateString()}</em>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="panel" style={{ marginTop: 20 }}>
        <h3>Mis solicitudes</h3>
        <ul className="list">
          {requests.map((request) => (
            <li key={request.id}>
              <span>{request.reason}</span>
              <strong>{request.employee?.user ? `${request.employee.user.firstName} ${request.employee.user.lastName}` : 'Usuario'}</strong>
              <em>{request.status} - {request.requestedDate}</em>
              {isAdmin && request.status === 'PENDING' ? (
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button className="primary-btn small" onClick={() => onApprove(request.id)}>Aprobar</button>
                  <button className="secondary-btn small" onClick={() => onReject(request.id)}>Rechazar</button>
                </div>
              ) : null}
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
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('turnosmart-user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('turnosmart-user');
      }
    }
  }, []);

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
