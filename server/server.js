// server/server.js

// 1. 引入所有需要的模块
const express = require('express');
const cors = require('cors');
const marked = require('marked');
const sequelize = require('./database'); // 引入我们的数据库连接实例

// 2. 引入数据模型
const Post = require('./models/post');
const Comment = require('./models/comment');

// 3. 初始化Express应用
const app = express();
const PORT = 3000; // 定义服务器运行的端口

// 4. 使用中间件
app.use(cors()); // 允许跨域请求，方便前后端在不同源下通信
app.use(express.json()); // 让服务器能解析JSON格式的请求体

// --- 公共 API (给前台博客展示页面使用) ---

// 获取所有已发布的文章列表 (支持按标签筛选)
app.get('/api/posts', async (req, res) => {
    try {
        const findOptions = {
            where: { status: 'publish' },
            order: [['publishDate', 'DESC']]
        };
        // 如果URL查询参数中包含tag，则添加到查询条件中
        if (req.query.tag) {
            findOptions.where.tags = sequelize.where(
                sequelize.fn('JSON_CONTAINS', sequelize.col('tags'), `"${req.query.tag}"`),
                true
            );
        }
        const posts = await Post.findAll(findOptions);
        
        // 在发送给前端前，将Markdown内容转换为HTML
        const postsWithHtmlContent = posts.map(post => {
            const postObject = post.toJSON();
            postObject.content = marked.parse(postObject.content || '');
            return postObject;
        });

        res.json(postsWithHtmlContent);
    } catch (error) {
        res.status(500).json({ message: '获取文章列表失败', error: error.message });
    }
});

// 获取单篇文章详情
app.get('/api/posts/:id', async (req, res) => {
    try {
        const post = await Post.findByPk(req.params.id, {
            include: [{ model: Comment, order: [['publishDate', 'DESC']] }]
        });
        if (!post) {
            return res.status(404).json({ message: '文章未找到' });
        }
        // 将Markdown内容转换为HTML
        const postWithHtmlContent = {
            ...post.toJSON(),
            content: marked.parse(post.content || '')
        };
        res.json(postWithHtmlContent);
    } catch (error) {
        res.status(500).json({ message: '获取单篇文章失败', error: error.message });
    }
});

// 获取所有不重复的标签列表
app.get('/api/tags', async (req, res) => {
    try {
        const posts = await Post.findAll({ attributes: ['tags'] });
        const allTags = posts.flatMap(post => post.tags);
        const uniqueTags = [...new Set(allTags)];
        res.json(uniqueTags);
    } catch (error) {
        res.status(500).json({ message: '获取标签列表失败', error: error.message });
    }
});

// 为某篇文章创建新评论
app.post('/api/posts/:id/comments', async (req, res) => {
    try {
        const { author, content } = req.body;
        const postId = req.params.id;
        if (!author || !content) {
            return res.status(400).json({ message: '作者和内容不能为空' });
        }
        const newComment = await Comment.create({ author, content, PostId: postId, publishDate: new Date() });
        res.status(201).json(newComment);
    } catch (error) {
        res.status(500).json({ message: '创建评论失败', error: error.message });
    }
});

// 点赞某篇文章
app.post('/api/posts/:id/like', async (req, res) => {
    try {
        const post = await Post.findByPk(req.params.id);
        if (!post) {
            return res.status(404).json({ message: '文章未找到' });
        }
        post.likes += 1;
        await post.save();
        res.status(200).json(post);
    } catch (error) {
        res.status(500).json({ message: '点赞失败', error: error.message });
    }
});

// --- 后台管理 API ---

// (后台) 获取所有文章列表，包括草稿
app.get('/api/admin/posts', async (req, res) => {
    try {
        const posts = await Post.findAll({ order: [['publishDate', 'DESC']] });
        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: '获取所有文章失败', error: error.message });
    }
});

// (后台) 获取单篇文章的原始数据 (用于编辑)
app.get('/api/admin/posts/:id', async (req, res) => {
    try {
        const post = await Post.findByPk(req.params.id);
        if (!post) {
            return res.status(404).json({ message: '文章未找到' });
        }
        res.json(post);
    } catch (error) {
        res.status(500).json({ message: '获取单篇原始文章失败', error: error.message });
    }
});

// (后台) 创建一篇新文章
app.post('/api/admin/posts', async (req, res) => {
    try {
        const { title, content, tags, status } = req.body;
        const newPost = await Post.create({
            title,
            content,
            tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
            status,
            publishDate: new Date()
        });
        res.status(201).json(newPost);
    } catch (error) {
        res.status(500).json({ message: '创建新文章失败', error: error.message });
    }
});

// (后台) 更新一篇文章
app.put('/api/admin/posts/:id', async (req, res) => {
    try {
        const { title, content, tags, status } = req.body;
        const post = await Post.findByPk(req.params.id);
        if (!post) {
            return res.status(404).json({ message: '文章未找到' });
        }
        await post.update({
            title,
            content,
            tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
            status
        });
        res.json(post);
    } catch (error) {
        res.status(500).json({ message: '更新文章失败', error: error.message });
    }
});

// (后台) 删除一篇文章
app.delete('/api/admin/posts/:id', async (req, res) => {
    try {
        const post = await Post.findByPk(req.params.id);
        if (!post) {
            return res.status(404).json({ message: '文章未找到' });
        }
        await post.destroy(); // Sequelize的级联删除会处理关联的评论
        res.json({ message: '文章及关联评论已成功删除' });
    } catch (error) {
        res.status(500).json({ message: '删除文章失败', error: error.message });
    }
});

// --- 启动服务器 ---
// 首先同步所有模型到数据库，然后启动服务器
sequelize.sync().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 服务器正在 http://localhost:${PORT} 上运行`);
    });
}).catch(error => {
    console.error('无法同步数据库:', error);
});
