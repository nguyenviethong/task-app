import { useState, useEffect, useMemo, useCallback } from "react";

export default function useTasks(api) {
  const [tasks, setTasks] = useState([]);

  // =========================
  // LOAD TASKS
  // =========================
  const load = useCallback(async () => {
    const data = await api.getTasks();
    setTasks(data);
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  // =========================
  // ADD TASK
  // =========================
  const addTask = useCallback(async (form) => {
    await api.addTask({
      ...form,
      startAt: new Date(form.startAt).getTime(),
      endAt: form.endAt
        ? new Date(form.endAt).getTime()
        : null
    });

    await load();
  }, [api, load]);

  // =========================
  // UPDATE STATE (KANBAN)
  // =========================
  const updateTaskState = useCallback((id, newState) => {
    setTasks(prev =>
      prev.map(t =>
        t.id === id ? { ...t, done: newState } : t
      )
    );
  }, []);

  // =========================
  // FILTER LOGIC
  // =========================

  const [typeFilter, setTypeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [nameFilter, setNameFilter] = useState("");
  const [dateFilter, setDateFilter] = useState(
    new Date().toISOString().split("T")[0]
  );
  function normalizeVN(str = "") {
	  return str
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "") // remove accents
		.toLowerCase();
  }
  
  const filtered = useMemo(() => {
    return tasks
      .filter(t => {
        if (typeFilter !== "all" && t.type !== typeFilter) return false;
        if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;

        if (nameFilter &&
            !normalizeVN(t.title)
			  .toLowerCase()
			  .includes(normalizeVN(nameFilter).toLowerCase())
        ) return false;

        if (dateFilter) {
          const startDay = new Date(dateFilter);
          startDay.setHours(0, 0, 0, 0);

          const endDay = new Date(dateFilter);
          endDay.setHours(23, 59, 59, 999);

          const s = t.startAt;
          const e = t.endAt;

          if (e) {
            if (!(s <= endDay && e >= startDay)) return false;
          } else {
            if (s >= endDay) return false;
          }
        }

        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [tasks, typeFilter, priorityFilter, nameFilter, dateFilter]);
  

  // =========================
  // ALERT LOGIC
  // =========================
  const taskAlerts = useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    return tasks
      .filter(t => !t.done)
      .map(t => {
        if (t.endAt && t.endAt < now) {
          return { ...t, alert: "overdue" };
        }

        const isToday =
          t.startAt <= endOfToday.getTime() &&
          (t.endAt ?? t.startAt) >= startOfToday.getTime();

        if (isToday) {
          return { ...t, alert: "today" };
        }

        return null;
      })
      .filter(Boolean);
  }, [tasks]);

  // =========================
  // STREAK
  // =========================
  const streak = useMemo(() => {
    const days = new Set(
      tasks
        .filter(t => t.completedAt)
        .map(t =>
          new Date(t.completedAt).toDateString()
        )
    );

    return days.size;
  }, [tasks]);

  // =========================
  // SUGGEST NEXT TASK
  // =========================
  const nextTask = useMemo(() => {
    const active = filtered.filter(t => t.done === 0);

    active.sort((a, b) => a.endAt - b.endAt);

    return active[0] || null;
  }, [filtered]);

/*  return {
		tasks,
		filtered,
		load,
		addTask,
		updateTaskState,
		taskAlerts,
		nextTask,
		streak
	
	  // export filter state
	  typeFilter,
	  setTypeFilter,
	  priorityFilter,
	  setPriorityFilter,
	  nameFilter,
	  setNameFilter,
	  dateFilter,
	  setDateFilter
  };
  */
  
  return {
    tasks,
    filtered,
	load,
    // export filter state
	typeFilter,
	setTypeFilter,
	priorityFilter,
	setPriorityFilter,
	nameFilter,
	setNameFilter,
	dateFilter,
	setDateFilter
  };
  
}