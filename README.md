Project requirements
-Node version: v18.19.1
-pgAdmin
-create a db by name "video_editor_db"

ENVIRONMENT VARS
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/video_editor_db?schema=public"

IMPORTANT COMMANDS-
- sudo systemctl start postgresql (Start posgres server in Linux)
- npm install (install node modules)
- node src/index.js (run backend server at localhost: 3000)