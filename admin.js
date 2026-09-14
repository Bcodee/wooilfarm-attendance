(() => {
  const $ = (selector) => document.querySelector(selector);
  let state = { data: null, filter: "all" };
  let selectedDay = WooilData.dayKey();
  const KST_OPTIONS = {
  timeZone: "Asia/Seoul",
};

const dateFormat = new Intl.DateTimeFormat("en-US", {
  ...KST_OPTIONS,
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

const timeFormat = new Intl.DateTimeFormat("en-US", {
  ...KST_OPTIONS,
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

const time = (value) =>
  value ? timeFormat.format(new Date(value)) : "—";
  const initials = (name) =>
    name
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  const person = (id) =>
    state.data.employees.find((employee) => employee.id === id) || {
      name: "Unknown farmer",
      team: "—",
      initials: "?",
      color: "mint",
    };
  const displayPerson = (record) =>
    record.employee || person(record.employee_id);
  function toast(message, kind = "good") {
    const element = document.createElement("div");
    element.className = `toast ${kind}`;
    element.innerHTML = `<i></i><span>${message}</span>`;
    $("#toastRegion").append(element);
    setTimeout(() => {
      element.classList.add("out");
      setTimeout(() => element.remove(), 300);
    }, 3600);
  }
  function duration(record) {
    if (!record.check_in) return "—";
    const end = record.check_out ? new Date(record.check_out) : new Date();
    const minutes = Math.max(
      0,
      Math.round((end - new Date(record.check_in)) / 60000),
    );
    return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
  }
  function avatar(member) {
    return `<span class="avatar ${member.color || "mint"}">${member.initials || initials(member.name)}</span>`;
  }
  function renderHeader() {
      updateSelectedDate();

    $("#syncState").innerHTML =
      `<i></i> ${state.data.isCloud ? "Supabase connected" : "Demo data"}`;
  }
  function renderStats() {
    const attendance = state.data.attendance;
    const present = attendance.filter((a) => a.check_in && !a.check_out);
    const checkedIn = attendance.filter((a) => a.check_in);
    const first = checkedIn.sort(
      (a, b) => new Date(a.check_in) - new Date(b.check_in),
    )[0];
    $("#statPresent").textContent = present.length;
    $("#presentDelta").textContent = `${checkedIn.length} total today`;
    $("#statArrival").textContent = first ? time(first.check_in) : "—";
    $("#statLogs").textContent = state.data.workLogs.length;
  }
  function renderOverviewAttendance() {
    const records = [...state.data.attendance]
      .sort((a, b) => new Date(b.check_in || 0) - new Date(a.check_in || 0))
      .slice(0, 4);
    $("#overviewAttendance").innerHTML = records.length
      ? records
          .map((record) => {
            const employee = displayPerson(record);
            return `<article class="mini-attendee">${avatar(employee)}<span><strong>${employee.name}</strong><small>${employee.team}</small></span><time class="${record.check_out ? "out" : ""}">${record.check_out ? `Out ${time(record.check_out)}` : `In ${time(record.check_in)}`}</time></article>`;
          })
          .join("")
      : `<p class="empty-state">No one has checked in yet.</p>`;
  }
  function renderDepartmentBars() {
    const groups = [
      "Greenhouse A",
      "Greenhouse B",
      "Harvest & packing",
      "Quality lab",
    ].map((project) => ({
      project,
      count: state.data.workLogs.filter((log) => log.project === project)
        .length,
    }));
    const max = Math.max(...groups.map((group) => group.count), 1);
    const shades = ["#3f9257", "#80ad70", "#eab153", "#916fca"];
    $("#departmentBars").innerHTML = groups
      .map(
        (group, index) =>
          `<div class="dept-row"><span>${group.project.replace(" & ", " + ")}</span><span class="bar"><i style="--width:${Math.max((group.count / max) * 100, group.count ? 9 : 0)}%;--bar:${shades[index]}"></i></span><b>${group.count}</b></div>`,
      )
      .join("");
  }
  function renderRecentNotes() {
    const logs = [...state.data.workLogs]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 3);
    $("#recentNotes").innerHTML = logs.length
      ? logs
          .map((log) => {
            const employee = displayPerson(log);
            return `<article class="note-card"><header>${avatar(employee)}<strong>${employee.name}</strong><time>${log.start_time}–${log.end_time}</time></header><p>${log.notes || `${log.task_type} · ${log.project}`}</p></article>`;
          })
          .join("")
      : `<p class="empty-state">Work notes will appear here as the team logs tasks.</p>`;
  }
  function renderAttendanceTable() {
    const records = [...state.data.attendance].sort(
      (a, b) => new Date(b.check_in || 0) - new Date(a.check_in || 0),
    );
    $("#attendanceTable").innerHTML = records.length
      ? records
          .map((record) => {
            const employee = displayPerson(record);
            return `<tr><td><span class="person-cell">${avatar(employee)}<b>${employee.name}</b></span></td><td>${employee.team}</td><td>${time(record.check_in)}</td><td>${time(record.check_out)}</td><td>${duration(record)}</td><td><span class="table-status ${record.check_out ? "done" : ""}">${record.check_out ? "Completed" : "On farm"}</span></td></tr>`;
          })
          .join("")
      : `<tr><td colspan="6" style="text-align:center;padding:35px">No attendance records for this day.</td></tr>`;
  }
  function renderWorkBoard() {
    const logs =
      state.filter === "all"
        ? state.data.workLogs
        : state.data.workLogs.filter((log) => log.project === state.filter);
    $("#workBoard").innerHTML = logs.length
      ? logs
          .map((log) => {
            const employee = displayPerson(log);
            return `<article class="work-card"><div class="work-card-top"><span class="project-tag">${log.project}</span><time>${formatWorkTime(log.start_time)}–${formatWorkTime(log.end_time)}</time></div><h3>${log.task_type}</h3><p>${log.notes || "No note added for this work period."}</p><footer class="work-card-footer">${avatar(employee)}<b>${employee.name}</b></footer></article>`;
          })
          .join("")
      : `<div class="empty-state">No work logs match this project yet.</div>`;
  }
  function renderPeople() {
    $("#peopleGrid").innerHTML = state.data.employees
      .filter((member) => member.active !== false)
      .map(
        (member) =>
          `<article class="person-card">${avatar(member)}<h3>${member.name}</h3><p>${member.role || "Farm team"}</p><span>${member.team}</span></article>`,
      )
      .join("");
  }
  function renderAll() {
    renderHeader();
    renderStats();
    renderOverviewAttendance();
    renderDepartmentBars();
    renderRecentNotes();
    renderAttendanceTable();
    renderWorkBoard();
    renderPeople();
  }
  async function refresh() {
    try {
      state.data = await WooilData.getAll(selectedDay);
      renderAll();
    } catch (error) {
      toast(error.message || "Could not load farm data.", "warn");
    }
  }
  function showView(id) {
    document
      .querySelectorAll(".admin-view")
      .forEach((view) =>
        view.classList.toggle("active", view.id === `${id}View`),
      );
    document
      .querySelectorAll(".nav-item")
      .forEach((button) =>
        button.classList.toggle("active", button.dataset.view === id),
      );
    const title = {
      overview: "Good morning, manager.",
      attendance: "Attendance, at a glance.",
      worklogs: "Today’s field work.",
      people: "Your farm team.",
    };
    $("#viewTitle").textContent = title[id];
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function formatWorkTime(value) {
  if (!value) return "—";

  const [hours, minutes] = value.split(":").map(Number);

  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;

  return `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}
  function excelRows() {
    return state.data.attendance.map((record) => {
      const employee = displayPerson(record);
      return [
        employee.name,
        employee.team,
        selectedDay,
        time(record.check_in),
        time(record.check_out),
        duration(record),
        record.check_out ? "Completed" : "On farm",
      ];
    });
    
}
function workExcelRows() {
  return state.data.workLogs.map((log) => {
    const employee = displayPerson(log);

    return [
      employee.name,
      employee.team,
      log.project,
      log.task_type,
      log.work_date,
      formatWorkTime(log.start_time),
      formatWorkTime(log.end_time),
      log.notes || "",
    ];
  });
  }
  async function addMember(event) {
    event.preventDefault();
    const name = $("#memberName").value.trim();
    if (!name) return;
    try {
      await WooilData.addEmployee({
        name,
        team: $("#memberTeam").value,
        role: $("#memberRole").value.trim(),
      });
      $("#memberDialog").close();
      event.target.reset();
      await refresh();
      toast(`${name} added to WOOILFARM.`);
    } catch (error) {
      toast(error.message || "Could not add farmer.", "warn");
    }
  }
  function updateSelectedDate() {
  const [year, month, day] = selectedDay.split("-").map(Number);

  const date = new Date(year, month - 1, day);

  $("#adminDate").textContent = dateFormat.format(date);
}

async function changeDate(offset) {
  const [year, month, day] = selectedDay.split("-").map(Number);

  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + offset);

  const today = WooilData.dayKey();

  const newYear = date.getFullYear();
  const newMonth = String(date.getMonth() + 1).padStart(2, "0");
  const newDay = String(date.getDate()).padStart(2, "0");

  const newDate = `${newYear}-${newMonth}-${newDay}`;

  // Future date जान नदिने
  if (newDate > today) {
    return;
  }

  selectedDay = newDate;

  updateSelectedDate();
  await refresh();
}
  function init() {
  updateSelectedDate();

  const prevDateButton = $("#prevDateButton");
  

  if (prevDateButton) {
    prevDateButton.addEventListener("click", () => {
      changeDate(-1);
    });
  }

  if (nextDateButton) {
    nextDateButton.addEventListener("click", () => {
      changeDate(1);
    });
    $("#dateButton").addEventListener("click", async () => {
  selectedDay = WooilData.dayKey();

  updateSelectedDate();
  await refresh();
});
  }

  refresh();
    document
      .querySelectorAll(".nav-item")
      .forEach((button) =>
        button.addEventListener("click", () => showView(button.dataset.view)),
      );
    document
      .querySelectorAll("[data-go]")
      .forEach((button) =>
        button.addEventListener("click", () => showView(button.dataset.go)),
      );
    $("#refreshButton").addEventListener("click", async () => {
      await refresh();
      toast("Farm desk is up to date.");
    });
    $("#exportButton").addEventListener("click", () => {
      WooilData.exportExcel(excelRows());
      toast("Excel attendance report is downloading.");
    });
    $("#exportWorkButton").addEventListener("click", () => {
  WooilData.exportWorkExcel(workExcelRows());
  toast("Excel work report is downloading.");
});
    $("#workFilters").addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      state.filter = button.dataset.project;
      document
        .querySelectorAll("#workFilters button")
        .forEach((item) => item.classList.toggle("active", item === button));
      renderWorkBoard();
    });
    $("#openMemberModal").addEventListener("click", () =>
      $("#memberDialog").showModal(),
    );
    $("#closeMemberModal").addEventListener("click", () =>
      $("#memberDialog").close(),
    );
    $("#memberForm").addEventListener("submit", addMember);
  }
  init();
})();
