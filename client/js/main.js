// client/js/main.js

const API_BASE_URL = '/api';

document.addEventListener('DOMContentLoaded', () => {
    // 为主页标题也添加新的字符动画
    const mainTitle = document.querySelector('.blog-header .title');
    if (mainTitle) {
        applyTypingEffect(mainTitle);
    }

    if (document.getElementById('posts-list')) {
        loadPostsList();
        loadTags();
    } else if (document.getElementById('post-content')) {
        loadSinglePost();
    }
});

// 更可靠的JavaScript驱动的打字机效果函数
function applyTypingEffect(element) {
    if (!element || !element.textContent) return;
    
    const originalText = element.textContent.trim();
    element.innerHTML = ''; // 清空元素内容
    element.style.opacity = 1; // 确保容器可见

    // 创建一个用于显示文本的节点和一个光标节点
    const textNode = document.createTextNode('');
    const cursor = document.createElement('span');
    cursor.className = 'typing-cursor';
    cursor.textContent = '▋'; // 使用一个方块字符作为光标

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


async function loadPostsList(tag = null) {
    const postsListContainer = document.getElementById('posts-list');
    postsListContainer.innerHTML = '<p class="font-sans">正在从服务器获取文章...</p>';
    
    let url = `${API_BASE_URL}/posts`;
    if (tag) {
        url += `?tag=${encodeURIComponent(tag)}`;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('网络响应错误');
        const posts = await response.json();
        postsListContainer.innerHTML = '';
        if (posts.length === 0) {
            postsListContainer.innerHTML = '<p class="font-sans">该标签下没有文章。</p>';
            return;
        }

        posts.forEach((post) => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = post.content;
            const snippet = tempDiv.textContent.substring(0, 100) + '...';
            const postDate = new Date(post.publishDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            
            const tagsHtml = (post.Tags || []).map(tag => `<span class="post-tag">${tag.name}</span>`).join('');

            const coverImageHtml = post.coverImage 
                ? `<img src="${post.coverImage}" alt="${post.title}" class="cover-image">`
                : `<div class="cover-image" style="background-color: #e5e7eb;"></div>`;

            const articleHTML = `
                <article class="post-card">
                    ${coverImageHtml}
                    <div class="card-content">
                        <p class="date">${postDate}</p>
                        <h2 class="title"><a href="post.html?id=${post.id}">${post.title}</a></h2>
                        <div class="post-tags">${tagsHtml}</div>
                        <p class="excerpt">${snippet}</p>
                        <a href="post.html?id=${post.id}" class="read-more">阅读全文 &rarr;</a>
                    </div>
                </article>
            `;
            postsListContainer.innerHTML += articleHTML;
        });
    } catch (error) {
        console.error('获取文章列表失败:', error);
        postsListContainer.innerHTML = '<p class="font-sans text-red-500">加载文章失败，请确保后端服务器正在运行。</p>';
    }
}

async function loadSinglePost() {
    const params = new URLSearchParams(window.location.search);
    const postId = params.get('id');
    if (!postId) return;

    try {
        const response = await fetch(`${API_BASE_URL}/posts/${postId}`);
        if (!response.ok) throw new Error('网络响应错误');
        const post = await response.json();

        const titleElement = document.getElementById('post-title');
        titleElement.textContent = post.title;
        document.title = `${post.title} - 我的代码书卷`;

        // 为文章标题应用新的打字机效果
        applyTypingEffect(titleElement);
        
        document.getElementById('post-date').textContent = `发布于 ${new Date(post.publishDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
        document.getElementById('post-content').innerHTML = post.content;
        
        const tagsContainer = document.getElementById('post-tags-container');
        if (tagsContainer && post.Tags && post.Tags.length > 0) {
            tagsContainer.innerHTML = (post.Tags || []).map(tag => `<a href="index.html?tag=${encodeURIComponent(tag.name)}" class="post-tag">${tag.name}</a>`).join('');
        }

        const likeCountSpan = document.getElementById('like-count');
        likeCountSpan.textContent = post.likes;
        renderComments(post.Comments);
        
        document.getElementById('comment-form').addEventListener('submit', (event) => handleCommentSubmit(event, postId));
        document.getElementById('like-button').addEventListener('click', () => handleLikeClick(postId));

    } catch (error) {
        console.error('获取单篇文章失败:', error);
    }
}

async function loadTags() {
    const tagsContainer = document.getElementById("tags-container");
    try {
        const response = await fetch(`${API_BASE_URL}/tags`);
        if (!response.ok) throw new Error("网络响应错误");
        const tags = await response.json();
        tagsContainer.innerHTML = "";
        const allButton = createTagButton("所有文章", true);
        tagsContainer.appendChild(allButton);
        tags.forEach(tag => {
            const tagButton = createTagButton(tag.name);
            tagsContainer.appendChild(tagButton);
        });
    } catch (error) {
        console.error("获取标签列表失败:", error);
        tagsContainer.innerHTML = '<p class="text-red-500">加载标签失败。</p>';
    }
}

function createTagButton(tagName, isActive = false) {
    const button = document.createElement("button");
    button.textContent = tagName;
    button.className = `tag-button ${isActive ? "active" : ""}`;
    button.addEventListener("click", () => {
        document.querySelectorAll(".tag-button").forEach(btn => btn.classList.remove("active"));
        button.classList.add("active");
        if (tagName === "所有文章") {
            loadPostsList();
        } else {
            loadPostsList(tagName);
        }
    });
    return button;
}

async function handleLikeClick(postId) {
    const likeButton = document.getElementById("like-button");
    if (likeButton.disabled) return;
    try {
        const response = await fetch(`${API_BASE_URL}/posts/${postId}/like`, { method: "POST" });
        if (!response.ok) throw new Error("点赞失败");
        const updatedPost = await response.json();
        document.getElementById("like-count").textContent = updatedPost.likes;
        likeButton.disabled = true;
    } catch (error) {
        console.error("点赞时出错:", error);
    }
}

function renderComments(comments) {
    const commentsList = document.getElementById("comments-list");
    const commentsHeader = document.querySelector("#comments-section .comment-section-header");
    
    commentsHeader.textContent = `评论 (${comments ? comments.length : 0})`;

    if (!comments || comments.length === 0) {
        commentsList.innerHTML = '<p id="no-comment-notice" class="font-sans text-gray-500">暂无评论。</p>';
        return;
    }

    commentsList.innerHTML = ''; // 清空加载提示
    comments.forEach(comment => {
        addCommentToDOM(comment);
    });
}

function addCommentToDOM(comment, isNew = false) {
    const commentsList = document.getElementById("comments-list");
    const noCommentNotice = document.getElementById("no-comment-notice");
    if (noCommentNotice) {
        noCommentNotice.remove();
    }
    const commentDate = new Date(comment.publishDate).toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short' });
    
    const commentElement = document.createElement('div');
    commentElement.className = 'comment';
    commentElement.innerHTML = `
        <div class="comment-meta">
            <span class="author">${comment.author}</span>
            <span class="date">${commentDate}</span>
        </div>
        <div class="comment-body">
            <p>${comment.content}</p>
        </div>
    `;
    
    if (isNew) {
        commentsList.prepend(commentElement);
    } else {
        commentsList.appendChild(commentElement);
    }
}

async function handleCommentSubmit(event, postId) {
    event.preventDefault();
    const form = event.target;
    const author = form.author.value;
    const content = form.content.value;
    const messageDiv = document.getElementById("comment-message");
    if (!author.trim() || !content.trim()) {
        messageDiv.textContent = "名字和评论内容都不能为空！";
        messageDiv.className = "mt-4 text-red-500 font-sans";
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/posts/${postId}/comments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ author, content }),
        });
        if (!response.ok) throw new Error("提交评论失败");
        const newComment = await response.json();
        addCommentToDOM(newComment, true);
        form.reset();
        messageDiv.textContent = "评论成功！";
        messageDiv.className = "mt-4 text-green-500 font-sans";
        setTimeout(() => (messageDiv.textContent = ""), 3000);
    } catch (error) {
        console.error("提交评论时出错:", error);
        messageDiv.textContent = "评论失败，请稍后重试。";
        messageDiv.className = "mt-4 text-red-500 font-sans";
    }
}
