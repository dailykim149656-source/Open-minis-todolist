"use strict";

const STORAGE_KEY = "open-minis-todolist:v1";

const elements = {
  form: document.querySelector("#todo-form"),
  input: document.querySelector("#todo-input"),
  list: document.querySelector("#todo-list"),
  filters: document.querySelector(".filters"),
  filterButtons: [...document.querySelectorAll("[data-filter]")],
  clearButton: document.querySelector("#clear-completed"),
  remainingCount: document.querySelector("#remaining-count"),
  allCount: document.querySelector("#all-count"),
  emptyState: document.querySelector("#empty-state"),
  emptyTitle: document.querySelector("#empty-title"),
  emptyDescription: document.querySelector("#empty-description"),
  currentDate: document.querySelector("#current-date"),
  progressLabel: document.querySelector("#progress-label"),
  progressPercent: document.querySelector("#progress-percent"),
  progressTrack: document.querySelector("#progress-track"),
  progressBar: document.querySelector("#progress-bar"),
  statusMessage: document.querySelector("#status-message")
};

let todos = loadTodos();
let currentFilter = "all";

function loadTodos() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((todo) =>
      todo && typeof todo.id === "string" && typeof todo.text === "string" && typeof todo.completed === "boolean"
    );
  } catch {
    return [];
  }
}

function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function announce(message) {
  elements.statusMessage.textContent = "";
  requestAnimationFrame(() => { elements.statusMessage.textContent = message; });
}

function filteredTodos() {
  if (currentFilter === "active") return todos.filter((todo) => !todo.completed);
  if (currentFilter === "completed") return todos.filter((todo) => todo.completed);
  return todos;
}

function createTodoElement(todo) {
  const item = document.createElement("li");
  item.className = `todo-item${todo.completed ? " completed" : ""}`;
  item.dataset.id = todo.id;

  const checkbox = document.createElement("input");
  checkbox.className = "todo-checkbox";
  checkbox.type = "checkbox";
  checkbox.checked = todo.completed;
  checkbox.setAttribute("aria-label", `${todo.text} ${todo.completed ? "미완료로 변경" : "완료로 변경"}`);

  const text = document.createElement("span");
  text.className = "todo-text";
  text.textContent = todo.text;

  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-button";
  deleteButton.type = "button";
  deleteButton.dataset.action = "delete";
  deleteButton.setAttribute("aria-label", `${todo.text} 삭제`);
  deleteButton.innerHTML = '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" aria-hidden="true"><path d="M4 7h16M10 11v5M14 11v5M6.5 7l.8 12h9.4l.8-12M9 7V4.8h6V7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  item.append(checkbox, text, deleteButton);
  return item;
}

function render() {
  const visibleTodos = filteredTodos();
  const activeCount = todos.filter((todo) => !todo.completed).length;
  const completedCount = todos.length - activeCount;
  const progress = todos.length ? Math.round((completedCount / todos.length) * 100) : 0;

  elements.list.replaceChildren(...visibleTodos.map(createTodoElement));
  elements.remainingCount.textContent = activeCount;
  elements.allCount.textContent = todos.length;
  elements.clearButton.disabled = completedCount === 0;

  elements.progressPercent.textContent = `${progress}%`;
  elements.progressBar.style.width = `${progress}%`;
  elements.progressTrack.setAttribute("aria-valuenow", String(progress));
  elements.progressLabel.textContent = todos.length
    ? completedCount === todos.length ? "오늘 할 일을 모두 마쳤어요!" : `${completedCount}/${todos.length} 완료했어요`
    : "아직 할 일이 없어요";

  const emptyCopy = {
    all: ["할 일을 추가해 보세요", "작은 계획부터 가볍게 시작해요."],
    active: ["남은 할 일이 없어요", "멋져요, 잠시 쉬어 가도 좋아요."],
    completed: ["완료한 일이 없어요", "하나씩 끝내면 여기에 모여요."]
  }[currentFilter];
  elements.emptyTitle.textContent = emptyCopy[0];
  elements.emptyDescription.textContent = emptyCopy[1];
  elements.emptyState.hidden = visibleTodos.length > 0;

  elements.filterButtons.forEach((button) => {
    const selected = button.dataset.filter === currentFilter;
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
}

function addTodo(text) {
  const cleanText = text.trim().replace(/\s+/g, " ");
  if (!cleanText) return;
  todos.unshift({ id: createId(), text: cleanText, completed: false, createdAt: Date.now() });
  saveTodos();
  render();
  announce(`할 일 '${cleanText}'을 추가했습니다.`);
}

function toggleTodo(id, completed) {
  const todo = todos.find((item) => item.id === id);
  if (!todo) return;
  todo.completed = completed;
  saveTodos();
  render();
  announce(`'${todo.text}'을 ${completed ? "완료" : "진행 중"} 상태로 변경했습니다.`);
}

function deleteTodo(id) {
  const todo = todos.find((item) => item.id === id);
  if (!todo) return;
  todos = todos.filter((item) => item.id !== id);
  saveTodos();
  render();
  announce(`'${todo.text}'을 삭제했습니다.`);
}

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  addTodo(elements.input.value);
  elements.form.reset();
  elements.input.focus();
});

elements.list.addEventListener("change", (event) => {
  if (!event.target.matches(".todo-checkbox")) return;
  const item = event.target.closest(".todo-item");
  toggleTodo(item.dataset.id, event.target.checked);
});

elements.list.addEventListener("click", (event) => {
  const button = event.target.closest('[data-action="delete"]');
  if (!button) return;
  deleteTodo(button.closest(".todo-item").dataset.id);
});

elements.filters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  currentFilter = button.dataset.filter;
  render();
});

elements.filters.addEventListener("keydown", (event) => {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  const index = elements.filterButtons.indexOf(document.activeElement);
  const step = event.key === 'ArrowRight' ? 1 : -1;
  const next = elements.filterButtons[(index + step + elements.filterButtons.length) % elements.filterButtons.length];
  next.click();
  next.focus();
});

elements.clearButton.addEventListener("click", () => {
  const count = todos.filter((todo) => todo.completed).length;
  todos = todos.filter((todo) => !todo.completed);
  saveTodos();
  render();
  announce(`완료한 할 일 ${count}개를 삭제했습니다.`);
});

elements.currentDate.textContent = new Intl.DateTimeFormat("ko-KR", {
  month: "long", day: "numeric", weekday: "long"
}).format(new Date());

render();
