// client/js/main.js - (API版本)

// 定义后端API的基础URL，方便以后修改
const API_BASE_URL = 'http://localhost:3000/api';

// 根据当前页面的元素，决定执行哪个函数
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('posts-list')) {
        loadPostsList();
    } else if (document.getElementById('post-content')) {
        loadSinglePost();
    }
});

// 加载文章列表到主页 (index.html)
async function loadPostsList() {
    const postsListContainer = document.getElementById('posts-list');
    postsListContainer.innerHTML = '<p class="text-center text-gray-500">正在从服务器获取文章...</p>';

    try {
        const response = await fetch(`${API_BASE_URL}/posts`);
        if (!response.ok) throw new Error('网络响应错误');
        
        const posts = await response.json();
        postsListContainer.innerHTML = ''; // 清空加载提示

        if (posts.length === 0) {
            postsListContainer.innerHTML = '<p class="text-center text-gray-500">还没有任何文章。</p>';
            return;
        }

        posts.forEach((post, index) => {
            // 从HTML内容中提取纯文本作为摘要
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = post.content;
            const snippet = tempDiv.textContent.substring(0, 150) + '...';

            const postDate = new Date(post.publishDate).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
            });

            const articleHTML = `
                <article class="mb-12">
                    <p class="text-gray-500 text-sm mb-2">${postDate}</p>
                    <h2 class="text-3xl font-bold mb-6">
                        <a href="post.html?id=${post._id}" class="article-title hover:text-blue-500 transition-colors duration-300">
                            ${post.title}
                        </a>
                    </h2>
                    <p class="article-body leading-loose text-lg">
                        ${snippet}
                    </p>
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

// 加载单篇文章到文章页 (post.html)
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

        // 更新页面标题和文章元数据
        document.title = `${post.title} - 我的代码书卷`;
        document.getElementById('post-title').textContent = post.title;
        document.getElementById('post-date').textContent = `发布于 ${new Date(post.publishDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;

        // 直接渲染从数据库获取的HTML内容
        document.getElementById('post-content').innerHTML = post.content;

        // 渲染评论区
        renderComments(post.comments);

    } catch (error) {
        console.error('获取单篇文章失败:', error);
        document.getElementById('post-content').innerHTML = '<p class="text-center text-red-500">加载文章失败，请检查文章ID是否正确，并确保后端服务器正在运行。</p>';
    }
}

// 渲染评论区的函数
function renderComments(comments) {
    const commentsContainer = document.getElementById('comments-section');
    if (!comments || comments.length === 0) {
        commentsContainer.innerHTML = '<p class="text-gray-500">暂无评论。</p>';
        return;
    }

    // 按时间正序排列评论
    comments.sort((a, b) => new Date(a.publishDate) - new Date(b.publishDate));
    
    let commentsHTML = `<h3 class="text-2xl font-bold mb-8 article-title font-code">评论 (${comments.length})</h3>`;
    
    comments.forEach(comment => {
        const commentDate = new Date(comment.publishDate).toLocaleString();
        commentsHTML += `
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
    });

    commentsContainer.innerHTML = commentsHTML;
}
