// client/admin/admin.js

const API_BASE_URL = 'http://localhost:3000/api/admin';

// 根据页面上的元素判断当前是哪个页面，并执行相应函数
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('admin-posts-table-body')) {
        loadAdminPosts();
    } else if (document.getElementById('edit-form')) {
        initializeEditPage();
    }
});

// 加载所有文章到后台主页的表格中
async function loadAdminPosts() {
    try {
        const response = await fetch(`${API_BASE_URL}/posts`);
        const posts = await response.json();
        const tableBody = document.getElementById('admin-posts-table-body');
        tableBody.innerHTML = ''; // 清空加载提示

        posts.forEach(post => {
            const row = `
                <tr class="border-b border-gray-200">
                    <td class="py-4 pr-4">${post.title}</td>
                    <td class="py-4 pr-4">
                        <span class="font-semibold ${post.status === 'publish' ? 'text-green-600' : 'text-yellow-600'}">
                            ${post.status === 'publish' ? '已发布' : '草稿'}
                        </span>
                    </td>
                    <td class="py-4 pr-4">${new Date(post.publishDate).toLocaleDateString()}</td>
                    <td class="py-4 pr-4">
                        <a href="edit.html?id=${post._id}" class="text-blue-600 hover:underline mr-4">编辑</a>
                        <button onclick="handleDeletePost('${post._id}', '${post.title}')" class="text-red-600 hover:underline">删除</button>
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    } catch (error) {
        console.error('加载文章列表失败:', error);
    }
}

// 处理删除文章的函数
async function handleDeletePost(id, title) {
    if (confirm(`你确定要删除文章 "${title}" 吗？此操作不可撤销。`)) {
        try {
            await fetch(`${API_BASE_URL}/posts/${id}`, { method: 'DELETE' });
            // 删除成功后重新加载列表
            loadAdminPosts();
        } catch (error) {
            console.error('删除文章失败:', error);
            alert('删除失败，请稍后重试。');
        }
    }
}

// 初始化文章编辑页面
async function initializeEditPage() {
    // **修改：初始化Quill.js编辑器**
    const quill = new Quill('#content-editor', {
        theme: 'snow', // 使用 'snow' 这个干净的主题
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                ['link', 'image', 'code-block'],
                ['clean']
            ]
        }
    });

    const params = new URLSearchParams(window.location.search);
    const postId = params.get('id');

    if (postId) {
        // 如果URL中有ID，说明是编辑模式
        document.getElementById('edit-page-title').textContent = '编辑文章';
        
        const response = await fetch(`http://localhost:3000/api/posts/${postId}`);
        const post = await response.json();
        
        document.getElementById('post-id').value = post._id;
        document.getElementById('title').value = post.title;
        // **修改：使用Quill的API来填充内容**
        quill.root.innerHTML = post.content;
        document.getElementById('tags').value = post.tags.join(', ');
        document.getElementById('status').value = post.status;
    }

    // **修改：为表单添加提交事件，并传入quill实例**
    document.getElementById('edit-form').addEventListener('submit', (event) => {
        handleFormSubmit(event, quill);
    });
}

// **修改：处理表单提交的函数，接收quill实例**
async function handleFormSubmit(event, quill) {
    event.preventDefault();
    
    const form = event.target;
    const postId = form.id.value;
    // **修改：从Quill获取HTML内容**
    const content = quill.root.innerHTML;

    // 检查内容是否为空（Quill的默认空内容是 <p><br></p>）
    if (content === '<p><br></p>') {
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
