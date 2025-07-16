// server/migrate.js

const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const mongoose = require('mongoose');
const TurndownService = require('turndown'); // 引入turndown库

const Post = require('./models/post');
const Comment = require('./models/comment');

const MONGO_URI = 'mongodb://localhost:27017/my-new-blog'; 
const XML_FILE_PATH = path.join(__dirname, '..', 'sowrhome.WordPress.2025-07-16.xml'); 

async function migrate() {
    // **修改：初始化Turndown服务**
    const turndownService = new TurndownService();

    let dbConnection;
    try {
        await mongoose.connect(MONGO_URI);
        dbConnection = mongoose.connection;
        console.log('✅ 数据库连接成功！');

        await Post.deleteMany({});
        await Comment.deleteMany({});
        console.log('   - 旧的文章和评论数据已清空。');

        const xmlData = fs.readFileSync(XML_FILE_PATH, 'utf8');
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(xmlData);
        console.log('   - XML文件解析成功。');

        const items = result.rss.channel[0].item;
        
        const postsToMigrate = items.filter(item => item['wp:post_type'][0] === 'post' && item['wp:status'][0] === 'publish');
        console.log(`>>> 发现 ${postsToMigrate.length} 篇已发布的文章需要迁移...`);

        for (const wpPost of postsToMigrate) {
            const tags = (wpPost.category || []).filter(c => c.$.domain === 'category').map(c => c._);
            
            // **修改：将HTML内容转换为Markdown**
            const markdownContent = turndownService.turndown(wpPost['content:encoded'][0] || '');

            const newPost = new Post({
                title: wpPost.title[0],
                content: markdownContent, // 保存Markdown
                publishDate: new Date(wpPost.pubDate[0]),
                status: wpPost['wp:status'][0],
                tags: tags,
                wpPostId: parseInt(wpPost['wp:post_id'][0])
            });
            await newPost.save();
        }
        console.log('✅ 所有文章迁移完成！');

        // ... (评论迁移部分保持不变)
        const commentsToMigrate = items.flatMap(item => item['wp:comment'] ? item['wp:comment'].map(c => ({ ...c, wpPostId: parseInt(item['wp:post_id'][0]) })) : []);
        console.log(`>>> 发现 ${commentsToMigrate.length} 条评论需要迁移...`);
        for (const wpComment of commentsToMigrate) {
            if (!wpComment['wp:comment_id'] || !wpComment['wp:comment_parent']) continue;
            const relatedPost = await Post.findOne({ wpPostId: wpComment.wpPostId });
            if (!relatedPost) continue;
            const newComment = new Comment({ post: relatedPost._id, author: wpComment['wp:comment_author'] ? wpComment['wp:comment_author'][0] : '匿名用户', authorEmail: wpComment['wp:comment_author_email'] ? wpComment['wp:comment_author_email'][0] : '', content: wpComment['wp:comment_content'] ? wpComment['wp:comment_content'][0] : '', publishDate: wpComment['wp:comment_date_gmt'] ? new Date(wpComment['wp:comment_date_gmt'][0] + 'Z') : new Date(), wpCommentId: parseInt(wpComment['wp:comment_id'][0]), wpParentId: parseInt(wpComment['wp:comment_parent'][0]) });
            if (!newComment.content) continue;
            const savedComment = await newComment.save();
            relatedPost.comments.push(savedComment._id);
            await relatedPost.save();
        }
        console.log('✅ 所有评论迁移完成！');
        const allComments = await Comment.find({ wpParentId: { $ne: 0 } });
        for (const childComment of allComments) {
            const parentComment = await Comment.findOne({ wpCommentId: childComment.wpParentId });
            if (parentComment) { childComment.parentComment = parentComment._id; await childComment.save(); }
        }
        console.log('✅ 评论回复关系已关联！');

    } catch (error) {
        console.error('迁移过程中发生错误:', error);
    } finally {
        if (dbConnection) {
            await mongoose.connection.close();
            console.log('--- 数据库连接已关闭。迁移结束。 ---');
        }
    }
}

migrate();
