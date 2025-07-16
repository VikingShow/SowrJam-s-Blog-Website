// client/admin/admin.js

const API_BASE_URL = '/api/admin';

document.addEventListener('DOMContentLoaded', () => {
    const postsTable = document.getElementById('admin-posts-table-body');
    if (postsTable) {
        loadAdminPosts();
    }

    const tagsTable = document.getElementById('admin-tags-table-body');
    if (tagsTable) {
        loadAdminTags();
    }
    
    const addTagForm = document.getElementById('add-tag-form');
    if (addTagForm) {
        addTagForm.addEventListener('submit', handleAddTag);
    }

    const editForm = document.getElementById('edit-form');
    if (editForm) {
        initializeEditPage();
    }
});

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
async function handleDeletePost(id, title) {
    if (confirm(`你确定要删除文章 "${title}" 吗？此操作不可撤销。`)) {
        try {
            await fetch(`${API_BASE_URL}/posts/${id}`, { method: 'DELETE' });
            loadAdminPosts();
        } catch (error) { console.error('删除文章失败:', error); alert('删除失败，请稍后重试。'); }
    }
}

// --- 标签管理 ---
async function loadAdminTags() {
    try {
        const response = await fetch(`${API_BASE_URL}/tags`);
        const tags = await response.json();
        const tableBody = document.getElementById('admin-tags-table-body');
        tableBody.innerHTML = '';
        tags.forEach(tag => {
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
async function handleAddTag(event) {
    event.preventDefault();
    const input = document.getElementById('new-tag-name');
    const name = input.value.trim();
    if (name) {
        try {
            await fetch(`${API_BASE_URL}/tags`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            input.value = '';
            loadAdminTags();
        } catch (error) { console.error('创建标签失败:', error); alert('创建失败。'); }
    }
}
async function handleEditTag(id, oldName) {
    const newName = prompt(`正在重命名标签 "${oldName}":`, oldName);
    if (newName && newName.trim() !== '' && newName !== oldName) {
        try {
            await fetch(`${API_BASE_URL}/tags/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName.trim() })
            });
            loadAdminTags();
        } catch (error) { console.error('重命名标签失败:', error); alert('重命名失败。'); }
    }
}
async function handleDeleteTag(id, name) {
    if (confirm(`你确定要删除标签 "${name}" 吗？这将会从所有使用该标签的文章中移除它。`)) {
        try {
            await fetch(`${API_BASE_URL}/tags/${id}`, { method: 'DELETE' });
            loadAdminTags();
        } catch (error) { console.error('删除标签失败:', error); alert('删除失败。'); }
    }
}

// --- 文章编辑器 ---
async function initializeEditPage() {
    const easyMDE = new EasyMDE({ 
        element: document.getElementById('content-editor'),
        spellChecker: false,
        maxHeight: "400px",
        // **新增：配置图片上传功能**
        uploadImage: true,
        imageUploadFunction: async (file, onSuccess, onError) => {
            const formData = new FormData();
            formData.append('image', file);

            try {
                const response = await fetch(`${API_BASE_URL}/upload`, {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    throw new Error('上传失败');
                }

                const result = await response.json();
                onSuccess(result.url); // 调用成功回调，将图片URL插入编辑器
            } catch (error) {
                console.error('图片上传失败:', error);
                onError('图片上传失败: ' + error.message); // 调用失败回调
            }
        },
    });

    const mdUploadInput = document.getElementById('md-upload');
    mdUploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => { easyMDE.value(e.target.result); };
        reader.readAsText(file);
    });
    const params = new URLSearchParams(window.location.search);
    const postId = params.get('id');
    if (postId) {
        document.getElementById('edit-page-title').textContent = '编辑文章';
        const response = await fetch(`${API_BASE_URL}/posts/${postId}`);
        if (!response.ok) throw new Error(`获取文章失败: ${response.statusText}`);
        const post = await response.json();
        document.getElementById('post-id').value = post.id;
        document.getElementById('title').value = post.title;
        easyMDE.value(post.content);
        document.getElementById('tags').value = (post.Tags || []).map(tag => tag.name).join(', ');
        document.getElementById('status').value = post.status;
    }
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
