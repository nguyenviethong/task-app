let tasks = [];

async function init() {
  tasks = await window.api.loadTasks();
  render();
}

function addTask() {
  const input = document.getElementById('taskInput');
  if (!input.value) return;

  tasks.push({ text: input.value, done: false });
  input.value = '';
  save();
}

function toggleTask(i) {
  tasks[i].done = !tasks[i].done;
  save();
}

function deleteTask(i) {
  tasks.splice(i, 1);
  save();
}

async function save() {
  await window.api.saveTasks(tasks);
  render();
}

function render() {
  const list = document.getElementById('taskList');
  list.innerHTML = '';

  tasks.forEach((task, i) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span style="text-decoration:${task.done ? 'line-through' : 'none'}"
            onclick="toggleTask(${i})">
        ${task.text}
      </span>
      <button onclick="deleteTask(${i})">❌</button>
    `;
    list.appendChild(li);
  });
}

init();
