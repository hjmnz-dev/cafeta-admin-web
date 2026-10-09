import React, { createContext, useContext, useEffect, useState } from 'react';

/**
 * Estado de la consola de administración (FT10 · DEF-11).
 *
 * Igual que la app móvil, todavía no hay backend: los datos viven en el cliente
 * y se persisten en localStorage. La diferencia importante con la app de
 * estudiantes es la **bitácora**: aquí toda acción relevante deja rastro
 * (HU46), incluidos los intentos rechazados por falta de permisos, porque esa
 * traza es el producto que consume HU45.
 *
 * Cuando exista el backend, los setters pasan a ser llamadas a la API y la
 * bitácora se lee del servidor manteniendo la misma forma de datos.
 */

/** Rol de quien actúa en la bitácora. */
export type Role = 'admin' | 'student';

/** Quien usa la consola: el administrador que inició sesión en la API. */
export interface Actor {
  name: string;
  email: string;
}

export type AccountStatus = 'active' | 'inactive';
export type VerificationStatus = 'verified' | 'pending' | 'rejected';

/** Cuenta registrada en la plataforma, vista desde administración (HU47). */
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  career: string;
  /** Alta de la cuenta, en epoch ms. */
  joinedAt: number;
  status: AccountStatus;
  verification: VerificationStatus;
  posts: number;
  followers: number;
}

/** Publicación, en la medida en que administración necesita moderarla (HU52). */
export interface AdminPost {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: number;
  active: boolean;
}

export type ReportStatus = 'pending' | 'sanctioned' | 'dismissed';

/**
 * Denuncia levantada por un estudiante (HU55/HU56 en la app móvil) y revisada
 * aquí (HU51/HU52).
 */
export interface AdminReport {
  id: string;
  targetType: 'user' | 'post';
  targetId: string;
  reason: string;
  reportedBy: string;
  createdAt: number;
  status: ReportStatus;
  /** Quién resolvió y cuándo, una vez revisada. */
  resolvedBy?: string;
  resolvedAt?: number;
}

/** Acciones que la bitácora sabe nombrar (HU46). */
export type AuditAction =
  | 'account.deactivate'
  | 'account.reactivate'
  | 'account.verify'
  | 'account.reject_verification'
  | 'post.deactivate'
  | 'report.sanction'
  | 'report.dismiss'
  | 'report.generate'
  | 'access.denied';

/** Entrada de la bitácora de auditoría (HU45/HU46). */
export interface AuditEntry {
  id: string;
  at: number;
  /** Quién ejecutó la acción (o intentó ejecutarla). */
  actor: string;
  actorRole: Role;
  action: AuditAction;
  /** Objetivo legible: cuenta, publicación o pantalla. */
  target: string;
  detail: string;
  /** false cuando la acción fue rechazada (HU46, escenario 2). */
  succeeded: boolean;
}

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  'account.deactivate': 'Desactivar cuenta',
  'account.reactivate': 'Reactivar cuenta',
  'account.verify': 'Verificar cuenta',
  'account.reject_verification': 'Rechazar verificación',
  'post.deactivate': 'Desactivar publicación',
  'report.sanction': 'Sancionar reporte',
  'report.dismiss': 'Desestimar reporte',
  'report.generate': 'Generar reporte administrativo',
  'access.denied': 'Acceso denegado',
};

interface AdminStateValue {
  actor: Actor;

  users: AdminUser[];
  posts: AdminPost[];
  reports: AdminReport[];
  audit: AuditEntry[];
}

const CAREERS = [
  'Ing. Software',
  'Ing. Industrial',
  'Ing. Civil',
  'Medicina',
  'Adm. Empresas',
  'Psicología',
];

const DAY = 24 * 60 * 60 * 1000;

/**
 * Padrón de demostración. Se construye con fechas relativas al arranque para
 * que los indicadores del dashboard (altas por día, actividad reciente) tengan
 * sentido en cualquier momento en que se abra la consola.
 */
const sampleUsers = (): AdminUser[] => {
  const now = Date.now();
  const seed: [
    string,
    string,
    string,
    number,
    AccountStatus,
    VerificationStatus,
    number,
    number,
  ][] = [
    [
      'maria',
      'María Rodríguez',
      'mrodriguez@est.intec.edu.do',
      0,
      'active',
      'verified',
      27,
      842,
    ],
    [
      'juan',
      'Juan Pérez',
      'jperez@est.intec.edu.do',
      1,
      'active',
      'verified',
      40,
      512,
    ],
    [
      'laura',
      'Laura Batista',
      'lbatista@est.intec.edu.do',
      2,
      'active',
      'pending',
      63,
      1204,
    ],
    [
      'pedro',
      'Pedro Sánchez',
      'psanchez@est.intec.edu.do',
      3,
      'active',
      'pending',
      15,
      231,
    ],
    [
      'ana',
      'Ana Martínez',
      'amartinez@est.intec.edu.do',
      4,
      'inactive',
      'verified',
      8,
      96,
    ],
    [
      'roberto',
      'Roberto Díaz',
      'rdiaz@est.intec.edu.do',
      5,
      'active',
      'rejected',
      3,
      44,
    ],
    [
      'comite',
      'Comité de Estudiantes',
      'comite@intec.edu.do',
      0,
      'active',
      'verified',
      120,
      3100,
    ],
    [
      'carlos',
      'Carlos Gómez',
      'cgomez@est.intec.edu.do',
      2,
      'active',
      'verified',
      12,
      318,
    ],
  ];
  return seed.map(
    (
      [id, name, email, careerIdx, status, verification, posts, followers],
      i,
    ) => ({
      id,
      name,
      email,
      career: CAREERS[careerIdx],
      joinedAt: now - (30 - i * 3) * DAY,
      status,
      verification,
      posts,
      followers,
    }),
  );
};

const samplePosts = (): AdminPost[] => {
  const now = Date.now();
  return [
    {
      id: 'p2',
      authorId: 'juan',
      authorName: 'Juan Pérez',
      content: 'Resumen de Cálculo Diferencial para el parcial de mañana.',
      createdAt: now - 2 * DAY,
      active: true,
    },
    {
      id: 'p3',
      authorId: 'maria',
      authorName: 'María Rodríguez',
      content: 'Libro de Anatomía Humana en PDF para quien lo necesite.',
      createdAt: now - 4 * DAY,
      active: true,
    },
    {
      id: 'p7',
      authorId: 'roberto',
      authorName: 'Roberto Díaz',
      content: 'Vendo respuestas del examen final, escríbanme por privado.',
      createdAt: now - 1 * DAY,
      active: true,
    },
    {
      id: 'p8',
      authorId: 'ana',
      authorName: 'Ana Martínez',
      content: 'Mensaje ofensivo contra un grupo de estudiantes.',
      createdAt: now - 3 * DAY,
      active: true,
    },
  ];
};

const sampleReports = (): AdminReport[] => {
  const now = Date.now();
  return [
    {
      id: 'r1',
      targetType: 'post',
      targetId: 'p7',
      reason: 'Spam o publicidad',
      reportedBy: 'María Rodríguez',
      createdAt: now - 20 * 60 * 60 * 1000,
      status: 'pending',
    },
    {
      id: 'r2',
      targetType: 'post',
      targetId: 'p8',
      reason: 'Acoso o intimidación',
      reportedBy: 'Juan Pérez',
      createdAt: now - 2 * DAY,
      status: 'pending',
    },
    {
      id: 'r3',
      targetType: 'user',
      targetId: 'roberto',
      reason: 'Suplantación de identidad',
      reportedBy: 'Laura Batista',
      createdAt: now - 3 * DAY,
      status: 'pending',
    },
    {
      id: 'r4',
      targetType: 'user',
      targetId: 'ana',
      reason: 'Acoso o intimidación',
      reportedBy: 'Pedro Sánchez',
      createdAt: now - 6 * DAY,
      status: 'sanctioned',
      resolvedBy: 'Hamsell Jiménez',
      resolvedAt: now - 5 * DAY,
    },
    {
      id: 'r5',
      targetType: 'post',
      targetId: 'p2',
      reason: 'Contenido inapropiado',
      reportedBy: 'Ana Martínez',
      createdAt: now - 8 * DAY,
      status: 'dismissed',
      resolvedBy: 'Hamsell Jiménez',
      resolvedAt: now - 7 * DAY,
    },
  ];
};

/** Bitácora inicial: la resolución ya tomada sobre la cuenta de Ana (r4). */
const sampleAudit = (): AuditEntry[] => {
  const now = Date.now();
  return [
    {
      id: 'a1',
      at: now - 5 * DAY,
      actor: 'Hamsell Jiménez',
      actorRole: 'admin',
      action: 'report.sanction',
      target: 'Ana Martínez',
      detail: 'Reporte por acoso o intimidación resuelto con sanción.',
      succeeded: true,
    },
    {
      id: 'a2',
      at: now - 5 * DAY + 60_000,
      actor: 'Hamsell Jiménez',
      actorRole: 'admin',
      action: 'account.deactivate',
      target: 'Ana Martínez',
      detail: 'Cuenta desactivada tras la revisión del reporte.',
      succeeded: true,
    },
    {
      id: 'a3',
      at: now - 7 * DAY,
      actor: 'Hamsell Jiménez',
      actorRole: 'admin',
      action: 'report.dismiss',
      target: 'Publicación p2',
      detail: 'Reporte desestimado: el contenido no infringe las normas.',
      succeeded: true,
    },
  ];
};

const STORAGE_KEY = 'cafeta.admin.v1';

interface PersistedState {
  users: AdminUser[];
  posts: AdminPost[];
  reports: AdminReport[];
  audit: AuditEntry[];
}

function load(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        users: Array.isArray(parsed.users) ? parsed.users : sampleUsers(),
        posts: Array.isArray(parsed.posts) ? parsed.posts : samplePosts(),
        reports: Array.isArray(parsed.reports)
          ? parsed.reports
          : sampleReports(),
        audit: Array.isArray(parsed.audit) ? parsed.audit : sampleAudit(),
      };
    }
  } catch {
    /* storage no disponible o corrupto: usar datos de demostración */
  }
  return {
    users: sampleUsers(),
    posts: samplePosts(),
    reports: sampleReports(),
    audit: sampleAudit(),
  };
}

const AdminStateContext = createContext<AdminStateValue | null>(null);

export function AdminStateProvider({
  actor,
  children,
}: {
  actor: Actor;
  children: React.ReactNode;
}) {
  const [{ users, posts, reports, audit }] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ users, posts, reports, audit }),
      );
    } catch {
      /* almacenamiento no disponible: el estado sigue solo en memoria */
    }
  }, [users, posts, reports, audit]);

  return (
    <AdminStateContext.Provider
      value={{
        actor,
        users,
        posts,
        reports,
        audit,
      }}
    >
      {children}
    </AdminStateContext.Provider>
  );
}

export function useAdminState(): AdminStateValue {
  const ctx = useContext(AdminStateContext);
  if (!ctx)
    throw new Error('useAdminState debe usarse dentro de <AdminStateProvider>');
  return ctx;
}
