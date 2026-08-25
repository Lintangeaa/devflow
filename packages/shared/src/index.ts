import { z } from "zod";

// ---------------------------------------------------------------------------
// Constants shared everywhere
// ---------------------------------------------------------------------------
export const PRIORITIES = ["low", "medium", "high", "critical"] as const;
export const SEVERITIES = ["minor", "major", "blocker", "crash"] as const;
export const TASK_STATUSES = ["backlog", "todo", "in_progress", "done"] as const;
export const BUG_STATUSES = [
  "new",
  "open",
  "in_progress",
  "ready_for_qa",
  "resolved",
  "closed",
] as const;
export const TICKET_TYPES = ["task", "bug"] as const;
export const PROJECT_MEMBER_ROLES = ["owner", "member"] as const;
export const SYSTEM_ROLES = ["admin", "user"] as const;

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------
export const bugDetailsSchema = z.object({
  feature: z.string().min(1, "feature wajib diisi"),
  devices: z.string().min(1, "devices wajib diisi"),
  scenario: z.string().min(1, "scenario wajib diisi"),
  given: z.string().min(1, "given wajib diisi"),
  when: z.string().min(1, "when wajib diisi"),
  then: z.string().min(1, "then wajib diisi"),
  output: z.string().min(1, "output wajib diisi"),
});

export const projectSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "slug hanya huruf kecil, angka, dash"),
  description: z.string().max(2000).optional().nullable(),
  status: z.enum(["active", "archived", "paused"]).optional(),
});

export const phaseSchema = z.object({
  name: z.string().min(1).max(80),
  order: z.number().int().min(0).optional(),
  color: z.string().max(20).optional(),
});

export const ticketSchema = z
  .object({
    type: z.enum(TICKET_TYPES).default("task"),
    headline: z.string().min(1).max(200),
    description: z.string().max(5000).optional().nullable(),
    bugDetails: bugDetailsSchema.optional().nullable(),
    phaseId: z.string().uuid().optional().nullable(),
    parentId: z.string().uuid().optional().nullable(),
    priority: z.enum(PRIORITIES).default("medium"),
    severity: z.enum(SEVERITIES).optional().nullable(),
    assigneeId: z.string().optional().nullable(),
    status: z.string().optional(), // validated against type's statuses in handler
    dueDate: z.string().datetime().optional().nullable(),
    component: z.string().max(120).optional().nullable(),
    environment: z.string().max(500).optional().nullable(),
    tags: z.array(z.string().max(40)).max(15).optional().default([]),
    position: z.number().int().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.type === "bug") {
      if (v.severity === undefined || v.severity === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["severity"],
          message: "bug wajib punya severity",
        });
      }
      if (!v.bugDetails) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["bugDetails"],
          message: "bug wajib menyertakan bugDetails",
        });
      } else {
        const fields = ["feature", "devices", "scenario", "given", "when", "then", "output"] as const;
        for (const f of fields) {
          if (!v.bugDetails[f] || !v.bugDetails[f].trim()) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["bugDetails", f],
              message: `${f} wajib diisi`,
            });
          }
        }
      }
    }
  });

const ticketUpdateBase = z.object({
  type: z.enum(TICKET_TYPES).optional(),
  headline: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  bugDetails: bugDetailsSchema.optional().nullable(),
  phaseId: z.string().uuid().optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
  priority: z.enum(PRIORITIES).optional(),
  severity: z.enum(SEVERITIES).optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  status: z.string().optional(),
  dueDate: z.string().datetime().optional().nullable(),
  component: z.string().max(120).optional().nullable(),
  environment: z.string().max(500).optional().nullable(),
  tags: z.array(z.string().max(40)).max(15).optional(),
  position: z.number().int().optional(),
});

export const ticketUpdateSchema = ticketUpdateBase; // all fields optional
export const commentSchema = z.object({ body: z.string().min(1).max(5000) });

export const memberSchema = z.object({
  userId: z.string(),
  role: z.enum(PROJECT_MEMBER_ROLES).default("member"),
});

export const signupSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type BugDetails = z.infer<typeof bugDetailsSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Phase = z.infer<typeof phaseSchema> & { id: string; projectId: string };
export type Ticket = z.infer<typeof ticketSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;