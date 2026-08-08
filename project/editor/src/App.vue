<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { adminApi } from './api/level';
import { STATUS_LABEL, type LevelContent, type LevelSummary } from './types/level';

const levels = ref<LevelSummary[]>([]);
const loading = ref(false);
const errorMsg = ref('');
const successMsg = ref('');
const filterStatus = ref<number | ''>('');
const editingId = ref<string | null>(null);
const jsonText = ref('');
const jsonError = ref('');
const content = ref<LevelContent | null>(null);
const saveBusy = ref(false);

const EMPTY_CONTENT = (): LevelContent => ({
  schemaVersion: '1.0.0',
  levelId: '',
  chapterId: 'chapter_01',
  order: 1,
  title: '新关卡',
  puzzleType: 'visual',
  difficulty: 2,
  unlock: { type: 'auto' },
  story: { intro: '开场故事…', outro: '结局故事…' },
  scene: {
    background: 'bg_default',
    objects: [
      {
        id: 'key_object',
        type: 'sprite',
        spriteKey: 'obj_placeholder',
        position: { x: 0, y: 0 },
        zIndex: 2,
        interactive: true,
        actions: [
          {
            id: 'right_tap_key',
            trigger: 'tap',
            targetId: 'key_object',
            result: 'right',
            feedback: { bugTalk: '真相只有一个！', toast: '找到了！' },
            onSuccess: { unlockBugLog: true, gotoResult: true },
          },
        ],
      },
      {
        id: 'decoy',
        type: 'sprite',
        spriteKey: 'obj_placeholder',
        position: { x: 200, y: 0 },
        zIndex: 2,
        interactive: true,
        actions: [
          {
            id: 'wrong_tap_decoy',
            trigger: 'tap',
            targetId: 'decoy',
            result: 'wrong',
            feedback: { bugTalk: '不对哦，再想想。', toast: '不是这个。' },
          },
        ],
      },
    ],
    camera: { initialZoom: 1, maxZoom: 1.5 },
  },
  misleadLayer: {
    description: '玩家会被表面现象误导。',
    actions: [{ id: 'wrong_tap_decoy', trigger: 'tap', targetId: 'decoy', result: 'wrong' }],
  },
  truthLayer: {
    description: '发现真相，点击正确对象。',
    successMode: 'any',
    actions: [{ id: 'right_tap_key', trigger: 'tap', targetId: 'key_object', result: 'right' }],
  },
  hints: [
    { level: 1, text: '别相信你的第一眼。', cost: { ad: false, coins: 0 } },
    { level: 2, text: '仔细看看哪里不对劲。', cost: { ad: true, coins: 0 } },
    { level: 3, text: '试试点击正确的地方。', cost: { ad: true, coins: 50 } },
  ],
  bugLog: { id: '', title: '新 Bug 记录', detail: '错误记录：…真相：…' },
  tags: [],
});

const filteredLevels = computed(() => levels.value);

async function load() {
  loading.value = true;
  errorMsg.value = '';
  try {
    levels.value = await adminApi.list(filterStatus.value || undefined);
  } catch (e) {
    errorMsg.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}

function flash(msg: string) {
  successMsg.value = msg;
  setTimeout(() => (successMsg.value = ''), 2500);
}

async function refresh() {
  await load();
  if (editingId.value) {
    await openEdit(editingId.value);
  }
}

async function openEdit(id: string) {
  try {
    const detail = await adminApi.detail(id);
    editingId.value = id;
    content.value = detail.content;
    jsonText.value = JSON.stringify(detail.content, null, 2);
    jsonError.value = '';
  } catch (e) {
    errorMsg.value = (e as Error).message;
  }
}

function closeEdit() {
  editingId.value = null;
  content.value = null;
  jsonText.value = '';
  jsonError.value = '';
}

function parseJson(): LevelContent | null {
  try {
    const parsed = JSON.parse(jsonText.value) as LevelContent;
    jsonError.value = '';
    return parsed;
  } catch {
    jsonError.value = 'JSON 解析失败，请检查语法';
    return null;
  }
}

async function save() {
  const parsed = parseJson();
  if (!parsed || !editingId.value) return;
  saveBusy.value = true;
  try {
    await adminApi.update(editingId.value, parsed);
    flash('保存成功');
    await refresh();
  } catch (e) {
    errorMsg.value = (e as Error).message;
  } finally {
    saveBusy.value = false;
  }
}

async function createNew() {
  saveBusy.value = true;
  try {
    const summary = await adminApi.create(EMPTY_CONTENT(), 1);
    flash('草稿创建成功');
    await load();
    await openEdit(summary.level_id);
  } catch (e) {
    errorMsg.value = (e as Error).message;
  } finally {
    saveBusy.value = false;
  }
}

async function doTransition(id: string, action: 'submit' | 'approve' | 'offline' | 'reject') {
  try {
    await adminApi.transition(id, action);
    flash(`状态已更新：${STATUS_LABEL[action === 'submit' ? 2 : action === 'approve' ? 3 : action === 'offline' ? 4 : 1]}`);
    await refresh();
  } catch (e) {
    errorMsg.value = (e as Error).message;
  }
}

async function removeLevel(id: string) {
  if (!window.confirm('确认删除该草稿？此操作不可恢复。')) return;
  try {
    await adminApi.remove(id);
    flash('草稿已删除');
    if (editingId.value === id) closeEdit();
    await load();
  } catch (e) {
    errorMsg.value = (e as Error).message;
  }
}

function newFromTemplate() {
  content.value = EMPTY_CONTENT();
  editingId.value = null;
  jsonText.value = JSON.stringify(EMPTY_CONTENT(), null, 2);
  jsonError.value = '';
}

onMounted(load);
</script>

<template>
  <div class="editor">
    <header class="editor__header">
      <h1>Bug哥 · 关卡编辑器</h1>
      <div class="editor__header-actions">
        <button class="btn" @click="newFromTemplate">从模板新建（本地）</button>
        <button class="btn btn--primary" @click="createNew">创建草稿</button>
        <button class="btn" @click="load">刷新列表</button>
      </div>
    </header>

    <div v-if="successMsg" class="toast toast--ok">{{ successMsg }}</div>
    <div v-if="errorMsg" class="toast toast--err">{{ errorMsg }}</div>

    <section class="panel">
      <div class="panel__toolbar">
        <h2>关卡列表</h2>
        <select v-model="filterStatus" @change="load" class="select">
          <option value="">全部状态</option>
          <option v-for="(label, key) in STATUS_LABEL" :key="key" :value="Number(key)">{{ label }}</option>
        </select>
      </div>

      <div v-if="loading" class="muted">加载中…</div>
      <table v-else class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>标题</th>
            <th>类型</th>
            <th>难度</th>
            <th>章节</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="l in filteredLevels" :key="l.level_id" :class="{ active: editingId === l.level_id }">
            <td>{{ l.level_id }}</td>
            <td>{{ l.title }}</td>
            <td>{{ l.puzzle_type }}</td>
            <td>{{ l.difficulty }}★</td>
            <td>{{ l.chapter_id }}</td>
            <td><span class="badge" :class="`badge--${l.level_status}`">{{ STATUS_LABEL[l.level_status] }}</span></td>
            <td class="row-actions">
              <button class="btn btn--sm" @click="openEdit(l.level_id)">编辑</button>
              <button v-if="l.level_status === 1" class="btn btn--sm" @click="doTransition(l.level_id, 'submit')">提交审核</button>
              <button v-if="l.level_status === 2" class="btn btn--sm" @click="doTransition(l.level_id, 'approve')">通过</button>
              <button v-if="l.level_status === 2" class="btn btn--sm" @click="doTransition(l.level_id, 'reject')">打回</button>
              <button v-if="l.level_status === 3" class="btn btn--sm" @click="doTransition(l.level_id, 'offline')">下线</button>
              <button v-if="l.level_status === 1" class="btn btn--sm btn--danger" @click="removeLevel(l.level_id)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section v-if="editingId || content" class="panel">
      <div class="panel__toolbar">
        <h2>关卡内容编辑</h2>
        <button class="btn" @click="closeEdit">关闭</button>
      </div>

      <div class="editor-grid">
        <div class="form">
          <label class="field">
            <span>标题</span>
            <input v-model="content!.title" type="text" />
          </label>
          <label class="field">
            <span>谜题类型</span>
            <select v-model="content!.puzzleType">
              <option value="visual">visual（视觉误导）</option>
              <option value="reverse">reverse（常识反转）</option>
              <option value="target">target（目标误解）</option>
              <option value="language">language（语言陷阱）</option>
              <option value="detail">detail（细节推理）</option>
            </select>
          </label>
          <label class="field">
            <span>难度（1-5）</span>
            <input v-model.number="content!.difficulty" type="number" min="1" max="5" />
          </label>
          <label class="field">
            <span>章节</span>
            <input v-model="content!.chapterId" type="text" />
          </label>
          <div class="field">
            <span>误导层描述</span>
            <textarea v-model="content!.misleadLayer.description" rows="2"></textarea>
          </div>
          <div class="field">
            <span>真相层描述</span>
            <textarea v-model="content!.truthLayer.description" rows="2"></textarea>
          </div>
          <div class="field">
            <span>开场故事</span>
            <textarea v-model="content!.story.intro" rows="2"></textarea>
          </div>
          <div class="field">
            <span>结局故事</span>
            <textarea v-model="content!.story.outro" rows="2"></textarea>
          </div>
        </div>

        <div class="json-panel">
          <div class="json-panel__head">
            <span>原始 JSON（与表单双向同步）</span>
            <button class="btn btn--sm" @click="jsonText = JSON.stringify(parseJson() ?? content, null, 2)">格式化</button>
          </div>
          <textarea v-model="jsonText" class="json-editor" spellcheck="false"></textarea>
          <div v-if="jsonError" class="json-error">{{ jsonError }}</div>
        </div>
      </div>

      <div class="form-actions">
        <button class="btn btn--primary" :disabled="saveBusy" @click="save">
          {{ saveBusy ? '保存中…' : '保存修改' }}
        </button>
        <span class="muted">保存时将提交服务端 Schema 校验（R01-R20），失败会被拒绝</span>
      </div>
    </section>
  </div>
</template>

<style scoped>
.editor {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}
.editor__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.editor__header h1 {
  font-size: 22px;
  margin: 0;
}
.editor__header-actions {
  display: flex;
  gap: 8px;
}
.btn {
  padding: 6px 14px;
  border: 1px solid #d0d5dd;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.15s;
}
.btn:hover {
  border-color: #667085;
}
.btn--primary {
  background: #1d4ed8;
  color: #fff;
  border-color: #1d4ed8;
}
.btn--primary:hover {
  background: #1e40af;
}
.btn--danger {
  color: #b42318;
  border-color: #fda29b;
}
.btn--danger:hover {
  background: #fef3f2;
}
.btn--sm {
  padding: 3px 10px;
  font-size: 12px;
}
.toast {
  padding: 10px 14px;
  border-radius: 6px;
  margin-bottom: 12px;
  font-size: 13px;
}
.toast--ok {
  background: #ecfdf3;
  color: #027a48;
  border: 1px solid #a6f4c5;
}
.toast--err {
  background: #fef3f2;
  color: #b42318;
  border: 1px solid #fecdca;
}
.panel {
  background: #fff;
  border: 1px solid #e4e7ec;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 16px;
}
.panel__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.panel__toolbar h2 {
  font-size: 16px;
  margin: 0;
}
.select {
  padding: 5px 10px;
  border: 1px solid #d0d5dd;
  border-radius: 6px;
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.table th,
.table td {
  text-align: left;
  padding: 8px 10px;
  border-bottom: 1px solid #f2f4f7;
}
.table tr.active td {
  background: #eff6ff;
}
.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
}
.badge--1 { background: #f2f4f7; color: #475467; }
.badge--2 { background: #fffaeb; color: #b54708; }
.badge--3 { background: #ecfdf3; color: #027a48; }
.badge--4 { background: #fef3f2; color: #b42318; }
.row-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.editor-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
}
.field span {
  color: #475467;
}
.field input,
.field select,
.field textarea {
  padding: 6px 10px;
  border: 1px solid #d0d5dd;
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
}
.json-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.json-panel__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #475467;
}
.json-editor {
  width: 100%;
  height: 380px;
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 12px;
  border: 1px solid #d0d5dd;
  border-radius: 6px;
  padding: 10px;
  resize: vertical;
  line-height: 1.5;
}
.json-error {
  color: #b42318;
  font-size: 12px;
}
.form-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
}
.muted {
  color: #98a2b3;
  font-size: 12px;
}
</style>
