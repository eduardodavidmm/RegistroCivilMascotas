const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../../middleware/auth');

const Post = require('../../models/Post');
const Profile = require('../../models/Profile');
const User = require('../../models/User');

//@route   POST api/posts
//@desc    Create a post
//@access  Private

router.post(
  '/',
  [auth, [check('text', 'Texto es Requerido').not().isEmpty()]],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user.id).select('-password');

      const newPost = new Post({
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id,
      });

      const post = await newPost.save();

      res.json(post);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

//@route   GET api/posts
//@desc    Get all posts
//@access  Private

router.get('/', auth, async (req, res) => {
  try {
    const posts = await Post.find().sort({ date: -1 });
    res.json(posts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

//@route   GET api/posts/:id
//@desc    Get posts by id
//@access  Private

router.get('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ msg: 'Publicación no encontrada' });
    }

    res.json(post);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Publicación no encontrada' });
    }
    res.status(500).send('Server Error');
  }
});

//@route   DELETE api/posts/:id
//@desc    Delete posts
//@access  Private

router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ msg: 'Publicación no encontrada' });
    }

    //Revisar Usuario

    if (post.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Usuario no autorizado' });
    }

    await post.remove();

    res.json({ msg: 'Publicación eliminada' });
  } catch (err) {
    console.error(err.message);
    if (!post) {
      return res.status(404).json({ msg: 'Publicación no encontrada' });
    }
    res.status(500).send('Server Error');
  }
});

//@route   PUT api/posts/like/:id
//@desc    Like a post
//@access  Private

router.put('/like/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    //Chequeo si ya se le dió like
    if (
      post.likes.filter((like) => like.user.toString() === req.user.id).length >
      0
    ) {
      return res.json(400).json({ msg: 'Ya diste like a esta publicación' });
    }

    post.likes.unshift({ user: req.user.id });

    await post.save();

    res.json(post.likes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error de Servidor');
  }
});

//@route   PUT api/posts/unlike/:id
//@desc    Like a post
//@access  Private

router.put('/unlike/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    //Chequeo si ya se le dió like
    if (
      post.likes.filter((like) => like.user.toString() === req.user.id)
        .length === 0
    ) {
      return res
        .json(400)
        .json({ msg: 'La Publicación no ha recibido like aún' });
    }

    //Get remove index

    const removeIndex = post.likes
      .map((like) => like.user.toString())
      .indexOf(req.user.id);

    post.likes.splice(removeIndex, 1);

    await post.save();

    res.json(post.likes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error de Servidor');
  }
});

module.exports = router;
