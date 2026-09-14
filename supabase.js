/*
 * WOOILFARM data layer
 * Add your Supabase values below. Leave them blank while previewing the app:
 * the same screens then use local demo data saved in this browser.
 */
window.WOOILFARM_CONFIG = {
  supabaseUrl: "https://swdntdmdqzlxgizwhwop.supabase.co",
  supabaseAnonKey: "sb_publishable_0PrD4lfYucI11OydhCw9lA_9DfslXK4"
};

window.WooilData = (() => {
  const DB_KEY = "wooilfarm-fieldlog-v1";
  const dayKey = () => {
  const now = new Date();

  const koreaTime = new Date(
    now.toLocaleString("en-US", {
      timeZone: "Asia/Seoul"
    })
  );

  const year = koreaTime.getFullYear();
  const month = String(koreaTime.getMonth() + 1).padStart(2, "0");
  const day = String(koreaTime.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};
  const stamp = () => new Date().toISOString();
  const demo = {
    employees: [
      { id: "kim-seo", name: "Kim Seo-yeon", initials: "KS", team: "Greenhouse A", role: "Crop specialist", color: "coral", active: true },
      { id: "park-min", name: "Park Min-jun", initials: "PM", team: "Harvest & packing", role: "Harvest lead", color: "gold", active: true },
      { id: "nguyen-linh", name: "Nguyen Linh", initials: "NL", team: "Greenhouse B", role: "Field specialist", color: "mint", active: true },
      { id: "han-ji", name: "Han Ji-ho", initials: "HJ", team: "Quality lab", role: "Quality inspector", color: "violet", active: true },
      { id: "sita-rai", name: "Sita Rai", initials: "SR", team: "Harvest & packing", role: "Packing associate", color: "blue", active: true }
    ],
    attendance: [],
    workLogs: []
  };

  function read() {
    try {
      const stored = JSON.parse(localStorage.getItem(DB_KEY));
      return stored && stored.employees ? stored : structuredClone(demo);
    } catch { return structuredClone(demo); }
  }
  function write(db) { localStorage.setItem(DB_KEY, JSON.stringify(db)); }
  function seededDB() {
    const db = read();
    if (!db.attendance.some(x => x.work_date === dayKey()) && !localStorage.getItem(`${DB_KEY}-visited`)) {
      const now = new Date();
      const time = (hour, minute) => new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute).toISOString();
      db.attendance.push(
        { id: "demo-1", employee_id: "kim-seo", work_date: dayKey(), check_in: time(7, 48), check_out: null },
        { id: "demo-2", employee_id: "park-min", work_date: dayKey(), check_in: time(8, 5), check_out: null },
        { id: "demo-3", employee_id: "nguyen-linh", work_date: dayKey(), check_in: time(8, 12), check_out: null }
      );
      db.workLogs.push(
        { id: "log-1", employee_id: "kim-seo", project: "Greenhouse A", task_type: "Planting & pruning", start_time: "08:00", end_time: "10:30", notes: "Pruned mature vines in rows A1–A8.", work_date: dayKey(), created_at: stamp() },
        { id: "log-2", employee_id: "park-min", project: "Harvest & packing", task_type: "Harvesting", start_time: "08:30", end_time: "11:00", notes: "Picked Premium Grade tomatoes for the morning shipment.", work_date: dayKey(), created_at: stamp() },
        { id: "log-3", employee_id: "han-ji", project: "Quality lab", task_type: "Quality inspection", start_time: "09:00", end_time: "10:20", notes: "Checked Brix level and color consistency in Batch 42.", work_date: dayKey(), created_at: stamp() }
      );
      write(db); localStorage.setItem(`${DB_KEY}-visited`, "true");
    }
    return db;
  }

  const configured = () => Boolean(window.WOOILFARM_CONFIG.supabaseUrl && window.WOOILFARM_CONFIG.supabaseAnonKey && window.supabase);
  const client = () => configured() ? window.supabase.createClient(window.WOOILFARM_CONFIG.supabaseUrl, window.WOOILFARM_CONFIG.supabaseAnonKey) : null;
  const normalize = (rows, db) => rows.map(row => ({ ...row, employee: row.employee || db.employees.find(e => e.id === row.employee_id) }));

  async function getAll(selectedDate = dayKey()) {
  const db = seededDB();

  if (!configured()) {
    return { ...db, isCloud: false };
  }

  const supa = client();

  const [people, attendance, workLogs] = await Promise.all([
    supa
      .from("employees")
      .select("*")
      .eq("active", true)
      .order("name"),

    supa
      .from("attendance_records")
      .select("*, employee:employees(*)")
      .eq("work_date", selectedDate)
      .order("check_in"),

    supa
      .from("work_logs")
      .select("*, employee:employees(*)")
      .eq("work_date", selectedDate)
      .order("created_at", { ascending: false }),
  ]);

  if (people.error || attendance.error || workLogs.error) {
    throw new Error(
      "Supabase could not load data. Check your project URL, key, and table setup.",
    );
  }

  return {
    employees: people.data,
    attendance: attendance.data,
    workLogs: workLogs.data,
    isCloud: true,
  };
}
  async function checkIn(employeeId) {
  const today = dayKey();

  if (!configured()) {
    const db = seededDB();

    const existing = db.attendance.find(
      (a) =>
        a.employee_id === employeeId &&
        a.work_date === today
    );

    if (existing?.check_in) {
      existing.check_out = null;
      write(db);
      return existing;
    }

    const record = {
      id: `att-${Date.now()}`,
      employee_id: employeeId,
      work_date: today,
      check_in: stamp(),
      check_out: null,
    };

    db.attendance.push(record);
    write(db);

    return record;
  }

  const { data: existing, error: findError } = await client()
    .from("attendance_records")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("work_date", today)
    .maybeSingle();

  if (findError) throw findError;

  // पहिले check-in भएको छ भने
  // पहिलो check-in time राख्ने,
  // checkout मात्र reset गर्ने
  if (existing?.check_in) {
    const { data, error } = await client()
      .from("attendance_records")
      .update({
        check_out: null,
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  // पहिलो check-in
  const { data, error } = await client()
    .from("attendance_records")
    .insert({
      employee_id: employeeId,
      work_date: today,
      check_in: stamp(),
      check_out: null,
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}


async function checkOut(employeeId) {
  const today = dayKey();

  if (!configured()) {
    const db = seededDB();

    const record = db.attendance.find(
      (a) =>
        a.employee_id === employeeId &&
        a.work_date === today
    );

    if (!record?.check_in) {
      throw new Error("Check in before checking out.");
    }

    record.check_out = stamp();
    write(db);

    return record;
  }

  const { data: existing, error: findError } = await client()
    .from("attendance_records")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("work_date", today)
    .maybeSingle();

  if (findError) throw findError;

  if (!existing?.check_in) {
    throw new Error("Check in before checking out.");
  }

  const { data, error } = await client()
    .from("attendance_records")
    .update({
      check_out: stamp(),
    })
    .eq("id", existing.id)
    .select()
    .single();

  if (error) throw error;

  return data;
}
  async function saveWork(log) {
    const row = { ...log, work_date: dayKey(), created_at: stamp() };
    if (!configured()) { const db = seededDB(); row.id = `log-${Date.now()}`; db.workLogs.unshift(row); write(db); return row; }
    const { data, error } = await client().from("work_logs").insert(row).select().single(); if (error) throw error; return data;
  }
  async function addEmployee(employee) {
    const row = { ...employee, id: employee.id || crypto.randomUUID(), active: true, initials: employee.name.split(/\s+/).map(n => n[0]).join("").slice(0, 2).toUpperCase(), color: "mint" };
    if (!configured()) { const db = seededDB(); db.employees.push(row); write(db); return row; }
    const { data, error } = await client().from("employees").insert(row).select().single(); if (error) throw error; return data;
  }
  
  function exportExcel(
  rows,
  fileName = `wooilfarm-attendance-${dayKey()}.xlsx`,
) {
  if (!window.XLSX) {
    throw new Error("Excel library is not loaded.");
  }

  const headers = [
    "Farmer",
    "Team",
    "Date",
    "Check in",
    "Check out",
    "Hours",
    "Status",
  ];

  const worksheet = XLSX.utils.aoa_to_sheet([
    headers,
    ...rows,
  ]);

  worksheet["!cols"] = [
    { wch: 22 },
    { wch: 22 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 14 },
  ];

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Attendance",
  );

  XLSX.writeFile(workbook, fileName);
}

function exportWorkExcel(
  rows,
  fileName = `wooilfarm-worklogs-${dayKey()}.xlsx`,
) {
  if (!window.XLSX) {
    throw new Error("Excel library is not loaded.");
  }

  const headers = [
    "Farmer",
    "Team",
    "House",
    "Work Type",
    "Date",
    "Start Time",
    "End Time",
    "Notes",
  ];

  const worksheet = XLSX.utils.aoa_to_sheet([
    headers,
    ...rows,
  ]);

  worksheet["!cols"] = [
    { wch: 22 },
    { wch: 22 },
    { wch: 24 },
    { wch: 24 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 45 },
  ];

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Work Logs",
  );

  XLSX.writeFile(workbook, fileName);
}

return {
  getAll,
  checkIn,
  checkOut,
  saveWork,
  addEmployee,
  exportExcel,
  exportWorkExcel,
  dayKey,
  normalize,
  isConfigured: configured,
};
})();

