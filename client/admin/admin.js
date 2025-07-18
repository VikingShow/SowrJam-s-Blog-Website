// client/admin/admin.js

const API_BASE_URL = '/api/admin';

// --- 全局状态 ---
let allTagsCache = [];

// --- 页面加载逻辑 ---
document.addEventListener('DOMContentLoaded', () => {
    const adminLogo = document.querySelector('.admin-sidebar .logo');
    if (adminLogo) {
        applyTypingEffect(adminLogo);
    }

    const pageId = document.body.id;
    if (document.getElementById('admin-posts-table-body')) {
        loadAdminPosts();
    } else if (document.getElementById('admin-tags-table-body')) {
        loadAdminTags();
    } else if (document.getElementById('edit-form')) {
        initializeEditPage();
    }
});

// --- 模态框 (Modal) 辅助函数 ---
function showModal({ title, body, onConfirm, onCancel, confirmText = '确认', cancelText = '取消', danger = false }) {
    const modalContainer = document.getElementById('modal-container');
    const modalHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${title}</h2>
                </div>
                <div class="modal-body">${body}</div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="modal-cancel">${cancelText}</button>
                    <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="modal-confirm">${confirmText}</button>
                </div>
            </div>
        </div>
    `;
    modalContainer.innerHTML = modalHTML;
    const overlay = modalContainer.querySelector('.modal-overlay');
    
    // 延迟一帧添加 'visible' class 以触发CSS过渡
    requestAnimationFrame(() => {
        overlay.classList.add('visible');
    });

    const closeModal = () => {
        overlay.classList.remove('visible');
        setTimeout(() => { modalContainer.innerHTML = ''; }, 300); // 等待动画结束后移除
    };

    document.getElementById('modal-confirm').onclick = () => {
        if (onConfirm) onConfirm();
        closeModal();
    };
    document.getElementById('modal-cancel').onclick = () => {
        if (onCancel) onCancel();
        closeModal();
    };
    overlay.onclick = (e) => {
        if (e.target === overlay) closeModal();
    };
}

// --- 文章管理 ---
async function loadAdminPosts() {
    try {
        const response = await fetch(`${API_BASE_URL}/posts`);
        const posts = await response.json();
        const tableBody = document.getElementById('admin-posts-table-body');
        tableBody.innerHTML = '';
        posts.forEach(post => {
            const tagsHtml = (post.Tags || []).map(tag => `<span class="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">${tag.name}</span>`).join(' ');
            const row = `
                <tr>
                    <td class="font-semibold">${post.title}</td>
                    <td><span class="status-badge ${post.status === 'publish' ? 'status-publish' : 'status-draft'}">${post.status === 'publish' ? '已发布' : '草稿'}</span></td>
                    <td><div class="flex flex-wrap gap-1">${tagsHtml}</div></td>
                    <td>${new Date(post.publishDate).toLocaleDateString()}</td>
                    <td>
                        <a href="edit.html?id=${post.id}" class="action-link">编辑</a>
                        <button onclick="handleDeletePost('${post.id}', '${post.title}')" class="action-btn">删除</button>
                    </td>
                </tr>`;
            tableBody.innerHTML += row;
        });
    } catch (error) { console.error('加载文章列表失败:', error); }
}
function handleDeletePost(id, title) {
    showModal({
        title: '删除文章',
        body: `<p>你确定要删除文章 <strong>"${title}"</strong> 吗？此操作不可撤销。</p>`,
        confirmText: '删除',
        danger: true,
        onConfirm: async () => {
            try {
                await fetch(`${API_BASE_URL}/posts/${id}`, { method: 'DELETE' });
                loadAdminPosts();
            } catch (error) { console.error('删除文章失败:', error); alert('删除失败。'); }
        }
    });
}

// --- 标签管理 ---
async function loadAdminTags() {
    try {
        const response = await fetch(`${API_BASE_URL}/tags`);
        allTagsCache = await response.json();
        const tableBody = document.getElementById('admin-tags-table-body');
        tableBody.innerHTML = '';
        allTagsCache.forEach(tag => {
            const row = `
                <tr>
                    <td>${tag.name}</td>
                    <td class="text-right">
                        <button onclick="handleEditTag(${tag.id}, '${tag.name}')" class="action-link">重命名</button>
                        <button onclick="handleDeleteTag(${tag.id}, '${tag.name}')" class="action-btn">删除</button>
                    </td>
                </tr>`;
            tableBody.innerHTML += row;
        });
    } catch (error) { console.error('加载标签列表失败:', error); }
}
function handleAddTag() {
    showModal({
        title: '创建新标签',
        body: `
            <div class="form-group">
                <label for="modal-tag-name" class="form-label">标签名</label>
                <input type="text" id="modal-tag-name" class="form-input" required>
            </div>`,
        confirmText: '创建',
        onConfirm: async () => {
            const name = document.getElementById('modal-tag-name').value.trim();
            if (name) {
                try {
                    await fetch(`${API_BASE_URL}/tags`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name })
                    });
                    loadAdminTags();
                } catch (error) { console.error('创建标签失败:', error); alert('创建失败。'); }
            }
        }
    });
    // 自动聚焦到输入框
    setTimeout(() => document.getElementById('modal-tag-name').focus(), 100);
}
function handleEditTag(id, oldName) {
    showModal({
        title: '重命名标签',
        body: `
            <div class="form-group">
                <label for="modal-tag-name" class="form-label">新标签名</label>
                <input type="text" id="modal-tag-name" class="form-input" value="${oldName}" required>
            </div>`,
        confirmText: '更新',
        onConfirm: async () => {
            const newName = document.getElementById('modal-tag-name').value.trim();
            if (newName && newName !== oldName) {
                try {
                    await fetch(`${API_BASE_URL}/tags/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: newName })
                    });
                    loadAdminTags();
                } catch (error) { console.error('重命名标签失败:', error); alert('重命名失败。'); }
            }
        }
    });
    setTimeout(() => document.getElementById('modal-tag-name').focus(), 100);
}
function handleDeleteTag(id, name) {
    showModal({
        title: '删除标签',
        body: `<p>你确定要删除标签 <strong>"${name}"</strong> 吗？这将会从所有使用该标签的文章中移除它。</p>`,
        confirmText: '删除',
        danger: true,
        onConfirm: async () => {
            try {
                await fetch(`${API_BASE_URL}/tags/${id}`, { method: 'DELETE' });
                loadAdminTags();
            } catch (error) { console.error('删除标签失败:', error); alert('删除失败。'); }
        }
    });
}

// --- 文章编辑器 ---
async function initializeEditPage() {
    // 1. 初始化编辑器
    const easyMDE = new EasyMDE({ element: document.getElementById('content-editor'), spellChecker: false, maxHeight: "400px", toolbar: ["bold", "italic", "heading", "|", "quote", "code", "unordered-list", "ordered-list", "|", "link", "image", "|", "preview", "side-by-side", "fullscreen"] });
    
    // 2. 处理MD文件上传
    const mdUploadInput = document.getElementById('md-upload');
    mdUploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => { easyMDE.value(e.target.result); };
        reader.readAsText(file);
    });

    // 3. 加载已有文章数据 (如果是编辑模式)
    const params = new URLSearchParams(window.location.search);
    const postId = params.get('id');
    if (postId) {
        document.getElementById('edit-page-title').textContent = '编辑文章';
        const response = await fetch(`${API_BASE_URL}/posts/${postId}`);
        const post = await response.json();
        document.getElementById('post-id').value = post.id;
        document.getElementById('title').value = post.title;
        easyMDE.value(post.content);
        document.getElementById('tags').value = (post.Tags || []).map(tag => tag.name).join(', ');
        document.getElementById('status').value = post.status;
    }

    // 4. 初始化标签自动补全
    const tagsInput = document.getElementById('tags');
    const suggestionsContainer = document.getElementById('tag-suggestions');
    
    // 先获取所有标签
    await fetch(`${API_BASE_URL}/tags`).then(res => res.json()).then(tags => {
        allTagsCache = tags.map(t => t.name);
    });

    tagsInput.addEventListener('input', () => {
        const currentTags = tagsInput.value.split(',').map(t => t.trim());
        const currentTagFragment = currentTags.pop();
        
        if (currentTagFragment) {
            const suggestions = allTagsCache.filter(tag => 
                tag.toLowerCase().startsWith(currentTagFragment.toLowerCase()) && 
                !currentTags.includes(tag)
            );
            renderSuggestions(suggestions, currentTags, currentTagFragment);
        } else {
            suggestionsContainer.innerHTML = '';
        }
    });

    function renderSuggestions(suggestions, existingTags, currentFragment) {
        suggestionsContainer.innerHTML = '';
        suggestions.forEach(suggestion => {
            const div = document.createElement('div');
            div.textContent = suggestion;
            div.onclick = () => {
                const newTags = [...existingTags, suggestion];
                tagsInput.value = newTags.join(', ') + ', ';
                suggestionsContainer.innerHTML = '';
                tagsInput.focus();
            };
            suggestionsContainer.appendChild(div);
        });
    }

    // 5. 绑定表单提交事件
    document.getElementById('edit-form').addEventListener('submit', (event) => { handleFormSubmit(event, easyMDE); });
}

async function handleFormSubmit(event, easyMDE) {
    event.preventDefault();
    const form = event.target;
    const postId = form.id.value;
    const content = easyMDE.value();
    if (!content.trim()) { alert('文章内容不能为空！'); return; }
    const postData = { title: form.title.value, content: content, tags: form.tags.value, status: form.status.value };
    const method = postId ? 'PUT' : 'POST';
    const url = postId ? `${API_BASE_URL}/posts/${postId}` : `${API_BASE_URL}/posts`;
    try {
        const response = await fetch(url, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(postData) });
        if (!response.ok) throw new Error('保存失败');
        window.location.href = 'index.html';
    } catch (error) { console.error('保存文章失败:', error); alert('保存失败，请检查控制台信息。'); }
}

// **新增：从前台复制过来的打字机效果函数**
function applyTypingEffect(element) {
    if (!element || !element.textContent) return;
    
    const originalText = element.textContent.trim();
    element.innerHTML = ''; // 清空元素内容
    element.style.opacity = 1; // 确保容器可见

    const textNode = document.createTextNode('');
    const cursor = document.createElement('span');
    cursor.className = 'typing-cursor';
    cursor.textContent = '▋';

    element.appendChild(textNode);
    element.appendChild(cursor);

    let i = 0;
    const typingInterval = setInterval(() => {
        if (i < originalText.length) {
            // 逐一添加字符
            textNode.nodeValue += originalText.charAt(i);
            i++;
        } else {
            // **修改：打字结束后，只清除定时器，不再移除光标**
            clearInterval(typingInterval);
        }
    }, 120); // 打字速度 (毫秒)
}