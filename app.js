(() => {
  const $ = selector => document.querySelector(selector);
  const farmerGrid = $("#farmerGrid");
  const selectStage = $("#selectStage");
  const attendanceStage = $("#attendanceStage");
  const workStage = $("#workStage");
  const continueButton = $("#continueButton");
  let state = { data: null, selected: null, project: null };

  const clockFormat = new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", hour12: true });
  const dateFormat = new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" });
  const longDate = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" });
  const today = () => new Date().toISOString().slice(0, 10);
  const time = value => value ? clockFormat.format(new Date(value)) : "—";

  function initials(name) { return name.split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase(); }
  function toast(message, kind = "good") {
    const toast = document.createElement("div"); toast.className = `toast ${kind}`; toast.innerHTML = `<i></i><span>${message}</span>`;
    $("#toastRegion").append(toast); setTimeout(() => { toast.classList.add("out"); setTimeout(() => toast.remove(), 300); }, 3600);
  }
  function setDates() {
    $("#todayDate").textContent = dateFormat.format(new Date()).toUpperCase();
    $("#attendanceDate").textContent = longDate.format(new Date());
    const updateClock = () => { $("#liveClock").textContent = clockFormat.format(new Date()); };
    updateClock(); setInterval(updateClock, 20_000);
  }
  function renderFarmers() {
    farmerGrid.innerHTML = state.data.employees.filter(person => person.active !== false).map(person => `
      <button type="button" class="farmer-choice ${state.selected?.id === person.id ? "selected" : ""}" data-id="${person.id}">
        <span class="avatar ${person.color || "mint"}">${person.initials || initials(person.name)}</span>
        <strong>${person.name}</strong><small>${person.team}</small>
      </button>`).join("");
    farmerGrid.querySelectorAll("button").forEach(button => button.addEventListener("click", () => {
      state.selected = state.data.employees.find(person => person.id === button.dataset.id); renderFarmers();
      $("#selectionHint").textContent = `${state.selected.name} · ${state.selected.team}`;
      continueButton.disabled = false;
    }));
  }
  function attendanceForSelected() { return state.data.attendance.find(record => record.employee_id === state.selected?.id && record.work_date === today()); }
  function paintAttendance() {
    const person = state.selected; const record = attendanceForSelected();
    $("#chosenAvatar").textContent = person.initials || initials(person.name); $("#chosenAvatar").className = `avatar avatar-large ${person.color || "mint"}`;
    $("#chosenName").textContent = person.name; $("#chosenTeam").textContent = `${person.team} · ${person.role || "Farm team"}`;
    const inButton = $("#checkInButton"), outButton = $("#checkOutButton");
    $("#checkInStatus").textContent = record?.check_in ? `Checked in at ${time(record.check_in)}` : "Ready to start your day";
    $("#checkOutStatus").textContent = record?.check_out ? `Checked out at ${time(record.check_out)}` : record?.check_in ? "Ready when the day is done" : "Available after check-in";
    inButton.disabled = Boolean(record?.check_in && !record?.check_out); outButton.disabled = !record?.check_in || Boolean(record?.check_out);
    workStage.classList.toggle("hidden", !record?.check_in);
  }
  function renderProjects() {
  const houses = ["APC", "A1", "A2", "C 동", "B1", "B2"];

  $("#projectChoices").innerHTML = houses
    .map(
      (house) =>
        `<button type="button" class="project-choice ${
          state.project === house ? "selected" : ""
        }" data-project="${house}">${house}</button>`,
    )
    .join("");

  $("#projectChoices")
    .querySelectorAll("button")
    .forEach((button) =>
      button.addEventListener("click", () => {
        state.project = button.dataset.project;
        renderProjects();
      }),
    );
}
  function updatePulse() {
    const total = state.data.attendance.filter(record => record.work_date === today() && record.check_in && !record.check_out).length;
    $("#activeCount").textContent = total;
  }
  async function refresh() {
    try { state.data = await WooilData.getAll(); renderFarmers(); updatePulse(); }
    catch (error) { toast(error.message || "Unable to load farm data.", "warn"); }
  }
  async function handleCheckIn() {
    try { await WooilData.checkIn(state.selected.id); state.data = await WooilData.getAll(); paintAttendance(); updatePulse(); toast(`Welcome, ${state.selected.name}. Check-in saved.`); }
    catch (error) { toast(error.message || "Check-in could not be saved.", "warn"); }
  }
  async function handleCheckOut() {
    try { await WooilData.checkOut(state.selected.id); state.data = await WooilData.getAll(); paintAttendance(); updatePulse(); toast("Check-out saved. Thank you for today’s work!"); }
    catch (error) { toast(error.message || "Check-out could not be saved.", "warn"); }
  }
  function localTimeValue(date) { return `${String(date.getHours()).padStart(2,"0")}:${String(date.getMinutes()).padStart(2,"0")}`; }
  async function handleWork(event) {
    event.preventDefault();
    const taskType = $("#taskType").value, start = $("#startTime").value, end = $("#endTime").value;
      if (!state.project) return toast("Please choose a house first.", "warn");    
      if (!taskType || !start || !end) return toast("Add the work type and time range.", "warn");
      if (end <= start) return toast("End time must be after start time.", "warn");
    try {
      await WooilData.saveWork({ employee_id: state.selected.id, project: state.project, task_type: taskType, start_time: start, end_time: end, notes: $("#workNote").value.trim() });
      event.target.reset(); const now = new Date(); $("#startTime").value = localTimeValue(now); $("#endTime").value = localTimeValue(new Date(now.getTime() + 60 * 60 * 1000)); state.project = null; renderProjects(); toast("Work log saved to the department board.");
    } catch (error) { toast(error.message || "Work log could not be saved.", "warn"); }
  }
  async function selfRegister(event) {
    event.preventDefault();
    const name = $("#registerName").value.trim();
    const team = $("#registerTeam").value;
    const role = $("#registerRole").value.trim() || "Farm team";
if (!name || !team) return toast("Please enter your name and house.", "warn");    const alreadyAdded = state.data.employees.find(person => person.name.trim().toLowerCase() === name.toLowerCase());
    if (alreadyAdded) {
      state.selected = alreadyAdded; renderFarmers(); continueButton.disabled = false;
      $("#selectionHint").textContent = `${alreadyAdded.name} is already on the list — selected for you.`;
      $("#registerDialog").close(); return toast("That name is already available. We selected it for you.", "warn");
    }
    try {
      const added = await WooilData.addEmployee({ name, team, role });
      state.data = await WooilData.getAll(); state.selected = state.data.employees.find(person => person.id === added.id) || added;
      renderFarmers(); continueButton.disabled = false; $("#selectionHint").textContent = `${state.selected.name} was added — you can continue now.`;
      $("#registerDialog").close(); event.target.reset(); toast(`Welcome, ${state.selected.name}. Your name is now on the list.`);
    } catch (error) { toast(error.message || "Your name could not be added.", "warn"); }
  }
  function setLanguage(button) {
    document.querySelectorAll(".lang").forEach(lang => lang.classList.toggle("active", lang === button));
    const copy = { ko: "언어가 한국어로 설정되었습니다.", en: "Language set to English.", ne: "भाषा नेपालीमा सेट भयो।" }; toast(copy[button.dataset.language]);
  }
  async function init() {
    setDates(); await refresh(); renderProjects();
    const now = new Date(); $("#startTime").value = localTimeValue(now); $("#endTime").value = localTimeValue(new Date(now.getTime() + 60 * 60 * 1000));
    continueButton.addEventListener("click", () => { selectStage.classList.add("hidden"); attendanceStage.classList.remove("hidden"); paintAttendance(); attendanceStage.scrollIntoView({ behavior: "smooth", block: "center" }); });
    $("#changeWorker").addEventListener("click", () => { attendanceStage.classList.add("hidden"); workStage.classList.add("hidden"); selectStage.classList.remove("hidden"); });
    $("#checkInButton").addEventListener("click", handleCheckIn); $("#checkOutButton").addEventListener("click", handleCheckOut); $("#workForm").addEventListener("submit", handleWork);
    $("#openRegisterDialog").addEventListener("click", () => $("#registerDialog").showModal()); $("#closeRegisterDialog").addEventListener("click", () => $("#registerDialog").close()); $("#registerForm").addEventListener("submit", selfRegister);
    document.querySelectorAll(".lang").forEach(button => button.addEventListener("click", () => setLanguage(button)));
  }
  init();
})();
