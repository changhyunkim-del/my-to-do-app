// localStorage에 할 일 목록을 저장할 때 쓰는 키
const STORAGE_KEY = 'todo-app.todos';

// 필터별로 보여줄 할 일 조건과, 목록이 비었을 때의 안내 문구
const FILTERS = {
    all: { match: () => true, empty: '할 일이 없습니다' },
    active: { match: (todo) => !todo.done, empty: '미완료된 할 일이 없습니다' },
    done: { match: (todo) => todo.done, empty: '완료된 할 일이 없습니다' },
};

// 입력창, 안내 메시지, 목록, 개수 표시, 버튼 요소
let inputEl;
let messageEl;
let listEl;
let totalCountEl;
let doneCountEl;
let clearDoneBtn;
let filterBtns;

// 할 일 데이터: [{ id, text, done }, ...]
let todos = [];

// 현재 선택된 필터: 'all' | 'active' | 'done'
let currentFilter = 'all';

// 저장된 할 일 목록 불러오기 (없거나 읽을 수 없으면 빈 목록)
function loadTodos() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return Array.isArray(saved) ? saved : [];
    } catch (error) {
        return [];
    }
}

// 현재 할 일 목록을 저장 (저장할 수 없는 환경이면 조용히 넘어감)
function saveTodos() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    } catch (error) {
        // 시크릿 창 등에서 저장이 막혀도 앱은 계속 동작
    }
}

// 비교용 텍스트: 앞뒤 공백 제거, 연속 공백은 하나로, 영문 대소문자 무시
function normalize(text) {
    return text.trim().replace(/\s+/g, ' ').toLowerCase();
}

// 같은 할 일이 이미 있는지 확인 (수정 중인 자기 자신은 exceptId로 제외)
function isDuplicate(text, exceptId) {
    const key = normalize(text);
    return todos.some((todo) => todo.id !== exceptId && normalize(todo.text) === key);
}

// 입력창 아래 안내 메시지 표시 (빈 문자열이면 숨김)
function showMessage(text) {
    messageEl.textContent = text;
}

// 전체/완료 개수와 "완료 항목 삭제" 버튼 상태를 갱신
function updateStats() {
    const doneCount = todos.filter((todo) => todo.done).length;
    totalCountEl.textContent = todos.length;
    doneCountEl.textContent = doneCount;
    clearDoneBtn.disabled = doneCount === 0;
}

// 현재 필터에 맞는 할 일만 목록에 다시 그림
function render() {
    const filter = FILTERS[currentFilter];

    listEl.replaceChildren();
    listEl.dataset.empty = filter.empty;
    todos.filter(filter.match).forEach(renderTodo);

    filterBtns.forEach((btn) => {
        btn.setAttribute('aria-pressed', btn.dataset.filter === currentFilter);
    });

    updateStats();
}

// 할 일이 바뀔 때마다 호출: 저장하고 화면 갱신
function handleTodosChange() {
    saveTodos();
    render();
}

// 할 일 하나를 화면 목록 맨 아래에 표시
// 구조: [체크박스] [할 일 텍스트] [수정] [삭제]
function renderTodo(todo) {
    const item = document.createElement('li');
    item.className = 'todo-item';
    item.classList.toggle('done', todo.done);

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'todo-check';
    checkbox.checked = todo.done;
    checkbox.setAttribute('aria-label', '완료');
    checkbox.addEventListener('change', () => {
        todo.done = checkbox.checked;
        handleTodosChange();
    });

    const textEl = document.createElement('span');
    textEl.className = 'todo-text';
    textEl.textContent = todo.text;

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn-small btn-edit';
    editBtn.textContent = '수정';
    editBtn.addEventListener('click', () => {
        if (item.classList.contains('editing')) {
            finishEdit(item, todo, true);
        } else {
            startEdit(item, todo);
        }
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn-small btn-delete';
    deleteBtn.textContent = '삭제';
    deleteBtn.addEventListener('click', () => {
        todos = todos.filter((t) => t.id !== todo.id);
        handleTodosChange();
    });

    const actions = document.createElement('div');
    actions.className = 'todo-actions';
    actions.append(editBtn, deleteBtn);

    item.append(checkbox, textEl, actions);
    listEl.appendChild(item);
}

// 새 할 일을 데이터에 추가하고 저장
// 새 할 일은 미완료이므로 "완료" 필터에서 추가하면 전체 보기로 전환해 바로 보이게 함
function addTodo(text) {
    todos.push({ id: Date.now(), text, done: false });
    if (currentFilter === 'done') {
        currentFilter = 'all';
    }
    handleTodosChange();
}

// 완료된 할 일을 한꺼번에 삭제
function clearDone() {
    const doneCount = todos.filter((todo) => todo.done).length;
    if (doneCount === 0) {
        return;
    }
    if (!confirm(`완료된 할 일 ${doneCount}개를 삭제할까요?`)) {
        return;
    }

    todos = todos.filter((todo) => !todo.done);
    handleTodosChange();
}

// 필터 변경
function setFilter(filter) {
    currentFilter = filter;
    render();
}

// 수정 시작: 텍스트를 입력창으로 바꾸고 버튼을 "저장"으로 변경
function startEdit(item, todo) {
    const textEl = item.querySelector('.todo-text');

    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.className = 'todo-edit-input';
    editInput.value = todo.text;
    editInput.setAttribute('aria-label', '할 일 수정');
    editInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            finishEdit(item, todo, true);
        } else if (event.key === 'Escape') {
            finishEdit(item, todo, false);
        }
    });

    textEl.replaceWith(editInput);
    item.classList.add('editing');
    item.querySelector('.btn-edit').textContent = '저장';

    editInput.focus();
    editInput.select();
}

// 수정 종료: save가 true면 새 내용을 반영해 저장, false면 원래 내용 유지
// 빈 내용으로 저장하려 하면 원래 내용을 유지
// 다른 할 일과 같은 내용이면 저장하지 않고 수정 상태를 유지
function finishEdit(item, todo, save) {
    const editInput = item.querySelector('.todo-edit-input');
    const newText = editInput.value.trim();

    if (save && newText !== '' && isDuplicate(newText, todo.id)) {
        showMessage('이미 등록된 할 일입니다.');
        editInput.focus();
        return;
    }

    showMessage('');

    if (save && newText !== '') {
        todo.text = newText;
        handleTodosChange();
    } else {
        render();
    }
}

// 폼 제출(추가 버튼 클릭 또는 Enter) 처리
function handleSubmit(event) {
    event.preventDefault();

    const text = inputEl.value.trim();
    if (text === '') {
        inputEl.focus();
        return;
    }

    if (isDuplicate(text)) {
        showMessage('이미 등록된 할 일입니다.');
        inputEl.focus();
        inputEl.select();
        return;
    }

    showMessage('');
    addTodo(text);
    inputEl.value = '';
    inputEl.focus();
}

// 앱 시작: 요소를 찾고, 저장된 할 일을 표시하고, 이벤트 연결
function initApp() {
    inputEl = document.getElementById('todo-text');
    messageEl = document.getElementById('input-message');
    listEl = document.getElementById('todo-list');
    totalCountEl = document.getElementById('total-count');
    doneCountEl = document.getElementById('done-count');
    clearDoneBtn = document.getElementById('clear-done-btn');
    filterBtns = document.querySelectorAll('.filter-btn');

    todos = loadTodos();
    render();

    document.getElementById('todo-form').addEventListener('submit', handleSubmit);
    inputEl.addEventListener('input', () => showMessage(''));
    clearDoneBtn.addEventListener('click', clearDone);
    filterBtns.forEach((btn) => {
        btn.addEventListener('click', () => setFilter(btn.dataset.filter));
    });
}

document.addEventListener('DOMContentLoaded', initApp);
