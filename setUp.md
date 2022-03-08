##  Installations:
    - Install node js
    - sudo apt install npm
    - npm install express
    - npm install ejs
    - npm install express-session
    - npm install mysql2
    - npm install md5
    - npm install multer
    - npm install sharp

## Frequently used commands

- Githuis
    - git pull
    - git checkout develop // use development branch
    - git add .
    - git commit -m "message"
    - git push

- Screen in ubuntu

    - screen -ls -> list all screens
    - screen -S screenname -> create a screen
    - screen -r screenid -> reattach to a screen
    - ctrl a+d -> exit from a screen
    - ctrl a + k -> kill a screen

- Killing Node Process

    - ps -aux | grep api.js -> look for the processid of running node API file
    - kill -9 Processid
    - Restarting API.js file issue
    - To kill and start node server: lsof -i tcp:3000 -> kill -9 pid

## APP info: 

    - http://3.228.236.231:3000/

## Reference Links:

- Restarting node files: https://dev.to/jerrymcdonald/automatically-restart-your-node-js-application-using-nodemon-4k9a
- https://cloud.google.com/docs/authentication/getting-started
- https://cloud.google.com/nodejs/docs/reference/google-auth-library/latest
- https://developers.google.com/identity/sign-in/web/sign-in
- https://www.youtube.com/watch?v=Y2ec4KQ7mP8

## to do

- verify account when registering user email
- study mate logo on student profile page clickable
- forgot password
- profile picture not getting updated on live / works on local