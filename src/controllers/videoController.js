const { PrismaClient } = require("@prisma/client");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs");
const ffmpegPath = require("ffmpeg-static");
const ffprobePath = require("ffprobe-static").path;

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const prisma = new PrismaClient();

exports.upload = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded or invalid format(only .mp4 and .mov files are allowed)" });
  }

  const { filename, size, path: filePath } = req.file;
  const videoPath = path.join("uploads", filename);

  ffmpeg.ffprobe(filePath, async (err, metadata) => {
    if (err) {
      console.error("Error getting video metadata:", err);
      return res.status(500).json({ error: "Failed to get video metadata" });
    }

    console.log("Video metadata:", metadata.format.duration);

    const duration = metadata.format.duration;
    const video = await prisma.video.create({
      data: {
        name: filename,
        size: size,
        path: videoPath,
        duration: duration || 0,
      },
    });
    res.json(video);
  });
};

exports.trim = async (req, res) => {
  const { id } = req.params;
  const { start, end } = req.body;

  const video = await prisma.video.findUnique({ where: { id: parseInt(id) } });
  if (!video) {
    return res.status(404).json({ error: "Video not found" });
  }

  const outputPath = `rendered/${Date.now()}_trimmed.mp4`;

  ffmpeg(video.path)
    .setStartTime(start)
    .setDuration(end - start)
    .output(outputPath)
    .on("end", async () => {
      try {
        const stats = fs.statSync(outputPath);
        const newSize = stats.size;

        ffmpeg.ffprobe(outputPath, async (err, metadata) => {
          if (err) {
            console.error("Error getting metadata:", err);
            return res
              .status(500)
              .json({ error: "Failed to get trimmed video metadata" });
          }

          const newDuration = metadata.format.duration;

          await prisma.video.update({
            where: { id: parseInt(id) },
            data: {
              path: outputPath,
              size: newSize,
              duration: newDuration,
              status: "trimmed",
            },
          });

          res.download(outputPath);
        });
      } catch (error) {
        console.error("Error after trimming:", error);
        res.status(500).json({ error: "Error processing trimmed video" });
      }
    })
    .on("error", (err) => {
      console.error("FFmpeg error:", err);
      res.status(500).json({ error: "Failed to trim video" });
    })
    .run();
};

exports.addSubtitles = async (req, res) => {
  const id = parseInt(req.params.id);
  const { text, start, end } = req.body;
  const video = await prisma.video.findUnique({ where: { id } });

  const outputPath = `rendered/${Date.now()}_subtitled.mp4`;
  const subtitleFilter = `drawtext=fontfile=font/Movistar Text Regular.ttf:text='${text
    .replace(/:/g, "\\:")
    .replace(
      /'/g,
      "\\'"
    )}':enable='between(t\\,${start}\\,${end})':fontcolor=white:fontsize=64:x=(w-text_w)/2:y=(h-text_h)-100:borderw=2:bordercolor=black`;

  ffmpeg(video.path)
    .videoFilter(subtitleFilter)
    .output(outputPath)
    .on("end", async () => {
      await prisma.video.update({ where: { id }, data: { path: outputPath } });
      res.download(outputPath);
    })
    .run();
};

exports.render = async (req, res) => {
  const id  = parseInt(req.params.id);
  const video = await prisma.video.findUnique({ where: { id } });

  const outputPath = `rendered/${Date.now()}_final.mp4`;
  ffmpeg(video.path)
    .output(outputPath)
    .on("end", async () => {
      await prisma.video.update({
        where: { id },
        data: { path: outputPath, status: "rendered" },
      });
      res.json({ message: "Rendered successfully", path: outputPath });
    })
    .run();
};

exports.download = async (req, res) => {
  const id = parseInt(req.params.id);
  const video = await prisma.video.findUnique({ where: { id } });

  if (fs.existsSync(video.path)) {
    res.download(video.path);
  } else {
    res.status(404).json({ error: "File not found" });
  }
};
