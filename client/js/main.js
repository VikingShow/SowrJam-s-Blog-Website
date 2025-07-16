// client/js/main.js - (API版本)

const API_BASE_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('posts-list')) {
        // 页面加载时，获取所有文章和所有标签
        loadPostsList();
        loadTags();
    } else if (document.getElementById('post-content')) {
        loadSinglePost();
    }
});

// **修改：函数现在可以接收一个标签参数**
async function loadPostsList(tag = null) {
    const postsListContainer = document.getElementById('posts-list');
    postsListContainer.innerHTML = '<p class="text-center text-gray-500">正在从服务器获取文章...</p>';
    
    // **修改：根据是否有标签来构建不同的API URL**
    let url = `${API_BASE_URL}/posts`;
    if (tag) {
        url += `?tag=${encodeURIComponent(tag)}`; // 使用encodeURIComponent确保特殊字符被正确编码
    }

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('网络响应错误');
        const posts = await response.json();
        postsListContainer.innerHTML = '';
        if (posts.length === 0) {
            postsListContainer.innerHTML = '<p class="text-center text-gray-500">该标签下没有文章。</p>';
            return;
        }
        posts.forEach((post, index) => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = post.content;
            const snippet = tempDiv.textContent.substring(0, 150) + '...';
            const postDate = new Date(post.publishDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            const articleHTML = `
                <article class="mb-12">
                    <p class="text-gray-500 text-sm mb-2">${postDate}</p>
                    <h2 class="text-3xl font-bold mb-6">
                        <a href="post.html?id=${post._id}" class="article-title hover:text-blue-500 transition-colors duration-300">${post.title}</a>
                    </h2>
                    <p class="article-body leading-loose text-lg">${snippet}</p>
                    <a href="post.html?id=${post._id}" class="link-style font-semibold mt-6 inline-block">阅读全文</a>
                </article>
                ${index < posts.length - 1 ? '<div class="article-separator">//</div>' : ''}
            `;
            postsListContainer.innerHTML += articleHTML;
        });
    } catch (error) {
        console.error('获取文章列表失败:', error);
        postsListContainer.innerHTML = '<p class="text-center text-red-500">加载文章失败，请确保后端服务器正在运行。</p>';
    }
}

// **新增：加载所有标签的函数**
async function loadTags() {
    const tagsContainer = document.getElementById('tags-container');
    try {
        const response = await fetch(`${API_BASE_URL}/tags`);
        if (!response.ok) throw new Error('网络响应错误');
        const tags = await response.json();
        tagsContainer.innerHTML = ''; // 清空加载提示

        // 创建 "所有文章" 按钮
        const allButton = createTagButton('所有文章', true); // 默认选中
        tagsContainer.appendChild(allButton);

        // 为每个标签创建按钮
        tags.forEach(tag => {
            const tagButton = createTagButton(tag);
            tagsContainer.appendChild(tagButton);
        });

    } catch (error) {
        console.error('获取标签列表失败:', error);
        tagsContainer.innerHTML = '<p class="text-red-500">加载标签失败。</p>';
    }
}

// **新增：创建单个标签按钮的辅助函数**
function createTagButton(tag, isActive = false) {
    const button = document.createElement('button');
    button.textContent = tag;
    button.className = `tag-button inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mb-2 hover:bg-gray-300 transition-colors duration-200 ${isActive ? 'active' : ''}`;
    
    button.addEventListener('click', () => {
        // 移除所有按钮的 active 状态
        document.querySelectorAll('.tag-button').forEach(btn => btn.classList.remove('active'));
        // 给当前点击的按钮添加 active 状态
        button.classList.add('active');
        
        // 如果点击的是 "所有文章"，则不带参数调用loadPostsList
        if (tag === '所有文章') {
            loadPostsList();
        } else {
            loadPostsList(tag);
        }
    });
    return button;
}


async function loadSinglePost() {
    const params = new URLSearchParams(window.location.search);
    const postId = params.get('id');
    if (!postId) {
        document.getElementById('post-content').innerHTML = '<p>错误：文章ID未提供。</p>';
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/posts/${postId}`);
        if (!response.ok) throw new Error('网络响应错误');
        const post = await response.json();
        document.title = `${post.title} - 我的代码书卷`;
        document.getElementById('post-title').textContent = post.title;
        document.getElementById('post-date').textContent = `发布于 ${new Date(post.publishDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
        document.getElementById('post-content').innerHTML = post.content;
        
        const likeCountSpan = document.getElementById('like-count');
        likeCountSpan.textContent = post.likes;

        renderComments(post.comments);
        
        const commentForm = document.getElementById('comment-form');
        commentForm.addEventListener('submit', (event) => handleCommentSubmit(event, postId));

        const likeButton = document.getElementById('like-button');
        likeButton.addEventListener('click', () => handleLikeClick(postId, likeButton, likeCountSpan));

    } catch (error) {
        console.error('获取单篇文章失败:', error);
        document.getElementById('post-content').innerHTML = '<p class="text-center text-red-500">加载文章失败，请检查文章ID是否正确，并确保后端服务器正在运行。</p>';
    }
}

async function handleLikeClick(postId, button, countSpan) {
    if (button.classList.contains('liked')) return;
    try {
        const response = await fetch(`${API_BASE_URL}/posts/${postId}/like`, { method: 'POST' });
        if (!response.ok) throw new Error('点赞失败');
        const updatedPost = await response.json();
        countSpan.textContent = updatedPost.likes;
        button.classList.add('liked');
        button.disabled = true;
    } catch (error) {
        console.error('点赞时出错:', error);
    }
}

function renderComments(comments) {
    const commentsContainer = document.getElementById('comments-section');
    commentsContainer.innerHTML = `<h3 class="text-2xl font-bold mb-8 article-title font-code">评论 (${comments.length})</h3>`;
    if (!comments || comments.length === 0) {
        commentsContainer.innerHTML += '<p id="no-comment-notice" class="text-gray-500">暂无评论。</p>';
        return;
    }
    comments.reverse().forEach(comment => addCommentToDOM(comment));
}

function addCommentToDOM(comment) {
    const commentsContainer = document.getElementById('comments-section');
    const noCommentNotice = document.getElementById('no-comment-notice');
    if (noCommentNotice) noCommentNotice.remove();
    
    const commentDate = new Date(comment.publishDate).toLocaleString();
    const commentHTML = `<div class="comment mb-6 pb-6 border-b border-gray-200"><div class="comment-meta mb-2"><strong class="font-bold text-gray-800">${comment.author}</strong><span class="text-gray-500 text-sm ml-2">${commentDate}</span></div><div class="comment-body article-body">${comment.content}</div></div>`;
    
    const commentsTitle = commentsContainer.querySelector('h3');
    commentsTitle.insertAdjacentHTML('afterend', commentHTML);
}

async function handleCommentSubmit(event, postId) {
    event.preventDefault(); 
    const form = event.target;
    const author = form.author.value;
    const content = form.content.value;
    const messageDiv = document.getElementById('comment-message');
    if (!author.trim() || !content.trim()) {
        messageDiv.textContent = '名字和评论内容都不能为空！';
        messageDiv.className = 'mt-4 text-red-500';
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/posts/${postId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ author, content }),
        });
        if (!response.ok) throw new Error('提交评论失败');
        const newComment = await response.json();
        addCommentToDOM(newComment);
        form.reset();
        messageDiv.textContent = '评论成功！';
        messageDiv.className = 'mt-4 text-green-500';
        setTimeout(() => messageDiv.textContent = '', 3000);
    } catch (error) {
        console.error('提交评论时出错:', error);
        messageDiv.textContent = '评论失败，请稍后重试。';
        messageDiv.className = 'mt-4 text-red-500';
    }
}
