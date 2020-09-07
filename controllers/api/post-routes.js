const router = require('express').Router();
const { Post, User, Category, Comment, Vote } = require('../../models');
const sequelize = require('../../config/connection');
const withAuth = require('../../utils/auth');
const Multer = require("multer")
const { Storage } = require("@google-cloud/storage")
const uuid = require("uuid");
const uuidv1 = uuid.v1;
require("dotenv").config()

const storage = new Storage({
  projectId: process.env.GCLOUD_PROJECT,
  credentials: {
      client_email: process.env.GCLOUD_CLIENT_EMAIL,
      private_key: process.env.GCLOUD_PRIVATE_KEY
  }
});

const multer = Multer({
  storage: Multer.memoryStorage(),
  limits: {
      fileSize: 5 * 1024 * 1024,
  },
});

const bucket = storage.bucket(process.env.GSC_BUCKET)

router.post('/', multer.single("file"), (req, res) => {
  const newFileName = uuidv1() + "-" + req.file.originalname
  const blob = bucket.file(newFileName)
  const blobStream = blob.createWriteStream()

  blobStream.on("error", err => console.log(err))

  blobStream.on("finish", () => {
    const publicUrl = `https://storage.googleapi.com/${process.env.GSC_BUCKET}/${blob.name}`
    
    const imageDetails = JSON.parse(req.body.data)
    imageDetails.image = publicUrl 

    db.Image.create(imageDetails).then(() => res.json(imageDetails))
  })

  blobStream.end(req.file.buffer)
})

// get all users
// router.get('/', withAuth, (req, res) => {
router.get('/', (req, res) => {
  console.log('======================');
  Post.findAll({
    attributes: [
      'id',
      'post_url',
      'post_summary',
      'title',
      'created_at',
  
      [sequelize.literal('(SELECT COUNT(*) FROM vote WHERE post.id = vote.post_id)'), 'vote_count']
    ],
    order: [['created_at', 'DESC']],
    /* order property is assigned a nested array that orders by created_at column in descending order
    to display latest articles first */
    include: [
      {
        model: Comment,
        attributes: ['id', 'comment_text', 'post_id', 'user_id', 'created_at'],
        include: {
          model: User,
          attributes: ['username']
        }
      },
      {
        model: User,
        attributes: ['username']
      },
      {
        model: Category,
        attributes: ['category_name']
      }
    ]
  })
    .then(dbPostData => res.json(dbPostData))
    .catch(err => {
      console.log(err);
      res.status(500).json(err);
    });
});

// get-one query that will be used as a request parameter
// router.get('/:id', withAuth, (req, res) => {
router.get('/:id', (req, res) => {
  Post.findOne({
    where: {
      id: req.params.id
    },
    attributes: ['id', 'post_url', 'title', 'created_at',
      [
        sequelize.literal(
          '(SELECT COUNT(*) FROM vote WHERE post.id = vote.post_id)'
        ),
        'vote_count'
      ]
    ],
    include: [
      {
        model: Comment,
        attributes: ['id', 'comment_text', 'post_id', 'user_id', 'created_at'],
        include: {
          model: User,
          attributes: ['username']
        }
      },
      {
        model: User,
        attributes: ['username']
      }
    ]
  })
    .then(dbPostData => {
      if (!dbPostData) {
        res.status(404).json({ message: 'No post found with this id' });
        return;
      }
      res.json(dbPostData);
    })
    .catch(err => {
      console.log(err);
      res.status(500).json(err);
    });
});

// Create a Post
router.post('/', withAuth, (req, res) => {
// router.post('/', (req, res) => {
  // expects {title: 'Taskmaster goes public!', post_url: 'https://taskmaster.com/press', user_id: 1}
  Post.create({
    title: req.body.title,
    post_url: req.body.post_url,
    user_id: req.session.user_id,
    category_id: req.body.category_id,
    content: req.body.content
  })
    .then(dbPostData => res.json(dbPostData))
    .catch(err => {
      console.log(err);
      res.status(500).json(err);
    });
});

// PUT /api/posts/upvote
router.put('/upvote', withAuth, (req, res) => {
// router.put('/upvote', (req, res) => {
  // custom static method created in models/Post.js
  Post.upvote({ ...req.body, user_id: req.session.user_id }, { Vote, Comment, User })
    .then(updatedVoteData => res.json(updatedVoteData))
    .catch(err => {
      console.log(err);
      res.status(400).json(err);
    });

  // // make sure the session exists first
  // if (req.session) {
  //   // pass session id along with all destructured properties on req.body
  //   Post.upvote({ ...req.body, user_id: req.session.user_id }, { Vote, Comment, User })
  //     .then(updatedVoteData => res.json(updatedVoteData))
  //     .catch(err => {
  //       console.log(err);
  //       res.status(500).json(err);
  //     });
  // }
});

// Update a post's title
router.put('/:id', withAuth, (req, res) => {
// router.put('/:id', (req, res) => {
  Post.update(
    {
      title: req.body.title
    },
    {
      where: {
        id: req.params.id
      }
    }
  )
    .then(dbPostData => {
      if (!dbPostData) {
        res.status(404).json({ message: 'No post found with this id' });
        return;
      }
      res.json(dbPostData);
    })
    .catch(err => {
      console.log(err);
      res.status(500).json(err);
    });
});

// Delete a Post
router.delete('/:id', withAuth, (req, res) => {
// router.delete('/:id', (req, res) => {
  Post.destroy({
    where: {
      id: req.params.id
    }
  })
    .then(dbPostData => {
      if (!dbPostData) {
        res.status(404).json({ message: 'No post found with this id' });
        return;
      }
      res.json(dbPostData);
    })
    .catch(err => {
      console.log(err);
      res.status(500).json(err);
    });
});

module.exports = router;