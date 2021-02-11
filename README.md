# webapp
## Build and Deploy instructions
This project is built with Node.js. You need to install Node.js and NPM before running it.

The database for this project is Mysql. You need to install and start MySQL, create a database called "webapp" first. 
### Start mysql service:
`$ sudo service mysql start`
### Enter mysql database:
`$ mysql -u root -p`
### Create a databse:
`$ create database webapp`

### Before run the project, you will need to install all dependecies first by running:
`$ npm install`

### Run the project:
`$ npm run start`

### Test the project:
run `$ npm run test`
