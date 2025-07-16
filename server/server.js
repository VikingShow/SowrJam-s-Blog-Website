// server/server.js

// 1. 引入需要的模块
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// 引入我们的数据模型
const Post = require('./models/post');
const Comment = require('./models/comment');

// 2. 初始化App
const app = express();
const PORT = 3000;

// 3. 配置中间件
app.use(cors());
app.use(express.json());

// 4. 连接到MongoDB数据库
const MONGO_URI = 'mongodb://localhost:27017/my-new-blog';
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ 数据库连接成功！'))
    .catch(err => console.error('数据库连接失败:', err));

// --- API 路由 ---

app.get('/', (req, res) => {
    res.send('欢迎来到我的博客后端API！');
});

// API 1：获取所有文章列表
app.get('/api/posts', async (req, res) => {
    try {
        const posts = await Post.find({ status: 'publish' })
                                .sort({ publishDate: -1 })
                                .populate('comments'); 
        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: '获取文章列表失败', error: error });
    }
});

// API 2：获取单篇文章详情
app.get('/api/posts/:id', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
                               .populate({
                                   path: 'comments',
                                   options: { sort: { 'publishDate': -1 } },
                                   populate: { path: 'parentComment' }
                               });
        if (!post) {
            return res.status(404).json({ message: '文章未找到' });
        }
        res.json(post);
    } catch (error) {
        res.status(500).json({ message: '获取单篇文章失败', error: error });
    }
});

// API 3：创建新评论
app.post('/api/posts/:id/comments', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: '文章未找到' });
        }
        const { author, content } = req.body;
        if (!author || !content) {
            return res.status(400).json({ message: '作者和内容不能为空' });
        }
        const newComment = new Comment({
            post: post._id,
            author: author,
            content: content,
            publishDate: new Date()
        });
        await newComment.save();
        post.comments.push(newComment._id);
        await post.save();
        res.status(201).json(newComment);
    } catch (error) {
        res.status(500).json({ message: '创建评论失败', error: error });
    }
});

// **--- 新增API 4：点赞文章 ---**
app.post('/api/posts/:id/like', async (req, res) => {
    try {
        // 1. 找到文章
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: '文章未找到' });
        }

        // 2. 将likes字段加1
        post.likes += 1;

        // 3. 保存更新后的文章
        await post.save();

        // 4. 返回更新后的文章（特别是新的点赞数）
        res.status(200).json(post);

    } catch (error) {
        res.status(500).json({ message: '点赞失败', error: error });
    }
});


// --- 启动服务器 ---
app.listen(PORT, () => {
    console.log(`🚀 服务器正在 http://localhost:${PORT} 上运行`);
});
