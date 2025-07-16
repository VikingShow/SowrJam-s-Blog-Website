// server/server.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

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

// --- 公共 API ---

// 获取所有已发布的文章列表 (可按标签筛选)
app.get('/api/posts', async (req, res) => {
    try {
        const filter = { status: 'publish' };
        if (req.query.tag) {
            filter.tags = req.query.tag;
        }
        const posts = await Post.find(filter).sort({ publishDate: -1 }).populate('comments');
        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: '获取文章列表失败', error: error });
    }
});

// 获取单篇文章详情
app.get('/api/posts/:id', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id).populate({
            path: 'comments',
            options: { sort: { 'publishDate': -1 } },
            populate: { path: 'parentComment' }
        });
        if (!post) return res.status(404).json({ message: '文章未找到' });
        res.json(post);
    } catch (error) {
        res.status(500).json({ message: '获取单篇文章失败', error: error });
    }
});

// 获取所有标签
app.get('/api/tags', async (req, res) => {
    try {
        const tags = await Post.distinct('tags');
        res.json(tags);
    } catch (error) {
        res.status(500).json({ message: '获取标签列表失败', error: error });
    }
});

// 创建新评论
app.post('/api/posts/:id/comments', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: '文章未找到' });
        const { author, content } = req.body;
        if (!author || !content) return res.status(400).json({ message: '作者和内容不能为空' });
        const newComment = new Comment({ post: post._id, author, content });
        await newComment.save();
        post.comments.push(newComment._id);
        await post.save();
        res.status(201).json(newComment);
    } catch (error) {
        res.status(500).json({ message: '创建评论失败', error: error });
    }
});

// 点赞文章
app.post('/api/posts/:id/like', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: '文章未找到' });
        post.likes += 1;
        await post.save();
        res.status(200).json(post);
    } catch (error) {
        res.status(500).json({ message: '点赞失败', error: error });
    }
});


// --- 后台管理 API ---

// **新增：(后台) 获取所有文章，包括草稿**
app.get('/api/admin/posts', async (req, res) => {
    try {
        const posts = await Post.find().sort({ publishDate: -1 });
        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: '获取所有文章失败', error: error });
    }
});

// **新增：(后台) 创建一篇新文章**
app.post('/api/admin/posts', async (req, res) => {
    try {
        const { title, content, tags, status } = req.body;
        const newPost = new Post({
            title,
            content,
            tags: tags.split(',').map(tag => tag.trim()), // 将逗号分隔的字符串转为数组
            status,
            publishDate: new Date()
        });
        await newPost.save();
        res.status(201).json(newPost);
    } catch (error) {
        res.status(500).json({ message: '创建新文章失败', error: error });
    }
});

// **新增：(后台) 更新一篇文章**
app.put('/api/admin/posts/:id', async (req, res) => {
    try {
        const { title, content, tags, status } = req.body;
        const updatedPost = await Post.findByIdAndUpdate(
            req.params.id,
            {
                title,
                content,
                tags: tags.split(',').map(tag => tag.trim()),
                status
            },
            { new: true } // 这个选项保证返回的是更新后的文档
        );
        if (!updatedPost) return res.status(404).json({ message: '文章未找到' });
        res.json(updatedPost);
    } catch (error) {
        res.status(500).json({ message: '更新文章失败', error: error });
    }
});

// **新增：(后台) 删除一篇文章**
app.delete('/api/admin/posts/:id', async (req, res) => {
    try {
        const deletedPost = await Post.findByIdAndDelete(req.params.id);
        if (!deletedPost) return res.status(404).json({ message: '文章未找到' });
        // 同时删除关联的评论 (可选，但推荐)
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
