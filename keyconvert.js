const fs = require('fs');
const key = fs.readFileSync('./local-chef-bazaar-4-all-firebase-adminsdk.json', 'utf8')
const base64 = Buffer.from(key).toString('base64')
console.log(base64)