// server/server.js

const express = require('express');
const cors = require('cors');
const marked = require('marked');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const { sequelize, Post, Comment, Tag } = require('./database');
const { Op } = require('sequelize');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// --- 图片上传配置 ---
const UPLOADS_DIR = path.join(__dirname, '..', 'client', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    console.log(`✅ Uploads directory created at: ${UPLOADS_DIR}`);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOADS_DIR);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });


// --- 辅助函数：处理文章的标签关联 ---
async function handlePostTags(post, tagsString) {
    if (tagsString === null || tagsString === undefined) return;
    const tagNames = tagsString.split(',').map(t => t.trim()).filter(Boolean);
    const tagInstances = [];
    for (const name of tagNames) {
        const [tag] = await Tag.findOrCreate({ where: { name } });
        tagInstances.push(tag);
    }
    await post.setTags(tagInstances);
}

// --- 公共 API ---
app.get('/api/posts', async (req, res) => {
    try {
        const findOptions = {
            where: { status: 'publish' },
            order: [['publishDate', 'DESC']],
            include: [Tag]
        };
        if (req.query.tag) {
            findOptions.include = [{ model: Tag, where: { name: req.query.tag } }];
        }
        const posts = await Post.findAll(findOptions);
        const postsWithDetails = posts.map(post => {
            const postObject = post.toJSON();
            const htmlContent = marked.parse(postObject.content || '');
            return { ...postObject, content: htmlContent, coverImage: htmlContent.match(/<img.*?src=["'](.*?)["']/)?.[1] || null };
        });
        res.json(postsWithDetails);
    } catch (error) { res.status(500).json({ message: '获取文章列表失败', error: error.message }); }
});
app.get('/api/posts/:id', async (req, res) => { try { const post = await Post.findByPk(req.params.id, { include: [Comment, Tag] }); if (!post) return res.status(404).json({ message: '文章未找到' }); const postWithHtmlContent = { ...post.toJSON(), content: marked.parse(post.content || '') }; res.json(postWithHtmlContent); } catch (error) { res.status(500).json({ message: '获取单篇文章失败', error: error.message }); } });
app.get('/api/tags', async (req, res) => { try { const tags = await Tag.findAll({ order: [['name', 'ASC']] }); res.json(tags); } catch (error) { res.status(500).json({ message: '获取标签列表失败', error: error.message }); } });
app.post('/api/posts/:id/comments', async (req, res) => { try { const { author, content } = req.body; const postId = req.params.id; if (!author || !content) return res.status(400).json({ message: '作者和内容不能为空' }); const newComment = await Comment.create({ author, content, PostId: postId, publishDate: new Date() }); res.status(201).json(newComment); } catch (error) { res.status(500).json({ message: '创建评论失败', error: error.message }); } });
app.post('/api/posts/:id/like', async (req, res) => { try { const post = await Post.findByPk(req.params.id); if (!post) return res.status(404).json({ message: '文章未找到' }); post.likes += 1; await post.save(); res.status(200).json(post); } catch (error) { res.status(500).json({ message: '点赞失败', error: error.message }); } });

// --- 后台管理 API ---
app.get('/api/admin/posts', async (req, res) => { try { const posts = await Post.findAll({ include: [Tag], order: [['publishDate', 'DESC']] }); res.json(posts); } catch (error) { res.status(500).json({ message: '获取所有文章失败', error: error.message }); } });
app.get('/api/admin/posts/:id', async (req, res) => { try { const post = await Post.findByPk(req.params.id, { include: [Tag] }); if (!post) return res.status(404).json({ message: '文章未找到' }); res.json(post); } catch (error) { res.status(500).json({ message: '获取单篇原始文章失败', error: error.message }); } });
app.post('/api/admin/posts', async (req, res) => {
    try {
        const { title, content, tags, status } = req.body;
        const newPost = await Post.create({ title, content, status, publishDate: new Date() });
        await handlePostTags(newPost, tags);
        res.status(201).json(newPost);
    } catch (error) { res.status(500).json({ message: '创建新文章失败', error: error.message }); }
});
app.put('/api/admin/posts/:id', async (req, res) => {
    try {
        const { title, content, tags, status } = req.body;
        const post = await Post.findByPk(req.params.id);
        if (!post) return res.status(404).json({ message: '文章未找到' });
        await post.update({ title, content, status });
        await handlePostTags(post, tags);
        res.json(post);
    } catch (error) { res.status(500).json({ message: '更新文章失败', error: error.message }); }
});
app.delete('/api/admin/posts/:id', async (req, res) => { try { const post = await Post.findByPk(req.params.id); if (!post) return res.status(404).json({ message: '文章未找到' }); await post.destroy(); res.json({ message: '文章已成功删除' }); } catch (error) { res.status(500).json({ message: '删除文章失败', error: error.message }); } });

// (后台) 标签管理API
app.get('/api/admin/tags', async (req, res) => { try { const tags = await Tag.findAll({ order: [['name', 'ASC']] }); res.json(tags); } catch (error) { res.status(500).json({ message: '获取标签列表失败', error: error.message }); } });
app.post('/api/admin/tags', async (req, res) => { try { const { name } = req.body; if (!name) return res.status(400).json({ message: '标签名不能为空' }); const [tag, created] = await Tag.findOrCreate({ where: { name: name.trim() } }); res.status(created ? 201 : 200).json(tag); } catch (error) { res.status(500).json({ message: '创建标签失败', error: error.message }); } });
app.put('/api/admin/tags/:id', async (req, res) => {
    const { name: newName } = req.body;
    const { id: tagId } = req.params;
    if (!newName || newName.trim() === '') return res.status(400).json({ message: '新标签名不能为空' });
    try {
        const tagToUpdate = await Tag.findByPk(tagId);
        if (!tagToUpdate) return res.status(404).json({ message: '标签未找到' });
        
        const existingTag = await Tag.findOne({ where: { name: newName.trim() } });
        
        if (existingTag && existingTag.id !== tagToUpdate.id) {
            const posts = await tagToUpdate.getPosts();
            if (posts.length > 0) {
                await existingTag.addPosts(posts);
            }
            await tagToUpdate.destroy();
        } else {
            await tagToUpdate.update({ name: newName.trim() });
        }
        
        res.json({ message: `标签已成功更新` });
    } catch (error) {
        res.status(500).json({ message: '更新标签失败', error: error.message });
    }
});
app.delete('/api/admin/tags/:id', async (req, res) => { try { const tagToDelete = await Tag.findByPk(req.params.id); if (!tagToDelete) return res.status(404).json({ message: '标签未找到' }); await tagToDelete.destroy(); res.json({ message: `标签 '${tagToDelete.name}' 已成功删除` }); } catch (error) { res.status(500).json({ message: '删除标签失败', error: error.message }); } });

// (后台) 图片上传API
app.post('/api/admin/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: '没有上传文件' });
    }
    res.json({ url: `/uploads/${req.file.filename}` });
});

// --- 启动服务器 ---
sequelize.sync().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 服务器正在 http://localhost:${PORT} 上运行`);
    });
}).catch(error => {
    console.error('无法同步数据库:', error);
});
