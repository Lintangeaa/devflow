import { db, pool, schema } from "./index";

async function main() {
  console.log("🌱 Memulai pembersihan database dan seeding data...");

  // 1. Clean existing project data
  console.log("🧹 Membersihkan data projects, tickets, phases, media, comments...");
  await db.delete(schema.notifications);
  await db.delete(schema.media);
  await db.delete(schema.comments);
  await db.delete(schema.activities);
  await db.delete(schema.tickets);
  await db.delete(schema.projectMembers);
  await db.delete(schema.phases);
  await db.delete(schema.projects);

  // 2. Fetch or create users
  const existingUsers = await db.select().from(schema.user);
  let ownerId: string;

  if (existingUsers.length > 0) {
    ownerId = existingUsers[0].id;
    console.log(`👤 Menggunakan user yang ada: ${existingUsers[0].name} (${existingUsers[0].email})`);
  } else {
    // Create fallback demo user
    const [newUser] = await db
      .insert(schema.user)
      .values({
        id: "demo-user-1",
        name: "Lintang Prakoso",
        email: "lintang@devflow.local",
        emailVerified: true,
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    ownerId = newUser.id;
    console.log(`👤 Dibuat user demo: ${newUser.name}`);
  }

  // 3. Create Projects
  console.log("📁 Menambahkan 3 project baru...");

  // Project 1: Devflow Core
  const [p1] = await db
    .insert(schema.projects)
    .values({
      name: "Devflow Core",
      slug: "devflow-core",
      description: "Monorepo Turborepo dengan Hono Node.js backend dan Next.js 15 App Router frontend.",
      ownerId,
      status: "active",
    })
    .returning();

  // Project 2: Mobile App
  const [p2] = await db
    .insert(schema.projects)
    .values({
      name: "Devflow Mobile App",
      slug: "devflow-mobile",
      description: "Aplikasi mobile lintas platform untuk notifikasi instan dan pelacakan tiket di lapangan.",
      ownerId,
      status: "active",
    })
    .returning();

  // Project 3: Customer Portal
  const [p3] = await db
    .insert(schema.projects)
    .values({
      name: "Client Support Portal",
      slug: "client-portal",
      description: "Portal publik tempat klien dapat melaporkan bug dan melacak status penyelesaian issue.",
      ownerId,
      status: "active",
    })
    .returning();

  // 4. Assign members
  for (const p of [p1, p2, p3]) {
    for (const u of existingUsers) {
      await db
        .insert(schema.projectMembers)
        .values({
          projectId: p.id,
          userId: u.id,
          role: u.id === ownerId ? "owner" : "member",
        })
        .onConflictDoNothing();
    }
  }

  // 5. Create Standard Phases for all Projects
  const standardPhases = [
    { name: "Planning", color: "#6366f1", order: 0 },
    { name: "In Progress", color: "#f59e0b", order: 1 },
    { name: "Testing", color: "#8b5cf6", order: 2 },
    { name: "Done", color: "#10b981", order: 3 },
  ];

  const p1Phases = await db
    .insert(schema.phases)
    .values(standardPhases.map((sp) => ({ ...sp, projectId: p1.id })))
    .returning();

  for (const otherProject of [p2, p3]) {
    await db
      .insert(schema.phases)
      .values(standardPhases.map((sp) => ({ ...sp, projectId: otherProject.id })));
  }

  const [phPlanning, phInProgress, phTesting, phDone] = p1Phases;

  // 6. Create Tasks for Project 1
  console.log("📋 Menambahkan Tasks & Bugs...");

  const [t1, t2, t3, t4] = await db
    .insert(schema.tickets)
    .values([
      {
        projectId: p1.id,
        phaseId: phDone.id,
        type: "task",
        headline: "Turborepo monorepo setup dengan Hono backend",
        description: "Migrasi backend API dari Next.js custom server.js ke standalone Hono pada port 4000.",
        status: "done",
        priority: "critical",
        creatorId: ownerId,
        assigneeId: ownerId,
        component: "architecture",
        tags: ["backend", "monorepo"],
        position: 0,
      },
      {
        projectId: p1.id,
        phaseId: phInProgress.id,
        type: "task",
        headline: "Implementasi Collapsible Sidebar dan AppShell",
        description: "Rombak header lama menjadi left sidebar collapsible (w-64 / w-16 icon rail) dengan shortcut Cmd+B.",
        status: "in_progress",
        priority: "high",
        creatorId: ownerId,
        assigneeId: ownerId,
        component: "frontend",
        tags: ["ui", "layout"],
        position: 0,
      },
      {
        projectId: p1.id,
        phaseId: phTesting.id,
        type: "task",
        headline: "Integrasi MinIO S3 media Range 206 video streaming",
        description: "Dukungan streaming video bug reproduction dengan HTTP Range 206 headers.",
        status: "ready_for_qa",
        priority: "medium",
        creatorId: ownerId,
        assigneeId: ownerId,
        component: "storage",
        tags: ["s3", "media"],
        position: 0,
      },
      {
        projectId: p1.id,
        phaseId: phPlanning.id,
        type: "task",
        headline: "Setup automated GitHub Webhook untuk auto-close issue",
        description: "Menerima payload webhook dari GitHub saat PR di-merge dengan tag Fixes #DEV-xxx.",
        status: "todo",
        priority: "medium",
        creatorId: ownerId,
        assigneeId: ownerId,
        component: "integration",
        tags: ["webhook", "github"],
        position: 0,
      },
    ])
    .returning();

  // 7. Create Bugs for Project 1
  const [b1, b2, b3] = await db
    .insert(schema.tickets)
    .values([
      {
        projectId: p1.id,
        phaseId: phTesting.id,
        type: "bug",
        headline: "WebSocket connection 401 saat membuka halaman unauthenticated",
        description: "Komponen NotificationBell mencoba upgrade WebSocket sebelum ada sesi login pengguna.",
        status: "open",
        priority: "high",
        severity: "major",
        creatorId: ownerId,
        assigneeId: ownerId,
        component: "realtime",
        tags: ["websocket", "auth"],
        position: 0,
        bugDetails: {
          feature: "Notifikasi Realtime",
          devices: "Chrome Desktop macOS / Windows",
          scenario: "User membuka URL login",
          given: "Pengguna belum login dan mengakses halaman /login",
          when: "Halaman me-render NotificationBell",
          then: "WebSocket mencoba koneksi ke ws://localhost:4000/ws/notifications",
          output: "Console browser menampilkan WebSocket handshake failed: 401 Unauthorized",
        },
      },
      {
        projectId: p1.id,
        phaseId: phInProgress.id,
        type: "bug",
        headline: "Excel export gagal saat deskripsi tiket memiliki karakter emoji",
        description: "Library ExcelJS membutuhkan formatting UTF-8 string agar cell tidak korup.",
        status: "in_progress",
        priority: "medium",
        severity: "minor",
        creatorId: ownerId,
        assigneeId: ownerId,
        component: "export",
        tags: ["excel", "bug"],
        position: 1,
        bugDetails: {
          feature: "Laporan Export Excel",
          devices: "All",
          scenario: "Export tiket dengan deskripsi emoji",
          given: "Tiket memiliki emoji di kolom deskripsi",
          when: "User klik tombol Export Excel",
          then: "File XLSX di-download",
          output: "Cell Excel berisi karakter pengganti yang tidak terbaca",
        },
      },
      {
        projectId: p1.id,
        phaseId: phPlanning.id,
        type: "bug",
        headline: "Hydration warning pada Avatar User dropdown saat SSR",
        description: "Inisialisasi state tema menghasilkan perbedaan class dark/light sebelum mount.",
        status: "resolved",
        priority: "low",
        severity: "minor",
        creatorId: ownerId,
        assigneeId: ownerId,
        component: "ui",
        tags: ["ssr", "hydration"],
        position: 2,
        bugDetails: {
          feature: "User Profile Dropdown",
          devices: "All browsers",
          scenario: "Render awal SSR Next.js",
          given: "User mengunjungi halaman beranda",
          when: "Next.js melakukan render Server Component",
          then: "HTML dikirim ke browser",
          output: "React warning: Prop className did not match between server and client",
        },
      },
    ])
    .returning();

  // 8. Add sample comments
  await db.insert(schema.comments).values([
    {
      ticketId: t2.id,
      userId: ownerId,
      body: "Desain sidebar sudah dibuat dengan mode collapsible rail `w-64` / `w-16` dan shortcut `Cmd+B`.",
    },
    {
      ticketId: b1.id,
      userId: ownerId,
      body: "Perbaikan sudah diterapkan dengan menambahkan pengecekan `authClient.useSession()` sebelum koneksi WebSocket dibuka.",
    },
  ]);

  console.log("✅ Seeding selesai dengan sukses!");
  console.log(`📊 Total: 3 Projects, 3 Phases, 4 Tasks, 3 Bugs, 2 Comments.`);
}

main()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("❌ Error saat seeding:", err);
    await pool.end();
    process.exit(1);
  });
