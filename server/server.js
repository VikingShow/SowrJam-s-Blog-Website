// server/server.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const marked = require('marked');

const Post = require('./models/post');
const Comment = require('./models/comment');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const MONGO_URI = 'mongodb://localhost:27017/my-new-blog';
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ 数据库连接成功！'))
    .catch(err => console.error('数据库连接失败:', err));

// --- 公共 API (给前台使用) ---

app.get('/api/posts', async (req, res) => {
    try {
        const filter = { status: 'publish' };
        if (req.query.tag) {
            filter.tags = req.query.tag;
        }
        const posts = await Post.find(filter).sort({ publishDate: -1 });
        const postsWithHtmlContent = posts.map(post => {
            const postObject = post.toObject();
            postObject.content = marked.parse(postObject.content || '');
            return postObject;
        });
        res.json(postsWithHtmlContent);
    } catch (error) {
        res.status(500).json({ message: '获取文章列表失败', error: error });
    }
});

app.get('/api/posts/:id', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id).populate({
            path: 'comments',
            options: { sort: { 'publishDate': -1 } },
        });
        if (!post) return res.status(404).json({ message: '文章未找到' });
        const postWithHtmlContent = post.toObject();
        postWithHtmlContent.content = marked.parse(postWithHtmlContent.content || '');
        res.json(postWithHtmlContent);
    } catch (error) {
        res.status(500).json({ message: '获取单篇文章失败', error: error });
    }
});

app.get('/api/tags', async (req, res) => { try { const tags = await Post.distinct('tags'); res.json(tags); } catch (error) { res.status(500).json({ message: '获取标签列表失败', error: error }); } });
app.post('/api/posts/:id/comments', async (req, res) => { try { const post = await Post.findById(req.params.id); if (!post) return res.status(404).json({ message: '文章未找到' }); const { author, content } = req.body; if (!author || !content) return res.status(400).json({ message: '作者和内容不能为空' }); const newComment = new Comment({ post: post._id, author, content }); await newComment.save(); post.comments.push(newComment._id); await post.save(); res.status(201).json(newComment); } catch (error) { res.status(500).json({ message: '创建评论失败', error: error }); } });
app.post('/api/posts/:id/like', async (req, res) => { try { const post = await Post.findById(req.params.id); if (!post) return res.status(404).json({ message: '文章未找到' }); post.likes += 1; await post.save(); res.status(200).json(post); } catch (error) { res.status(500).json({ message: '点赞失败', error: error }); } });


// --- 后台管理 API ---

app.get('/api/admin/posts', async (req, res) => {
    try {
        const posts = await Post.find().sort({ publishDate: -1 });
        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: '获取所有文章失败', error: error });
    }
});

// **新增：(后台) 获取单篇文章的原始数据**
app.get('/api/admin/posts/:id', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: '文章未找到' });
        // 直接返回原始数据，包含Markdown
        res.json(post);
    } catch (error) {
        res.status(500).json({ message: '获取单篇原始文章失败', error: error });
    }
});

app.post('/api/admin/posts', async (req, res) => {
    try {
        const { title, content, tags, status } = req.body;
        const newPost = new Post({
            title,
            content,
            tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
            status,
            publishDate: new Date()
        });
        await newPost.save();
        res.status(201).json(newPost);
    } catch (error) {
        res.status(500).json({ message: '创建新文章失败', error: error });
    }
});

app.put('/api/admin/posts/:id', async (req, res) => {
    try {
        const { title, content, tags, status } = req.body;
        const updatedPost = await Post.findByIdAndUpdate(
            req.params.id,
            {
                title,
                content,
                tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
                status
            },
            { new: true }
        );
        if (!updatedPost) return res.status(404).json({ message: '文章未找到' });
        res.json(updatedPost);
    } catch (error) {
        res.status(500).json({ message: '更新文章失败', error: error });
    }
});

app.delete('/api/admin/posts/:id', async (req, res) => {
    try {
        const deletedPost = await Post.findByIdAndDelete(req.params.id);
        if (!deletedPost) return res.status(404).json({ message: '文章未找到' });
        await Comment.deleteMany({ post: deletedPost._id });
        res.json({ message: '文章及关联评论已成功删除' });
    } catch (error) {
        res.status(500).json({ message: '删除文章失败', error: error });
    }
});


// --- 启动服务器 ---
app.listen(PORT, () => {
    console.log(`🚀 服务器正在 http://localhost:${PORT} 上运行`);
});
