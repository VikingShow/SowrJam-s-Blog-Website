// client/admin/admin.js

const API_BASE_URL = '/api/admin';

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('admin-posts-table-body')) {
        loadAdminPosts();
    } else if (document.getElementById('edit-form')) {
        initializeEditPage();
    }
});

async function loadAdminPosts() {
    try {
        const response = await fetch(`${API_BASE_URL}/posts`);
        const posts = await response.json();
        const tableBody = document.getElementById('admin-posts-table-body');
        tableBody.innerHTML = '';
        posts.forEach(post => {
            const row = `
                <tr>
                    <td class="font-semibold">${post.title}</td>
                    <td>
                        <span class="status-badge ${post.status === 'publish' ? 'status-publish' : 'status-draft'}">
                            ${post.status === 'publish' ? '已发布' : '草稿'}
                        </span>
                    </td>
                    <td>${new Date(post.publishDate).toLocaleDateString()}</td>
                    <td>
                        <a href="edit.html?id=${post.id}" class="action-link">编辑</a>
                        <button onclick="handleDeletePost('${post.id}', '${post.title}')" class="action-btn">删除</button>
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    } catch (error) {
        console.error('加载文章列表失败:', error);
    }
}

async function handleDeletePost(id, title) {
    if (confirm(`你确定要删除文章 "${title}" 吗？此操作不可撤销。`)) {
        try {
            await fetch(`${API_BASE_URL}/posts/${id}`, { method: 'DELETE' });
            loadAdminPosts();
        } catch (error) {
            console.error('删除文章失败:', error);
            alert('删除失败，请稍后重试。');
        }
    }
}

async function initializeEditPage() {
    const easyMDE = new EasyMDE({
        element: document.getElementById('content-editor'),
        spellChecker: false,
        maxHeight: "400px",
        toolbar: ["bold", "italic", "heading", "|", "quote", "code", "unordered-list", "ordered-list", "|", "link", "image", "|", "preview", "side-by-side", "fullscreen"]
    });

    const mdUploadInput = document.getElementById('md-upload');
    mdUploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            easyMDE.value(e.target.result);
        };
        reader.readAsText(file);
    });

    const params = new URLSearchParams(window.location.search);
    const postId = params.get('id');

    if (postId) {
        document.getElementById('edit-page-title').textContent = '编辑文章';
        
        const response = await fetch(`${API_BASE_URL}/posts/${postId}`);
        if (!response.ok) {
            throw new Error(`获取文章失败: ${response.statusText}`);
        }
        const post = await response.json();
        
        document.getElementById('post-id').value = post.id;
        document.getElementById('title').value = post.title;
        easyMDE.value(post.content);

        document.getElementById('tags').value = (post.tags && Array.isArray(post.tags)) ? post.tags.join(', ') : '';
        
        document.getElementById('status').value = post.status;
    }

    document.getElementById('edit-form').addEventListener('submit', (event) => {
        handleFormSubmit(event, easyMDE);
    });
}

async function handleFormSubmit(event, easyMDE) {
    event.preventDefault();
    
    const form = event.target;
    const postId = form.id.value;
    const content = easyMDE.value();

    if (!content.trim()) {
        alert('文章内容不能为空！');
        return;
    }

    const postData = {
        title: form.title.value,
        content: content,
        tags: form.tags.value,
        status: form.status.value
    };

    const method = postId ? 'PUT' : 'POST';
    const url = postId ? `${API_BASE_URL}/posts/${postId}` : `${API_BASE_URL}/posts`;

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(postData)
        });
        if (!response.ok) throw new Error('保存失败');
        window.location.href = 'index.html';
    } catch (error) {
        console.error('保存文章失败:', error);
        alert('保存失败，请检查控制台信息。');
    }
}
