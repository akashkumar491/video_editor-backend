const express = require('express');
const router = express.Router();
const upload = require('../middlewares/multer');
const controller = require('../controllers/videoController');

router.post('/upload', upload.single('video'), controller.upload);
router.post('/:id/trim', controller.trim);
router.post('/:id/subtitles', controller.addSubtitles);
router.post('/:id/render', controller.render);
router.get('/:id/download', controller.download);

module.exports = router;