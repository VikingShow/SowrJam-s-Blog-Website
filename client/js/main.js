// client/js/main.js - (API版本)

const API_BASE_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('posts-list')) {
        loadPostsList();
    } else if (document.getElementById('post-content')) {
        loadSinglePost();
    }
});

async function loadPostsList() {
    const postsListContainer = document.getElementById('posts-list');
    postsListContainer.innerHTML = '<p class="text-center text-gray-500">正在从服务器获取文章...</p>';
    try {
        const response = await fetch(`${API_BASE_URL}/posts`);
        if (!response.ok) throw new Error('网络响应错误');
        const posts = await response.json();
        postsListContainer.innerHTML = '';
        if (posts.length === 0) {
            postsListContainer.innerHTML = '<p class="text-center text-gray-500">还没有任何文章。</p>';
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
        
        // **更新：初始化点赞按钮**
        const likeCountSpan = document.getElementById('like-count');
        likeCountSpan.textContent = post.likes;

        renderComments(post.comments);
        
        const commentForm = document.getElementById('comment-form');
        commentForm.addEventListener('submit', (event) => handleCommentSubmit(event, postId));

        // **新增：为点赞按钮添加事件监听器**
        const likeButton = document.getElementById('like-button');
        likeButton.addEventListener('click', () => handleLikeClick(postId, likeButton, likeCountSpan));

    } catch (error) {
        console.error('获取单篇文章失败:', error);
        document.getElementById('post-content').innerHTML = '<p class="text-center text-red-500">加载文章失败，请检查文章ID是否正确，并确保后端服务器正在运行。</p>';
    }
}

// **新增：处理点赞点击的函数**
async function handleLikeClick(postId, button, countSpan) {
    // 防止重复点击
    if (button.classList.contains('liked')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/posts/${postId}/like`, {
            method: 'POST',
        });

        if (!response.ok) {
            throw new Error('点赞失败');
        }

        const updatedPost = await response.json();
        
        // 更新页面上的点赞数
        countSpan.textContent = updatedPost.likes;
        
        // 禁用按钮并改变样式，表示已点赞
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
    
    // 倒序显示评论，最新的在最前面
    comments.reverse().forEach(comment => {
        addCommentToDOM(comment);
    });
}

function addCommentToDOM(comment, isNew = false) {
    const commentsContainer = document.getElementById('comments-section');
    const noCommentNotice = document.getElementById('no-comment-notice');
    if (noCommentNotice) {
        noCommentNotice.remove();
    }
    
    const commentDate = new Date(comment.publishDate).toLocaleString();
    const commentHTML = `
        <div class="comment mb-6 pb-6 border-b border-gray-200">
            <div class="comment-meta mb-2">
                <strong class="font-bold text-gray-800">${comment.author}</strong>
                <span class="text-gray-500 text-sm ml-2">${commentDate}</span>
            </div>
            <div class="comment-body article-body">
                ${comment.content}
            </div>
        </div>
    `;

    const commentsTitle = commentsContainer.querySelector('h3');
    commentsTitle.after(new DOMParser().parseFromString(commentHTML, 'text/html').body.firstChild);
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
        addCommentToDOM(newComment, true);
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
