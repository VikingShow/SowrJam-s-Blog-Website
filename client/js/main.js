// client/js/main.js

// **修改：使用相对路径，这样浏览器会自动使用当前域名和端口**
const API_BASE_URL = '/api';

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('posts-list')) {
        loadPostsList();
        loadTags();
    } else if (document.getElementById('post-content')) {
        loadSinglePost();
    }
});

async function loadPostsList(tag = null) {
    const postsListContainer = document.getElementById('posts-list');
    postsListContainer.innerHTML = '<p class="text-center text-gray-500 font-sans">正在从服务器获取文章...</p>';
    
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
            postsListContainer.innerHTML = '<p class="text-center text-gray-500 font-sans">该标签下没有文章。</p>';
            return;
        }

        posts.forEach((post, index) => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = post.content;
            const snippet = tempDiv.textContent.substring(0, 150) + '...';
            const postDate = new Date(post.publishDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            
            const coverImageHtml = post.coverImage 
                ? `<img src="${post.coverImage}" alt="${post.title}" class="cover-image">`
                : '';

            const articleHTML = `
                <article class="post-item" style="animation-delay: ${posts.indexOf(post) * 100}ms; opacity: 0; animation: fadeIn 0.5s ease-out forwards;">
                    ${coverImageHtml}
                    <div class="post-content-wrapper">
                        <p class="date">${postDate}</p>
                        <h2 class="title"><a href="post.html?id=${post.id}">${post.title}</a></h2>
                        <p class="excerpt">${snippet}</p>
                        <a href="post.html?id=${post.id}" class="read-more">阅读全文 &rarr;</a>
                    </div>
                </article>
            `;
            postsListContainer.innerHTML += articleHTML;
        });
    } catch (error) {
        console.error('获取文章列表失败:', error);
        postsListContainer.innerHTML = '<p class="text-center text-red-500 font-sans">加载文章失败，请确保后端服务器正在运行。</p>';
    }
}

async function loadTags(){const t=document.getElementById("tags-container");try{const e=await fetch(`${API_BASE_URL}/tags`);if(!e.ok)throw new Error("网络响应错误");const n=await e.json();t.innerHTML="";const o=createTagButton("所有文章",!0);t.appendChild(o),n.forEach(e=>{const n=createTagButton(e);t.appendChild(n)})}catch(e){console.error("获取标签列表失败:",e),t.innerHTML='<p class="text-red-500">加载标签失败。</p>'}}function createTagButton(t,e=!1){const n=document.createElement("button");return n.textContent=t,n.className=`tag-button ${e?"active":""}`,n.addEventListener("click",()=>{document.querySelectorAll(".tag-button").forEach(t=>t.classList.remove("active")),n.classList.add("active"),"所有文章"===t?loadPostsList():loadPostsList(t)}),n}async function loadSinglePost(){const t=new URLSearchParams(window.location.search).get("id");if(!t)return void(document.getElementById("post-content").innerHTML="<p>错误：文章ID未提供。</p>");try{const e=await fetch(`${API_BASE_URL}/posts/${t}`);if(!e.ok)throw new Error("网络响应错误");const n=await e.json();document.title=`${n.title} - 我的代码书卷`,document.getElementById("post-title").textContent=n.title,document.getElementById("post-date").textContent=`发布于 ${new Date(n.publishDate).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}`,document.getElementById("post-content").innerHTML=n.content;const o=document.getElementById("like-count");o.textContent=n.likes,renderComments(n.Comments);const c=document.getElementById("comment-form");c.addEventListener("submit",e=>handleCommentSubmit(e,t));const d=document.getElementById("like-button");d.addEventListener("click",()=>handleLikeClick(t,d,o))}catch(e){console.error("获取单篇文章失败:",e),document.getElementById("post-content").innerHTML='<p class="text-center text-red-500">加载文章失败，请检查文章ID是否正确，并确保后端服务器正在运行。</p>'}}async function handleLikeClick(t,e,n){if(e.classList.contains("liked"))return;try{const o=await fetch(`${API_BASE_URL}/posts/${t}/like`,{method:"POST"});if(!o.ok)throw new Error("点赞失败");const c=await o.json();n.textContent=c.likes,e.classList.add("liked"),e.disabled=!0}catch(o){console.error("点赞时出错:",o)}}function renderComments(t){const e=document.getElementById("comments-section");if(e.innerHTML=`<h3 class="text-2xl font-bold mb-6 font-sans">评论 (${t?t.length:0})</h3>`,!t||0===t.length)return void(e.innerHTML+='<p id="no-comment-notice" class="text-gray-500 font-sans">暂无评论。</p>');t.forEach(t=>{addCommentToDOM(t)})}function addCommentToDOM(t){const e=document.getElementById("comments-section"),n=document.getElementById("no-comment-notice");n&&n.remove();const o=new Date(t.publishDate).toLocaleString(),c=`\n        <div class="comment">\n            <div class="comment-meta mb-2 flex items-center">\n                <strong class="author">${t.author}</strong>\n                <span class="date ml-3">${o}</span>\n            </div>\n            <div class="comment-body">\n                <p>${t.content}</p>\n            </div>\n        </div>\n    `;e.insertAdjacentHTML("beforeend",c)}async function handleCommentSubmit(t,e){t.preventDefault();const n=t.target,o=n.author.value,c=n.content.value,d=document.getElementById("comment-message");if(!o.trim()||!c.trim())return d.textContent="名字和评论内容都不能为空！",void(d.className="mt-4 text-red-500");try{const t=await fetch(`${API_BASE_URL}/posts/${e}/comments`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({author:o,content:c})});if(!t.ok)throw new Error("提交评论失败");const i=await t.json();addCommentToDOM(i),n.reset(),d.textContent="评论成功！",d.className="mt-4 text-green-500",setTimeout(()=>d.textContent="",3e3)}catch(t){console.error("提交评论时出错:",t),d.textContent="评论失败，请稍后重试。",d.className="mt-4 text-red-500"}}
